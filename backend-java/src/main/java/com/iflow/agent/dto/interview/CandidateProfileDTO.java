package com.iflow.agent.dto.interview;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * 候选人画像 DTO - 对应 Python 的 CandidateProfile
 */
@Data
public class CandidateProfileDTO {
    private String name;
    private String email;
    private String phone;
    private String resumeSummary;
    private List<String> skills;
    private Double experienceYears;
    private List<Map<String, Object>> education;
    private List<String> previousRoles;
    private String targetPosition;
    private String currentSalary;
    private String expectedSalary;
    private String noticePeriod;
}
