package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * MCP Utils API
 */
@Slf4j
@RestController
@RequestMapping("/api/mcp-utils")
@RequiredArgsConstructor
public class McpUtilsController {

    /**
     * TaskMaster Server 状态
     */
    @GetMapping("/taskmaster-server")
    public ResponseEntity<Map<String, Object>> getTaskMasterServer() {
        log.info("获取 TaskMaster Server 状态");
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "running",
                "version", "1.0.0",
                "port", 3001
        ));
    }
}
