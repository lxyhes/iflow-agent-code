package com.iflow.agent.service.ai;

import cn.iflow.sdk.core.IFlowClient;
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
 * iFlow 服务封装类
 * 提供同步和异步的 AI 对话能力
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IFlowService {

    private final IFlowClient iFlowClient;
    private final IFlowBackendConfig backendConfig;

    /**
     * 同步查询 - 最简单的方式
     * @param message 用户消息
     * @return AI 响应文本
     */
    public String querySync(String message) {
        log.debug("iFlow sync query: {}", message);
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
            log.error("iFlow query failed", e);
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
        log.debug("iFlow stream query with backend mode: {}, model: {}", backendConfig.getBackendMode(), model);

        // 根据配置选择实现方式
        if (backendConfig.isSdkMode()) {
            return queryStreamViaSDK(message);
        } else {
            return queryStreamViaSubprocess(message, model);
        }
    }

    /**
     * 使用 SDK 进行流式查询
     * 注意: SDK 不支持模型切换，模型由 iFlow CLI 启动时决定
     */
    private Flux<String> queryStreamViaSDK(String message) {
        log.debug("iFlow SDK stream query: {}", message);

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
        log.debug("iFlow Subprocess stream query with model {}: {}", model, message);

        // 使用 subprocess 调用 iFlow CLI，传递 --model 参数
        String actualModel = model != null ? model : "GLM-4.7";
        
        // 构建命令
        String iflowPath = System.getenv().getOrDefault("IFLOW_PATH", "iflow");
        String escapedMessage = message.replace("\"", "\\\"").replace("\n", "\\n");
        // 添加 temperature 参数以增加输出多样性（0.7 是一个平衡的值，既保持一致性又有一定的随机性）
        String command = String.format("%s -p \"%s\" --model \"%s\" --temperature 0.7 -y",
            iflowPath, escapedMessage, actualModel);
        
        log.info("Running iFlow CLI with model {}: {}", actualModel, command);
        
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
                    log.error("iFlow CLI exited with code: {}", exitCode);
                    sink.error(new RuntimeException("iFlow CLI failed with exit code: " + exitCode));
                } else {
                    log.info("iFlow CLI completed successfully");
                    sink.complete();
                }
                
            } catch (Exception e) {
                log.error("Error running iFlow CLI", e);
                sink.error(e);
            }
        });
    }

    /**
     * 检查 iFlow 连接状态
     */
    public boolean isConnected() {
        try {
            iFlowClient.connect().block();
            return true;
        } catch (Exception e) {
            log.warn("iFlow not connected: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 关闭 iFlow 客户端
     */
    public void close() {
        try {
            iFlowClient.close();
            log.info("iFlow client closed");
        } catch (Exception e) {
            log.error("Error closing iFlow client", e);
        }
    }
}