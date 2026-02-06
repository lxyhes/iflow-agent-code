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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
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
