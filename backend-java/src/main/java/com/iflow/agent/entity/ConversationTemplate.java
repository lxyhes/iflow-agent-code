package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 会话模板实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "conversation_template")
public class ConversationTemplate {

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
     * 模板分类：coding, debugging, review, learning, brainstorming
     */
    @Column(name = "category", length = 50)
    private String category;

    /**
     * 预设消息 (JSON 数组)
     */
    @Column(name = "preset_messages", columnDefinition = "TEXT")
    private String presetMessages;

    /**
     * 预设配置 (JSON 格式)
     */
    @Column(name = "preset_config", columnDefinition = "TEXT")
    private String presetConfig;

    /**
     * 是否内置模板
     */
    @Column(name = "is_builtin")
    private Boolean isBuiltIn = false;

    /**
     * 用户 ID
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * 使用次数
     */
    @Column(name = "usage_count")
    private Integer usageCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
