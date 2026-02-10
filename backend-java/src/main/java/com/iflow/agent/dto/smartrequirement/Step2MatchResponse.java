package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 步骤2：模块匹配响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step2MatchResponse {
    /** 匹配的模块列表 */
    private List<MatchedModule> matchedModules;
}