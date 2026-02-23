package com.iflow.agent.repository;

import com.iflow.agent.entity.ConversationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 会话消息 Repository
 */
@Repository
public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {

    /**
     * 根据会话 ID 查找消息
     */
    List<ConversationMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    /**
     * 根据会话 ID 查找最近 N 条消息
     */
    List<ConversationMessage> findBySessionIdOrderByCreatedAtDesc(Long sessionId, org.springframework.data.domain.Pageable pageable);

    /**
     * 搜索消息
     */
    @Query("SELECT m FROM ConversationMessage m WHERE m.sessionId = :sessionId AND " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<ConversationMessage> searchInSession(@Param("sessionId") Long sessionId, @Param("keyword") String keyword);

    /**
     * 统计会话消息数
     */
    long countBySessionId(Long sessionId);

    /**
     * 删除会话的所有消息
     */
    void deleteBySessionId(Long sessionId);
}
