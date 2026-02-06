package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 项目管理 API
 */
@Slf4j
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    /**
     * 获取项目列表
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getProjects() {
        log.info("获取项目列表");
        
        // 返回空列表，实际应该从数据库或文件系统读取
        return ResponseEntity.ok(List.of());
    }

    /**
     * 获取项目详情
     */
    @GetMapping("/{projectName}")
    public ResponseEntity<Map<String, Object>> getProject(@PathVariable String projectName) {
        log.info("获取项目详情: {}", projectName);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "project", Map.of(
                        "name", projectName,
                        "path", "./projects/" + projectName,
                        "created_at", "2024-01-01",
                        "updated_at", "2024-01-01"
                )
        ));
    }

    /**
     * 创建项目
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createProject(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        log.info("创建项目: {}", name);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "项目创建成功",
                "project", Map.of(
                        "name", name,
                        "path", "./projects/" + name
                )
        ));
    }

    /**
     * 删除项目
     */
    @DeleteMapping("/{projectName}")
    public ResponseEntity<Map<String, Object>> deleteProject(@PathVariable String projectName) {
        log.info("删除项目: {}", projectName);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "项目删除成功"
        ));
    }
}
