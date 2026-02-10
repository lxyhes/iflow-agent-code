package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 里程碑
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Milestone {
    /** 里程碑名称 */
    private String name;
    /** 日期 */
    private String date;
    /** 任务列表 */
    private List<String> tasks;
}