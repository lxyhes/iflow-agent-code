package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 项目优化响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizeProjectResponse {
    /** 分析结果 */
    private ProjectOptimizationResult analysis;
    /** 建议列表 */
    private List<OptimizationRecommendation> recommendations;
}