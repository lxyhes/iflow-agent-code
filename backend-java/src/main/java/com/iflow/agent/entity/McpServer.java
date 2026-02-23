package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * MCP 服务器实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "mcp_server")
public class McpServer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 服务器名称
     */
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /**
     * 服务器类型：github, notion, slack, filesystem, postgresql
     */
    @Column(name = "type", nullable = false, length = 50)
    private String type;

    /**
     * 服务端点 URL
     */
    @Column(name = "endpoint", length = 500)
    private String endpoint;

    /**
     * 认证类型：api_key, oauth, none
     */
    @Column(name = "auth_type", length = 50)
    private String authType;

    /**
     * 认证配置 (JSON 格式)
     */
    @Column(name = "auth_config", columnDefinition = "TEXT")
    private String authConfig;

    /**
     * 状态：active, inactive, error
     */
    @Column(name = "status", length = 20)
    private String status = "inactive";

    /**
     * 发现的工具列表 (JSON 数组)
     */
    @Column(name = "tools_discovered", columnDefinition = "TEXT")
    private String toolsDiscovered;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
