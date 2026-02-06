package com.iflow.agent.controller;

import com.iflow.agent.service.ai.AIConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 配置管理 API
 * 用于切换和管理 AI 服务提供商
 */
@Slf4j
@RestController
@RequestMapping("/api/ai-config")
@RequiredArgsConstructor
public class AIConfigController {

    private final AIConfigService aiConfigService;

    /**
     * 获取当前 AI 配置
     */
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentConfig() {
        log.info("获取当前 AI 配置");
        
        Map<String, Object> config = aiConfigService.getCurrentConfig();
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "config", config
        ));
    }

    /**
     * 获取可用的 AI 提供商列表
     */
    @GetMapping("/providers")
    public ResponseEntity<Map<String, Object>> getAvailableProviders() {
        log.info("获取可用的 AI 提供商列表");
        
        List<Map<String, Object>> providers = aiConfigService.getAvailableProviders();
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "providers", providers
        ));
    }

    /**
     * 切换 AI 提供商
     */
    @PostMapping("/switch")
    public ResponseEntity<Map<String, Object>> switchProvider(@RequestBody SwitchProviderRequest request) {
        log.info("切换 AI 提供商到: {}", request.getProvider());
        
        boolean success = aiConfigService.switchProvider(request.getProvider());
        
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "已切换到 " + request.getProvider() : "切换失败",
                "current_provider", aiConfigService.getCurrentProvider()
        ));
    }

    /**
     * 更新 AI 配置
     */
    @PutMapping("/update")
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody UpdateConfigRequest request) {
        log.info("更新 AI 配置");
        
        Map<String, Object> config = Map.of(
                "apiKey", request.getApiKey(),
                "baseUrl", request.getBaseUrl(),
                "model", request.getModel(),
                "temperature", request.getTemperature()
        );
        
        boolean success = aiConfigService.updateConfig(request.getProvider(), config);
        
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "配置已更新" : "更新失败"
        ));
    }

    /**
     * 测试 AI 连接
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testConnection(@RequestBody TestConnectionRequest request) {
        log.info("测试 AI 连接: {}", request.getProvider());
        
        Map<String, Object> result = aiConfigService.testConnection(request.getProvider());
        
        return ResponseEntity.ok(Map.of(
                "success", result.get("success"),
                "message", result.get("message"),
                "latency_ms", result.getOrDefault("latency_ms", 0)
        ));
    }

    /**
     * 获取 AI 使用统计
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getUsageStats() {
        log.info("获取 AI 使用统计");
        
        Map<String, Object> stats = aiConfigService.getUsageStats();
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "stats", stats
        ));
    }

    /**
     * 重置 AI 配置为默认值
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetConfig() {
        log.info("重置 AI 配置为默认值");
        
        boolean success = aiConfigService.resetToDefault();
        
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "配置已重置为默认值 (iFlow)" : "重置失败",
                "current_provider", aiConfigService.getCurrentProvider()
        ));
    }

    // ========== 请求类 ==========

    @lombok.Data
    public static class SwitchProviderRequest {
        private String provider; // iflow, dashscope, openai
    }

    @lombok.Data
    public static class UpdateConfigRequest {
        private String provider;
        private String apiKey;
        private String baseUrl;
        private String model;
        private Double temperature;
    }

    @lombok.Data
    public static class TestConnectionRequest {
        private String provider;
    }
}
