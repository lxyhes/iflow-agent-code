package com.iflow.agent.controller;

import com.iflow.agent.service.office.PreviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * 预览服务控制器
 */
@RestController
@RequestMapping("/api/preview")
@RequiredArgsConstructor
@Slf4j
public class PreviewController {

    private final PreviewService previewService;

    /**
     * 获取文件预览
     */
    @PostMapping
    public ResponseEntity<?> getPreview(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            Map<String, Object> preview = previewService.getPreview(file);
            return ResponseEntity.ok(preview);

        } catch (IOException e) {
            log.error("生成预览失败", e);
            return ResponseEntity.internalServerError().body("生成预览失败：" + e.getMessage());
        }
    }

    /**
     * 获取支持的预览类型
     */
    @GetMapping("/supported-types")
    public ResponseEntity<?> getSupportedTypes() {
        List<Map<String, String>> types = previewService.getSupportedTypes();
        return ResponseEntity.ok(Map.of(
            "types", types,
            "total", types.size()
        ));
    }

    /**
     * 获取预览图片
     */
    @GetMapping("/{fileName}")
    public ResponseEntity<?> getPreviewImage(@PathVariable String fileName) {
        try {
            java.nio.file.Path filePath = java.nio.file.Paths.get("./storage/previews").resolve(fileName);
            
            if (!java.nio.file.Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] content = java.nio.file.Files.readAllBytes(filePath);
            String contentType = getContentType(fileName);
            
            return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .body(content);

        } catch (IOException e) {
            log.error("获取预览图片失败", e);
            return ResponseEntity.internalServerError().body("获取预览图片失败：" + e.getMessage());
        }
    }

    private String getContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        return "application/octet-stream";
    }
}
