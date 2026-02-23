package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 会话标签实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "conversation_tag")
public class ConversationTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 标签名称
     */
    @Column(name = "name", nullable = false, length = 100, unique = true)
    private String name;

    /**
     * 标签颜色
     */
    @Column(name = "color", length = 20)
    private String color = "#3b82f6";

    /**
     * 标签图标
     */
    @Column(name = "icon", length = 50)
    private String icon;

    /**
     * 用户 ID (null 表示系统标签)
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
