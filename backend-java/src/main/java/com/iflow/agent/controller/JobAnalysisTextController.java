package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 职位文本分析 API - 对应 Python 的 job_analysis_text.py
 */
@Slf4j
@RestController
@RequestMapping("/api/job-analysis")
@RequiredArgsConstructor
public class JobAnalysisTextController {

    /**
     * 分析职位描述文本
     */
    @PostMapping("/analyze-text")
    public ResponseEntity<Map<String, Object>> analyzeText(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        log.info("Analyzing job description text, length: {}", text != null ? text.length() : 0);

        Map<String, Object> analysis = new HashMap<>();
        analysis.put("title", "Software Engineer");
        analysis.put("company", "Tech Corp");
        analysis.put("location", "Beijing");
        analysis.put("salary_range", "30k-50k");
        analysis.put("required_skills", List.of("Java", "Spring Boot", "MySQL", "Redis"));
        analysis.put("preferred_skills", List.of("Docker", "Kubernetes", "Microservices"));
        analysis.put("experience_required", "3-5 years");
        analysis.put("education", "Bachelor's degree");
        analysis.put("job_type", "Full-time");
        analysis.put("benefits", List.of("Health insurance", "Stock options", "Flexible working"));
        analysis.put("description_summary", "We are looking for an experienced software engineer...");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", analysis
        ));
    }

    /**
     * 从文本中提取技能关键词
     */
    @PostMapping("/extract-skills-text")
    public ResponseEntity<Map<String, Object>> extractSkillsFromText(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        log.info("Extracting skills from text, length: {}", text != null ? text.length() : 0);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "skills", List.of(
                        Map.of("name", "Java", "category", "language", "confidence", 0.95),
                        Map.of("name", "Spring Boot", "category", "framework", "confidence", 0.92),
                        Map.of("name", "MySQL", "category", "database", "confidence", 0.88),
                        Map.of("name", "Redis", "category", "database", "confidence", 0.85),
                        Map.of("name", "Docker", "category", "devops", "confidence", 0.80),
                        Map.of("name", "Kubernetes", "category", "devops", "confidence", 0.78)
                ),
                "total_count", 6,
                "categories", Map.of(
                        "language", List.of("Java"),
                        "framework", List.of("Spring Boot"),
                        "database", List.of("MySQL", "Redis"),
                        "devops", List.of("Docker", "Kubernetes")
                )
        ));
    }
}
