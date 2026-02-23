package com.iflow.agent.repository;

import com.iflow.agent.entity.WorkflowTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 工作流模板 Repository
 */
@Repository
public interface WorkflowTemplateRepository extends JpaRepository<WorkflowTemplate, Long> {

    /**
     * 根据分类查找模板
     */
    List<WorkflowTemplate> findByCategoryOrderByUsageCountDesc(String category);

    /**
     * 查找所有内置模板
     */
    List<WorkflowTemplate> findByIsBuiltInTrueOrderByCreatedAtDesc();

    /**
     * 查找所有用户自定义模板
     */
    List<WorkflowTemplate> findByIsBuiltInFalseOrIsBuiltInIsNullOrderByCreatedAtDesc();

    /**
     * 搜索模板
     */
    @Query("SELECT t FROM WorkflowTemplate t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<WorkflowTemplate> searchTemplates(@Param("keyword") String keyword);

    /**
     * 根据分类搜索模板
     */
    @Query("SELECT t FROM WorkflowTemplate t WHERE t.category = :category AND " +
           "(LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<WorkflowTemplate> searchTemplatesByCategory(@Param("category") String category, 
                                                      @Param("keyword") String keyword);
}
