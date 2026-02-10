package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能需求分析 - 细化需求请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefineRequest {
    /** 之前的解决方案 */
    private PreviousSolution previousSolution;
    /** 用户反馈 */
    private String feedback;
}