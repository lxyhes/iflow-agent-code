package com.iflow.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = {
    com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeChatAutoConfiguration.class,
    com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeEmbeddingAutoConfiguration.class,
    com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeAgentAutoConfiguration.class
})
@EnableAsync
public class AgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
