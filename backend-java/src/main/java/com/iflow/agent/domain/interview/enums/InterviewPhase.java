package com.iflow.agent.domain.interview.enums;

/**
 * 面试阶段
 */
public enum InterviewPhase {
    WARM_UP("warm_up", "热身阶段"),
    MAIN("main", "主要环节"),
    DEEP_DIVE("deep_dive", "深入追问"),
    WRAP_UP("wrap_up", "收尾阶段");

    private final String code;
    private final String description;

    InterviewPhase(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }
}
