package com.iflow.agent.controller;

import com.iflow.agent.service.mcp.McpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * MCP 服务器配置 API
 * 提供与 Python 后端兼容的 /api/mcp/* 端点
 */
@Slf4j
@RestController
@RequestMapping("/api/mcp")
@RequiredArgsConstructor
public class McpController {

    private final McpService mcpService;

    /**
     * 获取 MCP 服务器列表
     * GET /api/mcp/servers
     */
    @GetMapping("/servers")
    public ResponseEntity<Map<String, Object>> getMcpServers(
            @RequestParam(defaultValue = "user") String scope) {
        log.info("获取 MCP 服务器列表, scope={}", scope);
        
        try {
            List<Map<String, Object>> servers = mcpService.getMcpServers();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "servers", servers
            ));
        } catch (Exception e) {
            log.error("获取 MCP 服务器失败", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "servers", List.of()
            ));
        }
    }

    /**
     * 测试 MCP 服务器连接
     * GET /api/mcp/servers/{serverId}/test
     */
    @GetMapping("/servers/{serverId}/test")
    public ResponseEntity<Map<String, Object>> testMcpServer(
            @PathVariable String serverId,
            @RequestParam(defaultValue = "user") String scope) {
        log.info("测试 MCP 服务器连接: {}, scope={}", serverId, scope);
        
        try {
            Map<String, Object> result = mcpService.testMcpServer(serverId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("测试 MCP 服务器失败", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取 MCP 服务器工具列表
     * GET /api/mcp/servers/{serverId}/tools
     */
    @GetMapping("/servers/{serverId}/tools")
    public ResponseEntity<Map<String, Object>> getMcpServerTools(
            @PathVariable String serverId,
            @RequestParam(defaultValue = "user") String scope) {
        log.info("获取 MCP 服务器工具: {}, scope={}", serverId, scope);
        
        try {
            List<Map<String, Object>> tools = mcpService.getMcpServerTools(serverId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "tools", tools
            ));
        } catch (Exception e) {
            log.error("获取 MCP 服务器工具失败", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "tools", List.of()
            ));
        }
    }
}
