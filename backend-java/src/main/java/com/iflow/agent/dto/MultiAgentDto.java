package com.iflow.agent.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 多 Agent 任务相关 DTO
 */
public class MultiAgentDto {

    /**
     * 任务列表响应
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskListResponse {
        private List<TaskInfo> tasks;
        private int total;
    }

    /**
     * 任务信息
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskInfo {
        private Long id;
        private String taskDescription;
        private List<String> assignedAgents;
        private String executionMode;
        private String status;
        private TaskResult results;
        private String errorMessage;
        private Long createdAt;
        private Long completedAt;
        private Long startedAt;
    }

    /**
     * 创建任务请求
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTaskRequest {
        @NotBlank(message = "任务描述不能为空")
        private String taskDescription;

        @NotNull(message = "必须指定至少一个 Agent")
        private List<Long> agentIds;

        private String executionMode = "parallel"; // parallel, sequential, collaborative

        private Long userId;

        private Long projectId;
    }

    /**
     * 任务执行请求
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExecuteTaskRequest {
        @NotBlank(message = "任务描述不能为空")
        private String taskDescription;

        @NotNull(message = "必须指定至少一个 Agent")
        private List<Long> agentIds;

        private String executionMode = "parallel";

        private String prompt;

        private String context;
    }

    /**
     * 任务结果
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskResult {
        private List<AgentExecutionResult> agentResults;
        private String aggregatedResult;
        private String comparison;
        private List<String> recommendations;
    }

    /**
     * Agent 执行结果
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentExecutionResult {
        private Long agentId;
        private String agentName;
        private String result;
        private String error;
        private Long executionTime;
        private Integer tokenUsage;
    }

    /**
     * 任务状态响应
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStatusResponse {
        private Long id;
        private String status;
        private Integer progress;
        private TaskResult results;
        private String errorMessage;
        private Long createdAt;
        private Long completedAt;
        private Long startedAt;
    }
}
