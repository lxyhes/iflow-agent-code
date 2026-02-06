package com.iflow.agent.config;

import cn.iflow.sdk.core.IFlowClient;
import cn.iflow.sdk.types.config.IFlowOptions;
import cn.iflow.sdk.types.enums.PermissionMode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * iFlow SDK 配置类
 * 自动管理 iFlow 进程，无需手动配置
 */
@Slf4j
@Configuration
public class IFlowConfig {

    @Value("${iflow.sdk.url:ws://localhost:8090/acp}")
    private String url;

    @Value("${iflow.sdk.auto-start:true}")
    private boolean autoStart;

    @Value("${iflow.sdk.timeout-seconds:30}")
    private int timeoutSeconds;

    @Value("${iflow.sdk.permission-mode:AUTO}")
    private String permissionMode;

    /**
     * 配置 iFlow 客户端选项
     */
    @Bean
    public IFlowOptions iFlowOptions() {
        PermissionMode mode = PermissionMode.valueOf(permissionMode.toUpperCase());

        return IFlowOptions.builder()
                .url(url)
                .autoStartProcess(autoStart)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .permissionMode(mode)
                .build();
    }

    /**
     * 创建 iFlow 客户端
     * 注意：客户端需要手动管理生命周期（connect 和 close）
     */
    @Bean
    public IFlowClient iFlowClient(IFlowOptions options) {
        log.info("Creating iFlow client with URL: {}, auto-start: {}", url, autoStart);
        return IFlowClient.create(options);
    }
}
