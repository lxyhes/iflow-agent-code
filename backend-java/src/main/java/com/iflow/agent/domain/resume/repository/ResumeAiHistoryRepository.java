package com.iflow.agent.domain.resume.repository;

import com.iflow.agent.domain.resume.entity.ResumeAiHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResumeAiHistoryRepository extends JpaRepository<ResumeAiHistory, Long> {

    /**
     * 获取简历的 AI 生成历史
     */
    List<ResumeAiHistory> findByResumeIdOrderByCreatedAtDesc(String resumeId);

    /**
     * 获取简历的特定类型 AI 生成历史
     */
    List<ResumeAiHistory> findByResumeIdAndTypeOrderByCreatedAtDesc(String resumeId, String type);

    /**
     * 获取最近的 N 条记录
     */
    @Query("SELECT h FROM ResumeAiHistory h WHERE h.resumeId = :resumeId ORDER BY h.createdAt DESC")
    List<ResumeAiHistory> findRecentHistory(@Param("resumeId") String resumeId);
}