package com.iflow.agent.controller;

import com.iflow.agent.dto.file.FileTreeNode;
import com.iflow.agent.dto.file.SaveFileRequest;
import com.iflow.agent.service.file.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.util.List;
import java.util.Map;

/**
 * 文件管理 API - 对应 Python 的 files.py
 */
@Slf4j
@RestController
@RequestMapping("/api/projects/{projectName}")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @Value("${file.base-path:./projects}")
    private String basePath;

    /**
     * 获取项目文件树
     */
    @GetMapping("/files")
    public ResponseEntity<Map<String, Object>> getProjectFiles(@PathVariable String projectName) {
        log.info("获取项目文件树: {}", projectName);

        String rootPath = basePath + "/" + projectName;
        List<FileTreeNode> tree = fileService.getTree(rootPath);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", tree
        ));
    }

    /**
     * 读取文件内容
     */
    @GetMapping("/file")
    public ResponseEntity<Map<String, Object>> readProjectFile(
            @PathVariable String projectName,
            @RequestParam String filePath) {

        log.info("读取文件: project={}, path={}", projectName, filePath);

        try {
            String rootPath = basePath + "/" + projectName;
            String content = fileService.readFile(rootPath, filePath);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "content", content
            ));

        } catch (NoSuchFileException e) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "File not found"
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取文件内容（用于下载）
     */
    @GetMapping("/files/content")
    public ResponseEntity<Resource> getFileContent(
            @PathVariable String projectName,
            @RequestParam String filePath) {

        log.info("获取文件内容: project={}, path={}", projectName, filePath);

        try {
            String rootPath = basePath + "/" + projectName;
            Resource resource = fileService.getFileResource(rootPath, filePath);

            // 猜测 Content-Type
            String contentType = "application/octet-stream";
            try {
                contentType = java.nio.file.Files.probeContentType(
                        java.nio.file.Paths.get(filePath));
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
            } catch (Exception e) {
                // 使用默认类型
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filePath + "\"")
                    .body(resource);

        } catch (NoSuchFileException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("获取文件内容失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 保存文件
     */
    @PutMapping("/file")
    public ResponseEntity<Map<String, Object>> saveProjectFile(
            @PathVariable String projectName,
            @RequestBody SaveFileRequest request) {

        log.info("保存文件: project={}, path={}", projectName, request.getFilePath());

        try {
            String rootPath = basePath + "/" + projectName;
            fileService.writeFile(rootPath, request.getFilePath(), request.getContent());

            int contentSize = request.getContent().getBytes().length;
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "success",
                    "size", contentSize
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 删除文件
     */
    @DeleteMapping("/file")
    public ResponseEntity<Map<String, Object>> deleteProjectFile(
            @PathVariable String projectName,
            @RequestParam String filePath) {

        log.info("删除文件: project={}, path={}", projectName, filePath);

        try {
            String rootPath = basePath + "/" + projectName;
            fileService.deleteFile(rootPath, filePath);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "File deleted successfully"
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 创建目录
     */
    @PostMapping("/directory")
    public ResponseEntity<Map<String, Object>> createDirectory(
            @PathVariable String projectName,
            @RequestParam String path) {

        log.info("创建目录: project={}, path={}", projectName, path);

        try {
            String rootPath = basePath + "/" + projectName;
            fileService.createDirectory(rootPath, path);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Directory created successfully"
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}
