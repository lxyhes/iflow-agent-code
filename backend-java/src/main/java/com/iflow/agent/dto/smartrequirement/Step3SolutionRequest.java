package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 步骤3：生成解决方案请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step3SolutionRequest {
    /** 步骤1的分析结果 */
    private Step1AnalyzeResponse analysis;
    /** 步骤2的匹配模块 */
    private List<MatchedModule> matchedModules;
}