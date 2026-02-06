package com.iflow.agent.controller;

import com.iflow.agent.domain.workflow.entity.Workflow;
import com.iflow.agent.domain.workflow.entity.WorkflowExecution;
import com.iflow.agent.domain.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * 工作流 API - 对应 Python 的 workflow.py
 */
@Slf4j
@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    // ========== 工作流基本操作 ==========

    @GetMapping
    public ResponseEntity<Map<String, Object>> getWorkflows(
            @RequestParam(required = false) String userId) {
        log.info("获取工作流列表: userId={}", userId);
        List<Workflow> workflows = workflowService.getWorkflows(userId);
        return ResponseEntity.ok(Map.of("success", true, "data", workflows));
    }

    @GetMapping("/{workflowId}")
    public ResponseEntity<Map<String, Object>> getWorkflow(@PathVariable String workflowId) {
        log.info("获取工作流: {}", workflowId);
        Workflow workflow = workflowService.getWorkflow(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found"));
        return ResponseEntity.ok(Map.of("success", true, "data", workflow));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createWorkflow(
            @RequestBody CreateWorkflowRequest request,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        log.info("创建工作流: {}", request.getName());
        Workflow workflow = workflowService.createWorkflow(userId, request.getName(), request.getDescription());
        return ResponseEntity.ok(Map.of("success", true, "data", workflow));
    }

    @PutMapping("/{workflowId}")
    public ResponseEntity<Map<String, Object>> updateWorkflow(
            @PathVariable String workflowId,
            @RequestBody UpdateWorkflowRequest request) {
        log.info("更新工作流: {}", workflowId);
        Workflow workflow = workflowService.updateWorkflow(workflowId, request.getName(), request.getDescription());
        return ResponseEntity.ok(Map.of("success", true, "data", workflow));
    }

    @DeleteMapping("/{workflowId}")
    public ResponseEntity<Map<String, Object>> deleteWorkflow(@PathVariable String workflowId) {
        log.info("删除工作流: {}", workflowId);
        workflowService.deleteWorkflow(workflowId);
        return ResponseEntity.ok(Map.of("success", true, "message", "工作流已删除"));
    }

    // ========== 工作流节点操作 ==========

    @PostMapping("/{workflowId}/nodes")
    public ResponseEntity<Map<String, Object>> addNode(
            @PathVariable String workflowId,
            @RequestBody AddNodeRequest request) {
        log.info("添加节点到工作流: {}", workflowId);
        Workflow.Node node = workflowService.addNode(workflowId, request.getType(), request.getConfig());
        return ResponseEntity.ok(Map.of("success", true, "data", node));
    }

    @PutMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<Map<String, Object>> updateNode(
            @PathVariable String workflowId,
            @PathVariable String nodeId,
            @RequestBody UpdateNodeRequest request) {
        log.info("更新节点: {} in workflow: {}", nodeId, workflowId);
        Workflow.Node node = workflowService.updateNode(nodeId, request.getType(), request.getConfig());
        return ResponseEntity.ok(Map.of("success", true, "data", node));
    }

    @DeleteMapping("/{workflowId}/nodes/{nodeId}")
    public ResponseEntity<Map<String, Object>> deleteNode(
            @PathVariable String workflowId,
            @PathVariable String nodeId) {
        log.info("删除节点: {} from workflow: {}", nodeId, workflowId);
        workflowService.deleteNode(nodeId);
        return ResponseEntity.ok(Map.of("success", true, "message", "节点已删除"));
    }

    // ========== 工作流连接操作 ==========

    @PostMapping("/{workflowId}/edges")
    public ResponseEntity<Map<String, Object>> addEdge(
            @PathVariable String workflowId,
            @RequestBody AddEdgeRequest request) {
        log.info("添加连接到工作流: {}", workflowId);
        Workflow.Edge edge = workflowService.addEdge(workflowId, request.getSource(), request.getTarget(), request.getCondition());
        return ResponseEntity.ok(Map.of("success", true, "data", edge));
    }

    @DeleteMapping("/{workflowId}/edges/{edgeId}")
    public ResponseEntity<Map<String, Object>> deleteEdge(
            @PathVariable String workflowId,
            @PathVariable String edgeId) {
        log.info("删除连接: {} from workflow: {}", edgeId, workflowId);
        workflowService.deleteEdge(edgeId);
        return ResponseEntity.ok(Map.of("success", true, "message", "连接已删除"));
    }

    // ========== 工作流执行 ==========

    @PostMapping("/{workflowId}/execute")
    public ResponseEntity<Map<String, Object>> executeWorkflow(
            @PathVariable String workflowId,
            @RequestBody Map<String, Object> inputs) {
        log.info("执行工作流: {}", workflowId);
        WorkflowExecution execution = workflowService.executeWorkflow(workflowId, inputs);
        return ResponseEntity.ok(Map.of("success", true, "data", execution));
    }

    /**
     * 流式执行工作流 (SSE)
     */
    @GetMapping(value = "/stream/{workflowId}/execute", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamExecuteWorkflow(
            @PathVariable String workflowId,
            @RequestParam(required = false) String inputs) {
        log.info("流式执行工作流: {}", workflowId);

        SseEmitter emitter = new SseEmitter(600000L); // 10分钟超时

        new Thread(() -> {
            try {
                // 解析输入参数
                Map<String, Object> inputMap = parseInputs(inputs);

                // 发送开始事件
                emitter.send(Map.of(
                        "type", "start",
                        "workflow_id", workflowId,
                        "message", "开始执行工作流",
                        "timestamp", System.currentTimeMillis()
                ));

                // 获取工作流
                Workflow workflow = workflowService.getWorkflow(workflowId)
                        .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

                // 创建工作流执行记录
                WorkflowExecution execution = workflowService.createExecution(workflowId, inputMap);

                // 模拟流式执行
                List<Workflow.Node> nodes = workflow.getNodes();
                int totalNodes = nodes.size();

                for (int i = 0; i < nodes.size(); i++) {
                    Workflow.Node node = nodes.get(i);

                    // 发送节点开始事件
                    emitter.send(Map.of(
                            "type", "node_start",
                            "node_id", node.getId(),
                            "node_type", node.getType(),
                            "node_name", node.getName(),
                            "progress", (i * 100) / totalNodes,
                            "message", "开始执行节点: " + node.getName(),
                            "timestamp", System.currentTimeMillis()
                    ));

                    // 模拟节点执行时间
                    Thread.sleep(1000 + (int) (Math.random() * 2000));

                    // 执行节点逻辑
                    Map<String, Object> nodeResult = executeNode(node, inputMap);

                    // 发送节点完成事件
                    emitter.send(Map.of(
                            "type", "node_complete",
                            "node_id", node.getId(),
                            "node_type", node.getType(),
                            "node_name", node.getName(),
                            "progress", ((i + 1) * 100) / totalNodes,
                            "result", nodeResult,
                            "message", "节点执行完成: " + node.getName(),
                            "timestamp", System.currentTimeMillis()
                    ));

                    // 更新执行记录
                    workflowService.updateExecutionProgress(execution.getId(), i + 1, totalNodes);
                }

                // 完成执行
                workflowService.completeExecution(execution.getId(), Map.of(
                        "status", "completed",
                        "total_nodes", totalNodes,
                        "completed_nodes", totalNodes
                ));

                // 发送完成事件
                emitter.send(Map.of(
                        "type", "complete",
                        "workflow_id", workflowId,
                        "execution_id", execution.getId(),
                        "progress", 100,
                        "message", "工作流执行完成",
                        "timestamp", System.currentTimeMillis()
                ));

                emitter.complete();

            } catch (Exception e) {
                log.error("流式执行工作流失败: {}", workflowId, e);
                try {
                    emitter.send(Map.of(
                            "type", "error",
                            "workflow_id", workflowId,
                            "message", e.getMessage(),
                            "timestamp", System.currentTimeMillis()
                    ));
                } catch (IOException ex) {
                    // ignore
                }
                emitter.completeWithError(e);
            }
        }).start();

        return emitter;
    }

    // ========== 工作流执行记录 ==========

    /**
     * 列出工作流执行记录
     */
    @GetMapping("/executions")
    public ResponseEntity<Map<String, Object>> listExecutions(
            @RequestParam(required = false) String workflowId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "20") int limit) {
        log.info("列出工作流执行记录: workflowId={}, status={}, limit={}", workflowId, status, limit);

        List<WorkflowExecution> executions;
        if (workflowId != null && !workflowId.isEmpty()) {
            executions = workflowService.getExecutionsByWorkflow(workflowId, limit);
        } else {
            executions = workflowService.getAllExecutions(limit);
        }

        // 按状态过滤
        if (status != null && !status.isEmpty()) {
            executions = executions.stream()
                    .filter(e -> status.equalsIgnoreCase(e.getStatus().name()))
                    .toList();
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", executions,
                "total", executions.size()
        ));
    }

    /**
     * 获取执行详情
     */
    @GetMapping("/executions/{executionId}")
    public ResponseEntity<Map<String, Object>> getExecutionDetail(@PathVariable String executionId) {
        log.info("获取执行详情: {}", executionId);

        WorkflowExecution execution = workflowService.getExecution(executionId)
                .orElseThrow(() -> new IllegalArgumentException("Execution not found: " + executionId));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", execution
        ));
    }

    // ========== 工作流模板 ==========

    @GetMapping("/templates/list")
    public ResponseEntity<Map<String, Object>> getTemplates() {
        log.info("获取工作流模板列表");
        List<Map<String, Object>> templates = List.of(
                Map.of(
                        "id", "code_review",
                        "name", "代码审查",
                        "description", "自动化的代码审查流程",
                        "category", "开发"
                ),
                Map.of(
                        "id", "bug_fix",
                        "name", "Bug修复",
                        "description", "Bug分析和修复流程",
                        "category", "开发"
                ),
                Map.of(
                        "id", "feature_dev",
                        "name", "功能开发",
                        "description", "新功能开发流程",
                        "category", "开发"
                ),
                Map.of(
                        "id", "deploy",
                        "name", "部署流程",
                        "description", "自动化部署流程",
                        "category", "运维"
                )
        );
        return ResponseEntity.ok(Map.of("success", true, "data", templates));
    }

    @PostMapping("/templates/{templateId}/apply")
    public ResponseEntity<Map<String, Object>> applyTemplate(
            @PathVariable String templateId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        log.info("应用模板: {}", templateId);
        Workflow workflow = workflowService.applyTemplate(userId, templateId);
        return ResponseEntity.ok(Map.of("success", true, "data", workflow));
    }

    // ========== 私有方法 ==========

    private Map<String, Object> parseInputs(String inputs) {
        if (inputs == null || inputs.isEmpty()) {
            return Map.of();
        }
        try {
            // 简单的 JSON 解析
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(inputs, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<String, Object> executeNode(Workflow.Node node, Map<String, Object> inputs) {
        // 根据节点类型执行不同的逻辑
        return switch (node.getType()) {
            case "llm" -> Map.of(
                    "type", "llm",
                    "status", "success",
                    "output", "LLM处理结果"
            );
            case "code" -> Map.of(
                    "type", "code",
                    "status", "success",
                    "output", "代码执行结果"
            );
            case "condition" -> Map.of(
                    "type", "condition",
                    "status", "success",
                    "output", "条件判断结果"
            );
            case "api" -> Map.of(
                    "type", "api",
                    "status", "success",
                    "output", "API调用结果"
            );
            default -> Map.of(
                    "type", node.getType(),
                    "status", "success",
                    "output", "节点执行结果"
            );
        };
    }

    // ========== 请求类 ==========

    @lombok.Data
    public static class CreateWorkflowRequest {
        private String name;
        private String description;
    }

    @lombok.Data
    public static class UpdateWorkflowRequest {
        private String name;
        private String description;
    }

    @lombok.Data
    public static class AddNodeRequest {
        private String type;
        private Map<String, Object> config;
    }

    @lombok.Data
    public static class UpdateNodeRequest {
        private String type;
        private Map<String, Object> config;
    }

    @lombok.Data
    public static class AddEdgeRequest {
        private String source;
        private String target;
        private String condition;
    }
}
