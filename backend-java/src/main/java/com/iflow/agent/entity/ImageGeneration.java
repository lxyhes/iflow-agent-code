package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 图像生成历史实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "image_generation")
public class ImageGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 生成类型：text-to-image, image-to-image, edit, variation
     */
    @Column(name = "generation_type", nullable = false, length = 50)
    private String generationType;

    /**
     * 提示词
     */
    @Column(name = "prompt", columnDefinition = "TEXT")
    private String prompt;

    /**
     * 负向提示词
     */
    @Column(name = "negative_prompt", columnDefinition = "TEXT")
    private String negativePrompt;

    /**
     * 输入图片路径 (图生图时使用)
     */
    @Column(name = "input_image_path", length = 500)
    private String inputImagePath;

    /**
     * 输出图片路径
     */
    @Column(name = "output_image_path", nullable = false, length = 500)
    private String outputImagePath;

    /**
     * 使用的模型
     */
    @Column(name = "model", length = 100)
    private String model;

    /**
     * 配置参数 (JSON 格式)
     */
    @Column(name = "config", columnDefinition = "TEXT")
    private String config;

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
