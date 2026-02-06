package com.iflow.agent.domain.interview.enums;

/**
 * 面试官类型
 */
public enum InterviewerType {
    TECHNICAL("technical", "技术面试官"),
    BEHAVIORAL("behavioral", "行为面试官"),
    HR("hr", "HR面试官"),
    SYSTEM_DESIGN("system_design", "系统架构师"),
    CODING("coding", "编程面试官");

    private final String code;
    private final String description;

    InterviewerType(String code, String description) {
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
