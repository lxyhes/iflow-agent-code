package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 步骤3：生成解决方案响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step3SolutionResponse {
    /** 完整的技术方案文档（Markdown） */
    private String solutionDoc;
    /** 执行计划 */
    private ExecutionPlan executionPlan;
    /** API 设计列表 */
    private List<ApiDesign> apiDesign;
    /** 工时估算 */
    private String effortEstimation;
    /** 测试场景 */
    private List<TestScenario> testScenarios;
}