package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 本地模型实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "local_model")
public class LocalModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 模型名称
     */
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /**
     * 模型类型：ollama, lmstudio, custom
     */
    @Column(name = "type", nullable = false, length = 50)
    private String type;

    /**
     * 提供商：ollama, lmstudio, openai-compatible
     */
    @Column(name = "provider", length = 50)
    private String provider;

    /**
     * API 端点
     */
    @Column(name = "endpoint", length = 500)
    private String endpoint;

    /**
     * 状态：active, inactive, error
     */
    @Column(name = "status", length = 20)
    private String status = "inactive";

    /**
     * 配置参数 (JSON 格式)
     */
    @Column(name = "config", columnDefinition = "TEXT")
    private String config;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
