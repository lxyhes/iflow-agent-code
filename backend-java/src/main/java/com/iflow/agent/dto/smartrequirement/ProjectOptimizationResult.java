package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 项目优化结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectOptimizationResult {
    /** 项目摘要 */
    private String summary;
    /** 健康分数 */
    private Integer healthScore;
    /** 优势列表 */
    private List<String> strengths;
    /** 劣势列表 */
    private List<String> weaknesses;
}