package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 技术框架 API - 对应 Python 的 frameworks.py
 */
@Slf4j
@RestController
@RequestMapping("/api/frameworks")
@RequiredArgsConstructor
public class FrameworksController {

    /**
     * 获取框架状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "active",
                "supported_frameworks", List.of("Spring Boot", "React", "Vue", "Django", "Flask")
        ));
    }

    /**
     * 推荐技术栈
     */
    @PostMapping("/recommend")
    public ResponseEntity<Map<String, Object>> recommend(@RequestBody Map<String, String> request) {
        String projectType = request.get("project_type");
        log.info("Recommending tech stack for: {}", projectType);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "recommendations", List.of(
                        Map.of(
                                "category", "backend",
                                "framework", "Spring Boot",
                                "reason", "Best for enterprise Java applications"
                        ),
                        Map.of(
                                "category", "frontend",
                                "framework", "React",
                                "reason", "Popular with large community"
                        ),
                        Map.of(
                                "category", "database",
                                "framework", "PostgreSQL",
                                "reason", "Reliable and feature-rich"
                        )
                )
        ));
    }

    /**
     * 获取提供商计划
     */
    @GetMapping("/providers/plan")
    public ResponseEntity<Map<String, Object>> getProviderPlan() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "providers", List.of(
                        Map.of("name", "AWS", "services", List.of("EC2", "RDS", "S3")),
                        Map.of("name", "Azure", "services", List.of("VM", "SQL Database", "Blob Storage")),
                        Map.of("name", "GCP", "services", List.of("Compute Engine", "Cloud SQL", "Cloud Storage"))
                )
        ));
    }
}
