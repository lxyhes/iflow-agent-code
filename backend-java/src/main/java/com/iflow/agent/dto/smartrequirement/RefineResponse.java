package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 细化需求响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefineResponse {
    /** 更新后的解决方案 */
    private UpdatedSolution updatedSolution;
}