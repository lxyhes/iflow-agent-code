package com.iflow.agent.controller;

import com.iflow.agent.dto.MultiAgentDto.*;
import com.iflow.agent.service.agent.AgentExecutionService;
import com.iflow.agent.service.agent.MultiAgentOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * 多 Agent 任务控制器
 * 负责多 Agent 协作任务的创建、执行和管理
 */
@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
@Slf4j
public class MultiAgentController {

    private final MultiAgentOrchestrator orchestrator;
    private final AgentExecutionService executionService;

    /**
     * 创建多 Agent 任务
     */
    @PostMapping("/tasks")
    public ResponseEntity<TaskInfo> createTask(@Valid @RequestBody CreateTaskRequest request) {
        log.info("创建多 Agent 任务：Agents={}, 模式={}", request.getAgentIds(), request.getExecutionMode());
        var task = orchestrator.createTask(request);
        return ResponseEntity.ok(toTaskInfo(task));
    }

    /**
     * 执行多 Agent 任务
     */
    @PostMapping("/tasks/{id}/execute")
    public ResponseEntity<TaskResult> executeTask(
            @PathVariable Long id,
            @Valid @RequestBody ExecuteTaskRequest request) {
        log.info("执行多 Agent 任务：ID={}, 模式={}", id, request.getExecutionMode());
        return ResponseEntity.ok(orchestrator.executeTask(id, request));
    }

    /**
     * 获取任务状态
     */
    @GetMapping("/tasks/{id}/status")
    public ResponseEntity<TaskStatusResponse> getTaskStatus(@PathVariable Long id) {
        log.info("获取任务状态：ID={}", id);
        return ResponseEntity.ok(orchestrator.getTaskStatus(id));
    }

    /**
     * 获取任务结果
     */
    @GetMapping("/tasks/{id}/results")
    public ResponseEntity<TaskResult> getTaskResults(@PathVariable Long id) {
        log.info("获取任务结果：ID={}", id);
        TaskStatusResponse status = orchestrator.getTaskStatus(id);
        if (status.getResults() != null) {
            return ResponseEntity.ok(status.getResults());
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * 获取任务历史
     */
    @GetMapping("/tasks/history")
    public ResponseEntity<TaskListResponse> getTaskHistory(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        log.info("获取任务历史：userId={}, limit={}", userId, limit);
        List<TaskInfo> tasks = orchestrator.getTaskHistory(userId, limit);
        return ResponseEntity.ok(new TaskListResponse(tasks, tasks.size()));
    }

    /**
     * 取消任务
     */
    @PostMapping("/tasks/{id}/cancel")
    public ResponseEntity<Void> cancelTask(@PathVariable Long id) {
        log.info("取消任务：ID={}", id);
        orchestrator.cancelTask(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 获取所有任务
     */
    @GetMapping("/tasks")
    public ResponseEntity<TaskListResponse> getAllTasks() {
        log.info("获取所有任务");
        List<TaskInfo> tasks = orchestrator.getTaskHistory(null, 100);
        return ResponseEntity.ok(new TaskListResponse(tasks, tasks.size()));
    }

    /**
     * 搜索任务
     */
    @GetMapping("/tasks/search")
    public ResponseEntity<TaskListResponse> searchTasks(
            @RequestParam String keyword) {
        log.info("搜索任务：keyword={}", keyword);
        // TODO: 实现搜索功能
        return ResponseEntity.ok(new TaskListResponse(List.of(), 0));
    }

    /**
     * 执行单个 Agent 任务
     */
    @PostMapping("/execute")
    public ResponseEntity<AgentExecutionResult> executeAgent(
            @RequestParam Long agentId,
            @RequestBody Map<String, String> request) {
        log.info("执行单 Agent 任务：Agent ID={}", agentId);
        
        String prompt = request.get("prompt");
        String context = request.get("context");
        
        if (prompt == null || prompt.isEmpty()) {
            throw new IllegalArgumentException("prompt 不能为空");
        }
        
        return ResponseEntity.ok(executionService.executeAgent(agentId, prompt, context));
    }

    /**
     * 流式执行 Agent 任务
     */
    @PostMapping(value = "/execute/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> executeAgentStream(
            @RequestParam Long agentId,
            @RequestBody Map<String, String> request) {
        log.info("流式执行 Agent 任务：Agent ID={}", agentId);
        
        String prompt = request.get("prompt");
        String context = request.get("context");
        
        if (prompt == null || prompt.isEmpty()) {
            return Flux.error(new IllegalArgumentException("prompt 不能为空"));
        }
        
        return executionService.executeAgentStream(agentId, prompt, context);
    }

    /**
     * 批量执行 Agent 任务
     */
    @PostMapping("/execute/batch")
    public ResponseEntity<List<AgentExecutionResult>> executeBatch(
            @RequestBody Map<String, Object> request) {
        log.info("批量执行 Agent 任务");
        
        @SuppressWarnings("unchecked")
        List<Long> agentIds = (List<Long>) request.get("agentIds");
        String prompt = (String) request.get("prompt");
        String context = (String) request.get("context");
        
        if (agentIds == null || agentIds.isEmpty()) {
            throw new IllegalArgumentException("agentIds 不能为空");
        }
        if (prompt == null || prompt.isEmpty()) {
            throw new IllegalArgumentException("prompt 不能为空");
        }
        
        return ResponseEntity.ok(executionService.executeBatch(agentIds, prompt, context));
    }

    /**
     * 获取 Agent 执行状态
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getAgentStatus(@PathVariable Long id) {
        log.info("获取 Agent 执行状态：ID={}", id);
        return ResponseEntity.ok(executionService.getExecutionStatus(id));
    }

    /**
     * 检查 Agent 是否可用
     */
    @GetMapping("/{id}/available")
    public ResponseEntity<Map<String, Object>> checkAgentAvailable(@PathVariable Long id) {
        log.info("检查 Agent 可用性：ID={}", id);
        boolean available = executionService.isAgentAvailable(id);
        return ResponseEntity.ok(Map.of(
            "available", available,
            "agentId", id
        ));
    }

    // Helper method to convert entity to DTO
    private TaskInfo toTaskInfo(com.iflow.agent.entity.MultiAgentTask task) {
        return new TaskInfo(
            task.getId(),
            task.getTaskDescription(),
            null, // assignedAgents
            task.getExecutionMode(),
            task.getStatus(),
            null, // results
            task.getErrorMessage(),
            task.getCreatedAt() != null ? 
                task.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : null,
            task.getCompletedAt() != null ? 
                task.getCompletedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : null,
            task.getStartedAt() != null ? 
                task.getStartedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : null
        );
    }
}
