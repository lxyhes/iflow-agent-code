package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 之前的解决方案
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PreviousSolution {
    /** 解决方案文档 */
    private String solutionDoc;
    /** 执行计划 */
    private ExecutionPlan executionPlan;
}