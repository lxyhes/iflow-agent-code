package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 多 Agent 任务实体类
 * 用于追踪多 Agent 协作任务的执行
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "multi_agent_task")
public class MultiAgentTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 任务描述
     */
    @Column(name = "task_description", nullable = false, columnDefinition = "TEXT")
    private String taskDescription;

    /**
     * 分配的 Agent ID 列表 (JSON 数组)
     */
    @Column(name = "assigned_agents", nullable = false, columnDefinition = "TEXT")
    private String assignedAgents;

    /**
     * 执行模式：parallel, sequential, collaborative
     */
    @Column(name = "execution_mode", nullable = false, length = 20)
    private String executionMode;

    /**
     * 任务状态：pending, running, completed, failed, cancelled
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    /**
     * 执行结果 (JSON 格式)
     */
    @Column(name = "results", columnDefinition = "TEXT")
    private String results;

    /**
     * 错误消息
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * 用户 ID (可选，用于多用户场景)
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * 项目 ID (可选，关联到具体项目)
     */
    @Column(name = "project_id")
    private Long projectId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;
}
