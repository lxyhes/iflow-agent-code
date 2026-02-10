package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 优化建议
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationRecommendation {
    /** 优先级 */
    private String priority;
    /** 类别 */
    private String category;
    /** 问题描述 */
    private String issue;
    /** 解决方案 */
    private String solution;
    /** 预估工作量 */
    private String effort;
}