package com.iflow.agent.domain.document.repository;

import com.iflow.agent.domain.document.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 文档版本仓储
 */
@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, String> {

    List<DocumentVersion> findByProjectNameAndFilePathOrderByCreatedAtDesc(String projectName, String filePath);

    Optional<DocumentVersion> findByProjectNameAndFilePathAndVersionId(String projectName, String filePath, String versionId);

    List<DocumentVersion> findByProjectNameOrderByCreatedAtDesc(String projectName);

    Optional<DocumentVersion> findByProjectNameAndFilePathAndIsCurrentTrue(String projectName, String filePath);

    long countByProjectName(String projectName);

    long countByProjectNameAndFilePath(String projectName, String filePath);
}
