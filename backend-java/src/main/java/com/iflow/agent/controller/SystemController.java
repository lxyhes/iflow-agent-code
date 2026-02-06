package com.iflow.agent.controller;

import com.iflow.agent.domain.database.repository.DatabaseConfigRepository;
import com.iflow.agent.domain.document.repository.DocumentVersionRepository;
import com.iflow.agent.domain.interview.repository.InterviewSessionRepository;
import com.iflow.agent.domain.interview.repository.PracticeSessionRepository;
import com.iflow.agent.domain.resume.repository.ResumeRepository;
import com.iflow.agent.domain.workflow.repository.WorkflowExecutionRepository;
import com.iflow.agent.domain.workflow.repository.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
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
    private final ResumeRepository resumeRepository;
    private final InterviewSessionRepository interviewSessionRepository;
    private final PracticeSessionRepository practiceSessionRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final DatabaseConfigRepository databaseConfigRepository;

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
        RuntimeMXBean runtimeMXBean = ManagementFactory.getRuntimeMXBean();
        MemoryMXBean memoryMXBean = ManagementFactory.getMemoryMXBean();

        // 数据库统计
        long resumeCount = resumeRepository.count();
        long interviewCount = interviewSessionRepository.count();
        long practiceCount = practiceSessionRepository.count();
        long workflowCount = workflowRepository.count();
        long executionCount = workflowExecutionRepository.count();
        long docVersionCount = documentVersionRepository.count();
        long dbConfigCount = databaseConfigRepository.count();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "stats", Map.of(
                        "timestamp", Instant.now().toString(),
                        "uptime", getUptime(),
                        "jvm", Map.of(
                                "uptime_ms", runtimeMXBean.getUptime(),
                                "start_time", runtimeMXBean.getStartTime(),
                                "vm_name", runtimeMXBean.getVmName(),
                                "vm_version", runtimeMXBean.getVmVersion()
                        ),
                        "memory", Map.of(
                                "total", runtime.totalMemory(),
                                "free", runtime.freeMemory(),
                                "used", runtime.totalMemory() - runtime.freeMemory(),
                                "max", runtime.maxMemory(),
                                "heap_used", memoryMXBean.getHeapMemoryUsage().getUsed(),
                                "heap_max", memoryMXBean.getHeapMemoryUsage().getMax(),
                                "non_heap_used", memoryMXBean.getNonHeapMemoryUsage().getUsed()
                        ),
                        "processors", runtime.availableProcessors(),
                        "database_stats", Map.of(
                                "resumes", resumeCount,
                                "interviews", interviewCount,
                                "practice_sessions", practiceCount,
                                "workflows", workflowCount,
                                "workflow_executions", executionCount,
                                "document_versions", docVersionCount,
                                "database_configs", dbConfigCount
                        ),
                        "total_records", resumeCount + interviewCount + practiceCount +
                                workflowCount + executionCount + docVersionCount + dbConfigCount
                )
        ));
    }

    // ========== 私有方法 ==========

    private long getUptime() {
        return System.currentTimeMillis() - startTime.toEpochMilli();
    }
}
