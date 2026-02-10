package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 保存响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveResponse {
    /** 保存路径 */
    private String path;
}