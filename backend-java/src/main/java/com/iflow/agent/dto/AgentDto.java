package com.iflow.agent.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Agent 相关 DTO
 */
public class AgentDto {

    /**
     * Agent 列表响应
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentListResponse {
        private List<AgentInfo> agents;
        private int total;
    }

    /**
     * Agent 信息
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentInfo {
        private Long id;
        private String name;
        private String type;
        private String cliPath;
        private String version;
        private String status;
        private List<String> capabilities;
        private Long lastHealthCheck;
        private String healthMessage;
        private Long createdAt;
    }

    /**
     * 注册 Agent 请求
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterAgentRequest {
        @NotBlank(message = "Agent 名称不能为空")
        private String name;

        @NotBlank(message = "Agent 类型不能为空")
        private String type;

        private String cliPath;

        private String version;

        private AgentConfig config;
    }

    /**
     * 更新 Agent 请求
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateAgentRequest {
        private String name;
        private String cliPath;
        private String version;
        private AgentConfig config;
    }

    /**
     * Agent 配置
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentConfig {
        private List<String> models;
        private Double temperature;
        private Integer maxTokens;
        private String apiKey;
        private String baseUrl;
        private List<String> tools;
    }

    /**
     * Agent 健康状态
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HealthStatus {
        private boolean healthy;
        private String message;
        private Long responseTime;
        private String version;
    }

    /**
     * 发现结果
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscoveryResult {
        private List<DiscoveredAgent> agents;
        private int found;
        private int registered;
    }

    /**
     * 已发现的 Agent
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscoveredAgent {
        private String type;
        private String cliPath;
        private String version;
        private boolean isRegistered;
        private Long registeredId;
    }
}
