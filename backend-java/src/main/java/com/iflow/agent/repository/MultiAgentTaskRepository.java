package com.iflow.agent.repository;

import com.iflow.agent.entity.MultiAgentTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 多 Agent 任务 Repository
 */
@Repository
public interface MultiAgentTaskRepository extends JpaRepository<MultiAgentTask, Long> {

    /**
     * 根据状态查找任务
     */
    List<MultiAgentTask> findByStatus(String status);

    /**
     * 根据用户 ID 查找任务
     */
    List<MultiAgentTask> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 根据项目 ID 查找任务
     */
    List<MultiAgentTask> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    /**
     * 获取用户最近的任务
     */
    @Query("SELECT t FROM MultiAgentTask t WHERE t.userId = :userId ORDER BY t.createdAt DESC LIMIT :limit")
    List<MultiAgentTask> findRecentTasksByUser(@Param("userId") Long userId, @Param("limit") int limit);

    /**
     * 搜索任务
     */
    @Query("SELECT t FROM MultiAgentTask t WHERE LOWER(t.taskDescription) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<MultiAgentTask> searchTasks(@Param("keyword") String keyword);
}
