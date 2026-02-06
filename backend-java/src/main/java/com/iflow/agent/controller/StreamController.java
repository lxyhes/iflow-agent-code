package com.iflow.agent.controller;

import com.iflow.agent.service.ai.IFlowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 流式聊天 API - SSE 端点
 * 使用 iFlow SDK 提供 AI 对话能力
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class StreamController {

    private final IFlowService iFlowService;
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    /**
     * 流式聊天接口 - SSE
     * 使用 iFlow SDK 进行流式对话
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam String message,
            @RequestParam String cwd,
            @RequestParam(required = false) String sessionId,
            @RequestParam String project,
            @RequestParam(required = false) String model,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) String persona) {

        log.info("流式聊天请求: project={}, sessionId={}, message={}", 
                project, sessionId, message.substring(0, Math.min(50, message.length())));

        SseEmitter emitter = new SseEmitter(300000L); // 5分钟超时

        executorService.execute(() -> {
            try {
                // 发送开始标记
                emitter.send(SseEmitter.event()
                        .name("message")
                        .data("{\"type\": \"start\"}"));

                // 使用 iFlow 进行流式查询
                Flux<String> stream = iFlowService.queryStream(message);
                
                stream.subscribe(
                        content -> {
                            try {
                                // 转义特殊字符
                                String escaped = content
                                        .replace("\\", "\\\\")
                                        .replace("\"", "\\\"")
                                        .replace("\n", "\\n")
                                        .replace("\r", "\\r");
                                
                                emitter.send(SseEmitter.event()
                                        .name("message")
                                        .data("{\"type\": \"content\", \"content\": \"" + escaped + "\"}"));
                            } catch (IllegalStateException e) {
                                // Emitter 已完成，停止发送
                                log.debug("Emitter already complete, stopping stream");
                            } catch (IOException e) {
                                log.warn("Failed to send SSE message (client may have disconnected): {}", e.getMessage());
                            }
                        },
                        error -> {
                            log.error("iFlow 流式响应错误", error);
                            try {
                                emitter.send(SseEmitter.event()
                                        .name("message")
                                        .data("{\"type\": \"error\", \"error\": \"" + error.getMessage() + "\"}"));
                                emitter.completeWithError(error);
                            } catch (IllegalStateException | IOException e) {
                                log.warn("Failed to send error message: {}", e.getMessage());
                            }
                        },
                        () -> {
                            try {
                                // 发送结束标记
                                emitter.send(SseEmitter.event()
                                        .name("message")
                                        .data("{\"type\": \"end\"}"));
                                emitter.complete();
                            } catch (IllegalStateException | IOException e) {
                                log.debug("Failed to send end message: {}", e.getMessage());
                            }
                        }
                );

            } catch (Exception e) {
                log.error("流式响应错误", e);
                try {
                    emitter.completeWithError(e);
                } catch (IllegalStateException ex) {
                    log.debug("Emitter already completed during error handling");
                }
            }
        });

        emitter.onCompletion(() -> log.debug("SSE 连接完成"));
        emitter.onTimeout(() -> log.warn("SSE 连接超时"));
        emitter.onError((e) -> {
            if (e instanceof java.io.IOException || e.getMessage() != null && e.getMessage().contains("Broken pipe")) {
                log.debug("SSE 连接已断开 (客户端关闭): {}", e.getMessage());
            } else {
                log.error("SSE 连接错误", e);
            }
        });

        return emitter;
    }
}
