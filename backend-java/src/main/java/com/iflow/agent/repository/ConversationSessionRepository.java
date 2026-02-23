package com.iflow.agent.repository;

import com.iflow.agent.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 会话 Repository
 */
@Repository
public interface ConversationSessionRepository extends JpaRepository<ConversationSession, Long> {

    /**
     * 根据用户 ID 查找
     */
    List<ConversationSession> findByUserIdOrderByLastActiveAtDesc(Long userId);

    /**
     * 根据项目 ID 查找
     */
    List<ConversationSession> findByProjectIdOrderByLastActiveAtDesc(Long projectId);

    /**
     * 查找置顶会话
     */
    List<ConversationSession> findByUserIdAndIsPinnedTrueOrderByCreatedAtDesc(Long userId);

    /**
     * 查找收藏会话
     */
    List<ConversationSession> findByUserIdAndIsFavoriteTrueOrderByCreatedAtDesc(Long userId);

    /**
     * 搜索会话
     */
    @Query("SELECT s FROM ConversationSession s WHERE s.userId = :userId AND " +
           "(LOWER(s.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(s.lastMessageSummary) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<ConversationSession> searchByUser(@Param("userId") Long userId, @Param("keyword") String keyword);

    /**
     * 统计用户会话数
     */
    long countByUserId(Long userId);
}
