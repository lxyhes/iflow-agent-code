package com.iflow.agent.domain.resume.service;

import com.iflow.agent.domain.resume.entity.Resume;

import java.util.List;
import java.util.Map;

/**
 * 简历AI服务接口 - 提供AI分析、诊断、重写等功能
 */
public interface ResumeAiService {

    /**
     * AI深度分析简历
     * 使用AI对简历进行全面分析，包括整体质量评估、内容优化建议、行业对比分析、求职竞争力评估
     */
    Map<String, Object> aiAnalyzeResume(Resume resume);

    /**
     * AI简历健康度检查
     * 使用AI对简历进行全面的健康度评估，包括内容完整性、专业度评估、竞争力分析、改进建议
     */
    Map<String, Object> healthCheck(Resume resume);

    /**
     * AI排版检查
     * 使用AI对简历进行排版和格式检查，包括视觉层次、格式一致性、可读性评估、专业外观
     */
    Map<String, Object> layoutCheck(Resume resume);

    /**
     * AI简历诊断
     * 使用AI对简历进行全面诊断，包括内容完整性、量化成果、关键词匹配、格式规范、语言表达、篇幅控制
     */
    Map<String, Object> diagnoseResume(Resume resume);

    /**
     * 根据AI诊断报告自动重写简历
     * 使用AI分析结果，自动优化简历内容，包括重写个人简介、优化工作经历描述、改进技能展示、提升整体表达
     */
    Map<String, Object> rewriteResume(Resume resume, Map<String, Object> healthAnalysis, String model);

    /**
     * 获取 AI 生成历史记录
     * @param resumeId 简历 ID
     * @param type 类型（analyze 或 rewrite），如果为 null 则返回全部
     * @return 历史记录列表
     */
    List<Map<String, Object>> getAiHistory(String resumeId, String type);
}
