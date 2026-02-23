package com.iflow.agent.service.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.dto.AgentDto.*;
import com.iflow.agent.entity.AiAgent;
import com.iflow.agent.repository.AiAgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Agent 注册管理服务
 * 负责 Agent 的注册、更新、删除和查询
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentRegistryService {

    private final AiAgentRepository agentRepository;
    private final AgentDetectionService detectionService;
    private final ObjectMapper objectMapper;

    /**
     * 获取所有 Agent
     */
    @Transactional(readOnly = true)
    public AgentListResponse getAllAgents() {
        List<AiAgent> agents = agentRepository.findAll();
        return toAgentListResponse(agents);
    }

    /**
     * 根据状态获取 Agent
     */
    @Transactional(readOnly = true)
    public AgentListResponse getAgentsByStatus(String status) {
        List<AiAgent> agents = agentRepository.findByStatus(status);
        return toAgentListResponse(agents);
    }

    /**
     * 根据类型获取 Agent
     */
    @Transactional(readOnly = true)
    public AgentListResponse getAgentsByType(String type) {
        List<AiAgent> agents = agentRepository.findByType(type);
        return toAgentListResponse(agents);
    }

    /**
     * 获取单个 Agent
     */
    @Transactional(readOnly = true)
    public AgentInfo getAgent(Long id) {
        AiAgent agent = agentRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Agent 不存在，ID: " + id));
        return toAgentInfo(agent);
    }

    /**
     * 注册新 Agent
     */
    @Transactional
    public AgentInfo registerAgent(RegisterAgentRequest request) {
        // 检查是否已存在
        if (request.getCliPath() != null && 
            agentRepository.existsByTypeAndCliPath(request.getType(), request.getCliPath())) {
            throw new IllegalArgumentException("该 Agent 已注册");
        }

        AiAgent agent = new AiAgent();
        agent.setName(request.getName());
        agent.setType(request.getType());
        agent.setCliPath(request.getCliPath());
        agent.setVersion(request.getVersion());
        agent.setStatus("active");
        
        if (request.getConfig() != null) {
            try {
                agent.setConfig(objectMapper.writeValueAsString(request.getConfig()));
            } catch (JsonProcessingException e) {
                log.warn("序列化 Agent 配置失败", e);
            }
        }

        // 设置默认能力
        List<String> defaultCapabilities = getDefaultCapabilities(request.getType());
        try {
            agent.setCapabilities(objectMapper.writeValueAsString(defaultCapabilities));
        } catch (JsonProcessingException e) {
            log.warn("序列化 Agent 能力失败", e);
        }

        AiAgent savedAgent = agentRepository.save(agent);
        log.info("注册新 Agent: {} (类型：{}, ID: {})", request.getName(), request.getType(), savedAgent.getId());
        
        return toAgentInfo(savedAgent);
    }

    /**
     * 更新 Agent
     */
    @Transactional
    public AgentInfo updateAgent(Long id, UpdateAgentRequest request) {
        AiAgent agent = agentRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Agent 不存在，ID: " + id));

        if (request.getName() != null) {
            agent.setName(request.getName());
        }
        if (request.getCliPath() != null) {
            agent.setCliPath(request.getCliPath());
        }
        if (request.getVersion() != null) {
            agent.setVersion(request.getVersion());
        }
        if (request.getConfig() != null) {
            try {
                agent.setConfig(objectMapper.writeValueAsString(request.getConfig()));
            } catch (JsonProcessingException e) {
                log.warn("序列化 Agent 配置失败", e);
            }
        }

        AiAgent updatedAgent = agentRepository.save(agent);
        log.info("更新 Agent: {} (ID: {})", updatedAgent.getName(), id);
        
        return toAgentInfo(updatedAgent);
    }

    /**
     * 删除 Agent
     */
    @Transactional
    public void deleteAgent(Long id) {
        if (!agentRepository.existsById(id)) {
            throw new IllegalArgumentException("Agent 不存在，ID: " + id);
        }
        
        agentRepository.deleteById(id);
        log.info("删除 Agent: ID: {}", id);
    }

    /**
     * 发现并注册所有可用 Agent
     */
    @Transactional
    public DiscoveryResult discoverAndRegister() {
        DiscoveryResult discoveryResult = detectionService.discoverAllAgents();
        
        int registeredCount = 0;
        for (DiscoveredAgent discovered : discoveryResult.getAgents()) {
            // 检查是否已注册
            if (!agentRepository.existsByTypeAndCliPath(discovered.getType(), discovered.getCliPath())) {
                // 自动注册
                RegisterAgentRequest request = new RegisterAgentRequest();
                request.setName(discovered.getType().toUpperCase() + "_Agent");
                request.setType(discovered.getType());
                request.setCliPath(discovered.getCliPath());
                request.setVersion(discovered.getVersion());
                
                try {
                    registerAgent(request);
                    registeredCount++;
                    log.info("自动注册 Agent: {}", discovered.getType());
                } catch (Exception e) {
                    log.warn("自动注册 Agent 失败：{} - {}", discovered.getType(), e.getMessage());
                }
            } else {
                // 更新已注册的 Agent 信息
                Optional<AiAgent> existingOpt = agentRepository.findAll().stream()
                    .filter(a -> a.getType().equals(discovered.getType()) && 
                                 a.getCliPath().equals(discovered.getCliPath()))
                    .findFirst();
                    
                if (existingOpt.isPresent()) {
                    AiAgent existing = existingOpt.get();
                    if (!discovered.getVersion().equals(existing.getVersion())) {
                        existing.setVersion(discovered.getVersion());
                        agentRepository.save(existing);
                    }
                }
            }
        }

        return new DiscoveryResult(
            discoveryResult.getAgents(),
            discoveryResult.getFound(),
            registeredCount
        );
    }

    /**
     * 检查 Agent 健康状态
     */
    @Transactional
    public HealthStatus checkHealth(Long id) {
        AiAgent agent = agentRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Agent 不存在，ID: " + id));

        long startTime = System.currentTimeMillis();
        boolean healthy = false;
        String message = "未知错误";
        String version = null;

        try {
            // 执行版本检查命令
            ProcessBuilder processBuilder = new ProcessBuilder(agent.getCliPath(), "--version");
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            try {
                boolean completed = process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
                if (completed) {
                    healthy = true;
                    message = "Agent 响应正常";
                    try (java.io.BufferedReader reader = new java.io.BufferedReader(
                            new java.io.InputStreamReader(process.getInputStream()))) {
                        version = reader.readLine();
                    }
                } else {
                    message = "Agent 响应超时";
                    process.destroy();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                message = "健康检查被中断";
            }

        } catch (Exception e) {
            message = "无法执行 Agent: " + e.getMessage();
            healthy = false;
        }

        long responseTime = System.currentTimeMillis() - startTime;

        // 更新健康状态
        agent.setLastHealthCheck(LocalDateTime.now());
        agent.setHealthMessage(message);
        agent.setStatus(healthy ? "active" : "error");
        agentRepository.save(agent);

        log.info("Agent 健康检查：{} - 状态：{}", agent.getName(), healthy ? "健康" : "异常");

        return new HealthStatus(healthy, message, responseTime, version);
    }

    /**
     * 搜索 Agent
     */
    @Transactional(readOnly = true)
    public AgentListResponse searchAgents(String keyword) {
        List<AiAgent> agents = agentRepository.searchAgents(keyword);
        return toAgentListResponse(agents);
    }

    /**
     * 转换为 AgentListResponse
     */
    private AgentListResponse toAgentListResponse(List<AiAgent> agents) {
        List<AgentInfo> infos = agents.stream()
            .map(this::toAgentInfo)
            .collect(Collectors.toList());
        return new AgentListResponse(infos, infos.size());
    }

    /**
     * 转换为 AgentInfo
     */
    private AgentInfo toAgentInfo(AiAgent agent) {
        List<String> capabilities = new ArrayList<>();
        if (agent.getCapabilities() != null) {
            try {
                capabilities = objectMapper.readValue(
                    agent.getCapabilities(), 
                    new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {}
                );
            } catch (JsonProcessingException e) {
                log.warn("反序列化 Agent 能力失败", e);
            }
        }

        Long lastHealthCheck = null;
        if (agent.getLastHealthCheck() != null) {
            lastHealthCheck = agent.getLastHealthCheck()
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
        }

        return new AgentInfo(
            agent.getId(),
            agent.getName(),
            agent.getType(),
            agent.getCliPath(),
            agent.getVersion(),
            agent.getStatus(),
            capabilities,
            lastHealthCheck,
            agent.getHealthMessage(),
            agent.getCreatedAt() != null ? 
                agent.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null
        );
    }

    /**
     * 获取默认能力列表
     */
    private List<String> getDefaultCapabilities(String type) {
        return switch (type) {
            case "claude-code" -> List.of("代码生成", "代码审查", "文件操作", "Shell 执行");
            case "gemini-cli" -> List.of("代码生成", "文档分析", "多模态处理");
            case "qwen-code" -> List.of("代码生成", "中文理解", "代码补全");
            case "codex" -> List.of("代码生成", "代码转换", "注释生成");
            case "goose" -> List.of("自动化任务", "工具调用");
            case "iflow" -> List.of("代码生成", "工作流执行", "多模型支持");
            default -> List.of("通用 AI 能力");
        };
    }
}
