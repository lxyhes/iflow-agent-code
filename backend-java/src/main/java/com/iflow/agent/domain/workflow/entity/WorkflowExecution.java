package com.iflow.agent.domain.workflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 工作流执行实体
 */
@Entity(name = "DomainWorkflowExecution")
@Table(name = "workflow_executions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowExecution {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(name = "workflow_id")
    private String workflowId;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ExecutionStatus status = ExecutionStatus.PENDING;

    @Column(name = "inputs", length = 4000)
    @Convert(converter = Workflow.JsonConverter.class)
    private Map<String, Object> inputs;

    @Column(name = "outputs", length = 4000)
    @Convert(converter = Workflow.JsonConverter.class)
    private Map<String, Object> outputs;

    @Column(name = "current_node_index")
    @Builder.Default
    private Integer currentNodeIndex = 0;

    @Column(name = "total_nodes")
    private Integer totalNodes;

    @Column(name = "progress")
    @Builder.Default
    private Integer progress = 0;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * 执行状态
     */
    public enum ExecutionStatus {
        PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    }
}
