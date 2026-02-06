package com.iflow.agent.controller;

import com.iflow.agent.dto.rag.RagIndexRequest;
import com.iflow.agent.dto.rag.RagRetrieveRequest;
import com.iflow.agent.dto.rag.RagRetrieveResponse;
import com.iflow.agent.dto.rag.RagResult;
import com.iflow.agent.service.rag.RagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * RAG API - 对应 Python 的 rag.py
 */
@Slf4j
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    @Value("${file.base-path:./projects}")
    private String basePath;

    /**
     * 获取 RAG 统计信息
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(required = false) String projectPath,
            @RequestParam(required = false) String projectName) {

        String finalPath = resolveProjectPath(projectPath, projectName);
        if (finalPath == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "缺少 project_path 或 project_name 参数"
            ));
        }

        Map<String, Object> stats = ragService.getStats(finalPath);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "stats", stats
        ));
    }

    /**
     * 获取 RAG 依赖状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "dependencies", Map.of(
                        "chromadb", false,  // 简化实现，不使用 ChromaDB
                        "sentence_transformers", false,
                        "sklearn", true     // 使用简单的 TF-IDF 风格检索
                ),
                "current_mode", "tfidf",
                "available_retrievers", List.of("simple")
        ));
    }

    /**
     * 索引项目（SSE 流式响应）
     */
    @PostMapping("/index")
    public SseEmitter indexProject(
            @RequestParam(required = false) String projectPath,
            @RequestParam(required = false) String projectName,
            @RequestBody(required = false) RagIndexRequest request) {

        String finalPath = resolveProjectPath(projectPath, projectName);
        if (finalPath == null) {
            SseEmitter emitter = new SseEmitter();
            try {
                emitter.send(Map.of("type", "error", "message", "缺少 project_path 或 project_name 参数"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        boolean forceReindex = request != null && Boolean.TRUE.equals(request.getForceReindex());

        SseEmitter emitter = new SseEmitter(300000L); // 5分钟超时

        new Thread(() -> {
            try {
                List<Map<String, Object>> progress = ragService.indexProject(finalPath, forceReindex);

                for (Map<String, Object> event : progress) {
                    emitter.send(event);
                }

                emitter.complete();
            } catch (Exception e) {
                log.error("索引项目失败", e);
                try {
                    emitter.send(Map.of("type", "error", "message", e.getMessage()));
                } catch (IOException ex) {
                    // ignore
                }
                emitter.completeWithError(e);
            }
        }).start();

        return emitter;
    }

    /**
     * 检索文档
     */
    @PostMapping("/retrieve/{projectName}")
    public ResponseEntity<Map<String, Object>> retrieve(
            @PathVariable String projectName,
            @RequestBody RagRetrieveRequest request) {

        if (request.getQuery() == null || request.getQuery().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "查询文本不能为空"
            ));
        }

        String projectPath = basePath + "/" + projectName;

        try {
            List<RagResult> results = ragService.retrieve(
                    projectPath,
                    request.getQuery(),
                    request.getNResults(),
                    request.getSimilarityThreshold(),
                    request.getFileTypes(),
                    request.getLanguages(),
                    request.getMinChunkSize(),
                    request.getMaxChunkSize(),
                    request.getSortBy()
            );

            RagRetrieveResponse response = RagRetrieveResponse.builder()
                    .success(true)
                    .query(request.getQuery())
                    .results(results)
                    .count(results.size())
                    .totalFiltered(results.size())
                    .filtersApplied(Map.of(
                            "similarity_threshold", request.getSimilarityThreshold(),
                            "file_types", request.getFileTypes(),
                            "languages", request.getLanguages(),
                            "min_chunk_size", request.getMinChunkSize(),
                            "max_chunk_size", request.getMaxChunkSize(),
                            "sort_by", request.getSortBy()
                    ))
                    .build();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "query", response.getQuery(),
                    "results", response.getResults(),
                    "count", response.getCount(),
                    "total_filtered", response.getTotalFiltered(),
                    "filters_applied", response.getFiltersApplied()
            ));

        } catch (Exception e) {
            log.error("RAG检索失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "RAG检索失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 重置 RAG 索引
     */
    @PostMapping("/reset/{projectName}")
    public ResponseEntity<Map<String, Object>> resetIndex(@PathVariable String projectName) {
        String projectPath = basePath + "/" + projectName;

        ragService.resetIndex(projectPath);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "RAG索引已重置"
        ));
    }

    /**
     * 清除 RAG 缓存
     */
    @PostMapping("/clear-cache")
    public ResponseEntity<Map<String, Object>> clearCache() {
        log.info("清除RAG缓存");
        ragService.clearCache();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "RAG缓存已清除"
        ));
    }

    /**
     * 向 RAG 知识库提问
     */
    @PostMapping("/ask/{projectName}")
    public ResponseEntity<Map<String, Object>> askRagQuestion(
            @PathVariable String projectName,
            @RequestBody Map<String, String> request) {

        String question = request.get("question");
        if (question == null || question.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "问题不能为空"
            ));
        }

        String projectPath = basePath + "/" + projectName;

        try {
            // 检索相关文档
            List<RagResult> results = ragService.retrieve(projectPath, question, 5, 0.0, null, null, 0, Integer.MAX_VALUE, "similarity");

            if (results.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "answer", "知识库中没有找到相关文档。",
                        "sources", List.of()
                ));
            }

            // 构建上下文和来源
            List<String> contextParts = new ArrayList<>();
            List<Map<String, Object>> sources = new ArrayList<>();

            for (int i = 0; i < results.size(); i++) {
                RagResult result = results.get(i);
                String filePath = result.getMetadata() != null ?
                        (String) result.getMetadata().getOrDefault("file_path", "未知文件") : "未知文件";
                String language = result.getMetadata() != null ?
                        (String) result.getMetadata().getOrDefault("language", "") : "";

                String sourceDesc = filePath;
                if (!language.isEmpty()) {
                    sourceDesc += " (" + language + ")";
                }

                contextParts.add("[文档 " + (i + 1) + "] " + sourceDesc + ":\n" + result.getContent());

                sources.add(Map.of(
                        "file_path", filePath,
                        "content", result.getContent().length() > 200 ?
                                result.getContent().substring(0, 200) + "..." : result.getContent(),
                        "similarity", result.getSimilarity(),
                        "language", language,
                        "source_desc", sourceDesc
                ));
            }

            log.info("RAG问答: 为问题 '{}' 找到 {} 个来源", question, sources.size());

            // TODO: 使用 LLM 生成答案
            return ResponseEntity.ok(Map.of(
                    "answer", "基于检索到的文档，请参考以下来源信息。",
                    "sources", sources,
                    "context", contextParts
            ));

        } catch (Exception e) {
            log.error("RAG问答失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "RAG问答失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 上传文档到 RAG 知识库
     */
    @PostMapping("/upload/{projectName}")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @PathVariable String projectName,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "未找到文件"
            ));
        }

        String projectPath = basePath + "/" + projectName;

        try {
            String content = new String(file.getBytes());
            String fileName = file.getOriginalFilename();
            String fileType = fileName != null ?
                    fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase() : "txt";

            Map<String, Object> result = ragService.addDocument(projectPath, fileName, content, fileType);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("上传文档到RAG失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "上传文档到RAG失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 批量上传文档到 RAG 知识库
     */
    @PostMapping("/upload-batch/{projectName}")
    public SseEmitter uploadDocumentsBatch(
            @PathVariable String projectName,
            @RequestParam("files") List<MultipartFile> files) {

        String projectPath = basePath + "/" + projectName;

        SseEmitter emitter = new SseEmitter(300000L); // 5分钟超时

        new Thread(() -> {
            try {
                int totalFiles = files.size();
                int processedFiles = 0;

                for (MultipartFile file : files) {
                    if (file.isEmpty()) {
                        continue;
                    }

                    try {
                        String content = new String(file.getBytes());
                        String fileName = file.getOriginalFilename();
                        String fileType = fileName != null ?
                                fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase() : "txt";

                        ragService.addDocument(projectPath, fileName, content, fileType);

                        processedFiles++;
                        emitter.send(Map.of(
                                "type", "progress",
                                "processed", processedFiles,
                                "total", totalFiles,
                                "current_file", fileName,
                                "message", "已处理 " + processedFiles + "/" + totalFiles + " 个文件"
                        ));

                    } catch (Exception e) {
                        log.error("处理文件失败: {}", file.getOriginalFilename(), e);
                        emitter.send(Map.of(
                                "type", "error",
                                "file", file.getOriginalFilename(),
                                "message", e.getMessage()
                        ));
                    }
                }

                emitter.send(Map.of(
                        "type", "complete",
                        "processed", processedFiles,
                        "total", totalFiles,
                        "message", "批量上传完成"
                ));

                emitter.complete();

            } catch (Exception e) {
                log.error("批量上传文档失败", e);
                try {
                    emitter.send(Map.of("type", "error", "message", e.getMessage()));
                } catch (IOException ex) {
                    // ignore
                }
                emitter.completeWithError(e);
            }
        }).start();

        return emitter;
    }

    /**
     * 添加系统文件路径到 RAG 知识库
     */
    @PostMapping("/add-files/{projectName}")
    public SseEmitter addFilesToRag(
            @PathVariable String projectName,
            @RequestBody Map<String, List<String>> request) {

        List<String> filePaths = request.get("file_paths");
        if (filePaths == null || filePaths.isEmpty()) {
            SseEmitter emitter = new SseEmitter();
            try {
                emitter.send(Map.of("type", "error", "message", "未提供文件路径"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        String projectPath = basePath + "/" + projectName;

        SseEmitter emitter = new SseEmitter(300000L); // 5分钟超时

        new Thread(() -> {
            try {
                int totalFiles = filePaths.size();
                int processedFiles = 0;

                for (String filePath : filePaths) {
                    try {
                        java.nio.file.Path path = java.nio.file.Path.of(filePath);

                        if (!java.nio.file.Files.exists(path)) {
                            emitter.send(Map.of(
                                    "type", "warning",
                                    "file", filePath,
                                    "message", "文件不存在"
                            ));
                            continue;
                        }

                        // 检查文件大小（限制 500MB）
                        long fileSize = java.nio.file.Files.size(path);
                        if (fileSize > 500 * 1024 * 1024) {
                            emitter.send(Map.of(
                                    "type", "warning",
                                    "file", filePath,
                                    "message", "文件过大，已跳过"
                            ));
                            continue;
                        }

                        // 检查文件类型
                        String fileName = path.getFileName().toString();
                        String fileType = fileName.contains(".") ?
                                fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase() : "txt";

                        List<String> allowedExtensions = List.of(
                                "txt", "md", "rst", "py", "js", "ts", "jsx", "tsx",
                                "java", "go", "rs", "json", "yaml", "yml", "html", "css",
                                "xml", "csv", "log", "sql", "sh", "bat", "ps1",
                                "docx", "xlsx", "pptx", "pdf"
                        );

                        if (!allowedExtensions.contains(fileType)) {
                            emitter.send(Map.of(
                                    "type", "warning",
                                    "file", filePath,
                                    "message", "不支持的文件类型"
                            ));
                            continue;
                        }

                        // 读取文件内容
                        String content = java.nio.file.Files.readString(path);

                        ragService.addDocument(projectPath, fileName, content, fileType);

                        processedFiles++;
                        emitter.send(Map.of(
                                "type", "progress",
                                "processed", processedFiles,
                                "total", totalFiles,
                                "current_file", fileName,
                                "message", "已处理 " + processedFiles + "/" + totalFiles + " 个文件"
                        ));

                    } catch (Exception e) {
                        log.error("添加文件到RAG失败: {}", filePath, e);
                        emitter.send(Map.of(
                                "type", "error",
                                "file", filePath,
                                "message", e.getMessage()
                        ));
                    }
                }

                emitter.send(Map.of(
                        "type", "complete",
                        "processed", processedFiles,
                        "total", totalFiles,
                        "message", "文件添加完成"
                ));

                emitter.complete();

            } catch (Exception e) {
                log.error("添加文件到RAG失败", e);
                try {
                    emitter.send(Map.of("type", "error", "message", e.getMessage()));
                } catch (IOException ex) {
                    // ignore
                }
                emitter.completeWithError(e);
            }
        }).start();

        return emitter;
    }

    // ========== 私有方法 ==========

    private String resolveProjectPath(String projectPath, String projectName) {
        if (projectPath != null && !projectPath.isEmpty()) {
            return projectPath;
        } else if (projectName != null && !projectName.isEmpty()) {
            return basePath + "/" + projectName;
        }
        return null;
    }
}
