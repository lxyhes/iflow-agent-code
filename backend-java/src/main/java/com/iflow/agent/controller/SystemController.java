package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 系统 API - 对应 Python 的 system.py
 */
@Slf4j
@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {

    private final Instant startTime = Instant.now();

    /**
     * 健康检查
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "timestamp", Instant.now().toString(),
                "uptime", getUptime()
        ));
    }

    /**
     * 系统信息
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        RuntimeMXBean runtimeMXBean = ManagementFactory.getRuntimeMXBean();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                        "name", "IFlow Agent Backend",
                        "version", "1.0.0",
                        "java_version", System.getProperty("java.version"),
                        "os_name", System.getProperty("os.name"),
                        "os_version", System.getProperty("os.version"),
                        "start_time", startTime.toString(),
                        "uptime", getUptime()
                )
        ));
    }

    /**
     * 服务列表
     */
    @GetMapping("/services")
    public ResponseEntity<Map<String, Object>> services() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "services", List.of(
                        Map.of("name", "resume", "status", "active"),
                        Map.of("name", "interview", "status", "active"),
                        Map.of("name", "job-analysis", "status", "active"),
                        Map.of("name", "rag", "status", "active"),
                        Map.of("name", "ocr", "status", "active"),
                        Map.of("name", "files", "status", "active")
                )
        ));
    }

    /**
     * 项目列表
     */
    @GetMapping("/projects")
    public ResponseEntity<Map<String, Object>> projects() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "projects", List.of()
        ));
    }

    /**
     * 重新加载项目
     */
    @PostMapping("/reload-projects")
    public ResponseEntity<Map<String, Object>> reloadProjects() {
        log.info("Reloading projects...");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Projects reloaded"
        ));
    }

    /**
     * 系统配置
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "config", Map.of(
                        "max_file_size", 100 * 1024 * 1024,
                        "supported_languages", List.of("java", "python", "javascript", "typescript"),
                        "features", Map.of(
                                "resume", true,
                                "interview", true,
                                "rag", true,
                                "ocr", true
                        )
                )
        ));
    }

    /**
     * 系统统计
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        Runtime runtime = Runtime.getRuntime();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "stats", Map.of(
                        "uptime", getUptime(),
                        "memory", Map.of(
                                "total", runtime.totalMemory(),
                                "free", runtime.freeMemory(),
                                "used", runtime.totalMemory() - runtime.freeMemory(),
                                "max", runtime.maxMemory()
                        ),
                        "processors", runtime.availableProcessors()
                )
        ));
    }

    // ========== 私有方法 ==========

    private long getUptime() {
        return System.currentTimeMillis() - startTime.toEpochMilli();
    }
}
