package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 会话消息实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "conversation_message")
public class ConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 会话 ID
     */
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /**
     * 消息角色：user, assistant, system
     */
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    /**
     * 消息内容
     */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Token 使用量
     */
    @Column(name = "token_usage")
    private Long tokenUsage = 0L;

    /**
     * 是否为重要消息
     */
    @Column(name = "is_important")
    private Boolean isImportant = false;

    /**
     * 附件路径 (JSON 数组)
     */
    @Column(name = "attachments", columnDefinition = "TEXT")
    private String attachments;

    /**
     * 元数据 (JSON 格式)
     */
    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
