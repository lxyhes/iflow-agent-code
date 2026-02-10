package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 步骤1：需求分析响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step1AnalyzeResponse {
    /** 需求类型 */
    private String type;
    /** 需求摘要 */
    private String summary;
    /** 关键词 */
    private List<String> keywords;
    /** 复杂度评估 */
    private String complexity;
    /** 复杂度评分 (1-10) */
    private Integer complexityScore;
    /** 优先级 */
    private String priority;
    /** 验收标准 */
    private List<String> acceptanceCriteria;
    /** 核心功能 */
    private List<String> keyFeatures;
    /** 技术约束 */
    private List<String> techConstraints;
}