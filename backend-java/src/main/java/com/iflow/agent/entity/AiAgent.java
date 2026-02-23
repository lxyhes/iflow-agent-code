package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * AI Agent 实体类
 * 用于注册和管理各种 CLI AI 工具 (Claude Code, Gemini CLI, Codex, Qwen Code 等)
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "ai_agent")
public class AiAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Agent 名称 (用户自定义)
     */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * Agent 类型
     * 支持：claude-code, gemini-cli, codex, qwen-code, goose, auggie, custom
     */
    @Column(name = "type", nullable = false, length = 50)
    private String type;

    /**
     * CLI 工具路径
     */
    @Column(name = "cli_path", length = 500)
    private String cliPath;

    /**
     * Agent 版本
     */
    @Column(name = "version", length = 50)
    private String version;

    /**
     * Agent 状态：active, inactive, error
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "inactive";

    /**
     * Agent 能力描述 (JSON 格式)
     */
    @Column(name = "capabilities", columnDefinition = "TEXT")
    private String capabilities;

    /**
     * Agent 配置 (JSON 格式)
     */
    @Column(name = "config", columnDefinition = "TEXT")
    private String config;

    /**
     * 最后健康检查时间
     */
    @Column(name = "last_health_check")
    private LocalDateTime lastHealthCheck;

    /**
     * 健康状态消息
     */
    @Column(name = "health_message", length = 500)
    private String healthMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
