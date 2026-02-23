package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 工作流模板实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "workflow_template")
public class WorkflowTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 模板名称
     */
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /**
     * 模板描述
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * 模板分类：code-review, testing, documentation, data-analysis, automation
     */
    @Column(name = "category", length = 50)
    private String category;

    /**
     * 模板数据 (JSON 格式，包含节点和连接信息)
     */
    @Column(name = "template_data", nullable = false, columnDefinition = "TEXT")
    private String templateData;

    /**
     * 是否内置模板
     */
    @Column(name = "is_builtin")
    private Boolean isBuiltIn = false;

    /**
     * 图标
     */
    @Column(name = "icon", length = 50)
    private String icon;

    /**
     * 使用次数
     */
    @Column(name = "usage_count")
    private Integer usageCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
