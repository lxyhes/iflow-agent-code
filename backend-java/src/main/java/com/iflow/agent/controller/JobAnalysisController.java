package com.iflow.agent.controller;

import com.iflow.agent.dto.job.JobAnalysisRequest;
import com.iflow.agent.dto.job.JobAnalysisResponse;
import com.iflow.agent.service.job.JobAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 职位分析 API - 对应 Python 的 job_analysis.py
 */
@Slf4j
@RestController
@RequestMapping("/api/job-analysis")
@RequiredArgsConstructor
public class JobAnalysisController {

    private final JobAnalysisService jobAnalysisService;

    /**
     * 分析招聘网页
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeJobPage(@RequestBody JobAnalysisRequest request) {
        log.info("分析职位页面: {}", request.getUrl());

        try {
            JobAnalysisResponse result = jobAnalysisService.analyzeJobPage(request.getUrl());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", result
            ));
        } catch (Exception e) {
            log.error("分析失败: {}", request.getUrl(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 从文本中提取技能
     */
    @PostMapping("/extract-skills")
    public ResponseEntity<Map<String, Object>> extractSkills(@RequestBody Map<String, String> request) {
        String text = request.getOrDefault("text", "");
        log.info("提取技能，文本长度: {}", text.length());

        List<String> skills = jobAnalysisService.extractSkills(text);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "skills", skills,
                "count", skills.size()
        ));
    }

    /**
     * 获取支持的招聘网站
     */
    @GetMapping("/supported-sites")
    public ResponseEntity<Map<String, Object>> getSupportedSites() {
        List<Map<String, String>> sites = jobAnalysisService.getSupportedSites();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "sites", sites
        ));
    }

    /**
     * 清除分析缓存
     */
    @DeleteMapping("/cache")
    public ResponseEntity<Map<String, Object>> clearCache() {
        int count = jobAnalysisService.clearCache();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "已清除 " + count + " 条缓存数据"
        ));
    }
}
