package com.iflow.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {
    com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeChatAutoConfiguration.class,
    com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeEmbeddingAutoConfiguration.class,
    com.alibaba.cloud.ai.autoconfigure.dashscope.DashScopeAgentAutoConfiguration.class
})
@EnableJpaRepositories(basePackages = {
    "com.iflow.agent.repository",
    "com.iflow.agent.domain.workflow.repository",
    "com.iflow.agent.domain.database.repository",
    "com.iflow.agent.domain.document.repository",
    "com.iflow.agent.domain.interview.repository",
    "com.iflow.agent.domain.resume.repository"
})
@EnableAsync
@EnableScheduling  // 启用定时任务支持
public class AgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
