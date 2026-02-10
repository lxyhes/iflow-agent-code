package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 项目优化请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizeProjectRequest {
    /** 关注领域（可选） */
    private String focus;
    /** 项目名称 */
    private String projectName;
}