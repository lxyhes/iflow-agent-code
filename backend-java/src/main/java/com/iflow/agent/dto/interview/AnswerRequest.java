package com.iflow.agent.dto.interview;

import lombok.Data;

/**
 * 提交回答请求 DTO
 */
@Data
public class AnswerRequest {
    private String answer;
    private Integer duration;
}
