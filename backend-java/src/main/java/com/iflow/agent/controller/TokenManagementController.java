package com.iflow.agent.controller;

import com.iflow.agent.service.ai.ApiKeyManager;
import com.iflow.agent.service.ai.TokenHealthMonitor;
import com.iflow.agent.service.ai.TokenRefreshService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Token 管理控制器
 * 提供 Token 状态检测、刷新和管理功能
 */
@Slf4j
@RestController
@RequestMapping("/api/token")
@RequiredArgsConstructor
public class TokenManagementController {

    private final TokenHealthMonitor tokenHealthMonitor;
    private final TokenRefreshService tokenRefreshService;
    private final ApiKeyManager apiKeyManager;

    /**
     * 获取 Token 状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getTokenStatus() {
        log.info("获取 Token 状态");
        TokenHealthMonitor.TokenStatus status = tokenHealthMonitor.getLastStatus();
        return ResponseEntity.ok(Map.of(
                "status", status.getStatus(),
                "valid", status.isValid(),
                "message", status.getMessage(),
                "requiresAction", status.getRequiresAction(),
                "lastCheckTime", status.getLastCheckTime()
        ));
    }

    /**
     * 手动检测 Token 状态
     */
    @PostMapping("/check")
    public ResponseEntity<Map<String, Object>> checkToken() {
        log.info("手动检测 Token 状态");
        TokenHealthMonitor.TokenStatus status = tokenHealthMonitor.manualCheck();
        return ResponseEntity.ok(Map.of(
                "status", status.getStatus(),
                "valid", status.isValid(),
                "message", status.getMessage(),
                "requiresAction", status.getRequiresAction(),
                "lastCheckTime", status.getLastCheckTime()
        ));
    }

    /**
     * 刷新 Token
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestBody RefreshTokenRequest request) {
        String newApiKey = request.getApiKey();
        log.info("刷新 Token, key starts with: {}...", 
                newApiKey != null ? newApiKey.substring(0, Math.min(8, newApiKey.length())) : "null");

        Map<String, Object> result = tokenRefreshService.refreshToken(newApiKey);
        return ResponseEntity.ok(result);
    }

    /**
     * 获取刷新建议
     */
    @GetMapping("/refresh-advice")
    public ResponseEntity<Map<String, Object>> getRefreshAdvice() {
        log.info("获取 Token 刷新建议");
        Map<String, Object> advice = tokenRefreshService.getRefreshAdvice();
        return ResponseEntity.ok(advice);
    }

    /**
     * 获取 API Key 信息（脱敏）
     */
    @GetMapping("/api-key-info")
    public ResponseEntity<Map<String, Object>> getApiKeyInfo() {
        log.info("获取 API Key 信息");
        ApiKeyManager.ApiKeyStatus status = apiKeyManager.getStatus();
        return ResponseEntity.ok(Map.of(
                "configured", status.isConfigured(),
                "maskedKey", status.getMaskedKey(),
                "source", status.getSource()
        ));
    }

    /**
     * 检查是否需要警告
     */
    @GetMapping("/warning")
    public ResponseEntity<Map<String, Object>> getWarningStatus() {
        log.info("检查 Token 警告状态");
        boolean needsWarning = tokenHealthMonitor.needsWarning();
        TokenHealthMonitor.TokenStatus status = tokenHealthMonitor.getLastStatus();
        
        return ResponseEntity.ok(Map.of(
                "needsWarning", needsWarning,
                "status", status.getStatus(),
                "message", needsWarning ? "Token 即将过期，建议提前准备新的 API Key" : "Token 状态正常"
        ));
    }

    /**
     * 获取 Token 管理概览
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        log.info("获取 Token 管理概览");
        
        TokenHealthMonitor.TokenStatus status = tokenHealthMonitor.getLastStatus();
        ApiKeyManager.ApiKeyStatus apiKeyStatus = apiKeyManager.getStatus();
        boolean needsWarning = tokenHealthMonitor.needsWarning();
        Map<String, Object> advice = tokenRefreshService.getRefreshAdvice();
        
        return ResponseEntity.ok(Map.of(
                "tokenStatus", Map.of(
                        "status", status.getStatus(),
                        "valid", status.isValid(),
                        "message", status.getMessage(),
                        "lastCheckTime", status.getLastCheckTime()
                ),
                "apiKeyInfo", Map.of(
                        "configured", apiKeyStatus.isConfigured(),
                        "maskedKey", apiKeyStatus.getMaskedKey(),
                        "source", apiKeyStatus.getSource()
                ),
                "warning", Map.of(
                        "needsWarning", needsWarning,
                        "message", needsWarning ? "Token 即将过期" : "Token 状态正常"
                ),
                "advice", advice
        ));
    }

    @Data
    public static class RefreshTokenRequest {
        private String apiKey;
    }
}