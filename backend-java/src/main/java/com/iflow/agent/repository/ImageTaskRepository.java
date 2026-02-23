package com.iflow.agent.repository;

import com.iflow.agent.entity.ImageTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 图像任务 Repository
 */
@Repository
public interface ImageTaskRepository extends JpaRepository<ImageTask, Long> {

    /**
     * 根据状态查找
     */
    List<ImageTask> findByStatus(String status);

    /**
     * 根据任务类型查找
     */
    List<ImageTask> findByTaskTypeOrderByCreatedAtDesc(String taskType);

    /**
     * 根据用户 ID 查找
     */
    List<ImageTask> findByUserIdOrderByCreatedAtDesc(Long userId);
}
