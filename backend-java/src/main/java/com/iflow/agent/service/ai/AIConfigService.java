package com.iflow.agent.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * AI 配置服务
 * 管理 AI 服务提供商的切换和配置
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AIConfigService {

    private final IFlowService iFlowService;
    private final TongyiQianwenService tongyiQianwenService;

    @Value("${llm.provider:iflow}")
    private String defaultProvider;

    // 当前使用的 AI 提供商
    private final AtomicReference<String> currentProvider = new AtomicReference<>("iflow");

    // 使用统计
    private final Map<String, AtomicLong> usageStats = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> tokenStats = new ConcurrentHashMap<>();

    // 提供商配置
    private final Map<String, Map<String, Object>> providerConfigs = new ConcurrentHashMap<>();

    /**
     * 获取当前 AI 配置
     */
    public Map<String, Object> getCurrentConfig() {
        String provider = currentProvider.get();
        
        Map<String, Object> config = new HashMap<>();
        config.put("provider", provider);
        config.put("name", getProviderName(provider));
        config.put("description", getProviderDescription(provider));
        config.put("available", isProviderAvailable(provider));
        config.put("config", providerConfigs.getOrDefault(provider, Map.of()));
        
        return config;
    }

    /**
     * 获取当前提供商
     */
    public String getCurrentProvider() {
        return currentProvider.get();
    }

    /**
     * 获取可用的 AI 提供商列表
     */
    public List<Map<String, Object>> getAvailableProviders() {
        List<Map<String, Object>> providers = new ArrayList<>();
        
        // iFlow
        providers.add(Map.of(
                "id", "iflow",
                "name", "iFlow",
                "description", "iFlow SDK - 本地大模型服务",
                "available", iFlowService.isConnected(),
                "is_default", "iflow".equals(currentProvider.get()),
                "features", List.of("chat", "stream", "sync")
        ));
        
        // DashScope (Spring AI)
        providers.add(Map.of(
                "id", "dashscope",
                "name", "阿里云 DashScope",
                "description", "阿里云大模型服务 - 通义千问",
                "available", isDashScopeAvailable(),
                "is_default", "dashscope".equals(currentProvider.get()),
                "features", List.of("chat", "stream", "embedding")
        ));
        
        // OpenAI (预留)
        providers.add(Map.of(
                "id", "openai",
                "name", "OpenAI",
                "description", "OpenAI GPT 模型",
                "available", false,
                "is_default", "openai".equals(currentProvider.get()),
                "features", List.of("chat", "stream", "embedding")
        ));
        
        return providers;
    }

    /**
     * 切换 AI 提供商
     */
    public boolean switchProvider(String provider) {
        log.info("切换 AI 提供商: {} -> {}", currentProvider.get(), provider);
        
        if (!isValidProvider(provider)) {
            log.error("无效的 AI 提供商: {}", provider);
            return false;
        }
        
        if (!isProviderAvailable(provider)) {
            log.error("AI 提供商不可用: {}", provider);
            return false;
        }
        
        currentProvider.set(provider);
        log.info("已切换到 AI 提供商: {}", provider);
        
        return true;
    }

    /**
     * 更新 AI 配置
     */
    public boolean updateConfig(String provider, Map<String, Object> config) {
        log.info("更新 AI 配置: {}", provider);
        
        if (!isValidProvider(provider)) {
            return false;
        }
        
        providerConfigs.put(provider, new HashMap<>(config));
        
        // 如果更新的是当前使用的提供商，可能需要重新初始化
        if (provider.equals(currentProvider.get())) {
            log.info("当前使用的提供商配置已更新，可能需要重启服务生效");
        }
        
        return true;
    }

    /**
     * 测试 AI 连接
     */
    public Map<String, Object> testConnection(String provider) {
        log.info("测试 AI 连接: {}", provider);
        
        long startTime = System.currentTimeMillis();
        
        try {
            String result;
            switch (provider) {
                case "iflow" -> {
                    if (iFlowService.isConnected()) {
                        result = iFlowService.querySync("Hello");
                    } else {
                        return Map.of(
                                "success", false,
                                "message", "iFlow 未连接",
                                "latency_ms", System.currentTimeMillis() - startTime
                        );
                    }
                }
                case "dashscope" -> {
                    result = tongyiQianwenService.generate("Hello");
                }
                default -> {
                    return Map.of(
                            "success", false,
                            "message", "未知的提供商: " + provider,
                            "latency_ms", 0
                    );
                }
            }
            
            long latency = System.currentTimeMillis() - startTime;
            
            boolean success = result != null && !result.isEmpty() && !result.startsWith("Error");
            
            return Map.of(
                    "success", success,
                    "message", success ? "连接成功" : "连接失败: " + result,
                    "latency_ms", latency,
                    "response_preview", success ? result.substring(0, Math.min(50, result.length())) : ""
            );
            
        } catch (Exception e) {
            log.error("测试 AI 连接失败", e);
            return Map.of(
                    "success", false,
                    "message", "连接异常: " + e.getMessage(),
                    "latency_ms", System.currentTimeMillis() - startTime
            );
        }
    }

    /**
     * 获取 AI 使用统计
     */
    public Map<String, Object> getUsageStats() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("current_provider", currentProvider.get());
        
        Map<String, Long> usage = new HashMap<>();
        usageStats.forEach((k, v) -> usage.put(k, v.get()));
        stats.put("usage_count", usage);
        
        Map<String, Long> tokens = new HashMap<>();
        tokenStats.forEach((k, v) -> tokens.put(k, v.get()));
        stats.put("token_count", tokens);
        
        return stats;
    }

    /**
     * 重置为默认配置
     */
    public boolean resetToDefault() {
        log.info("重置 AI 配置为默认值: {}", defaultProvider);
        return switchProvider(defaultProvider);
    }

    /**
     * 记录使用统计
     */
    public void recordUsage(String provider, long tokens) {
        usageStats.computeIfAbsent(provider, k -> new AtomicLong(0)).incrementAndGet();
        if (tokens > 0) {
            tokenStats.computeIfAbsent(provider, k -> new AtomicLong(0)).addAndGet(tokens);
        }
    }

    // ========== 私有方法 ==========

    private boolean isValidProvider(String provider) {
        return List.of("iflow", "dashscope", "openai").contains(provider);
    }

    private boolean isProviderAvailable(String provider) {
        return switch (provider) {
            case "iflow" -> iFlowService.isConnected();
            case "dashscope" -> isDashScopeAvailable();
            case "openai" -> false; // 预留
            default -> false;
        };
    }

    private boolean isDashScopeAvailable() {
        try {
            // 尝试调用一次来验证
            String result = tongyiQianwenService.generate("test");
            return result != null && !result.startsWith("Error");
        } catch (Exception e) {
            return false;
        }
    }

    private String getProviderName(String provider) {
        return switch (provider) {
            case "iflow" -> "iFlow";
            case "dashscope" -> "阿里云 DashScope";
            case "openai" -> "OpenAI";
            default -> "Unknown";
        };
    }

    private String getProviderDescription(String provider) {
        return switch (provider) {
            case "iflow" -> "iFlow SDK - 本地大模型服务";
            case "dashscope" -> "阿里云大模型服务 - 通义千问";
            case "openai" -> "OpenAI GPT 模型";
            default -> "Unknown";
        };
    }
}
