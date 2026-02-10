package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 步骤2.5：上下文分析响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step25ContextResponse {
    /** 业务上下文 */
    private BusinessContext context;
}