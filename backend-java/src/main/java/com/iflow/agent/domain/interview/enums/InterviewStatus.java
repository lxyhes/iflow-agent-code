package com.iflow.agent.domain.interview.enums;

/**
 * 面试状态
 */
public enum InterviewStatus {
    PENDING("pending", "待开始"),
    CREATED("created", "已创建"),
    IN_PROGRESS("in_progress", "进行中"),
    PAUSED("paused", "已暂停"),
    COMPLETED("completed", "已完成"),
    CANCELLED("cancelled", "已取消");

    private final String code;
    private final String description;

    InterviewStatus(String code, String description) {
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
