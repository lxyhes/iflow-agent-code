package com.iflow.agent.dto.interview;

import lombok.Data;
import java.util.List;

/**
 * 面试配置 DTO - 对应 Python 的 InterviewConfig
 */
@Data
public class InterviewConfigDTO {
    private Integer totalRounds = 5;
    private Integer maxDuration = 3600;
    private List<String> agentOrder = List.of("technical", "behavioral", "hr");
    private Boolean enableFollowUp = true;
    private Boolean enableStressTest = false;
}
