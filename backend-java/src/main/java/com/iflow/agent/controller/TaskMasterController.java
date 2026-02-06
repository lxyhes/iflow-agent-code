package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 任务管理 API - 对应 Python 的 taskmaster.py
 */
@Slf4j
@RestController
@RequestMapping("/api/taskmaster")
@RequiredArgsConstructor
public class TaskMasterController {

    /**
     * 获取安装状态
     */
    @GetMapping("/installation-status")
    public ResponseEntity<Map<String, Object>> getInstallationStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "installed", true,
                "version", "1.0.0"
        ));
    }

    /**
     * 获取项目任务列表
     */
    @GetMapping("/tasks/{projectName}")
    public ResponseEntity<Map<String, Object>> getTasks(@PathVariable String projectName) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "tasks", List.of(
                        Map.of("id", "task_1", "title", "Implement login", "status", "in_progress", "priority", "high"),
                        Map.of("id", "task_2", "title", "Add tests", "status", "pending", "priority", "medium"),
                        Map.of("id", "task_3", "title", "Update docs", "status", "completed", "priority", "low")
                )
        ));
    }

    /**
     * 创建任务
     */
    @PostMapping("/tasks/{projectName}")
    public ResponseEntity<Map<String, Object>> createTask(
            @PathVariable String projectName,
            @RequestBody Map<String, String> request) {

        String title = request.get("title");
        log.info("Creating task '{}' for project {}", title, projectName);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "task", Map.of(
                        "id", "task_" + System.currentTimeMillis(),
                        "title", title,
                        "status", "pending",
                        "project", projectName
                )
        ));
    }

    /**
     * 更新任务
     */
    @PutMapping("/tasks/{projectName}/{taskId}")
    public ResponseEntity<Map<String, Object>> updateTask(
            @PathVariable String projectName,
            @PathVariable String taskId,
            @RequestBody Map<String, String> request) {

        log.info("Updating task {} in project {}", taskId, projectName);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "task", Map.of(
                        "id", taskId,
                        "title", request.get("title"),
                        "status", request.get("status"),
                        "updated", true
                )
        ));
    }

    /**
     * 删除任务
     */
    @DeleteMapping("/tasks/{projectName}/{taskId}")
    public ResponseEntity<Map<String, Object>> deleteTask(
            @PathVariable String projectName,
            @PathVariable String taskId) {

        log.info("Deleting task {} from project {}", taskId, projectName);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Task deleted"
        ));
    }

    /**
     * 获取 PRD 列表
     */
    @GetMapping("/prd/{projectName}")
    public ResponseEntity<Map<String, Object>> getPrdList(@PathVariable String projectName) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "prds", List.of(
                        Map.of("name", "requirements.md", "updated", "2024-01-15"),
                        Map.of("name", "architecture.md", "updated", "2024-01-10")
                )
        ));
    }

    /**
     * 获取 PRD 内容
     */
    @GetMapping("/prd/{projectName}/{prdName}")
    public ResponseEntity<Map<String, Object>> getPrdContent(
            @PathVariable String projectName,
            @PathVariable String prdName) {

        return ResponseEntity.ok(Map.of(
                "success", true,
                "name", prdName,
                "content", "# Product Requirements Document\n\n## Overview\n\nThis is the PRD content..."
        ));
    }

    /**
     * 保存 PRD
     */
    @PostMapping("/prd/{projectName}")
    public ResponseEntity<Map<String, Object>> savePrd(
            @PathVariable String projectName,
            @RequestBody Map<String, String> request) {

        String name = request.get("name");
        String content = request.get("content");

        log.info("Saving PRD '{}' for project {}", name, projectName);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "PRD saved",
                "name", name
        ));
    }
}
