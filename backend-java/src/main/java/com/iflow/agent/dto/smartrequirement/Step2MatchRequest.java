package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 步骤2：模块匹配请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Step2MatchRequest {
    /** 关键词列表 */
    private List<String> keywords;
    /** 项目名称 */
    private String projectName;
}