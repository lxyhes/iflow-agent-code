package com.iflow.agent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 配置 API
 */
@Slf4j
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    /**
     * 获取配置
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getConfig() {
        log.info("获取配置");
        
        Map<String, Object> config = new HashMap<>();
        config.put("version", "1.0.0");
        config.put("apiBaseUrl", "http://localhost:8080");
        config.put("wsUrl", "ws://localhost:8080");
        config.put("features", Map.of(
                "interview", true,
                "workflow", true,
                "cursor", true,
                "mcp", true
        ));
        
        return ResponseEntity.ok(config);
    }

    /**
     * 更新配置
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody Map<String, Object> request) {
        log.info("更新配置: {}", request);
        
        // 这里可以添加配置更新逻辑
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "配置已更新"
        ));
    }
}
