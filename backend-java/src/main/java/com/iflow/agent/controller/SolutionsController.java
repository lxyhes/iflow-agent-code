package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 方案生成器 API - 对应 Python 的 solutions.py
 */
@Slf4j
@RestController
@RequestMapping("/api/solutions")
@RequiredArgsConstructor
public class SolutionsController {

    /**
     * 生成技术方案
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateSolution(@RequestBody Map<String, String> request) {
        String requirement = request.get("requirement");
        log.info("Generating solution for: {}", requirement);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "solution", Map.of(
                        "id", "sol_" + System.currentTimeMillis(),
                        "title", "Solution for " + requirement,
                        "overview", "This is a comprehensive solution...",
                        "architecture", Map.of(
                                "frontend", "React",
                                "backend", "Spring Boot",
                                "database", "PostgreSQL"
                        ),
                        "components", List.of(
                                Map.of("name", "API Gateway", "description", "Entry point for all requests"),
                                Map.of("name", "Auth Service", "description", "Handles authentication"),
                                Map.of("name", "Core Service", "description", "Main business logic")
                        ),
                        "implementation_steps", List.of(
                                "Setup project structure",
                                "Implement core features",
                                "Add authentication",
                                "Deploy to production"
                        )
                )
        ));
    }

    /**
     * 流式生成方案
     */
    @PostMapping("/generate-stream")
    public ResponseEntity<Map<String, Object>> generateSolutionStream(@RequestBody Map<String, String> request) {
        // 简化实现，返回完整方案
        return generateSolution(request);
    }

    /**
     * 获取方案列表
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listSolutions() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "solutions", List.of(
                        Map.of("id", "sol_1", "title", "E-commerce Platform", "status", "active"),
                        Map.of("id", "sol_2", "title", "Blog System", "status", "draft")
                )
        ));
    }

    /**
     * 获取方案模板
     */
    @GetMapping("/templates")
    public ResponseEntity<Map<String, Object>> getTemplates() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "templates", List.of(
                        Map.of("id", "temp_1", "name", "Web Application", "category", "web"),
                        Map.of("id", "temp_2", "name", "Mobile App", "category", "mobile"),
                        Map.of("id", "temp_3", "name", "Microservices", "category", "backend")
                )
        ));
    }

    /**
     * 获取单个方案详情
     */
    @GetMapping("/{solutionId}")
    public ResponseEntity<Map<String, Object>> getSolution(@PathVariable String solutionId) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "solution", Map.of(
                        "id", solutionId,
                        "title", "Sample Solution",
                        "content", "Detailed solution content..."
                )
        ));
    }
}
