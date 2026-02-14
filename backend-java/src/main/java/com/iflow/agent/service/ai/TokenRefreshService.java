package com.iflow.agent.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Token 刷新服务
 * 提供自动刷新和手动刷新 Token 的功能
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRefreshService {

    private final ApiKeyManager apiKeyManager;
    private final TokenHealthMonitor tokenHealthMonitor;

    /**
     * 手动刷新 Token
     * @param newApiKey 新的 API Key
     * @return 刷新结果
     */
    public Map<String, Object> refreshToken(String newApiKey) {
        log.info("开始刷新 Token...");

        Map<String, Object> result = new HashMap<>();

        try {
            // 1. 验证新 Token
            if (newApiKey == null || newApiKey.trim().isEmpty()) {
                result.put("success", false);
                result.put("message", "新 API Key 不能为空");
                return result;
            }

            String trimmedKey = newApiKey.trim();
            log.info("新 Token 长度: {}, 前8位: {}", trimmedKey.length(),
                    trimmedKey.substring(0, Math.min(8, trimmedKey.length())));

            // 2. 临时更新 API Key
            apiKeyManager.setApiKey(trimmedKey);

            // 3. 等待 iFlow 客户端重新初始化（增加等待时间到 5 秒）
            log.info("等待 iFlow 客户端重新初始化...");
            Thread.sleep(5000);

            // 4. 验证新 Token 是否有效（带重试机制）
            TokenHealthMonitor.TokenStatus status = null;
            int maxRetries = 3;
            int retryDelay = 2000; // 2 秒

            for (int i = 0; i < maxRetries; i++) {
                log.info("第 {} 次验证 Token...", i + 1);
                status = tokenHealthMonitor.manualCheck();
                log.info("验证结果: status={}, valid={}, message={}",
                        status.getStatus(), status.isValid(), status.getMessage());

                if (status.isValid()) {
                    break;
                }

                // 如果不是最后一次重试，等待后重试
                if (i < maxRetries - 1) {
                    log.info("Token 验证失败，{} 秒后重试...", retryDelay / 1000);
                    Thread.sleep(retryDelay);
                }
            }

            if (status != null && status.isValid()) {
                result.put("success", true);
                result.put("message", "Token 刷新成功");
                result.put("tokenStatus", status);
                log.info("Token 刷新成功");
            } else {
                // Token 无效，回滚
                String errorMsg = status != null ? status.getMessage() : "未知错误";
                log.warn("新 Token 无效: {}, 回滚到之前的 Token", errorMsg);
                apiKeyManager.clearDynamicApiKey();

                result.put("success", false);
                result.put("message", "新 Token 无效: " + errorMsg);
                result.put("tokenStatus", status);
            }

        } catch (Exception e) {
            log.error("Token 刷新失败: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("message", "刷新失败: " + e.getMessage());
        }

        return result;
    }

    /**
     * 自动刷新 Token（如果支持）
     * 注意：大多数 Token 需要用户手动获取，此方法仅用于演示
     */
    public Map<String, Object> autoRefreshToken() {
        log.info("尝试自动刷新 Token...");
        
        Map<String, Object> result = new HashMap<>();
        
        // 大多数情况下，Token 需要用户手动从平台获取
        // 这里提供一个提示信息
        result.put("success", false);
        result.put("message", "Token 需要手动获取，请访问 https://platform.iflow.cn/docs/api-key-management 获取新的 API Key");
        result.put("action", "manual_refresh");
        result.put("url", "https://platform.iflow.cn/docs/api-key-management");
        
        return result;
    }

    /**
     * 获取 Token 刷新建议
     */
    public Map<String, Object> getRefreshAdvice() {
        Map<String, Object> advice = new HashMap<>();
        
        TokenHealthMonitor.TokenStatus status = tokenHealthMonitor.getLastStatus();
        
        if (!status.isValid()) {
            advice.put("needsRefresh", true);
            advice.put("reason", status.getMessage());
            advice.put("action", status.getRequiresAction());
            advice.put("url", "https://platform.iflow.cn/docs/api-key-management");
            advice.put("steps", new String[]{
                "1. 访问 iFlow 平台获取新的 API Key",
                "2. 使用新的 API Key 调用刷新接口",
                "3. 系统将自动应用新的 Token"
            });
        } else if (tokenHealthMonitor.needsWarning()) {
            advice.put("needsRefresh", false);
            advice.put("warning", true);
            advice.put("message", "Token 即将过期，建议提前准备新的 API Key");
            advice.put("url", "https://platform.iflow.cn/docs/api-key-management");
        } else {
            advice.put("needsRefresh", false);
            advice.put("message", "Token 状态正常");
        }
        
        return advice;
    }
}