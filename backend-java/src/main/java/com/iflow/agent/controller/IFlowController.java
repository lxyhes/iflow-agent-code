package com.iflow.agent.controller;

import com.iflow.agent.service.ai.IFlowService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * iFlow AI 接口控制器
 * 提供基于 iFlow SDK 的 AI 对话能力
 */
@Slf4j
@RestController
@RequestMapping("/api/iflow")
@RequiredArgsConstructor
public class IFlowController {

    private final IFlowService iFlowService;

    /**
     * 同步查询 - 简单问答
     */
    @PostMapping("/query")
    public ResponseEntity<Map<String, String>> query(@RequestBody QueryRequest request) {
        log.debug("iFlow query request: {}", request.getMessage());
        String response = iFlowService.querySync(request.getMessage());
        return ResponseEntity.ok(Map.of("response", response));
    }

    /**
     * 流式查询 - SSE 实时返回
     */
    @PostMapping(value = "/query/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> queryStream(@RequestBody QueryRequest request) {
        log.debug("iFlow stream query request: {}", request.getMessage());
        return iFlowService.queryStream(request.getMessage())
                .map(chunk -> "data: " + chunk + "\n\n");
    }

    /**
     * 异步对话
     */
    @PostMapping("/chat")
    public CompletableFuture<ResponseEntity<Map<String, String>>> chat(@RequestBody QueryRequest request) {
        log.debug("iFlow chat request: {}", request.getMessage());
        return iFlowService.chat(request.getMessage())
                .thenApply(response -> ResponseEntity.ok(Map.of("response", response)));
    }

    /**
     * 健康检查
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean connected = iFlowService.isConnected();
        return ResponseEntity.ok(Map.of(
                "status", connected ? "connected" : "disconnected",
                "service", "iFlow",
                "timestamp", System.currentTimeMillis()
        ));
    }

    @Data
    public static class QueryRequest {
        private String message;
    }
}
