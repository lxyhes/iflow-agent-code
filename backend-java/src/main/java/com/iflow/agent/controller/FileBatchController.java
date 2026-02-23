package com.iflow.agent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.entity.FileBatchTask;
import com.iflow.agent.service.office.FileBatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * 文件批量处理控制器
 */
@RestController
@RequestMapping("/api/file-batch")
@RequiredArgsConstructor
@Slf4j
public class FileBatchController {

    private final FileBatchService fileBatchService;
    private final ObjectMapper objectMapper;

    /**
     * 批量重命名
     */
    @PostMapping("/rename")
    public ResponseEntity<?> batchRename(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> filePaths = (List<String>) request.get("filePaths");
            String pattern = (String) request.get("pattern");
            Long userId = request.get("userId") != null ? 
                Long.valueOf(request.get("userId").toString()) : null;

            if (filePaths == null || filePaths.isEmpty()) {
                return ResponseEntity.badRequest().body("文件路径不能为空");
            }

            FileBatchTask task = fileBatchService.createRenameTask(filePaths, pattern, userId);
            return ResponseEntity.ok(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "message", "重命名任务已创建"
            ));

        } catch (Exception e) {
            log.error("批量重命名失败", e);
            return ResponseEntity.internalServerError().body("批量重命名失败：" + e.getMessage());
        }
    }

    /**
     * 批量分类
     */
    @PostMapping("/classify")
    public ResponseEntity<?> batchClassify(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> filePaths = (List<String>) request.get("filePaths");
            String targetDir = (String) request.get("targetDir");
            Long userId = request.get("userId") != null ? 
                Long.valueOf(request.get("userId").toString()) : null;

            if (filePaths == null || filePaths.isEmpty()) {
                return ResponseEntity.badRequest().body("文件路径不能为空");
            }

            FileBatchTask task = fileBatchService.createClassifyTask(filePaths, targetDir, userId);
            return ResponseEntity.ok(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "message", "分类任务已创建"
            ));

        } catch (Exception e) {
            log.error("批量分类失败", e);
            return ResponseEntity.internalServerError().body("批量分类失败：" + e.getMessage());
        }
    }

    /**
     * 批量合并
     */
    @PostMapping("/merge")
    public ResponseEntity<?> batchMerge(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> filePaths = (List<String>) request.get("filePaths");
            String outputPath = (String) request.get("outputPath");
            Long userId = request.get("userId") != null ? 
                Long.valueOf(request.get("userId").toString()) : null;

            if (filePaths == null || filePaths.isEmpty()) {
                return ResponseEntity.badRequest().body("文件路径不能为空");
            }

            FileBatchTask task = fileBatchService.createMergeTask(filePaths, outputPath, userId);
            return ResponseEntity.ok(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "message", "合并任务已创建"
            ));

        } catch (Exception e) {
            log.error("批量合并失败", e);
            return ResponseEntity.internalServerError().body("批量合并失败：" + e.getMessage());
        }
    }

    /**
     * 获取任务状态
     */
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<?> getTaskStatus(@PathVariable Long taskId) {
        try {
            FileBatchTask task = fileBatchService.getTaskStatus(taskId);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            log.error("获取任务状态失败", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 获取任务历史
     */
    @GetMapping("/history")
    public ResponseEntity<?> getTaskHistory(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            List<FileBatchTask> tasks = fileBatchService.getTaskHistory(userId, limit);
            return ResponseEntity.ok(Map.of(
                "tasks", tasks,
                "total", tasks.size()
            ));
        } catch (Exception e) {
            log.error("获取任务历史失败", e);
            return ResponseEntity.internalServerError().body("获取任务历史失败：" + e.getMessage());
        }
    }

    /**
     * 上传文件进行处理
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            // 保存上传的文件
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            java.nio.file.Path filePath = java.nio.file.Paths.get("./storage/uploads").resolve(fileName);
            
            if (!filePath.getParent().toFile().exists()) {
                filePath.getParent().toFile().mkdirs();
            }
            
            file.transferTo(filePath.toFile());

            return ResponseEntity.ok(Map.of(
                "fileName", file.getOriginalFilename(),
                "filePath", filePath.toString(),
                "fileSize", file.getSize()
            ));

        } catch (IOException e) {
            log.error("文件上传失败", e);
            return ResponseEntity.internalServerError().body("文件上传失败：" + e.getMessage());
        }
    }
}
