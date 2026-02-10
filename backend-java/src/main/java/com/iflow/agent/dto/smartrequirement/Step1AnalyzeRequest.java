package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 步骤1：需求分析请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step1AnalyzeRequest {
    /** 需求文本 */
    private String text;
    /** 项目名称 */
    private String projectName;
    /** 图片路径（可选） */
    private String imagePath;
}