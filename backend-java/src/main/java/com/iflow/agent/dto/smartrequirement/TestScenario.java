package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 测试场景
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestScenario {
    /** 场景名称 */
    private String name;
    /** 测试步骤 */
    private List<String> steps;
}