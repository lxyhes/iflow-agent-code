package com.iflow.agent.repository;

import com.iflow.agent.entity.WorkflowExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 工作流执行历史 Repository
 */
@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, Long> {

    /**
     * 根据状态查找执行记录
     */
    List<WorkflowExecution> findByStatus(String status);

    /**
     * 根据工作流 ID 查找执行历史
     */
    List<WorkflowExecution> findByWorkflowIdOrderByCreatedAtDesc(Long workflowId);

    /**
     * 根据用户 ID 查找执行历史
     */
    List<WorkflowExecution> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 获取用户最近的执行历史
     */
    @Query("SELECT e FROM WorkflowExecution e WHERE e.userId = :userId ORDER BY e.createdAt DESC LIMIT :limit")
    List<WorkflowExecution> findRecentByUser(@Param("userId") Long userId, @Param("limit") int limit);

    /**
     * 统计工作流的执行次数
     */
    long countByWorkflowId(Long workflowId);

    /**
     * 统计成功率
     */
    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.workflowId = :workflowId AND e.status = 'completed'")
    long countSuccessfulByWorkflowId(@Param("workflowId") Long workflowId);
}
