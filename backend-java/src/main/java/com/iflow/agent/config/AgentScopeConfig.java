package com.iflow.agent.config;

import io.agentscope.core.model.DashScopeChatModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AgentScope 配置类
 * 只有在配置了 API key 时才启用
 */
@Slf4j
@Configuration
public class AgentScopeConfig {

    @Value("${agentscope.dashscope.api-key:}")
    private String apiKey;

    @Value("${agentscope.dashscope.model:qwen-turbo}")
    private String model;

    /**
     * 创建 AgentScope 的 DashScopeChatModel
     * 仅在配置了有效的 API key 时创建（长度大于10）
     */
    @Bean
    @ConditionalOnExpression("'${agentscope.dashscope.api-key:}'.length() > 10")
    public DashScopeChatModel agentScopeDashScopeChatModel() {
        log.info("Creating AgentScope DashScopeChatModel with model: {}", model);
        
        return DashScopeChatModel.builder()
                .apiKey(apiKey)
                .modelName(model)
                .build();
    }
}
