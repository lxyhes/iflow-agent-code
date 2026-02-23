package com.iflow.agent.service.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.dto.MultiAgentDto.*;
import com.iflow.agent.entity.AiAgent;
import com.iflow.agent.entity.MultiAgentTask;
import com.iflow.agent.repository.AiAgentRepository;
import com.iflow.agent.repository.MultiAgentTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * 多 Agent 编排器
 * 负责协调多个 Agent 协作完成任务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MultiAgentOrchestrator {

    private final MultiAgentTaskRepository taskRepository;
    private final AiAgentRepository agentRepository;
    private final AgentExecutionService executionService;
    private final ObjectMapper objectMapper;

    private final ExecutorService executorService = Executors.newCachedThreadPool();

    /**
     * 创建多 Agent 任务
     */
    @Transactional
    public MultiAgentTask createTask(CreateTaskRequest request) {
        log.info("创建多 Agent 任务：描述={}, Agents={}, 模式={}", 
            request.getTaskDescription(), request.getAgentIds(), request.getExecutionMode());

        // 验证 Agent 是否存在且可用
        List<AiAgent> agents = agentRepository.findAllById(request.getAgentIds());
        if (agents.size() != request.getAgentIds().size()) {
            throw new IllegalArgumentException("部分 Agent 不存在");
        }

        for (AiAgent agent : agents) {
            if (!"active".equals(agent.getStatus())) {
                throw new IllegalStateException("Agent " + agent.getName() + " 未激活");
            }
        }

        MultiAgentTask task = new MultiAgentTask();
        task.setTaskDescription(request.getTaskDescription());
        
        try {
            task.setAssignedAgents(objectMapper.writeValueAsString(
                request.getAgentIds().stream().map(String::valueOf).collect(Collectors.toList())
            ));
        } catch (JsonProcessingException e) {
            log.warn("序列化 Agent IDs 失败", e);
        }
        
        task.setExecutionMode(request.getExecutionMode());
        task.setStatus("pending");
        task.setUserId(request.getUserId());
        task.setProjectId(request.getProjectId());

        MultiAgentTask savedTask = taskRepository.save(task);
        log.info("多 Agent 任务已创建：ID={}", savedTask.getId());

        return savedTask;
    }

    /**
     * 执行多 Agent 任务
     */
    @Transactional
    public TaskResult executeTask(Long taskId, ExecuteTaskRequest request) {
        log.info("执行多 Agent 任务：ID={}, 模式={}", taskId, request.getExecutionMode());

        MultiAgentTask task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在，ID: " + taskId));

        // 更新任务状态
        task.setStatus("running");
        task.setStartedAt(LocalDateTime.now());
        task.setTaskDescription(request.getTaskDescription());
        
        try {
            task.setAssignedAgents(objectMapper.writeValueAsString(
                request.getAgentIds().stream().map(String::valueOf).collect(Collectors.toList())
            ));
        } catch (JsonProcessingException e) {
            log.warn("序列化 Agent IDs 失败", e);
        }
        
        taskRepository.save(task);

        TaskResult result;
        try {
            result = switch (request.getExecutionMode()) {
                case "parallel" -> executeParallel(task, request);
                case "sequential" -> executeSequential(task, request);
                case "collaborative" -> executeCollaborative(task, request);
                default -> throw new IllegalArgumentException("未知的执行模式：" + request.getExecutionMode());
            };

            // 保存结果
            task.setStatus("completed");
            try {
                task.setResults(objectMapper.writeValueAsString(result));
            } catch (JsonProcessingException e) {
                log.error("结果序列化失败", e);
                task.setResults("{}");
            }
            task.setCompletedAt(LocalDateTime.now());

        } catch (Exception e) {
            log.error("多 Agent 任务执行失败", e);
            task.setStatus("failed");
            task.setErrorMessage(e.getMessage());
            taskRepository.save(task);
            throw e;
        }

        return result;
    }

    /**
     * 并行执行模式
     * 所有 Agent 同时执行相同任务，结果聚合对比
     */
    private TaskResult executeParallel(MultiAgentTask task, ExecuteTaskRequest request) {
        log.info("并行执行模式：{} 个 Agent", request.getAgentIds().size());

        List<Long> agentIds = request.getAgentIds();
        List<CompletableFuture<AgentExecutionResult>> futures = new ArrayList<>();

        // 并行执行所有 Agent
        for (Long agentId : agentIds) {
            CompletableFuture<AgentExecutionResult> future = CompletableFuture
                .supplyAsync(() -> executionService.executeAgent(agentId, request.getPrompt(), request.getContext()), 
                    executorService);
            futures.add(future);
        }

        // 等待所有结果
        List<AgentExecutionResult> results = futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());

        // 生成对比分析
        String comparison = generateComparison(results);
        List<String> recommendations = generateRecommendations(results);

        return new TaskResult(
            results,
            aggregateResults(results),
            comparison,
            recommendations
        );
    }

    /**
     * 顺序执行模式
     * Agent 依次执行，前一个 Agent 的输出作为下一个的输入
     */
    private TaskResult executeSequential(MultiAgentTask task, ExecuteTaskRequest request) {
        log.info("顺序执行模式：{} 个 Agent", request.getAgentIds().size());

        List<AgentExecutionResult> results = new ArrayList<>();
        String currentContext = request.getContext();

        for (Long agentId : request.getAgentIds()) {
            // 执行当前 Agent
            AgentExecutionResult result = executionService.executeAgent(
                agentId, 
                request.getPrompt(), 
                currentContext
            );
            results.add(result);

            // 如果执行失败，停止后续执行
            if (result.getError() != null) {
                log.warn("Agent 执行失败，停止后续执行：Agent ID={}", agentId);
                break;
            }

            // 将当前结果作为下一个 Agent 的上下文
            if (result.getResult() != null) {
                currentContext = result.getResult();
            }
        }

        return new TaskResult(
            results,
            results.stream()
                .map(AgentExecutionResult::getResult)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("\n\n---\n\n")),
            null,
            generateRecommendations(results)
        );
    }

    /**
     * 协作执行模式
     * Agent 之间相互通信，共同完成任务
     */
    private TaskResult executeCollaborative(MultiAgentTask task, ExecuteTaskRequest request) {
        log.info("协作执行模式：{} 个 Agent", request.getAgentIds().size());

        List<AgentExecutionResult> results = new ArrayList<>();
        StringBuilder collaborativeOutput = new StringBuilder();
        
        // 协作轮次
        int rounds = Math.min(3, request.getAgentIds().size());
        String currentContext = request.getContext() != null ? request.getContext() : "";

        for (int round = 0; round < rounds; round++) {
            log.info("协作第 {} 轮", round + 1);
            
            for (Long agentId : request.getAgentIds()) {
                String prompt = buildCollaborativePrompt(request.getPrompt(), collaborativeOutput.toString(), round);
                
                AgentExecutionResult result = executionService.executeAgent(
                    agentId,
                    prompt,
                    currentContext
                );
                results.add(result);

                if (result.getResult() != null) {
                    collaborativeOutput.append("Agent ").append(agentId).append(": ")
                        .append(result.getResult()).append("\n");
                    currentContext = collaborativeOutput.toString();
                }

                if (result.getError() != null) {
                    log.warn("协作过程中 Agent 失败：Agent ID={}", agentId);
                }
            }
        }

        return new TaskResult(
            results,
            collaborativeOutput.toString(),
            "协作模式：多轮对话完成",
            generateRecommendations(results)
        );
    }

    /**
     * 获取任务状态
     */
    @Transactional(readOnly = true)
    public TaskStatusResponse getTaskStatus(Long taskId) {
        MultiAgentTask task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在，ID: " + taskId));

        TaskResult results = null;
        if (task.getResults() != null) {
            try {
                results = objectMapper.readValue(task.getResults(), TaskResult.class);
            } catch (JsonProcessingException e) {
                log.warn("反序列化任务结果失败", e);
            }
        }

        Integer progress = calculateProgress(task);

        return new TaskStatusResponse(
            task.getId(),
            task.getStatus(),
            progress,
            results,
            task.getErrorMessage(),
            task.getCreatedAt() != null ? 
                task.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null,
            task.getCompletedAt() != null ? 
                task.getCompletedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null,
            task.getStartedAt() != null ? 
                task.getStartedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null
        );
    }

    /**
     * 获取任务历史
     */
    @Transactional(readOnly = true)
    public List<TaskInfo> getTaskHistory(Long userId, int limit) {
        List<MultiAgentTask> tasks;
        if (userId != null) {
            tasks = taskRepository.findRecentTasksByUser(userId, limit);
        } else {
            tasks = taskRepository.findAll().stream()
                .sorted(Comparator.comparing(MultiAgentTask::getCreatedAt).reversed())
                .limit(limit)
                .collect(Collectors.toList());
        }

        return tasks.stream().map(this::toTaskInfo).collect(Collectors.toList());
    }

    /**
     * 取消任务
     */
    @Transactional
    public void cancelTask(Long taskId) {
        MultiAgentTask task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在，ID: " + taskId));

        if ("completed".equals(task.getStatus()) || "failed".equals(task.getStatus())) {
            throw new IllegalStateException("任务已完成或失败，无法取消");
        }

        task.setStatus("cancelled");
        task.setErrorMessage("用户取消");
        taskRepository.save(task);
        log.info("任务已取消：ID={}", taskId);
    }

    /**
     * 聚合结果
     */
    private String aggregateResults(List<AgentExecutionResult> results) {
        StringBuilder aggregated = new StringBuilder();
        aggregated.append("## 多 Agent 执行结果\n\n");

        for (AgentExecutionResult result : results) {
            aggregated.append("### ").append(result.getAgentName()).append("\n");
            if (result.getError() != null) {
                aggregated.append("❌ 错误：").append(result.getError()).append("\n");
            } else {
                aggregated.append(result.getResult()).append("\n");
            }
            aggregated.append("\n---\n\n");
        }

        return aggregated.toString();
    }

    /**
     * 生成对比分析
     */
    private String generateComparison(List<AgentExecutionResult> results) {
        StringBuilder comparison = new StringBuilder();
        comparison.append("## Agent 结果对比\n\n");

        // 统计成功/失败
        long successCount = results.stream()
            .filter(r -> r.getError() == null)
            .count();
        long failCount = results.size() - successCount;

        comparison.append("- ✅ 成功：").append(successCount).append("\n");
        comparison.append("- ❌ 失败：").append(failCount).append("\n\n");

        // 执行时间对比
        comparison.append("### 执行时间\n");
        for (AgentExecutionResult result : results) {
            comparison.append("- ").append(result.getAgentName())
                .append(": ").append(result.getExecutionTime()).append("ms\n");
        }

        return comparison.toString();
    }

    /**
     * 生成建议
     */
    private List<String> generateRecommendations(List<AgentExecutionResult> results) {
        List<String> recommendations = new ArrayList<>();

        // 分析结果并生成建议
        Optional<AgentExecutionResult> fastest = results.stream()
            .min(Comparator.comparingLong(AgentExecutionResult::getExecutionTime));

        fastest.ifPresent(r -> 
            recommendations.add("推荐使用 " + r.getAgentName() + " (执行最快：" + r.getExecutionTime() + "ms)")
        );

        long successCount = results.stream().filter(r -> r.getError() == null).count();
        if (successCount == 0) {
            recommendations.add("所有 Agent 执行失败，请检查 Agent 配置和连接状态");
        } else if (successCount < results.size()) {
            recommendations.add("部分 Agent 执行失败，建议检查失败的 Agent 状态");
        }

        return recommendations;
    }

    /**
     * 构建协作曲目
     */
    private String buildCollaborativePrompt(String originalPrompt, String context, int round) {
        return String.format(
            "[协作模式 - 第%d轮]\n原始任务：%s\n\n当前上下文:\n%s\n\n请基于以上信息继续完成任务。",
            round + 1,
            originalPrompt,
            context
        );
    }

    /**
     * 计算任务进度
     */
    private Integer calculateProgress(MultiAgentTask task) {
        return switch (task.getStatus()) {
            case "pending" -> 0;
            case "running" -> 50;
            case "completed" -> 100;
            case "failed", "cancelled" -> 100;
            default -> null;
        };
    }

    /**
     * 转换为 TaskInfo
     */
    private TaskInfo toTaskInfo(MultiAgentTask task) {
        TaskResult results = null;
        if (task.getResults() != null) {
            try {
                results = objectMapper.readValue(task.getResults(), TaskResult.class);
            } catch (JsonProcessingException e) {
                log.warn("反序列化任务结果失败", e);
            }
        }

        List<String> agentIds = new ArrayList<>();
        if (task.getAssignedAgents() != null) {
            try {
                agentIds = objectMapper.readValue(
                    task.getAssignedAgents(),
                    new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {}
                );
            } catch (JsonProcessingException e) {
                log.warn("反序列化 Agent IDs 失败", e);
            }
        }

        return new TaskInfo(
            task.getId(),
            task.getTaskDescription(),
            agentIds,
            task.getExecutionMode(),
            task.getStatus(),
            results,
            task.getErrorMessage(),
            task.getCreatedAt() != null ? 
                task.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null,
            task.getCompletedAt() != null ? 
                task.getCompletedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null,
            task.getStartedAt() != null ? 
                task.getStartedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null
        );
    }
}
