package com.iflow.agent.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

/**
 * AgentScope 配置类
 * 面试官智能体现在使用 AI 工作台 LLM 服务，不再需要 AgentScope 的 DashScope 配置
 */
@Slf4j
@Configuration
public class AgentScopeConfig {

    public AgentScopeConfig() {
        log.info("AgentScope config initialized - Using AI 工作台 LLM service for interview agents");
    }
}
