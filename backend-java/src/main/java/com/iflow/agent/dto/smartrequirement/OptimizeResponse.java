package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 智能需求分析 - 需求优化响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizeResponse {
    /** 优化后的需求文本 */
    private String optimizedText;
    /** 改进点列表 */
    private List<String> changes;
    /** 建议列表 */
    private List<String> suggestions;
}