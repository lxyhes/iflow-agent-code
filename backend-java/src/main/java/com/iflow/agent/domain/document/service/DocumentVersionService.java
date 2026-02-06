package com.iflow.agent.domain.document.service;

import com.iflow.agent.domain.document.entity.DocumentVersion;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 文档版本服务接口
 */
public interface DocumentVersionService {

    /**
     * 获取文件的所有版本
     */
    List<DocumentVersion> getVersions(String projectName, String filePath);

    /**
     * 获取特定版本
     */
    Optional<DocumentVersion> getVersion(String projectName, String filePath, String versionId);

    /**
     * 记录新版本
     */
    DocumentVersion recordVersion(String projectName, String filePath, String content, String changeDescription, String author);

    /**
     * 删除版本
     */
    boolean deleteVersion(String projectName, String filePath, String versionId);

    /**
     * 获取项目统计信息
     */
    Map<String, Object> getStatistics(String projectName);

    /**
     * 比较两个版本
     */
    Map<String, Object> compareVersions(String projectName, String filePath, String versionId1, String versionId2);

    /**
     * 回滚到指定版本
     */
    DocumentVersion rollbackToVersion(String projectName, String filePath, String versionId);
}
