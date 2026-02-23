package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 文档生成历史实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "document_generation_history")
public class DocumentGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 文档类型：ppt, word, pdf, excel
     */
    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    /**
     * 源内容 (Markdown/文本)
     */
    @Column(name = "source_content", columnDefinition = "TEXT")
    private String sourceContent;

    /**
     * 输出文件路径
     */
    @Column(name = "output_path", nullable = false, length = 500)
    private String outputPath;

    /**
     * 使用的模板
     */
    @Column(name = "template", length = 100)
    private String template;

    /**
     * 任务状态：pending, processing, completed, failed
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

    /**
     * 项目 ID
     */
    @Column(name = "project_id")
    private Long projectId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
