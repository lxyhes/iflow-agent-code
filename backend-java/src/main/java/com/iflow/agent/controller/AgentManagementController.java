package com.iflow.agent.controller;

import com.iflow.agent.dto.AgentDto.*;
import com.iflow.agent.service.agent.AgentDetectionService;
import com.iflow.agent.service.agent.AgentRegistryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

/**
 * Agent 管理控制器
 * 负责 Agent 的注册、发现、健康检查等管理功能
 */
@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentManagementController {

    private final AgentRegistryService registryService;
    private final AgentDetectionService detectionService;

    /**
     * 获取所有 Agent
     */
    @GetMapping
    public ResponseEntity<AgentListResponse> getAllAgents() {
        log.info("获取所有 Agent");
        return ResponseEntity.ok(registryService.getAllAgents());
    }

    /**
     * 根据状态获取 Agent
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<AgentListResponse> getAgentsByStatus(@PathVariable String status) {
        log.info("获取状态为 {} 的 Agent", status);
        return ResponseEntity.ok(registryService.getAgentsByStatus(status));
    }

    /**
     * 根据类型获取 Agent
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<AgentListResponse> getAgentsByType(@PathVariable String type) {
        log.info("获取类型为 {} 的 Agent", type);
        return ResponseEntity.ok(registryService.getAgentsByType(type));
    }

    /**
     * 获取单个 Agent
     */
    @GetMapping("/{id}")
    public ResponseEntity<AgentInfo> getAgent(@PathVariable Long id) {
        log.info("获取 Agent: ID={}", id);
        return ResponseEntity.ok(registryService.getAgent(id));
    }

    /**
     * 注册新 Agent
     */
    @PostMapping
    public ResponseEntity<AgentInfo> registerAgent(@Valid @RequestBody RegisterAgentRequest request) {
        log.info("注册新 Agent: 名称={}, 类型={}", request.getName(), request.getType());
        return ResponseEntity.ok(registryService.registerAgent(request));
    }

    /**
     * 更新 Agent
     */
    @PutMapping("/{id}")
    public ResponseEntity<AgentInfo> updateAgent(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAgentRequest request) {
        log.info("更新 Agent: ID={}", id);
        return ResponseEntity.ok(registryService.updateAgent(id, request));
    }

    /**
     * 删除 Agent
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAgent(@PathVariable Long id) {
        log.info("删除 Agent: ID={}", id);
        registryService.deleteAgent(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 发现并注册所有可用 Agent
     */
    @PostMapping("/discover")
    public ResponseEntity<DiscoveryResult> discoverAndRegister() {
        log.info("发现并注册所有可用 Agent");
        return ResponseEntity.ok(registryService.discoverAndRegister());
    }

    /**
     * 检测本地 Agent (不注册)
     */
    @GetMapping("/discover/scan")
    public ResponseEntity<DiscoveryResult> discoverAgents() {
        log.info("扫描本地 Agent");
        return ResponseEntity.ok(detectionService.discoverAllAgents());
    }

    /**
     * 检查 Agent 健康状态
     */
    @GetMapping("/{id}/health")
    public ResponseEntity<HealthStatus> checkHealth(@PathVariable Long id) {
        log.info("检查 Agent 健康状态：ID={}", id);
        return ResponseEntity.ok(registryService.checkHealth(id));
    }

    /**
     * 搜索 Agent
     */
    @GetMapping("/search")
    public ResponseEntity<AgentListResponse> searchAgents(
            @RequestParam String keyword) {
        log.info("搜索 Agent: keyword={}", keyword);
        return ResponseEntity.ok(registryService.searchAgents(keyword));
    }

    /**
     * 获取支持的 Agent 类型
     */
    @GetMapping("/supported-types")
    public ResponseEntity<List<String>> getSupportedTypes() {
        log.info("获取支持的 Agent 类型");
        return ResponseEntity.ok(detectionService.getSupportedAgentTypes());
    }
}
