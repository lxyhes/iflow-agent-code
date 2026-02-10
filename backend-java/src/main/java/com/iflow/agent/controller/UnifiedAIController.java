package com.iflow.agent.controller;

import com.iflow.agent.service.ai.UnifiedAIService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * 统一 AI API Controller
 * 提供所有 AI 相关接口，包括模型、人格、模式等配置信息
 * 所有 AI 调用都通过 UnifiedAIService
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class UnifiedAIController {

    private final UnifiedAIService unifiedAIService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 提交反馈 - 让 AI 从反馈中学习
     */
    @PostMapping("/learning/feedback")
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @RequestBody Map<String, Object> request) {
        String conversationId = (String) request.get("conversationId");
        Integer rating = (Integer) request.get("rating");
        String feedback = (String) request.get("feedback");

        log.info("Submitting learning feedback: id={}, rating={}", conversationId, rating);

        try {
            UnifiedAIService.LearningResult result =
                    unifiedAIService.submitFeedback(conversationId, rating, feedback)
                            .block(Duration.ofSeconds(10));

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "learningResult", Map.of(
                            "level", result.level,
                            "message", result.message
                    ),
                    "stats", result.stats
            ));
        } catch (Exception e) {
            log.error("Failed to submit feedback", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取学习状态
     */
    @GetMapping("/learning/status")
    public ResponseEntity<Map<String, Object>> getLearningStatus() {
        try {
            Map<String, Object> status = unifiedAIService.getLearningStatus()
                    .block(Duration.ofSeconds(5));

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", status
            ));
        } catch (Exception e) {
            log.error("Failed to get learning status", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 手动触发进化
     */
    @PostMapping("/learning/evolve")
    public ResponseEntity<Map<String, Object>> triggerEvolution() {
        log.info("Manual evolution triggered");

        try {
            unifiedAIService.autoEvolve();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "进化完成"
            ));
        } catch (Exception e) {
            log.error("Evolution failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 健康检查 - 检查 AI 服务是否可用
     * 使用 IFlowService.isConnected() 实现
     * 
     * @return 服务状态
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> status = unifiedAIService.healthCheck()
                    .block(Duration.ofSeconds(5));

            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("Health check failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "status", "unhealthy",
                    "available", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * 获取支持的模型列表
     * 
     * @return 模型列表
     */
    @GetMapping("/models")
    public Object getSupportedModels() {
        log.info("Get supported models");
        return unifiedAIService.getSupportedModels();
    }

    /**
     * 获取支持的人格类型
     * 
     * @return 人格列表
     */
    @GetMapping("/personas")
    public Object getSupportedPersonas() {
        log.info("Get supported personas");
        return unifiedAIService.getSupportedPersonas();
    }

    /**
     * 获取支持的模式
     * 
     * @return 模式列表
     */
    @GetMapping("/modes")
    public Object getSupportedModes() {
        log.info("Get supported modes");
        return unifiedAIService.getSupportedModes();
    }
}