package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 文件批量处理任务实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "file_batch_task")
public class FileBatchTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 任务类型：rename, classify, merge, split, convert
     */
    @Column(name = "task_type", nullable = false, length = 50)
    private String taskType;

    /**
     * 源文件路径列表 (JSON 数组)
     */
    @Column(name = "source_paths", nullable = false, columnDefinition = "TEXT")
    private String sourcePaths;

    /**
     * 目标路径
     */
    @Column(name = "target_path", length = 500)
    private String targetPath;

    /**
     * 任务配置 (JSON 格式)
     */
    @Column(name = "config", columnDefinition = "TEXT")
    private String config;

    /**
     * 任务状态：pending, running, completed, failed
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    /**
     * 处理结果 (JSON 格式)
     */
    @Column(name = "result", columnDefinition = "TEXT")
    private String result;

    /**
     * 错误消息
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * 用户 ID
     */
    @Column(name = "user_id")
    private Long userId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
