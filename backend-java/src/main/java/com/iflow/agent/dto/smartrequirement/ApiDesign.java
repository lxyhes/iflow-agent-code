package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API 设计
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiDesign {
    /** 端点路径 */
    private String endpoint;
    /** HTTP 方法 */
    private String method;
    /** 描述 */
    private String description;
}