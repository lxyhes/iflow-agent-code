package com.iflow.agent.dto.interview;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 面试响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewResponse {
    private String sessionId;
    private String status;
    private String message;
    private Map<String, Object> data;
}
