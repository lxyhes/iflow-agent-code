package com.iflow.agent.repository;

import com.iflow.agent.entity.ProjectHealthSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 项目健康快照 Repository
 */
@Repository
public interface ProjectHealthSnapshotRepository extends JpaRepository<ProjectHealthSnapshot, Long> {

    /**
     * 根据项目 ID 查找
     */
    List<ProjectHealthSnapshot> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    /**
     * 获取项目最近的健康快照
     */
    @Query("SELECT h FROM ProjectHealthSnapshot h WHERE h.projectId = :projectId ORDER BY h.createdAt DESC LIMIT 1")
    ProjectHealthSnapshot findLatestByProjectId(@Param("projectId") Long projectId);
}
