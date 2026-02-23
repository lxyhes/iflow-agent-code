package com.iflow.agent.repository;

import com.iflow.agent.entity.ImageGeneration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 图像生成 Repository
 */
@Repository
public interface ImageGenerationRepository extends JpaRepository<ImageGeneration, Long> {

    /**
     * 根据状态查找
     */
    List<ImageGeneration> findByStatus(String status);

    /**
     * 根据用户 ID 查找
     */
    List<ImageGeneration> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 根据生成类型查找
     */
    List<ImageGeneration> findByGenerationTypeOrderByCreatedAtDesc(String generationType);

    /**
     * 获取用户最近的生成历史
     */
    @Query("SELECT g FROM ImageGeneration g WHERE g.userId = :userId ORDER BY g.createdAt DESC LIMIT :limit")
    List<ImageGeneration> findRecentByUser(@Param("userId") Long userId, @Param("limit") int limit);
}
