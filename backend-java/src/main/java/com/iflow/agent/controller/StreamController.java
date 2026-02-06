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

        log.info("流式聊天请求: project={}, sessionId={}, model={}, message={}",
                project, sessionId, model, message.substring(0, Math.min(50, message.length())));

        SseEmitter emitter = new SseEmitter(600000L); // 10分钟超时

        executorService.execute(() -> {
            long startTime = System.currentTimeMillis();
            try {
                // 发送开始标记
                emitter.send(SseEmitter.event()
                        .name("message")
                        .data("{\"type\": \"start\"}"));
                log.info("SSE: Sent start event");

                // 使用 iFlow 进行流式查询，传递模型参数
                String actualModel = model != null ? model : "glm-4";
                Flux<String> stream = iFlowService.queryStream(message, actualModel);
                
                stream.subscribe(
                        content -> {
                            try {
                                // 检测 Execution Info 标记
                                if (content.equals("EXECUTION_INFO_START")) {
                                    log.debug("SSE: Skip EXECUTION_INFO_START");
                                    return;
                                } else if (content.equals("EXECUTION_INFO_END")) {
                                    log.debug("SSE: Skip EXECUTION_INFO_END");
                                    return;
                                }
                                
                                // 如果内容看起来像 JSON（可能包含 session-id 等字段），发送为 execution_info 事件
                                if (content.trim().startsWith("{") && content.contains("session-id")) {
                                    String escaped = content
                                            .replace("\\", "\\\\")
                                            .replace("\"", "\\\"")
                                            .replace("\n", "\\n")
                                            .replace("\r", "\\r");
                                    
                                    emitter.send(SseEmitter.event()
                                            .name("message")
                                            .data("{\"type\": \"execution_info\", \"data\": \"" + escaped + "\"}"));
                                    log.debug("SSE: Sent execution_info event ({} chars)", content.length());
                                    return;
                                }
                                
                                // 普通内容 - 立即发送，不等待累积
                                String escaped = content
                                        .replace("\\", "\\\\")
                                        .replace("\"", "\\\"")
                                        .replace("\n", "\\n")
                                        .replace("\r", "\\r");
                                
                                emitter.send(SseEmitter.event()
                                        .name("message")
                                        .data("{\"type\": \"content\", \"content\": \"" + escaped + "\"}"));
                                log.debug("SSE: Sent content chunk ({} chars), elapsed: {}ms", 
                                    content.length(), System.currentTimeMillis() - startTime);
                            } catch (IllegalStateException e) {
                                log.debug("Emitter already complete, stopping stream");
                            } catch (IOException e) {
                                log.warn("Failed to send SSE message: {}", e.getMessage());
                            }
                        },
                        error -> {
                            log.error("iFlow stream error after {}ms: {}", 
                                System.currentTimeMillis() - startTime, error.getMessage());
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
                            long duration = System.currentTimeMillis() - startTime;
                            log.info("SSE: Stream completed after {}ms, sending end event", duration);
                            try {
                                emitter.send(SseEmitter.event()
                                        .name("message")
                                        .data("{\"type\": \"end\"}"));
                                emitter.complete();
                            } catch (IllegalStateException e) {
                                // Emitter 已经完成，这通常意味着 SDK 完成后自动关闭了连接
                                log.debug("Emitter already completed, likely auto-closed after SDK completion");
                            } catch (IOException e) {
                                log.debug("Failed to send end message: {}", e.getMessage());
                            }
                        }
                );

            } catch (Exception e) {
                log.error("Stream error: {}", e.getMessage(), e);
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
