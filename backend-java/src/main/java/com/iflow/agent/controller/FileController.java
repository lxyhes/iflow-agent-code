package com.iflow.agent.controller;

import com.iflow.agent.service.file.FileService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/projects/{projectName}")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @Value("${file.max-size:104857600}")
    private long maxFileSize;

    @Value("${cache.base-dir:E:/cache/agent_project}")
    private String baseDir;

    @GetMapping("/files")
    public ResponseEntity<List<FileService.FileNode>> getProjectFiles(@PathVariable String projectName) {
        String projectPath = getProjectPath(projectName);
        try {
            List<FileService.FileNode> tree = fileService.getTree(projectPath);
            return ResponseEntity.ok(tree);
        } catch (IOException e) {
            log.error("Failed to get file tree for project: {}", projectName, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/file")
    public ResponseEntity<Map<String, String>> readProjectFile(
            @PathVariable String projectName,
            @RequestParam String filePath) {
        String projectRoot = getProjectPath(projectName);
        try {
            String content = fileService.readFile(projectRoot, filePath);
            return ResponseEntity.ok(Map.of("content", content));
        } catch (IOException e) {
            log.error("Failed to read file: {}", filePath, e);
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/files/content")
    public ResponseEntity<Resource> readProjectFileContent(
            @PathVariable String projectName,
            @RequestParam String filePath) {
        String projectRoot = getProjectPath(projectName);

        // Security check for path traversal
        if (filePath.contains("..")) {
            return ResponseEntity.status(403).build();
        }

        Path fullPath = Paths.get(projectRoot, filePath).normalize();
        Path realRoot = Paths.get(projectRoot).toAbsolutePath().normalize();

        if (!fullPath.startsWith(realRoot)) {
            return ResponseEntity.status(403).build();
        }

        if (!Files.exists(fullPath) || !Files.isRegularFile(fullPath)) {
            return ResponseEntity.notFound().build();
        }

        try {
            long fileSize = Files.size(fullPath);
            if (fileSize > maxFileSize) {
                double sizeMb = fileSize / (1024.0 * 1024.0);
                double maxMb = maxFileSize / (1024.0 * 1024.0);
                return ResponseEntity.status(413)
                        .body(null);
            }

            Resource resource = new FileSystemResource(fullPath.toFile());
            String contentType = Files.probeContentType(fullPath);
            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fullPath.getFileName() + "\"")
                    .body(resource);

        } catch (IOException e) {
            log.error("Error serving file: {}", filePath, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/file")
    public ResponseEntity<Map<String, Object>> saveProjectFile(
            @PathVariable String projectName,
            @RequestBody SaveFileRequest request) {
        String projectRoot = getProjectPath(projectName);

        // Check content size
        int contentSize = request.getContent().getBytes().length;
        if (contentSize > maxFileSize) {
            double sizeMb = contentSize / (1024.0 * 1024.0);
            double maxMb = maxFileSize / (1024.0 * 1024.0);
            return ResponseEntity.status(413)
                    .body(Map.of("error", String.format("File too large (%.1f MB), max allowed (%.1f MB)", sizeMb, maxMb)));
        }

        try {
            fileService.writeFile(projectRoot, request.getFilePath(), request.getContent());
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "size", contentSize
            ));
        } catch (SecurityException e) {
            log.error("Security error saving file: {}", request.getFilePath(), e);
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        } catch (IOException e) {
            log.error("Failed to save file: {}", request.getFilePath(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/file")
    public ResponseEntity<Map<String, String>> deleteProjectFile(
            @PathVariable String projectName,
            @RequestParam String filePath) {
        String projectRoot = getProjectPath(projectName);
        try {
            fileService.deleteFile(projectRoot, filePath);
            return ResponseEntity.ok(Map.of("status", "deleted"));
        } catch (IOException e) {
            log.error("Failed to delete file: {}", filePath, e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete file"));
        }
    }

    @PostMapping("/directories")
    public ResponseEntity<Map<String, String>> createDirectory(
            @PathVariable String projectName,
            @RequestParam String dirPath) {
        String projectRoot = getProjectPath(projectName);
        try {
            fileService.createDirectory(projectRoot, dirPath);
            return ResponseEntity.ok(Map.of("status", "created"));
        } catch (IOException e) {
            log.error("Failed to create directory: {}", dirPath, e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create directory"));
        }
    }

    private String getProjectPath(String projectName) {
        // For now, use a simple mapping. In production, this should come from a project registry
        return Paths.get(baseDir, "projects", projectName).toString();
    }

    @Data
    public static class SaveFileRequest {
        private String filePath;
        private String content;
    }
}
