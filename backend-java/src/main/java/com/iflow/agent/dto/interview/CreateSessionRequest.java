package com.iflow.agent.dto.interview;

import lombok.Data;

/**
 * 创建面试会话请求 DTO
 */
@Data
public class CreateSessionRequest {
    private CandidateProfileDTO candidateProfile;
    private InterviewConfigDTO config;
    private String jobPositionId;
}
