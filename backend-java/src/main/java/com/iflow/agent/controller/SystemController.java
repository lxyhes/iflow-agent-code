package com.iflow.agent.controller;

import com.iflow.agent.domain.database.repository.DatabaseConfigRepository;
import com.iflow.agent.domain.document.repository.DocumentVersionRepository;
import com.iflow.agent.domain.interview.repository.InterviewSessionRepository;
import com.iflow.agent.domain.interview.repository.PracticeSessionRepository;
import com.iflow.agent.domain.resume.repository.ResumeRepository;
import com.iflow.agent.domain.workflow.repository.WorkflowExecutionRepository;
import com.iflow.agent.domain.workflow.repository.WorkflowRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
                        "name", "AI 工作台后端",
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

    // ========== 端口扫描和进程管理 ==========

    @Data
    public static class PortScanRequest {
        private List<Integer> ports;
    }

    @Data
    public static class PortScanResult {
        private Integer port;
        private Integer pid;
        private String processName;
        private String status;
        private String address;
    }

    @Data
    public static class KillProcessRequest {
        private Integer port;
    }

    /**
     * 扫描端口占用情况
     */
    @PostMapping("/scan-ports")
    public ResponseEntity<Map<String, Object>> scanPorts(@RequestBody PortScanRequest request) {
        try {
            List<Integer> ports = request.getPorts();
            if (ports == null || ports.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "No ports specified"
                ));
            }

            List<PortScanResult> results = new ArrayList<>();
            for (Integer port : ports) {
                PortScanResult result = scanPort(port);
                if (result != null) {
                    results.add(result);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "results", results,
                    "total", results.size()
            ));
        } catch (Exception e) {
            log.error("Failed to scan ports", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * 重启占用指定端口的进程
     */
    @PostMapping("/restart-process")
    public ResponseEntity<Map<String, Object>> restartProcess(@RequestBody KillProcessRequest request) {
        try {
            Integer port = request.getPort();
            if (port == null || port <= 0 || port > 65535) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid port number"
                ));
            }

            PortScanResult portInfo = scanPort(port);
            if (portInfo == null || portInfo.getPid() == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Port " + port + " is not in use"
                ));
            }

            // 先终止进程
            boolean killed = killProcessByPid(portInfo.getPid());
            if (!killed) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Failed to kill process before restart",
                        "pid", portInfo.getPid(),
                        "port", port
                ));
            }

            // 等待一段时间让端口释放
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            // 重新启动服务（根据端口号执行相应的启动命令）
            boolean restarted = restartService(port);
            if (restarted) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Service restarted successfully",
                        "pid", portInfo.getPid(),
                        "port", port
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Process killed but service restart failed. Please restart manually.",
                        "pid", portInfo.getPid(),
                        "port", port
                ));
            }
        } catch (Exception e) {
            log.error("Failed to restart process", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * 根据端口重新启动服务
     */
    private boolean restartService(int port) {
        try {
            String os = System.getProperty("os.name").toLowerCase();
            
            // 1. 通过进程名称和端口获取进程信息
            PortScanResult portInfo = scanPort(port);
            if (portInfo == null) {
                log.warn("No process found on port {}", port);
                return false;
            }
            
            String processName = portInfo.getProcessName();
            log.info("Found process on port {}: {} (PID: {})", port, processName, portInfo.getPid());
            
            // 2. 根据进程名称和端口号推断项目类型和工作目录
            String workingDir = null;
            String command = null;
            
            // 通过 PID 获取进程的工作目录
            String processDir = getProcessWorkingDirectory(portInfo.getPid(), os);
            if (processDir != null) {
                log.info("Process working directory: {}", processDir);
                workingDir = processDir;
            }
            
            // 根据进程名称和端口判断项目类型
            if (processName != null) {
                processName = processName.toLowerCase();
                
                // Java 应用
                if (processName.contains("java") || processName.endsWith(".jar")) {
                    if (workingDir == null) {
                        // 如果无法获取工作目录，尝试从常见位置推断
                        workingDir = findJavaProjectDirectory(port);
                    }
                    command = "mvn spring-boot:run";
                    // 也可以用: command = "java -jar target/*.jar";
                }
                // Node.js 应用
                else if (processName.contains("node")) {
                    if (workingDir == null) {
                        workingDir = findNodeProjectDirectory(port);
                    }
                    command = "npm run dev";
                }
                // Python 应用
                else if (processName.contains("python")) {
                    if (workingDir == null) {
                        workingDir = findPythonProjectDirectory(port);
                    }
                    command = "python server.py";
                }
            }
            
            // 如果通过进程名称无法识别，尝试通过端口推断
            if (command == null) {
                switch (port) {
                    case 8080:
                        workingDir = findJavaProjectDirectory(port);
                        command = "mvn spring-boot:run";
                        break;
                    case 5173:
                    case 3000:
                    case 3001:
                        workingDir = findNodeProjectDirectory(port);
                        command = "npm run dev";
                        break;
                    case 8000:
                        workingDir = findPythonProjectDirectory(port);
                        command = "python server.py";
                        break;
                    default:
                        log.warn("Cannot determine service type for port {}", port);
                        return false;
                }
            }
            
            if (command != null && workingDir != null) {
                log.info("Restarting service: dir={}, command={}", workingDir, command);
                
                ProcessBuilder pb = new ProcessBuilder();
                pb.directory(new java.io.File(workingDir));
                
                if (os.contains("win")) {
                    // Windows: 启动新窗口执行命令
                    pb.command("cmd", "/c", "start", "cmd", "/k", command);
                } else {
                    // Linux/Mac: 使用 nohup 在后台执行
                    pb.command("bash", "-c", "nohup " + command + " > /dev/null 2>&1 &");
                }
                
                Process process = pb.start();
                
                // 等待一下确保命令已启动
                Thread.sleep(500);
                
                log.info("Service restart command executed successfully for port {}", port);
                return true;
            }
            
            log.warn("Could not determine restart parameters for port {}", port);
            return false;
        } catch (Exception e) {
            log.error("Failed to restart service on port {}", port, e);
            return false;
        }
    }
    
    /**
     * 获取进程的工作目录
     */
    private String getProcessWorkingDirectory(int pid, String os) {
        try {
            String command;
            if (os.contains("win")) {
                // Windows: 使用 wmic 获取进程命令行
                command = "wmic process where \"ProcessId=" + pid + "\" get CommandLine /value";
            } else {
                // Linux/Mac: 使用 pwdx 或 lsof
                command = "pwdx " + pid;
            }
            
            Process process = Runtime.getRuntime().exec(
                os.contains("win") ? new String[]{"cmd", "/c", command} : new String[]{"bash", "-c", command}
            );
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            
            while ((line = reader.readLine()) != null) {
                if (os.contains("win")) {
                    // Windows 格式: CommandLine="C:\path\to\java.exe ..."
                    if (line.contains("CommandLine=")) {
                        String cmdLine = line.substring("CommandLine=".length());
                        // 从命令行中提取工作目录
                        if (cmdLine.contains("\\")) {
                            // 提取第一个可执行文件的路径
                            int endIdx = cmdLine.indexOf(".exe");
                            if (endIdx > 0) {
                                String exePath = cmdLine.substring(0, endIdx + 4);
                                if (exePath.startsWith("\"")) {
                                    exePath = exePath.substring(1);
                                }
                                java.io.File exeFile = new java.io.File(exePath);
                                if (exeFile.exists()) {
                                    return exeFile.getParent();
                                }
                            }
                        }
                    }
                } else {
                    // Linux/Mac 格式: pid: /path/to/dir
                    if (line.contains(":")) {
                        String[] parts = line.split(":");
                        if (parts.length >= 2) {
                            return parts[1].trim();
                        }
                    }
                }
            }
            
            process.waitFor();
            reader.close();
        } catch (Exception e) {
            log.error("Failed to get working directory for PID {}", pid, e);
        }
        return null;
    }
    
    /**
     * 查找 Java 项目目录（根据端口）
     */
    private String findJavaProjectDirectory(int port) {
        // 尝试从项目根目录查找 Java 项目
        String[] possiblePaths = {
            "E:\\zhihui-soft\\agent_project\\backend-java",
            "./backend-java",
            "./backend"
        };
        
        for (String path : possiblePaths) {
            java.io.File dir = new java.io.File(path);
            if (dir.exists() && new java.io.File(dir, "pom.xml").exists()) {
                log.info("Found Java project directory: {}", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
        }
        
        return null;
    }
    
    /**
     * 查找 Node.js 项目目录（根据端口）
     */
    private String findNodeProjectDirectory(int port) {
        String[] possiblePaths = {
            "E:\\zhihui-soft\\agent_project\\frontend",
            "./frontend",
            "."
        };
        
        for (String path : possiblePaths) {
            java.io.File dir = new java.io.File(path);
            if (dir.exists() && new java.io.File(dir, "package.json").exists()) {
                log.info("Found Node.js project directory: {}", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
        }
        
        return null;
    }
    
    /**
     * 查找 Python 项目目录（根据端口）
     */
    private String findPythonProjectDirectory(int port) {
        String[] possiblePaths = {
            "E:\\zhihui-soft\\agent_project\\backend",
            "./backend",
            "."
        };
        
        for (String path : possiblePaths) {
            java.io.File dir = new java.io.File(path);
            if (dir.exists() && (new java.io.File(dir, "server.py").exists() || 
                                   new java.io.File(dir, "requirements.txt").exists())) {
                log.info("Found Python project directory: {}", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
        }
        
        return null;
    }
    @PostMapping("/kill-process")
    public ResponseEntity<Map<String, Object>> killProcess(@RequestBody KillProcessRequest request) {
        try {
            Integer port = request.getPort();
            if (port == null || port <= 0 || port > 65535) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid port number"
                ));
            }

            PortScanResult portInfo = scanPort(port);
            if (portInfo == null || portInfo.getPid() == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Port " + port + " is not in use"
                ));
            }

            boolean killed = killProcessByPid(portInfo.getPid());
            if (killed) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Process killed successfully",
                        "pid", portInfo.getPid(),
                        "port", port
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Failed to kill process",
                        "pid", portInfo.getPid(),
                        "port", port
                ));
            }
        } catch (Exception e) {
            log.error("Failed to kill process", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * 扫描单个端口
     */
    private PortScanResult scanPort(int port) {
        try {
            // Windows 使用 netstat 命令
            String os = System.getProperty("os.name").toLowerCase();
            String command;
            
            if (os.contains("win")) {
                command = "netstat -ano | findstr :" + port;
            } else {
                command = "netstat -tuln | grep :" + port;
            }

            Process process = Runtime.getRuntime().exec(
                    os.contains("win") ? new String[]{"cmd", "/c", command} : new String[]{"bash", "-c", command}
            );

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            Pattern pattern = Pattern.compile(
                    os.contains("win") 
                            ? "^\\s*(TCP|UDP)\\s+[^:]+:" + port + "\\s+[^\\s]+\\s+([A-Z]+)\\s+(\\d+)"
                            : ".*?:" + port + ".*?(\\d+)/.*"
            );

            while ((line = reader.readLine()) != null) {
                Matcher matcher = pattern.matcher(line);
                if (matcher.find()) {
                    PortScanResult result = new PortScanResult();
                    result.setPort(port);
                    result.setStatus(os.contains("win") ? matcher.group(2).toLowerCase() : "listening");
                    result.setPid(os.contains("win") ? Integer.parseInt(matcher.group(3)) : Integer.parseInt(matcher.group(1)));
                    result.setProcessName(getProcessName(result.getPid()));
                    return result;
                }
            }

            process.waitFor();
            reader.close();
        } catch (Exception e) {
            log.error("Failed to scan port {}", port, e);
        }
        return null;
    }

    /**
     * 获取进程名称
     */
    private String getProcessName(int pid) {
        try {
            String os = System.getProperty("os.name").toLowerCase();
            String command;
            
            if (os.contains("win")) {
                command = "tasklist /FI \"PID eq " + pid + "\" /FO CSV /NH";
            } else {
                command = "ps -p " + pid + " -o comm=";
            }

            Process process = Runtime.getRuntime().exec(
                    os.contains("win") ? new String[]{"cmd", "/c", command} : new String[]{"bash", "-c", command}
            );

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            
            if (line != null) {
                if (os.contains("win")) {
                    // Windows CSV 格式: "process_name","pid","session_name","mem_usage"
                    String[] parts = line.split("\",\"");
                    if (parts.length > 0) {
                        return parts[0].replace("\"", "");
                    }
                } else {
                    return line.trim();
                }
            }

            process.waitFor();
            reader.close();
        } catch (Exception e) {
            log.error("Failed to get process name for pid {}", pid, e);
        }
        return "unknown";
    }

    /**
     * 通过 PID 终止进程
     */
    private boolean killProcessByPid(int pid) {
        try {
            String os = System.getProperty("os.name").toLowerCase();
            String command;
            
            if (os.contains("win")) {
                command = "taskkill /F /PID " + pid;
            } else {
                command = "kill -9 " + pid;
            }

            Process process = Runtime.getRuntime().exec(
                    os.contains("win") ? new String[]{"cmd", "/c", command} : new String[]{"bash", "-c", command}
            );

            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            log.error("Failed to kill process with pid {}", pid, e);
            return false;
        }
    }

    /**
     * 获取端口对应的日志
     */
    @GetMapping("/port-logs")
    public ResponseEntity<Map<String, Object>> getPortLogs(@RequestParam int port) {
        try {
            // 根据端口号推断日志文件路径
            String logPath = null;
            String os = System.getProperty("os.name").toLowerCase();
            
            // 常见端口对应的日志文件
            if (port == 8080) {
                // Java 后端日志
                logPath = "logs/backend.log";
            } else if (port == 5173) {
                // 前端日志
                logPath = "logs/frontend.log";
            } else if (port == 8000) {
                // Python 后端日志
                logPath = "logs/python_backend.log";
            }
            
            if (logPath == null) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Unknown port, cannot determine log file location",
                        "logs", ""
                ));
            }
            
            java.io.File logFile = new java.io.File(logPath);
            if (!logFile.exists()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Log file not found: " + logPath,
                        "logs", ""
                ));
            }
            
            // 读取日志文件内容（最后 100 行）
            List<String> logLines = new java.util.ArrayList<>();
            try (BufferedReader reader = new BufferedReader(new java.io.FileReader(logFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logLines.add(line);
                }
            }
            
            // 只返回最后 100 行
            int startIndex = Math.max(0, logLines.size() - 100);
            List<String> recentLogs = logLines.subList(startIndex, logLines.size());
            
            String logs = String.join("\n", recentLogs);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Logs retrieved successfully",
                    "logs", logs,
                    "lineCount", recentLogs.size()
            ));
        } catch (Exception e) {
            log.error("Failed to get logs for port {}", port, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "logs", ""
            ));
        }
    }
}
