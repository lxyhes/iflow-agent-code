package com.iflow.agent.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.concurrent.atomic.AtomicReference;

/**
 * API Key 管理器
 * 支持动态更新 API Key，无需重启服务
 * 支持持久化 Token，重启后自动加载
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiKeyManager {

    @Value("${IFLOW_API_KEY:}")
    private String envApiKey;

    @Value("${llm.api-key:}")
    private String configApiKey;

    private final AtomicReference<String> dynamicApiKey = new AtomicReference<>();
    private final ApplicationEventPublisher eventPublisher;
    private final TokenPersistenceService tokenPersistenceService;

    @PostConstruct
    public void init() {
        // 启动时自动加载持久化的 Token
        String persistedToken = tokenPersistenceService.loadToken();
        if (persistedToken != null && !persistedToken.isEmpty()) {
            log.info("Loading persisted API Key from file...");
            dynamicApiKey.set(persistedToken);
            log.info("Persisted API Key loaded successfully");
        }
    }

    /**
     * 获取当前有效的 API Key
     * 优先级：动态设置 > 环境变量 > 配置文件
     */
    public String getApiKey() {
        // 1. 优先使用动态设置的 Key
        String dynamic = dynamicApiKey.get();
        if (dynamic != null && !dynamic.isEmpty()) {
            return dynamic;
        }

        // 2. 其次使用环境变量
        String env = System.getenv("IFLOW_API_KEY");
        if (env != null && !env.isEmpty()) {
            return env;
        }

        // 3. 最后使用配置文件
        if (envApiKey != null && !envApiKey.isEmpty()) {
            return envApiKey;
        }

        if (configApiKey != null && !configApiKey.isEmpty()) {
            return configApiKey;
        }

        return "";
    }

    /**
     * 动态设置 API Key
     * 设置后会立即生效，无需重启服务
     * 同时保存到持久化文件，重启后自动加载
     */
    public void setApiKey(String apiKey) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Attempted to set empty API Key");
            return;
        }
        String trimmed = apiKey.trim();
        String oldKey = dynamicApiKey.get();
        dynamicApiKey.set(trimmed);

        // 保存到持久化文件
        tokenPersistenceService.saveToken(trimmed);

        log.info("API Key updated dynamically and persisted. New key starts with: {}...",
                trimmed.substring(0, Math.min(8, trimmed.length())));

        // 如果 API Key 发生变化，发布事件通知重新初始化 iFlow 客户端
        if (oldKey == null || !oldKey.equals(trimmed)) {
            log.info("API Key changed, publishing reinitialize event...");
            eventPublisher.publishEvent(new ApiKeyChangedEvent(this, trimmed));
        }
    }

    /**
     * API Key 变更事件
     */
    public static class ApiKeyChangedEvent extends org.springframework.context.ApplicationEvent {
        private final String apiKey;

        public ApiKeyChangedEvent(Object source, String apiKey) {
            super(source);
            this.apiKey = apiKey;
        }

        public String getApiKey() {
            return apiKey;
        }
    }

    /**
     * 清除动态设置的 API Key
     * 清除后会回退到环境变量或配置文件中的 Key
     * 同时删除持久化文件
     */
    public void clearDynamicApiKey() {
        dynamicApiKey.set(null);
        tokenPersistenceService.deleteToken();
        log.info("Dynamic API Key cleared and persisted file deleted, will use env/config key");
    }

    /**
     * 检查 API Key 是否已配置
     */
    public boolean isApiKeyConfigured() {
        String key = getApiKey();
        return key != null && !key.isEmpty();
    }

    /**
     * 获取 API Key 状态信息（隐藏真实 Key）
     */
    public ApiKeyStatus getStatus() {
        String key = getApiKey();
        boolean configured = key != null && !key.isEmpty();
        
        String maskedKey = "";
        if (configured) {
            int len = key.length();
            if (len > 12) {
                maskedKey = key.substring(0, 8) + "..." + key.substring(len - 4);
            } else if (len > 4) {
                maskedKey = key.substring(0, 2) + "..." + key.substring(len - 2);
            } else {
                maskedKey = "***";
            }
        }

        return ApiKeyStatus.builder()
                .configured(configured)
                .maskedKey(maskedKey)
                .source(dynamicApiKey.get() != null ? "dynamic" : 
                        System.getenv("IFLOW_API_KEY") != null ? "environment" : "config")
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class ApiKeyStatus {
        private boolean configured;
        private String maskedKey;
        private String source;
    }
}
