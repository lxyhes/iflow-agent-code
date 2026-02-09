package com.iflow.agent.controller;

import com.iflow.agent.domain.project.entity.WorkspaceProject;
import com.iflow.agent.domain.project.entity.ProjectSession;
import com.iflow.agent.domain.project.entity.SessionMessage;
import com.iflow.agent.domain.project.repository.ProjectRepository;
import com.iflow.agent.domain.project.repository.ProjectSessionRepository;
import com.iflow.agent.domain.project.repository.SessionMessageRepository;
import com.iflow.agent.service.file.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 项目管理 API - 对应前端 Node.js Server 的项目功能
 */
@Slf4j
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectManagementController {

    private final ProjectRepository projectRepository;
    private final ProjectSessionRepository sessionRepository;
    private final SessionMessageRepository messageRepository;
    private final FileService fileService;

    // ========== 项目管理 ==========

    /**
     * 获取项目列表
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getProjects() {
        log.info("获取项目列表");
        
        List<WorkspaceProject> projects = projectRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (WorkspaceProject project : projects) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", project.getName());
            item.put("displayName", project.getDisplayName() != null ? project.getDisplayName() : project.getName());
            item.put("path", project.getPath());
            item.put("fullPath", project.getPath()); // 兼容前端
            item.put("description", project.getDescription());
            item.put("createdAt", project.getCreatedAt() != null ? project.getCreatedAt().toString() : null);
            item.put("updatedAt", project.getUpdatedAt() != null ? project.getUpdatedAt().toString() : null);
            
            // 重要：添加空的 sessions 列表，防止前端显示骨架屏
            item.put("sessions", new ArrayList<>());
            item.put("cursorSessions", new ArrayList<>());
            item.put("sessionMeta", Map.of("hasMore", false));
            
            result.add(item);
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * 创建项目
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createProject(@RequestBody Map<String, String> request) {
        String path = request.get("path");
        log.info("创建项目: {}", path);
        
        if (path == null || path.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project path is required"));
        }
        
        path = path.trim();
        File dir = new File(path);
        
        if (!dir.exists()) {
            dir.mkdirs();
        }
        
        String projectName = dir.getName();
        
        if (projectRepository.existsByName(projectName)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project already exists"));
        }
        
        WorkspaceProject project = WorkspaceProject.builder()
                .name(projectName)
                .displayName(projectName)
                .path(path)
                .description("")
                .createdBy("default-user")
                .build();
        
        project = projectRepository.save(project);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "project", Map.of(
                        "name", project.getName(),
                        "displayName", project.getDisplayName(),
                        "path", project.getPath()
                )
        ));
    }

    /**
     * 重命名项目
     */
    @PutMapping("/{projectName}/rename")
    public ResponseEntity<Map<String, Object>> renameProject(
            @PathVariable String projectName,
            @RequestBody Map<String, String> request) {
        String displayName = request.get("displayName");
        log.info("重命名项目 {} -> {}", projectName, displayName);
        
        WorkspaceProject project = projectRepository.findByName(projectName)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        project.setDisplayName(displayName);
        projectRepository.save(project);
        
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 删除项目
     */
    @DeleteMapping("/{projectName}")
    public ResponseEntity<Map<String, Object>> deleteProject(@PathVariable String projectName) {
        log.info("删除项目: {}", projectName);
        
        WorkspaceProject project = projectRepository.findByName(projectName)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        // 删除关联的会话和消息
        List<ProjectSession> sessions = sessionRepository.findByProjectNameOrderByUpdatedAtDesc(projectName);
        for (ProjectSession session : sessions) {
            List<SessionMessage> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
            messageRepository.deleteAll(messages);
        }
        sessionRepository.deleteAll(sessions);
        
        projectRepository.delete(project);
        
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ========== 会话管理 ==========

    /**
     * 获取项目会话列表
     */
    @GetMapping("/{projectName}/sessions")
    public ResponseEntity<Map<String, Object>> getSessions(
            @PathVariable String projectName,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        log.info("获取项目会话: {}, limit={}, offset={}", projectName, limit, offset);
        
        List<ProjectSession> sessions = sessionRepository.findByProjectNameOrderByUpdatedAtDesc(projectName);
        long total = sessions.size();
        
        // 分页
        List<Map<String, Object>> sessionList = new ArrayList<>();
        int endIndex = Math.min(offset + limit, sessions.size());
        for (int i = offset; i < endIndex; i++) {
            ProjectSession session = sessions.get(i);
            Map<String, Object> item = new HashMap<>();
            item.put("id", session.getId());
            item.put("summary", session.getTitle()); // 映射为 summary
            item.put("title", session.getTitle());   // 保留 title
            item.put("model", session.getModel());
            item.put("createdAt", session.getCreatedAt() != null ? session.getCreatedAt().toString() : null);
            item.put("updatedAt", session.getUpdatedAt() != null ? session.getUpdatedAt().toString() : null);
            item.put("lastActivity", session.getUpdatedAt() != null ? session.getUpdatedAt().toString() : null); // 映射为 lastActivity
            sessionList.add(item);
        }
        
        return ResponseEntity.ok(Map.of(
                "sessions", sessionList,
                "total", total,
                "limit", limit,
                "offset", offset
        ));
    }

    /**
     * 创建会话
     */
    @PostMapping("/{projectName}/sessions")
    public ResponseEntity<Map<String, Object>> createSession(
            @PathVariable String projectName,
            @RequestBody Map<String, String> request) {
        String title = request.get("title");
        String model = request.get("model");
        log.info("创建会话: {}, title={}", projectName, title);
        
        ProjectSession session = ProjectSession.builder()
                .projectName(projectName)
                .title(title != null ? title : "New Session")
                .model(model != null ? model : "default")
                .createdBy("default-user")
                .build();
        
        session = sessionRepository.save(session);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "session", Map.of(
                        "id", session.getId(),
                        "title", session.getTitle(),
                        "model", session.getModel()
                )
        ));
    }

    /**
     * 删除会话
     */
    @DeleteMapping("/{projectName}/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> deleteSession(
            @PathVariable String projectName,
            @PathVariable String sessionId) {
        log.info("删除会话: {}", sessionId);
        
        // 删除关联消息
        List<SessionMessage> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        messageRepository.deleteAll(messages);
        
        sessionRepository.deleteById(sessionId);
        
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 获取会话消息
     */
    @GetMapping("/{projectName}/sessions/{sessionId}/messages")
    public ResponseEntity<Map<String, Object>> getSessionMessages(
            @PathVariable String projectName,
            @PathVariable String sessionId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset) {
        log.info("获取会话消息: {}", sessionId);
        
        List<SessionMessage> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        
        List<Map<String, Object>> messageList = new ArrayList<>();
        for (SessionMessage msg : messages) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", msg.getId());
            item.put("role", msg.getRole());
            item.put("content", msg.getContent());
            item.put("createdAt", msg.getCreatedAt() != null ? msg.getCreatedAt().toString() : null);
            messageList.add(item);
        }
        
        return ResponseEntity.ok(Map.of("messages", messageList));
    }

    // ========== 文件操作 ==========

    /**
     * 读取文件
     */
    @GetMapping("/{projectName}/file")
    public ResponseEntity<Map<String, Object>> readFile(
            @PathVariable String projectName,
            @RequestParam String filePath) {
        log.info("读取文件: {}, {}", projectName, filePath);
        
        WorkspaceProject project = projectRepository.findByName(projectName)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        try {
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            File file = path.toFile();
            
            if (!file.exists() || !file.isFile()) {
                return ResponseEntity.status(404).body(Map.of("error", "File not found"));
            }
            
            // 检查文件大小，过大不读取
            long fileSize = file.length();
            if (fileSize > 10 * 1024 * 1024) { // 10MB
                return ResponseEntity.status(400).body(Map.of("error", "File too large (>10MB)"));
            }
            
            String content;
            try {
                content = Files.readString(path, StandardCharsets.UTF_8);
            } catch (java.nio.charset.MalformedInputException e) {
                // 二进制文件，返回特殊标记
                log.warn("Binary file detected: {}, size: {}", path, fileSize);
                return ResponseEntity.ok(Map.of(
                        "content", "[Binary Content - Cannot display]",
                        "path", path.toString(),
                        "isBinary", true,
                        "size", fileSize
                ));
            }
            
            return ResponseEntity.ok(Map.of(
                    "content", content,
                    "path", path.toString()
            ));
        } catch (IOException e) {
            log.error("读取文件失败", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 保存文件
     */
    @PutMapping("/{projectName}/file")
    public ResponseEntity<Map<String, Object>> saveFile(
            @PathVariable String projectName,
            @RequestBody Map<String, String> request) {
        String filePath = request.get("filePath");
        String content = request.get("content");
        log.info("保存文件: {}, {}", projectName, filePath);
        
        WorkspaceProject project = projectRepository.findByName(projectName)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        try {
            Path path = Paths.get(filePath).toAbsolutePath().normalize();
            Files.writeString(path, content);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "path", path.toString()
            ));
        } catch (IOException e) {
            log.error("保存文件失败", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 获取项目文件列表
     */
    @GetMapping("/{projectName}/files")
    public ResponseEntity<List<com.iflow.agent.dto.file.FileTreeNode>> getProjectFiles(@PathVariable String projectName) {
        log.info("获取项目文件: {}", projectName);
        
        WorkspaceProject project = projectRepository.findByName(projectName)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        File projectDir = new File(project.getPath());
        if (!projectDir.exists() || !projectDir.isDirectory()) {
            return ResponseEntity.ok(List.of());
        }
        
        // 使用 FileService 构建文件树
        List<com.iflow.agent.dto.file.FileTreeNode> fileTree = fileService.getTree(project.getPath());
        
        return ResponseEntity.ok(fileTree);
    }

    /**
     * 获取二进制文件内容
     */
    @GetMapping("/{projectName}/files/content")
    public ResponseEntity<byte[]> getBinaryFile(
            @PathVariable String projectName,
            @RequestParam String path) {
        log.info("获取二进制文件: {}, {}", projectName, path);
        
        try {
            Path filePath = Paths.get(path).toAbsolutePath().normalize();
            File file = filePath.toFile();
            
            if (!file.exists() || !file.isFile()) {
                return ResponseEntity.notFound().build();
            }
            
            byte[] content = Files.readAllBytes(filePath);
            
            // 根据文件扩展名设置 Content-Type
            String fileName = file.getName().toLowerCase();
            String contentType = "application/octet-stream";
            if (fileName.endsWith(".png")) contentType = "image/png";
            else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (fileName.endsWith(".gif")) contentType = "image/gif";
            else if (fileName.endsWith(".svg")) contentType = "image/svg+xml";
            
            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .body(content);
        } catch (IOException e) {
            log.error("读取文件失败", e);
            return ResponseEntity.status(500).build();
        }
    }
}
