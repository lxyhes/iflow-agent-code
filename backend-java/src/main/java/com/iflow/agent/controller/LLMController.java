package com.iflow.agent.controller;

import com.iflow.agent.service.llm.LLMService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/llm")
@RequiredArgsConstructor
public class LLMController {

    private final LLMService llmService;

    @PostMapping("/complete")
    public Mono<ResponseEntity<Map<String, String>>> complete(@RequestBody CompleteRequest request) {
        return llmService.complete(
                request.getMessages(),
                request.getTemperature(),
                request.getMaxTokens(),
                request.getModel()
        ).map(content -> ResponseEntity.ok(Map.of("content", content)))
         .onErrorResume(e -> {
             log.error("LLM completion failed", e);
             return Mono.just(ResponseEntity.internalServerError()
                     .body(Map.of("error", e.getMessage())));
         });
    }

    @PostMapping(value = "/complete/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> completeStream(@RequestBody CompleteRequest request) {
        return llmService.completeStream(
                request.getMessages(),
                request.getTemperature(),
                request.getMaxTokens(),
                request.getModel()
        ).map(chunk -> "data: " + chunk + "\n\n")
         .onErrorResume(e -> {
             log.error("LLM stream failed", e);
             return Flux.just("data: Error: " + e.getMessage() + "\n\n");
         });
    }

    @PostMapping("/generate")
    public Mono<ResponseEntity<Map<String, String>>> generate(@RequestBody GenerateRequest request) {
        return llmService.generate(
                request.getPrompt(),
                request.getTemperature(),
                request.getMaxTokens()
        ).map(content -> ResponseEntity.ok(Map.of("content", content)))
         .onErrorResume(e -> {
             log.error("LLM generation failed", e);
             return Mono.just(ResponseEntity.internalServerError()
                     .body(Map.of("error", e.getMessage())));
         });
    }

    @Data
    public static class CompleteRequest {
        private List<Map<String, String>> messages;
        private Double temperature;
        private Integer maxTokens;
        private String model;
    }

    @Data
    public static class GenerateRequest {
        private String prompt;
        private Double temperature;
        private Integer maxTokens;
    }
}
