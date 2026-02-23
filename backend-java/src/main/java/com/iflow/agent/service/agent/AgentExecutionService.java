package com.iflow.agent.service.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.dto.MultiAgentDto.AgentExecutionResult;
import com.iflow.agent.entity.AiAgent;
import com.iflow.agent.repository.AiAgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeoutException;

/**
 * Agent 执行服务
 * 负责执行单个 Agent 任务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentExecutionService {

    private final AiAgentRepository agentRepository;
    private final ObjectMapper objectMapper;

    @Value("${agent.execution.timeout:300}")
    private int executionTimeoutSeconds;

    /**
     * 执行单个 Agent 任务
     * @param agentId Agent ID
     * @param prompt 提示词
     * @param context 上下文信息
     * @return 执行结果
     */
    public AgentExecutionResult executeAgent(Long agentId, String prompt, String context) {
        log.info("执行 Agent 任务：Agent ID={}, Prompt 长度={}", agentId, prompt != null ? prompt.length() : 0);

        AiAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new IllegalArgumentException("Agent 不存在，ID: " + agentId));

        if (!"active".equals(agent.getStatus())) {
            throw new IllegalStateException("Agent 未激活，当前状态：" + agent.getStatus());
        }

        long startTime = System.currentTimeMillis();
        String result = null;
        String error = null;

        try {
            // 构建执行命令
            List<String> command = buildExecutionCommand(agent, prompt, context);
            
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            processBuilder.environment().put("AGENT_NAME", agent.getName());
            processBuilder.environment().put("AGENT_TYPE", agent.getType());

            Process process = processBuilder.start();

            // 读取输出
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            // 等待完成 (带超时)
            boolean completed = process.waitFor(executionTimeoutSeconds, java.util.concurrent.TimeUnit.SECONDS);
            if (!completed) {
                process.destroy();
                throw new TimeoutException("Agent 执行超时 (" + executionTimeoutSeconds + "秒)");
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                error = "Agent 执行失败，退出码：" + exitCode;
            } else {
                result = output.toString();
            }

        } catch (Exception e) {
            error = "Agent 执行异常：" + e.getMessage();
            log.error("Agent 执行失败", e);
        }

        long executionTime = System.currentTimeMillis() - startTime;

        return new AgentExecutionResult(
            agentId,
            agent.getName(),
            result,
            error,
            executionTime,
            null // Token usage 需要从 Agent 输出中解析
        );
    }

    /**
     * 流式执行 Agent 任务
     * @param agentId Agent ID
     * @param prompt 提示词
     * @param context 上下文信息
     * @return 流式响应
     */
    public Flux<String> executeAgentStream(Long agentId, String prompt, String context) {
        log.info("流式执行 Agent 任务：Agent ID={}", agentId);

        AiAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new IllegalArgumentException("Agent 不存在，ID: " + agentId));

        return Flux.create(emitter -> {
            try {
                List<String> command = buildExecutionCommand(agent, prompt, context);
                
                ProcessBuilder processBuilder = new ProcessBuilder(command);
                processBuilder.redirectErrorStream(true);
                Process process = processBuilder.start();

                // 异步读取输出
                new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        String line;
                        while ((line = reader.readLine()) != null && !emitter.isCancelled()) {
                            emitter.next(line + "\n");
                        }
                        emitter.complete();
                    } catch (IOException e) {
                        emitter.error(e);
                    }
                }).start();

                // 监控进程结束
                new Thread(() -> {
                    try {
                        boolean completed = process.waitFor(executionTimeoutSeconds, java.util.concurrent.TimeUnit.SECONDS);
                        if (!completed) {
                            process.destroy();
                            emitter.error(new TimeoutException("Agent 执行超时"));
                        } else if (process.exitValue() != 0) {
                            emitter.error(new RuntimeException("Agent 执行失败，退出码：" + process.exitValue()));
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        emitter.error(e);
                    }
                }).start();

            } catch (IOException e) {
                emitter.error(e);
            }
        })
        .timeout(Duration.ofSeconds(executionTimeoutSeconds))
        .doOnError(e -> log.error("流式执行失败", e))
        .map(Object::toString);
    }

    /**
     * 批量执行 Agent 任务 (并行)
     * @param agentIds Agent ID 列表
     * @param prompt 提示词
     * @param context 上下文信息
     * @return 执行结果列表
     */
    public List<AgentExecutionResult> executeBatch(List<Long> agentIds, String prompt, String context) {
        log.info("批量执行 Agent 任务：Agents={}, 数量={}", agentIds, agentIds.size());

        Map<Long, AgentExecutionResult> results = new ConcurrentHashMap<>();
        List<Thread> threads = new ArrayList<>();

        for (Long agentId : agentIds) {
            Thread thread = new Thread(() -> {
                try {
                    AgentExecutionResult result = executeAgent(agentId, prompt, context);
                    results.put(agentId, result);
                } catch (Exception e) {
                    log.error("Agent 执行失败：ID={}", agentId, e);
                    results.put(agentId, new AgentExecutionResult(
                        agentId,
                        "Unknown",
                        null,
                        e.getMessage(),
                        0L,
                        null
                    ));
                }
            });
            threads.add(thread);
            thread.start();
        }

        // 等待所有线程完成
        for (Thread thread : threads) {
            try {
                thread.join();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("等待线程完成时被中断", e);
            }
        }

        return new ArrayList<>(results.values());
    }

    /**
     * 构建执行命令
     */
    private List<String> buildExecutionCommand(AiAgent agent, String prompt, String context) {
        List<String> command = new ArrayList<>();

        switch (agent.getType()) {
            case "claude-code":
                command.add("claude");
                if (prompt != null) {
                    command.add("--prompt");
                    command.add(prompt);
                }
                break;

            case "gemini-cli":
                command.add("gemini");
                if (prompt != null) {
                    command.add("-p");
                    command.add(prompt);
                }
                break;

            case "qwen-code":
                command.add("qwen");
                if (prompt != null) {
                    command.add("--input");
                    command.add(prompt);
                }
                break;

            case "iflow":
                command.add("iflow");
                command.add("--experimental-acp");
                if (prompt != null) {
                    command.add("--prompt");
                    command.add(prompt);
                }
                break;

            default:
                // 通用命令：直接执行 CLI 路径
                if (agent.getCliPath() != null) {
                    command.add(agent.getCliPath());
                } else {
                    command.add(agent.getType());
                }
                if (prompt != null) {
                    command.add(prompt);
                }
        }

        // 添加上下文 (如果有)
        if (context != null && !context.isEmpty()) {
            command.add("--context");
            command.add(context);
        }

        return command;
    }

    /**
     * 检查 Agent 是否可用
     */
    public boolean isAgentAvailable(Long agentId) {
        Optional<AiAgent> agentOpt = agentRepository.findById(agentId);
        if (agentOpt.isEmpty()) {
            return false;
        }

        AiAgent agent = agentOpt.get();
        return "active".equals(agent.getStatus()) && agent.getCliPath() != null;
    }

    /**
     * 获取 Agent 执行状态
     */
    public Map<String, Object> getExecutionStatus(Long agentId) {
        Map<String, Object> status = new HashMap<>();
        
        Optional<AiAgent> agentOpt = agentRepository.findById(agentId);
        if (agentOpt.isEmpty()) {
            status.put("available", false);
            status.put("error", "Agent 不存在");
            return status;
        }

        AiAgent agent = agentOpt.get();
        status.put("available", true);
        status.put("id", agent.getId());
        status.put("name", agent.getName());
        status.put("type", agent.getType());
        status.put("status", agent.getStatus());
        status.put("cliPath", agent.getCliPath());
        status.put("version", agent.getVersion());
        status.put("lastHealthCheck", agent.getLastHealthCheck());

        return status;
    }
}
