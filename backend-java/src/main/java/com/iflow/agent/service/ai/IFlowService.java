package com.iflow.agent.service.ai;

import cn.iflow.sdk.query.IFlowQuery;
import com.iflow.agent.config.IFlowBackendConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Set;

/**
 * AI 工作台服务封装类
 * 提供同步和异步的 AI 对话能力
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IFlowService {

    private final IFlowBackendConfig backendConfig;
    private final ApiKeyManager apiKeyManager;
    private final IFlowClientManager iFlowClientManager;

    /**
     * 同步查询 - 最简单的方式
     * @param message 用户消息
     * @return AI 响应文本
     */
    public String querySync(String message) {
        log.debug("AI 工作台同步查询: {}", message);
        try {
            List<cn.iflow.sdk.types.messages.Message> response = IFlowQuery.querySync(message);
            StringBuilder result = new StringBuilder();

            for (cn.iflow.sdk.types.messages.Message msg : response) {
                if (msg instanceof cn.iflow.sdk.types.messages.AssistantMessage) {
                    cn.iflow.sdk.types.messages.AssistantMessage assistantMsg = 
                        (cn.iflow.sdk.types.messages.AssistantMessage) msg;
                    result.append(assistantMsg.getChunk().getText());
                }
            }
            return result.toString();
        } catch (Exception e) {
            log.error("AI 工作台查询失败", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 异步查询 - 返回 Flux 流
     * 根据配置选择使用 SDK 还是 subprocess
     * @param message 用户消息
     * @param model AI 模型名称 (仅在 subprocess 模式下有效)
     * @return Flux 消息流
     */
    public Flux<String> queryStream(String message, String model) {
        log.debug("AI 工作台流式查询 with backend mode: {}, model: {}", backendConfig.getBackendMode(), model);

        // 根据配置选择实现方式
        if (backendConfig.isSdkMode()) {
            return queryStreamViaSDK(message);
        } else {
            return queryStreamViaSubprocess(message, model);
        }
    }

    /**
     * 使用 SDK 进行流式查询
     * 注意: SDK 不支持模型切换，模型由 AI 工作台 CLI 启动时决定
     */
    private Flux<String> queryStreamViaSDK(String message) {
        log.debug("AI SDK stream query: {}", message);

        // 在 SDK 查询前，确保使用最新的 API Key
        // 先停止现有进程，防止连接到旧 Token 的进程
        iFlowClientManager.stopAndRecreateIfNeeded();

        return Flux.create(sink -> {
            long startTime = System.currentTimeMillis();
            try {
                Flux<cn.iflow.sdk.types.messages.Message> messageFlux = IFlowQuery.queryStream(message);
                
                messageFlux.subscribe(
                    msg -> {
                        if (msg instanceof cn.iflow.sdk.types.messages.AssistantMessage) {
                            cn.iflow.sdk.types.messages.AssistantMessage assistantMsg = 
                                (cn.iflow.sdk.types.messages.AssistantMessage) msg;
                            String text = assistantMsg.getChunk().getText();
                            if (text != null && !text.isEmpty()) {
                                log.debug("SDK: Received chunk ({} chars) after {}ms", 
                                    text.length(), System.currentTimeMillis() - startTime);
                                sink.next(text);
                            }
                        }
                    },
                    error -> {
                        log.error("SDK query failed after {}ms: {}", 
                            System.currentTimeMillis() - startTime, error.getMessage());
                        sink.error(error);
                    },
                    () -> {
                        log.info("SDK query completed successfully after {}ms", 
                            System.currentTimeMillis() - startTime);
                        sink.complete();
                    }
                );
            } catch (Exception e) {
                log.error("Error running SDK query: {}", e.getMessage(), e);
                sink.error(e);
            }
        });
    }

    /**
     * 使用 Subprocess 进行流式查询
     * 支持通过 --model 参数切换模型
     */
    private Flux<String> queryStreamViaSubprocess(String message, String model) {
        log.debug("AI 工作台 Subprocess stream query with model {}: {}", model, message);

        // 使用 subprocess 调用 AI 工作台 CLI，传递 --model 参数
        String actualModel = model != null ? model : "GLM-4.7";
        
        // 构建命令
        String iflowPath = System.getenv().getOrDefault("IFLOW_PATH", "iflow");
        String escapedMessage = message.replace("\"", "\\\"").replace("\n", "\\n");

        // 获取 API Key
        String apiKey = apiKeyManager.getApiKey();
        String apiKeyParam = "";
        if (apiKey != null && !apiKey.isEmpty()) {
            apiKeyParam = String.format(" --api-key \"%s\"", apiKey);
        }

        // 添加 temperature 参数以增加输出多样性（0.7 是一个平衡的值，既保持一致性又有一定的随机性）
        String command = String.format("%s -p \"%s\" --model \"%s\" --temperature 0.7%s -y",
            iflowPath, escapedMessage, actualModel, apiKeyParam);
        
        log.info("Running AI 工作台 CLI with model {}: {}", actualModel, command);
        
        return Flux.create(sink -> {
            try {
                ProcessBuilder pb = new ProcessBuilder("sh", "-c", command);
                pb.redirectErrorStream(true);
                
                Process process = pb.start();
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
                );
                
                String line;
                StringBuilder executionInfo = new StringBuilder();
                StringBuilder output = new StringBuilder();
                boolean inExecutionInfo = false;
                
                Set<String> filteredPrefixes = Set.of(
                    "[ACP]", "🚀", "Checking", "INFO:", "DEBUG:", "Attempt", "Error when"
                );
                
                while ((line = reader.readLine()) != null) {
                    // 检测 Execution Info 开始
                    if (line.trim().startsWith("<Execution Info>")) {
                        inExecutionInfo = true;
                        continue;
                    }
                    
                    // 检测 Execution Info 结束
                    if (inExecutionInfo && line.trim().startsWith("</Execution Info>")) {
                        inExecutionInfo = false;
                        // 发送 Execution Info 作为特殊事件
                        if (executionInfo.length() > 0) {
                            String jsonStr = executionInfo.toString().trim();
                            // 尝试解析 JSON，确保是完整的 JSON 对象
                            if (jsonStr.startsWith("{") && jsonStr.endsWith("}")) {
                                sink.next("EXECUTION_INFO_START");
                                sink.next(jsonStr);
                                sink.next("EXECUTION_INFO_END");
                            }
                            executionInfo.setLength(0);
                        }
                        continue;
                    }
                    
                    // 如果在 Execution Info 块中，收集内容
                    if (inExecutionInfo) {
                        executionInfo.append(line).append("\n");
                        continue;
                    }
                    
                    // 过滤日志行
                    if (filteredPrefixes.stream().noneMatch(line::startsWith)) {
                        if (!line.trim().isEmpty()) {
                            output.append(line).append("\n");
                            sink.next(line + "\n");
                        }
                    }
                }
                
                int exitCode = process.waitFor();
                if (exitCode != 0) {
                    log.error("AI 工作台 CLI exited with code: {}", exitCode);
                    sink.error(new RuntimeException("AI 工作台 CLI failed with exit code: " + exitCode));
                } else {
                    log.info("AI 工作台 CLI completed successfully");
                    sink.complete();
                }
                
            } catch (Exception e) {
                log.error("Error running AI 工作台 CLI", e);
                sink.error(e);
            }
        });
    }

    /**
     * 检查 AI 工作台 连接状态
     */
    public boolean isConnected() {
        return iFlowClientManager.isConnected();
    }

    /**
     * 关闭 AI 工作台 客户端
     */
    public void close() {
        // 客户端由 IFlowClientManager 管理
        log.info("IFlowService close called, client managed by IFlowClientManager");
    }
}
