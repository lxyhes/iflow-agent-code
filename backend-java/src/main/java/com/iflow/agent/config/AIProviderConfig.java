package com.iflow.agent.config;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;

/**
 * AI 服务提供商配置
 * 支持 iFlow SDK 和 AgentScope 两种方案
 */
@Slf4j
@Configuration
@Getter
@Setter
public class AIProviderConfig {

    @Value("${iflow.enabled:true}")
    private boolean iflowEnabled;

    @Value("${iflow.url:ws://localhost:8090/acp}")
    private String iflowUrl;

    @Value("${agentscope.enabled:true}")
    private boolean agentscopeEnabled;

    @Value("${agentscope.dashscope.api-key:}")
    private String agentscopeApiKey;

    @Value("${agentscope.dashscope.model:qwen-turbo}")
    private String agentscopeModel;

    @PostConstruct
    public void init() {
        log.info("AI Provider Config:");
        log.info("  iFlow enabled: {}", iflowEnabled);
        log.info("  iFlow URL: {}", iflowUrl);
        log.info("  AgentScope enabled: {}", agentscopeEnabled);
        log.info("  AgentScope API Key configured: {}", agentscopeApiKey != null && !agentscopeApiKey.isEmpty());
    }

    /**
     * 检查 AgentScope 是否可用（有 API key）
     */
    public boolean isAgentScopeAvailable() {
        return agentscopeEnabled && agentscopeApiKey != null && !agentscopeApiKey.isEmpty();
    }
}
