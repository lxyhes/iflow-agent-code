package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 执行计划
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExecutionPlan {
    /** 里程碑列表 */
    private List<Milestone> milestones;
}