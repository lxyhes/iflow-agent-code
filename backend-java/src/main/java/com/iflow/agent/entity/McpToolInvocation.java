package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * MCP 工具调用历史实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "mcp_tool_invocation")
public class McpToolInvocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 服务器 ID
     */
    @Column(name = "server_id")
    private Long serverId;

    /**
     * 工具名称
     */
    @Column(name = "tool_name", nullable = false, length = 200)
    private String toolName;

    /**
     * 输入数据 (JSON 格式)
     */
    @Column(name = "input_data", columnDefinition = "TEXT")
    private String inputData;

    /**
     * 输出数据 (JSON 格式)
     */
    @Column(name = "output_data", columnDefinition = "TEXT")
    private String outputData;

    /**
     * 状态：success, failed, timeout
     */
    @Column(name = "status", length = 20)
    private String status;

    /**
     * 错误消息
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * 执行时长 (毫秒)
     */
    @Column(name = "duration_ms")
    private Integer durationMs;

    @CreationTimestamp
    @Column(name = "invoked_at", updatable = false)
    private LocalDateTime invokedAt;
}
