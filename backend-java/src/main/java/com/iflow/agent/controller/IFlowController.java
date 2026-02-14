package com.iflow.agent.controller;

import com.iflow.agent.config.ModelConfig;
import com.iflow.agent.service.ai.ApiKeyManager;
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
 * AI 工作台 AI 接口控制器
 * 提供基于 AI SDK 的 AI 对话能力
 */
@Slf4j
@RestController
@RequestMapping("/api/iflow")
@RequiredArgsConstructor
public class IFlowController {

    private final IFlowService iFlowService;
    private final ApiKeyManager apiKeyManager;
    private final ModelConfig modelConfig;

    /**
     * 同步查询 - 简单问答
     */
    @PostMapping("/query")
    public ResponseEntity<Map<String, String>> query(@RequestBody QueryRequest request) {
        log.debug("AI 工作台查询请求: {}", request.getMessage());
        String response = iFlowService.querySync(request.getMessage());
        return ResponseEntity.ok(Map.of("response", response));
    }

    /**
     * 流式查询 - SSE 实时返回
     */
    @PostMapping(value = "/query/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> queryStream(@RequestBody QueryRequest request) {
        log.debug("AI 工作台流式查询 request: {}", request.getMessage());
        String model = modelConfig.resolveModel(request.getModel());
        return iFlowService.queryStream(request.getMessage(), model)
                .map(chunk -> "data: " + chunk + "\n\n");
    }

    /**
     * 异步对话
     */
    @PostMapping("/chat")
    public Flux<String> chat(@RequestBody QueryRequest request) {
        log.debug("AI 工作台聊天请求: {}", request.getMessage());
        return iFlowService.queryStream(request.getMessage(), request.getModel());
    }

    /**
     * 健康检查
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean connected = iFlowService.isConnected();
        return ResponseEntity.ok(Map.of(
                "status", connected ? "connected" : "disconnected",
                "service", "AI 工作台",
                "timestamp", System.currentTimeMillis()
        ));
    }

    /**
     * API Key 状态检测
     * 检测 API Token 是否有效、是否过期
     */
    @GetMapping("/api-key-status")
    public ResponseEntity<Map<String, Object>> checkApiKeyStatus() {
        log.info("检测 iFlow API Key 状态");
        
        try {
            boolean connected = iFlowService.isConnected();
            
            if (!connected) {
                return ResponseEntity.ok(Map.of(
                        "valid", false,
                        "status", "disconnected",
                        "message", "iFlow 服务未连接，请确保 iFlow SDK 已启动",
                        "action", "start_iflow"
                ));
            }

            // 尝试发送一个简单的查询来验证 API Key 是否有效
            // 使用同步查询更简单可靠
            String testMessage = "Hello";
            String responseText;
            
            try {
                responseText = iFlowService.querySync(testMessage);
                log.info("API Key 检测响应: {}", responseText);
            } catch (Exception e) {
                log.error("API Key 检测异常: {}", e.getMessage());
                String errorMsg = e.getMessage();
                if (errorMsg != null && (errorMsg.contains("API Token") || errorMsg.contains("过期") || errorMsg.contains("expired"))) {
                    return ResponseEntity.ok(Map.of(
                            "valid", false,
                            "status", "expired",
                            "message", "API Token 已过期，请访问 https://platform.iflow.cn/docs/api-key-management 重置 Token",
                            "action", "renew_token"
                    ));
                }
                return ResponseEntity.ok(Map.of(
                        "valid", false,
                        "status", "error",
                        "message", "检测失败: " + e.getMessage(),
                        "action", "retry"
                ));
            }
            
            // 检查是否返回了错误信息
            if (responseText == null) {
                return ResponseEntity.ok(Map.of(
                        "valid", false,
                        "status", "error",
                        "message", "API 返回空响应，请检查 Token 是否有效",
                        "action", "renew_token"
                ));
            }
            
            // 检查是否包含错误关键词（包括 SDK 返回的错误格式 "Error: xxx"）
            String lowerResponse = responseText.toLowerCase();
            if (responseText.contains("API Token") || responseText.contains("过期") || 
                responseText.contains("expired") || responseText.contains("已过期") ||
                responseText.startsWith("Error:") || 
                lowerResponse.contains("internal error") ||
                lowerResponse.contains("api token")) {
                // 提取更具体的错误信息
                String errorDetail = responseText.startsWith("Error:") 
                    ? responseText.substring(6).trim() 
                    : responseText;
                
                return ResponseEntity.ok(Map.of(
                        "valid", false,
                        "status", "expired",
                        "message", "API Token 已过期或无效: " + errorDetail + "。请访问 https://platform.iflow.cn/docs/api-key-management 重置 Token",
                        "action", "renew_token"
                ));
            }

            // 如果返回内容为空或很短，可能也是问题
            if (responseText.trim().isEmpty() || responseText.length() < 3) {
                return ResponseEntity.ok(Map.of(
                        "valid", false,
                        "status", "error",
                        "message", "API 响应异常，请检查 Token 是否有效",
                        "action", "renew_token"
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "status", "connected",
                    "message", "API Key 状态正常",
                    "action", "none"
            ));
            
        } catch (Exception e) {
            log.error("API Key 检测异常: {}", e.getMessage());
            String errorMessage = e.getMessage();
            if (errorMessage != null && (errorMessage.contains("API Token") || errorMessage.contains("过期") || errorMessage.contains("expired"))) {
                return ResponseEntity.ok(Map.of(
                        "valid", false,
                        "status", "expired",
                        "message", "API Token 已过期，请访问 https://platform.iflow.cn/docs/api-key-management 重置 Token",
                        "action", "renew_token"
                ));
            }
            
            return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "status", "error",
                    "message", "检测失败: " + e.getMessage(),
                    "action", "retry"
            ));
        }
    }

    /**
     * 获取当前 API Key 状态
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
     * 动态更新 API Key
     * 更新后立即生效，无需重启服务
     */
    @PostMapping("/api-key")
    public ResponseEntity<Map<String, Object>> updateApiKey(@RequestBody ApiKeyUpdateRequest request) {
        String apiKey = request.getApiKey();
        log.info("更新 API Key, key starts with: {}...", apiKey.substring(0, Math.min(8, apiKey.length())));

        if (apiKey == null || apiKey.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "API Key 不能为空"
            ));
        }

        try {
            apiKeyManager.setApiKey(apiKey.trim());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "API Key 更新成功，已立即生效"
            ));
        } catch (Exception e) {
            log.error("更新 API Key 失败: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "更新失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 清除动态设置的 API Key
     */
    @DeleteMapping("/api-key")
    public ResponseEntity<Map<String, Object>> clearApiKey() {
        log.info("清除动态 API Key");
        apiKeyManager.clearDynamicApiKey();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "动态 API Key 已清除，将使用环境变量或配置文件中的 Key"
        ));
    }

    @Data
    public static class ApiKeyUpdateRequest {
        private String apiKey;
    }

    @Data
    public static class QueryRequest {
        private String message;
        private String model;
    }
}
