package com.iflow.agent.repository;

import com.iflow.agent.entity.FileBatchTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 文件批量任务 Repository
 */
@Repository
public interface FileBatchTaskRepository extends JpaRepository<FileBatchTask, Long> {

    /**
     * 根据状态查找任务
     */
    List<FileBatchTask> findByStatus(String status);

    /**
     * 根据用户 ID 查找任务
     */
    List<FileBatchTask> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 根据任务类型查找
     */
    List<FileBatchTask> findByTaskTypeOrderByCreatedAtDesc(String taskType);

    /**
     * 获取用户最近的任务
     */
    @Query("SELECT t FROM FileBatchTask t WHERE t.userId = :userId ORDER BY t.createdAt DESC LIMIT :limit")
    List<FileBatchTask> findRecentTasksByUser(@Param("userId") Long userId, @Param("limit") int limit);
}
