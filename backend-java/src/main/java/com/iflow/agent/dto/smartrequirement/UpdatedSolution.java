package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 更新后的解决方案
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatedSolution {
    /** 更新后的解决方案文档 */
    private String solutionDoc;
    /** 更新后的执行计划 */
    private ExecutionPlan executionPlan;
    /** 更新后的 API 设计 */
    private List<ApiDesign> apiDesign;
}