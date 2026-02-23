package com.iflow.agent.controller;

import com.iflow.agent.service.office.DocumentGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * 文档生成控制器
 */
@RestController
@RequestMapping("/api/document")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentGeneratorService documentService;

    /**
     * 生成 PDF 文档
     */
    @PostMapping("/generate/pdf")
    public ResponseEntity<?> generatePdf(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String title = request.get("title");
            String template = request.getOrDefault("template", "default");

            if (content == null || content.isEmpty()) {
                return ResponseEntity.badRequest().body("内容不能为空");
            }

            Map<String, Object> result = documentService.generatePdf(content, title, template);
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            log.error("生成 PDF 失败", e);
            return ResponseEntity.internalServerError().body("生成 PDF 失败：" + e.getMessage());
        }
    }

    /**
     * 生成 Word 文档
     */
    @PostMapping("/generate/word")
    public ResponseEntity<?> generateWord(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String title = request.get("title");

            if (content == null || content.isEmpty()) {
                return ResponseEntity.badRequest().body("内容不能为空");
            }

            Map<String, Object> result = documentService.generateWord(content, title);
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            log.error("生成 Word 失败", e);
            return ResponseEntity.internalServerError().body("生成 Word 失败：" + e.getMessage());
        }
    }

    /**
     * 生成 PPT
     */
    @PostMapping("/generate/ppt")
    public ResponseEntity<?> generatePpt(
            @RequestBody Map<String, String> request) {
        try {
            String markdownContent = request.get("markdown");
            String template = request.getOrDefault("template", "default");

            if (markdownContent == null || markdownContent.isEmpty()) {
                return ResponseEntity.badRequest().body("Markdown 内容不能为空");
            }

            Map<String, Object> result = documentService.generatePptFromMarkdown(markdownContent, template);
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            log.error("生成 PPT 失败", e);
            return ResponseEntity.internalServerError().body("生成 PPT 失败：" + e.getMessage());
        }
    }

    /**
     * 下载文档
     */
    @GetMapping("/download/{fileName}")
    public ResponseEntity<?> downloadDocument(@PathVariable String fileName) {
        try {
            byte[] content = documentService.downloadDocument(fileName);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", fileName);
            
            return new ResponseEntity<>(content, headers, HttpStatus.OK);

        } catch (IOException e) {
            log.error("下载文档失败", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 获取文档历史
     */
    @GetMapping("/history")
    public ResponseEntity<?> getDocumentHistory(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            List<Map<String, Object>> history = documentService.getDocumentHistory(userId, limit);
            return ResponseEntity.ok(Map.of(
                "documents", history,
                "total", history.size()
            ));
        } catch (Exception e) {
            log.error("获取文档历史失败", e);
            return ResponseEntity.internalServerError().body("获取文档历史失败：" + e.getMessage());
        }
    }

    /**
     * 文档排版
     */
    @PostMapping("/format")
    public ResponseEntity<?> formatDocument(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String formatType = request.getOrDefault("type", "markdown");

            if (content == null || content.isEmpty()) {
                return ResponseEntity.badRequest().body("内容不能为空");
            }

            // 简单实现：返回格式化后的内容
            String formatted = formatContent(content, formatType);
            return ResponseEntity.ok(Map.of(
                "formatted", formatted,
                "formatType", formatType
            ));

        } catch (Exception e) {
            log.error("文档排版失败", e);
            return ResponseEntity.internalServerError().body("文档排版失败：" + e.getMessage());
        }
    }

    /**
     * 格式化内容
     */
    private String formatContent(String content, String formatType) {
        // 简单实现
        return switch (formatType) {
            case "markdown" -> formatAsMarkdown(content);
            case "html" -> formatAsHtml(content);
            default -> content;
        };
    }

    private String formatAsMarkdown(String content) {
        // 简单的 Markdown 格式化
        return content
            .replaceAll("^# (.+)$", "# $1")
            .replaceAll("^## (.+)$", "## $1")
            .replaceAll("^- (.+)$", "- $1")
            .replaceAll("^\\* (.+)$", "* $1");
    }

    private String formatAsHtml(String content) {
        return "<!DOCTYPE html>\n<html>\n<head>\n<meta charset='UTF-8'>\n</head>\n<body>\n" + 
               content + "\n</body>\n</html>";
    }
}
