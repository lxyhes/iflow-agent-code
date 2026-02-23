package com.iflow.agent.repository;

import com.iflow.agent.entity.DocumentGeneration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 文档生成历史 Repository
 */
@Repository
public interface DocumentGenerationRepository extends JpaRepository<DocumentGeneration, Long> {

    /**
     * 根据状态查找
     */
    List<DocumentGeneration> findByStatus(String status);

    /**
     * 根据文档类型查找
     */
    List<DocumentGeneration> findByDocumentTypeOrderByCreatedAtDesc(String documentType);

    /**
     * 根据用户 ID 查找
     */
    List<DocumentGeneration> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 获取用户最近的文档生成历史
     */
    @Query("SELECT d FROM DocumentGeneration d WHERE d.userId = :userId ORDER BY d.createdAt DESC LIMIT :limit")
    List<DocumentGeneration> findRecentByUser(@Param("userId") Long userId, @Param("limit") int limit);
}
