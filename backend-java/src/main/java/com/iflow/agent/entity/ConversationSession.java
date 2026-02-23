package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 会话实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "conversation_session")
public class ConversationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 会话标题
     */
    @Column(name = "title", length = 200)
    private String title;

    /**
     * 项目 ID
     */
    @Column(name = "project_id")
    private Long projectId;

    /**
     * 用户 ID
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * Agent ID
     */
    @Column(name = "agent_id")
    private Long agentId;

    /**
     * 会话标签 (JSON 数组)
     */
    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    /**
     * 是否置顶
     */
    @Column(name = "is_pinned")
    private Boolean isPinned = false;

    /**
     * 是否收藏
     */
    @Column(name = "is_favorite")
    private Boolean isFavorite = false;

    /**
     * 消息数量
     */
    @Column(name = "message_count")
    private Integer messageCount = 0;

    /**
     * Token 使用量
     */
    @Column(name = "token_usage")
    private Long tokenUsage = 0L;

    /**
     * 最后一条消息摘要
     */
    @Column(name = "last_message_summary", columnDefinition = "TEXT")
    private String lastMessageSummary;

    /**
     * 最后活跃时间
     */
    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
