package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 保存请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveRequest {
    /** 项目名称 */
    private String projectName;
    /** 标题 */
    private String title;
    /** 内容 */
    private String content;
}