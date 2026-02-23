package com.iflow.agent.repository;

import com.iflow.agent.entity.ConversationTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 会话标签 Repository
 */
@Repository
public interface ConversationTagRepository extends JpaRepository<ConversationTag, Long> {

    /**
     * 根据名称查找标签
     */
    Optional<ConversationTag> findByName(String name);

    /**
     * 获取所有系统标签
     */
    List<ConversationTag> findByUserIdIsNullOrderByCreatedAtDesc();

    /**
     * 获取用户自定义标签
     */
    List<ConversationTag> findByUserIdOrderByUsageCountDesc(Long userId);

    /**
     * 搜索标签
     */
    @Query("SELECT t FROM ConversationTag t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<ConversationTag> searchTags(@Param("keyword") String keyword);
}
