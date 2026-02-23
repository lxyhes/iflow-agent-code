package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 工作流执行历史实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "workflow_execution")
public class WorkflowExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 工作流 ID
     */
    @Column(name = "workflow_id", nullable = false)
    private Long workflowId;

    /**
     * 执行状态：pending, running, completed, failed, cancelled
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    /**
     * 输入数据 (JSON 格式)
     */
    @Column(name = "input_data", columnDefinition = "TEXT")
    private String inputData;

    /**
     * 输出数据 (JSON 格式)
     */
    @Column(name = "output_data", columnDefinition = "TEXT")
    private String outputData;

    /**
     * 错误消息
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * 执行日志 (JSON 数组)
     */
    @Column(name = "execution_log", columnDefinition = "TEXT")
    private String executionLog;

    /**
     * 用户 ID
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * 项目 ID
     */
    @Column(name = "project_id")
    private Long projectId;

    /**
     * 开始时间
     */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /**
     * 完成时间
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
