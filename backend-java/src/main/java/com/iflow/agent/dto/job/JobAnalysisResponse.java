package com.iflow.agent.dto.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 职位分析响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobAnalysisResponse {
    private String jobTitle;
    private String company;
    private String location;
    private String salary;
    private String experience;
    private String education;
    private List<String> skills;
    private List<String> responsibilities;
    private List<String> requirements;
    private List<String> benefits;
    private String rawContent;
    private List<Map<String, Object>> interviewQuestions;
}
