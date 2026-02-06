package com.iflow.agent.domain.interview.enums;

/**
 * 协调模式
 */
public enum CoordinationMode {
    SEQUENTIAL("sequential", "顺序模式：智能体按顺序轮流"),
    COLLABORATIVE("collaborative", "协作模式：多智能体同时参与"),
    ARBITRATED("arbitrated", "仲裁模式：主控智能体协调");

    private final String code;
    private final String description;

    CoordinationMode(String code, String description) {
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
