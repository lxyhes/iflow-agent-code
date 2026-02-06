package com.iflow.agent.domain.workflow.service;

import com.iflow.agent.domain.workflow.entity.Workflow;
import com.iflow.agent.domain.workflow.entity.WorkflowExecution;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 工作流服务接口
 */
public interface WorkflowService {

    // ========== 工作流基本操作 ==========
    List<Workflow> getWorkflows(String userId);

    Optional<Workflow> getWorkflow(String workflowId);

    Workflow createWorkflow(String userId, String name, String description);

    Workflow updateWorkflow(String workflowId, String name, String description);

    void deleteWorkflow(String workflowId);

    // ========== 节点操作 ==========
    Workflow.Node addNode(String workflowId, String type, Map<String, Object> config);

    Workflow.Node updateNode(String nodeId, String type, Map<String, Object> config);

    void deleteNode(String nodeId);

    // ========== 连接操作 ==========
    Workflow.Edge addEdge(String workflowId, String source, String target, String condition);

    void deleteEdge(String edgeId);

    // ========== 执行操作 ==========
    WorkflowExecution executeWorkflow(String workflowId, Map<String, Object> inputs);

    WorkflowExecution createExecution(String workflowId, Map<String, Object> inputs);

    void updateExecutionProgress(String executionId, int currentNode, int totalNodes);

    void completeExecution(String executionId, Map<String, Object> outputs);

    Optional<WorkflowExecution> getExecution(String executionId);

    List<WorkflowExecution> getExecutionsByWorkflow(String workflowId, int limit);

    List<WorkflowExecution> getAllExecutions(int limit);

    // ========== 模板操作 ==========
    Workflow applyTemplate(String userId, String templateId);
}
