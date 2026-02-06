package com.iflow.agent.service.ai;

import cn.iflow.sdk.core.IFlowClient;
import cn.iflow.sdk.query.IFlowQuery;
import cn.iflow.sdk.types.config.IFlowOptions;
import cn.iflow.sdk.types.messages.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * iFlow 服务封装类
 * 提供同步和异步的 AI 对话能力
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IFlowService {

    private final IFlowClient iFlowClient;

    /**
     * 同步查询 - 最简单的方式
     * @param message 用户消息
     * @return AI 响应文本
     */
    public String querySync(String message) {
        log.debug("iFlow sync query: {}", message);
        try {
            List<Message> response = IFlowQuery.querySync(message);
            StringBuilder result = new StringBuilder();

            for (Message msg : response) {
                if (msg instanceof AssistantMessage) {
                    AssistantMessage assistantMsg = (AssistantMessage) msg;
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
     * @param message 用户消息
     * @param model AI 模型名称
     * @return Flux 消息流
     */
    public Flux<String> queryStream(String message, String model) {
        log.debug("iFlow stream query with model {}: {}", model, message);

        // 构建包含模型参数的 metadata
        Map<String, Object> metadata = Map.of("model", model != null ? model : "glm-4");

        // 创建包含 metadata 的 IFlowOptions
        IFlowOptions options = IFlowOptions.builder()
                .url("ws://localhost:8090/acp")
                .autoStartProcess(true)
                .metadata(metadata)
                .build();

        return Mono.fromCallable(() -> {
                    // 使用自定义 options 创建临时客户端
                    IFlowClient client = IFlowClient.create(options);
                    client.connect().block();
                    client.sendMessage(message).block();
                    return client;
                })
                .flatMapMany(c -> c.receiveMessages()
                        .takeUntil(msg -> msg instanceof TaskFinishMessage)
                        .filter(msg -> msg instanceof AssistantMessage)
                        .map(msg -> {
                            AssistantMessage assistantMsg = (AssistantMessage) msg;
                            return assistantMsg.getChunk().getText();
                        })
                        .filter(text -> text != null && !text.isEmpty())
                );
    }

    /**
     * 使用客户端进行完整对话
     * @param message 用户消息
     * @return CompletableFuture 包含完整响应
     */
    public CompletableFuture<String> chat(String message) {
        log.debug("iFlow chat: {}", message);

        return CompletableFuture.supplyAsync(() -> {
            StringBuilder response = new StringBuilder();

            try (IFlowClient client = IFlowClient.create()) {
                client.connect().block();
                client.sendMessage(message).block();

                client.receiveMessages()
                        .doOnNext(msg -> {
                            if (msg instanceof AssistantMessage) {
                                AssistantMessage assistantMsg = (AssistantMessage) msg;
                                response.append(assistantMsg.getChunk().getText());
                            }
                        })
                        .doOnError(error -> log.error("iFlow receive error", error))
                        .blockLast();

            } catch (Exception e) {
                log.error("iFlow chat failed", e);
                return "Error: " + e.getMessage();
            }

            return response.toString();
        });
    }

    /**
     * 检查 iFlow 连接状态
     */
    public boolean isConnected() {
        try {
            // 尝试连接来验证状态
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
