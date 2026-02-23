package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 图像处理任务实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "image_task")
public class ImageTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 任务类型：recognize, ocr, edit, ui-to-code
     */
    @Column(name = "task_type", nullable = false, length = 50)
    private String taskType;

    /**
     * 输入图片路径
     */
    @Column(name = "input_image_path", nullable = false, length = 500)
    private String inputImagePath;

    /**
     * 输出结果 (JSON 格式)
     */
    @Column(name = "output_result", columnDefinition = "TEXT")
    private String outputResult;

    /**
     * 状态：pending, processing, completed, failed
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

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
}
