package com.iflow.agent.domain.interview.enums;

/**
 * 提问策略
 */
public enum QuestionStrategy {
    SEQUENTIAL("sequential", "顺序提问"),
    ADAPTIVE("adaptive", "自适应提问"),
    DEPTH_FIRST("depth_first", "深度优先"),
    BREADTH_FIRST("breadth_first", "广度优先"),
    PRESSURE("pressure", "压力测试");

    private final String code;
    private final String description;

    QuestionStrategy(String code, String description) {
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
