package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 需求优化请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizeRequest {
    /** 原始需求文本 */
    private String text;
    /** 项目名称 */
    private String projectName;
}