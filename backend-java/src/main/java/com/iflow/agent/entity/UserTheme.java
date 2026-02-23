package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 用户主题实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_theme")
public class UserTheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 用户 ID
     */
    @Column(name = "user_id")
    private Long userId;

    /**
     * 主题名称
     */
    @Column(name = "name", length = 200)
    private String name;

    /**
     * 配色方案 (JSON 格式)
     */
    @Column(name = "colors", columnDefinition = "TEXT")
    private String colors;

    /**
     * 是否内置主题
     */
    @Column(name = "is_builtin")
    private Boolean isBuiltIn = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
