package com.iflow.agent.controller;

import com.iflow.agent.domain.document.entity.DocumentVersion;
import com.iflow.agent.domain.document.service.DocumentVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 文档版本管理 API
 */
@Slf4j
@RestController
@RequestMapping("/api/document-versions")
@RequiredArgsConstructor
public class DocumentVersionController {

    private final DocumentVersionService documentVersionService;

    /**
     * 获取文件的所有版本
     */
    @GetMapping("/{projectName}/{filePath}")
    public ResponseEntity<Map<String, Object>> getVersions(
            @PathVariable String projectName,
            @PathVariable String filePath) {
        log.info("获取文件版本历史: {}/{}", projectName, filePath);
        
        List<DocumentVersion> versions = documentVersionService.getVersions(projectName, filePath);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "project_name", projectName,
                "file_path", filePath,
                "versions", versions,
                "total", versions.size()
        ));
    }

    /**
     * 获取特定版本
     */
    @GetMapping("/{projectName}/{filePath}/{versionId}")
    public ResponseEntity<Map<String, Object>> getVersion(
            @PathVariable String projectName,
            @PathVariable String filePath,
            @PathVariable String versionId) {
        log.info("获取特定版本: {}/{}/{}", projectName, filePath, versionId);
        
        return documentVersionService.getVersion(projectName, filePath, versionId)
                .map(version -> ResponseEntity.ok(Map.of(
                        "success", true,
                        "version", version
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 记录新版本
     */
    @PostMapping("/{projectName}/{filePath}/record")
    public ResponseEntity<Map<String, Object>> recordVersion(
            @PathVariable String projectName,
            @PathVariable String filePath,
            @RequestBody RecordVersionRequest request) {
        log.info("记录新版本: {}/{}", projectName, filePath);
        
        DocumentVersion version = documentVersionService.recordVersion(
                projectName,
                filePath,
                request.getContent(),
                request.getChangeDescription(),
                request.getAuthor()
        );
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "版本已记录",
                "version", version
        ));
    }

    /**
     * 删除版本
     */
    @DeleteMapping("/{projectName}/{filePath}/{versionId}")
    public ResponseEntity<Map<String, Object>> deleteVersion(
            @PathVariable String projectName,
            @PathVariable String filePath,
            @PathVariable String versionId) {
        log.info("删除版本: {}/{}/{}", projectName, filePath, versionId);
        
        boolean success = documentVersionService.deleteVersion(projectName, filePath, versionId);
        
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "版本已删除" : "版本不存在"
        ));
    }

    /**
     * 获取项目统计信息
     */
    @GetMapping("/{projectName}/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(@PathVariable String projectName) {
        log.info("获取项目文档统计: {}", projectName);
        
        Map<String, Object> stats = documentVersionService.getStatistics(projectName);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "statistics", stats
        ));
    }

    /**
     * 比较两个版本
     */
    @PostMapping("/{projectName}/{filePath}/compare")
    public ResponseEntity<Map<String, Object>> compareVersions(
            @PathVariable String projectName,
            @PathVariable String filePath,
            @RequestBody CompareVersionsRequest request) {
        log.info("比较版本: {}/{} - {} vs {}", projectName, filePath, request.getVersionId1(), request.getVersionId2());
        
        Map<String, Object> comparison = documentVersionService.compareVersions(
                projectName,
                filePath,
                request.getVersionId1(),
                request.getVersionId2()
        );
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "comparison", comparison
        ));
    }

    /**
     * 回滚到指定版本
     */
    @PostMapping("/{projectName}/{filePath}/rollback/{versionId}")
    public ResponseEntity<Map<String, Object>> rollbackToVersion(
            @PathVariable String projectName,
            @PathVariable String filePath,
            @PathVariable String versionId) {
        log.info("回滚到版本: {}/{}/{}", projectName, filePath, versionId);
        
        DocumentVersion newVersion = documentVersionService.rollbackToVersion(projectName, filePath, versionId);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "已回滚到版本 " + versionId,
                "new_version", newVersion
        ));
    }

    // ========== 请求类 ==========

    @lombok.Data
    public static class RecordVersionRequest {
        private String content;
        private String changeDescription;
        private String author;
    }

    @lombok.Data
    public static class CompareVersionsRequest {
        private String versionId1;
        private String versionId2;
    }
}
