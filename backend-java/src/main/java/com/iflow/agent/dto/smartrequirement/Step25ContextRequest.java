package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 步骤2.5：上下文分析请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step25ContextRequest {
    /** 匹配的模块列表 */
    private List<MatchedModule> matchedModules;
}