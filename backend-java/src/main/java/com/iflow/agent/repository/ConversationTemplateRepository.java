package com.iflow.agent.repository;

import com.iflow.agent.entity.ConversationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 会话模板 Repository
 */
@Repository
public interface ConversationTemplateRepository extends JpaRepository<ConversationTemplate, Long> {

    /**
     * 根据分类查找模板
     */
    List<ConversationTemplate> findByCategoryOrderByUsageCountDesc(String category);

    /**
     * 获取所有内置模板
     */
    List<ConversationTemplate> findByIsBuiltInTrueOrderByCreatedAtDesc();

    /**
     * 获取用户自定义模板
     */
    List<ConversationTemplate> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 搜索模板
     */
    @Query("SELECT t FROM ConversationTemplate t WHERE " +
           "LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<ConversationTemplate> searchTemplates(@Param("keyword") String keyword);
}
