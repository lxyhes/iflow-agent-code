package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 匹配的模块信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchedModule {
    /** 模块名称 */
    private String name;
    /** 文件路径 */
    private String path;
    /** 相关性分数 */
    private double relevanceScore;
    /** 描述 */
    private String description;
}