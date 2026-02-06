package com.iflow.agent.domain.workflow.service.impl;

import com.iflow.agent.domain.workflow.entity.Workflow;
import com.iflow.agent.domain.workflow.entity.WorkflowExecution;
import com.iflow.agent.domain.workflow.repository.WorkflowExecutionRepository;
import com.iflow.agent.domain.workflow.repository.WorkflowRepository;
import com.iflow.agent.domain.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 工作流服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowServiceImpl implements WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    @Override
    public List<Workflow> getWorkflows(String userId) {
        if (userId != null && !userId.isEmpty()) {
            return workflowRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
        return workflowRepository.findAll();
    }

    @Override
    public Optional<Workflow> getWorkflow(String workflowId) {
        return workflowRepository.findById(workflowId);
    }

    @Override
    @Transactional
    public Workflow createWorkflow(String userId, String name, String description) {
        Workflow workflow = Workflow.builder()
                .userId(userId)
                .name(name)
                .description(description)
                .status(Workflow.WorkflowStatus.DRAFT)
                .nodes(new ArrayList<>())
                .edges(new ArrayList<>())
                .build();
        return workflowRepository.save(workflow);
    }

    @Override
    @Transactional
    public Workflow updateWorkflow(String workflowId, String name, String description) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        if (name != null) {
            workflow.setName(name);
        }
        if (description != null) {
            workflow.setDescription(description);
        }
        workflow.setUpdatedAt(LocalDateTime.now());

        return workflowRepository.save(workflow);
    }

    @Override
    @Transactional
    public void deleteWorkflow(String workflowId) {
        workflowRepository.deleteById(workflowId);
    }

    @Override
    @Transactional
    public Workflow.Node addNode(String workflowId, String type, Map<String, Object> config) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        String nodeName = config != null ? (String) config.getOrDefault("name", "Node") : "Node";

        Workflow.Node node = Workflow.Node.builder()
                .workflow(workflow)
                .type(type)
                .name(nodeName)
                .config(config)
                .sortOrder(workflow.getNodes().size())
                .build();

        workflow.getNodes().add(node);
        workflowRepository.save(workflow);

        return node;
    }

    @Override
    @Transactional
    public Workflow.Node updateNode(String nodeId, String type, Map<String, Object> config) {
        // 简化实现，实际应该通过节点仓储查找
        log.info("更新节点: {}", nodeId);
        return Workflow.Node.builder()
                .id(nodeId)
                .type(type)
                .config(config)
                .build();
    }

    @Override
    @Transactional
    public void deleteNode(String nodeId) {
        log.info("删除节点: {}", nodeId);
    }

    @Override
    @Transactional
    public Workflow.Edge addEdge(String workflowId, String source, String target, String condition) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        Workflow.Edge edge = Workflow.Edge.builder()
                .workflow(workflow)
                .source(source)
                .target(target)
                .condition(condition)
                .build();

        workflow.getEdges().add(edge);
        workflowRepository.save(workflow);

        return edge;
    }

    @Override
    @Transactional
    public void deleteEdge(String edgeId) {
        log.info("删除连接: {}", edgeId);
    }

    @Override
    @Transactional
    public WorkflowExecution executeWorkflow(String workflowId, Map<String, Object> inputs) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        WorkflowExecution execution = WorkflowExecution.builder()
                .workflowId(workflowId)
                .status(WorkflowExecution.ExecutionStatus.RUNNING)
                .inputs(inputs)
                .totalNodes(workflow.getNodes().size())
                .startedAt(LocalDateTime.now())
                .build();

        return executionRepository.save(execution);
    }

    @Override
    @Transactional
    public WorkflowExecution createExecution(String workflowId, Map<String, Object> inputs) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        WorkflowExecution execution = WorkflowExecution.builder()
                .workflowId(workflowId)
                .status(WorkflowExecution.ExecutionStatus.RUNNING)
                .inputs(inputs)
                .totalNodes(workflow.getNodes().size())
                .startedAt(LocalDateTime.now())
                .build();

        return executionRepository.save(execution);
    }

    @Override
    @Transactional
    public void updateExecutionProgress(String executionId, int currentNode, int totalNodes) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new IllegalArgumentException("Execution not found: " + executionId));

        execution.setCurrentNodeIndex(currentNode);
        execution.setProgress((currentNode * 100) / totalNodes);

        executionRepository.save(execution);
    }

    @Override
    @Transactional
    public void completeExecution(String executionId, Map<String, Object> outputs) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new IllegalArgumentException("Execution not found: " + executionId));

        execution.setStatus(WorkflowExecution.ExecutionStatus.COMPLETED);
        execution.setOutputs(outputs);
        execution.setProgress(100);
        execution.setCompletedAt(LocalDateTime.now());

        executionRepository.save(execution);
    }

    @Override
    public Optional<WorkflowExecution> getExecution(String executionId) {
        return executionRepository.findById(executionId);
    }

    @Override
    public List<WorkflowExecution> getExecutionsByWorkflow(String workflowId, int limit) {
        List<WorkflowExecution> executions = executionRepository.findByWorkflowIdOrderByCreatedAtDesc(workflowId);
        if (executions.size() > limit) {
            return executions.subList(0, limit);
        }
        return executions;
    }

    @Override
    public List<WorkflowExecution> getAllExecutions(int limit) {
        List<WorkflowExecution> executions = executionRepository.findTop20ByOrderByCreatedAtDesc();
        if (executions.size() > limit) {
            return executions.subList(0, limit);
        }
        return executions;
    }

    @Override
    @Transactional
    public Workflow applyTemplate(String userId, String templateId) {
        log.info("应用模板: {} for user: {}", templateId, userId);

        // 根据模板创建基础工作流
        String workflowName = switch (templateId) {
            case "code_review" -> "代码审查工作流";
            case "bug_fix" -> "Bug修复工作流";
            case "feature_dev" -> "功能开发工作流";
            case "deploy" -> "部署工作流";
            default -> "新工作流";
        };

        Workflow workflow = createWorkflow(userId, workflowName, "从模板创建的工作流");

        // 根据模板添加节点
        switch (templateId) {
            case "code_review" -> {
                addNode(workflow.getId(), "llm", Map.of("name", "代码分析", "prompt", "分析代码质量"));
                addNode(workflow.getId(), "llm", Map.of("name", "生成报告", "prompt", "生成审查报告"));
            }
            case "bug_fix" -> {
                addNode(workflow.getId(), "llm", Map.of("name", "Bug分析", "prompt", "分析Bug原因"));
                addNode(workflow.getId(), "llm", Map.of("name", "生成修复方案", "prompt", "生成修复建议"));
            }
            case "feature_dev" -> {
                addNode(workflow.getId(), "llm", Map.of("name", "需求分析", "prompt", "分析功能需求"));
                addNode(workflow.getId(), "llm", Map.of("name", "设计方案", "prompt", "设计实现方案"));
                addNode(workflow.getId(), "code", Map.of("name", "生成代码", "language", "java"));
            }
            case "deploy" -> {
                addNode(workflow.getId(), "condition", Map.of("name", "检查环境", "condition", "环境是否正常"));
                addNode(workflow.getId(), "api", Map.of("name", "执行部署", "method", "POST"));
            }
        }

        return workflow;
    }
}
