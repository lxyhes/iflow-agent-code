package com.iflow.agent.controller;

import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final TongyiQianwenService tongyiQianwenService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generate(@RequestBody GenerateRequest request) {
        String result = tongyiQianwenService.generate(request.getPrompt());
        return ResponseEntity.ok(Map.of("content", result));
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatRequest request) {
        String result = tongyiQianwenService.chat(request.getMessages());
        return ResponseEntity.ok(Map.of("content", result));
    }

    @PostMapping(value = "/generate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generateStream(@RequestBody GenerateRequest request) {
        return tongyiQianwenService.generateStream(request.getPrompt())
                .map(chunk -> "data: " + chunk + "\n\n");
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chatStream(@RequestBody ChatRequest request) {
        return tongyiQianwenService.chatStream(request.getMessages())
                .map(chunk -> "data: " + chunk + "\n\n");
    }

    @PostMapping("/embed")
    public ResponseEntity<Map<String, Object>> embed(@RequestBody EmbedRequest request) {
        float[] embedding = tongyiQianwenService.embed(request.getText());
        return ResponseEntity.ok(Map.of(
                "embedding", embedding,
                "dimensions", embedding.length
        ));
    }

    @PostMapping("/generate/model")
    public ResponseEntity<Map<String, String>> generateWithModel(@RequestBody ModelGenerateRequest request) {
        String result = tongyiQianwenService.generateWithModel(
                request.getPrompt(),
                request.getModel(),
                request.getTemperature()
        );
        return ResponseEntity.ok(Map.of("content", result));
    }

    @GetMapping("/models")
    public ResponseEntity<Map<String, List<String>>> getAvailableModels() {
        return ResponseEntity.ok(Map.of(
                "models", List.of(
                        "qwen-turbo",
                        "qwen-plus",
                        "qwen-max",
                        "qwen-max-longcontext",
                        "qwen-coder-plus",
                        "qwen-math-plus"
                )
        ));
    }

    @Data
    public static class GenerateRequest {
        private String prompt;
    }

    @Data
    public static class ChatRequest {
        private List<Map<String, String>> messages;
    }

    @Data
    public static class EmbedRequest {
        private String text;
    }

    @Data
    public static class ModelGenerateRequest {
        private String prompt;
        private String model;
        private Double temperature;
    }
}
