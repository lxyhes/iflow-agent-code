package com.iflow.agent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 认证 API - 对应 Python 的认证相关功能
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /**
     * 获取认证状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAuthStatus() {
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", Map.of(
                        "id", "system",
                        "name", "System User",
                        "role", "admin"
                ),
                "timestamp", System.currentTimeMillis()
        ));
    }
}