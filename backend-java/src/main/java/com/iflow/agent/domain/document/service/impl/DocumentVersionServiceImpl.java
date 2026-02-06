package com.iflow.agent.domain.document.service.impl;

import com.iflow.agent.domain.document.entity.DocumentVersion;
import com.iflow.agent.domain.document.repository.DocumentVersionRepository;
import com.iflow.agent.domain.document.service.DocumentVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 文档版本服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentVersionServiceImpl implements DocumentVersionService {

    private final DocumentVersionRepository versionRepository;

    @Override
    public List<DocumentVersion> getVersions(String projectName, String filePath) {
        log.info("获取文件版本历史: {}/{}", projectName, filePath);
        return versionRepository.findByProjectNameAndFilePathOrderByCreatedAtDesc(projectName, filePath);
    }

    @Override
    public Optional<DocumentVersion> getVersion(String projectName, String filePath, String versionId) {
        log.info("获取特定版本: {}/{}/{}", projectName, filePath, versionId);
        return versionRepository.findByProjectNameAndFilePathAndVersionId(projectName, filePath, versionId);
    }

    @Override
    @Transactional
    public DocumentVersion recordVersion(String projectName, String filePath, String content, 
                                         String changeDescription, String author) {
        log.info("记录新版本: {}/{}", projectName, filePath);

        // 生成版本ID (基于时间戳)
        String versionId = "v" + System.currentTimeMillis();

        // 计算行数和字符数
        int lineCount = content != null ? content.split("\n").length : 0;
        int charCount = content != null ? content.length() : 0;

        // 取消之前的当前版本标记
        Optional<DocumentVersion> currentVersion = versionRepository
                .findByProjectNameAndFilePathAndIsCurrentTrue(projectName, filePath);
        currentVersion.ifPresent(v -> {
            v.setIsCurrent(false);
            versionRepository.save(v);
        });

        // 创建新版本
        DocumentVersion version = DocumentVersion.builder()
                .projectName(projectName)
                .filePath(filePath)
                .versionId(versionId)
                .content(content)
                .changeDescription(changeDescription != null ? changeDescription : "自动保存")
                .author(author != null ? author : "system")
                .lineCount(lineCount)
                .charCount(charCount)
                .isCurrent(true)
                .build();

        return versionRepository.save(version);
    }

    @Override
    @Transactional
    public boolean deleteVersion(String projectName, String filePath, String versionId) {
        log.info("删除版本: {}/{}/{}", projectName, filePath, versionId);
        
        Optional<DocumentVersion> version = versionRepository
                .findByProjectNameAndFilePathAndVersionId(projectName, filePath, versionId);
        
        if (version.isPresent()) {
            versionRepository.delete(version.get());
            return true;
        }
        return false;
    }

    @Override
    public Map<String, Object> getStatistics(String projectName) {
        log.info("获取项目文档统计: {}", projectName);
        
        long totalVersions = versionRepository.countByProjectName(projectName);
        List<DocumentVersion> allVersions = versionRepository.findByProjectNameOrderByCreatedAtDesc(projectName);
        
        // 统计文件数量
        Set<String> uniqueFiles = new HashSet<>();
        for (DocumentVersion v : allVersions) {
            uniqueFiles.add(v.getFilePath());
        }
        
        // 统计今日版本
        java.time.LocalDate today = java.time.LocalDate.now();
        long todayVersions = allVersions.stream()
                .filter(v -> v.getCreatedAt().toLocalDate().equals(today))
                .count();
        
        // 统计本周版本
        java.time.LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1);
        long weekVersions = allVersions.stream()
                .filter(v -> !v.getCreatedAt().toLocalDate().isBefore(weekStart))
                .count();
        
        return Map.of(
                "total_versions", totalVersions,
                "total_files", uniqueFiles.size(),
                "today_versions", todayVersions,
                "week_versions", weekVersions,
                "project_name", projectName
        );
    }

    @Override
    public Map<String, Object> compareVersions(String projectName, String filePath, 
                                                String versionId1, String versionId2) {
        log.info("比较版本: {}/{} - {} vs {}", projectName, filePath, versionId1, versionId2);
        
        Optional<DocumentVersion> v1 = getVersion(projectName, filePath, versionId1);
        Optional<DocumentVersion> v2 = getVersion(projectName, filePath, versionId2);
        
        if (v1.isEmpty() || v2.isEmpty()) {
            return Map.of("error", "版本不存在");
        }
        
        String content1 = v1.get().getContent() != null ? v1.get().getContent() : "";
        String content2 = v2.get().getContent() != null ? v2.get().getContent() : "";
        
        // 简单的行级差异比较
        List<String> lines1 = Arrays.asList(content1.split("\n"));
        List<String> lines2 = Arrays.asList(content2.split("\n"));
        
        List<Map<String, Object>> differences = new ArrayList<>();
        int maxLines = Math.max(lines1.size(), lines2.size());
        
        for (int i = 0; i < maxLines; i++) {
            String line1 = i < lines1.size() ? lines1.get(i) : null;
            String line2 = i < lines2.size() ? lines2.get(i) : null;
            
            if (!Objects.equals(line1, line2)) {
                differences.add(Map.of(
                        "line_number", i + 1,
                        "old_line", line1,
                        "new_line", line2,
                        "type", line1 == null ? "added" : (line2 == null ? "removed" : "modified")
                ))
;            }
        }
        
        return Map.of(
                "version1", Map.of(
                        "version_id", versionId1,
                        "created_at", v1.get().getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                        "author", v1.get().getAuthor()
                ),
                "version2", Map.of(
                        "version_id", versionId2,
                        "created_at", v2.get().getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                        "author", v2.get().getAuthor()
                ),
                "differences", differences,
                "total_differences", differences.size()
        );
    }

    @Override
    @Transactional
    public DocumentVersion rollbackToVersion(String projectName, String filePath, String versionId) {
        log.info("回滚到版本: {}/{}/{}", projectName, filePath, versionId);
        
        Optional<DocumentVersion> targetVersion = getVersion(projectName, filePath, versionId);
        if (targetVersion.isEmpty()) {
            throw new IllegalArgumentException("版本不存在: " + versionId);
        }
        
        // 创建新版本，内容为回滚目标版本的内容
        return recordVersion(
                projectName, 
                filePath, 
                targetVersion.get().getContent(),
                "回滚到版本 " + versionId,
                "system"
        );
    }
}
