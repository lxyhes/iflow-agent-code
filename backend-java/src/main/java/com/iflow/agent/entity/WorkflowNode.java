package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 工作流节点实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "workflow_node")
public class WorkflowNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 所属工作流 ID
     */
    @Column(name = "workflow_id", nullable = false)
    private Long workflowId;

    /**
     * 节点类型：prompt, agent, condition, loop, tool, variable, human_approval
     */
    @Column(name = "node_type", nullable = false, length = 50)
    private String nodeType;

    /**
     * 节点名称
     */
    @Column(name = "node_name", length = 200)
    private String nodeName;

    /**
     * 节点配置 (JSON 格式)
     */
    @Column(name = "node_config", columnDefinition = "TEXT")
    private String nodeConfig;

    /**
     * 节点位置 X
     */
    @Column(name = "position_x")
    private Integer positionX;

    /**
     * 节点位置 Y
     */
    @Column(name = "position_y")
    private Integer positionY;

    /**
     * 连接的节点 ID 列表 (JSON 数组)
     */
    @Column(name = "connections", columnDefinition = "TEXT")
    private String connections;

    /**
     * 节点描述
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
