package com.iflow.agent.controller;

import com.iflow.agent.domain.resume.entity.*;
import com.iflow.agent.domain.resume.service.ResumeAiService;
import com.iflow.agent.domain.resume.service.ResumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 简历管理 API - 对应 Python 的 resume.py
 */
@Slf4j
@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;
    private final ResumeAiService resumeAiService;

    // ========== 简历基本操作 ==========

    @GetMapping
    public ResponseEntity<Map<String, Object>> getResumes(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        List<Resume> resumes = resumeService.getResumes(userId);
        return ResponseEntity.ok(Map.of("success", true, "data", resumes));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getResume(@PathVariable String id) {
        return resumeService.getResume(id)
                .map(resume -> ResponseEntity.ok(Map.of("success", true, "data", resume)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createResume(
            @RequestBody ResumeCreateRequest request,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        Resume resume = resumeService.createResume(
                userId,
                request.getName(),
                request.getTargetPosition(),
                request.getTemplate()
        );
        return ResponseEntity.ok(Map.of("success", true, "data", resume));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateResume(
            @PathVariable String id,
            @RequestBody ResumeUpdateRequest request) {
        Resume updates = new Resume();
        updates.setName(request.getName());
        updates.setTargetPosition(request.getTargetPosition());
        updates.setTemplate(request.getTemplate());

        Resume updated = resumeService.updateResume(id, updates);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteResume(@PathVariable String id) {
        resumeService.deleteResume(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Resume deleted"));
    }

    // ========== 个人信息 ==========

    @PutMapping("/{id}/personal-info")
    public ResponseEntity<Map<String, Object>> updatePersonalInfo(
            @PathVariable String id,
            @RequestBody PersonalInfo info) {
        PersonalInfo updated = resumeService.updatePersonalInfo(id, info);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    // ========== 工作经历 ==========

    @PostMapping("/{id}/work-experience")
    public ResponseEntity<Map<String, Object>> addWorkExperience(
            @PathVariable String id,
            @RequestBody WorkExperience experience) {
        WorkExperience added = resumeService.addWorkExperience(id, experience);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/{id}/work-experience/{expId}")
    public ResponseEntity<Map<String, Object>> updateWorkExperience(
            @PathVariable String id,
            @PathVariable Long expId,
            @RequestBody WorkExperience experience) {
        WorkExperience updated = resumeService.updateWorkExperience(expId, experience);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/{id}/work-experience/{expId}")
    public ResponseEntity<Map<String, Object>> deleteWorkExperience(
            @PathVariable String id,
            @PathVariable Long expId) {
        resumeService.deleteWorkExperience(expId);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        return ResponseEntity.ok(Map.of("success", true, "data", resume));
    }

    @PutMapping("/{id}/work-experience-order")
    public ResponseEntity<Map<String, Object>> updateWorkExperienceOrder(
            @PathVariable String id,
            @RequestBody List<Long> order) {
        // 更新工作经历排序
        resumeService.updateWorkExperienceOrder(id, order);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        return ResponseEntity.ok(Map.of("success", true, "data", resume));
    }

    // ========== 教育经历 ==========

    @PostMapping("/{id}/education")
    public ResponseEntity<Map<String, Object>> addEducation(
            @PathVariable String id,
            @RequestBody Education education) {
        Education added = resumeService.addEducation(id, education);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/{id}/education/{eduId}")
    public ResponseEntity<Map<String, Object>> updateEducation(
            @PathVariable String id,
            @PathVariable Long eduId,
            @RequestBody Education education) {
        Education updated = resumeService.updateEducation(eduId, education);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/{id}/education/{eduId}")
    public ResponseEntity<Map<String, Object>> deleteEducation(
            @PathVariable String id,
            @PathVariable Long eduId) {
        resumeService.deleteEducation(eduId);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        return ResponseEntity.ok(Map.of("success", true, "data", resume));
    }

    // ========== 技能 ==========

    @PostMapping("/{id}/skills")
    public ResponseEntity<Map<String, Object>> addSkill(
            @PathVariable String id,
            @RequestBody Skill skill) {
        Skill added = resumeService.addSkill(id, skill);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/{id}/skills/{skillId}")
    public ResponseEntity<Map<String, Object>> updateSkill(
            @PathVariable String id,
            @PathVariable Long skillId,
            @RequestBody Skill skill) {
        Skill updated = resumeService.updateSkill(skillId, skill);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/{id}/skills/{skillId}")
    public ResponseEntity<Map<String, Object>> deleteSkill(
            @PathVariable String id,
            @PathVariable Long skillId) {
        log.info("Deleting skill {} from resume {}", skillId, id);
        Resume resume = resumeService.deleteSkill(id, skillId);
        return ResponseEntity.ok(Map.of("success", true, "data", resume));
    }

    // ========== 项目经历 ==========

    @PostMapping("/{id}/projects")
    public ResponseEntity<Map<String, Object>> addProject(
            @PathVariable String id,
            @RequestBody Project project) {
        Project added = resumeService.addProject(id, project);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/{id}/projects/{projectId}")
    public ResponseEntity<Map<String, Object>> updateProject(
            @PathVariable String id,
            @PathVariable Long projectId,
            @RequestBody Project project) {
        Project updated = resumeService.updateProject(projectId, project);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/{id}/projects/{projectId}")
    public ResponseEntity<Map<String, Object>> deleteProject(
            @PathVariable String id,
            @PathVariable Long projectId) {
        resumeService.deleteProject(projectId);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        return ResponseEntity.ok(Map.of("success", true, "data", resume));
    }

    // ========== AI 功能 ==========

    /**
     * AI深度分析简历
     */
    @PostMapping("/{id}/ai-analyze")
    public ResponseEntity<Map<String, Object>> aiAnalyzeResume(@PathVariable String id) {
        log.info("AI分析简历: {}", id);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        Map<String, Object> result = resumeAiService.aiAnalyzeResume(resume);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * AI优化简历
     */
    @PostMapping("/{id}/optimize")
    public ResponseEntity<Map<String, Object>> optimizeResume(
            @PathVariable String id,
            @RequestBody OptimizeRequest request) {
        String result = resumeService.optimizeResume(id, request.getJobDescription());
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * 简历与职位匹配分析
     */
    @PostMapping("/{id}/match-job")
    public ResponseEntity<Map<String, Object>> matchJob(
            @PathVariable String id,
            @RequestBody JobMatchRequest request) {
        String result = resumeService.matchJob(id, request.getJobDescription());
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * 根据AI诊断自动重写简历
     */
    @PostMapping("/{id}/rewrite")
    public ResponseEntity<Map<String, Object>> rewriteResume(
            @PathVariable String id,
            @RequestBody RewriteRequest request) {
        log.info("重写简历: {}", id);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        Map<String, Object> result = resumeAiService.rewriteResume(resume, request.getHealthAnalysis(), request.getModel());
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * 获取 AI 生成历史记录
     */
    @GetMapping("/{id}/ai-history")
    public ResponseEntity<Map<String, Object>> getAiHistory(
            @PathVariable String id,
            @RequestParam(required = false) String type) {
        log.info("获取 AI 历史: resumeId={}, type={}", id, type);
        List<Map<String, Object>> history = resumeAiService.getAiHistory(id, type);
        return ResponseEntity.ok(Map.of("success", true, "data", history));
    }

    /**
     * AI简历健康度检查
     */
    @PostMapping("/{id}/health-check")
    public ResponseEntity<Map<String, Object>> healthCheck(@PathVariable String id) {
        log.info("简历健康度检查: {}", id);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        Map<String, Object> result = resumeAiService.healthCheck(resume);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * AI排版检查
     */
    @PostMapping("/{id}/layout-check")
    public ResponseEntity<Map<String, Object>> layoutCheck(@PathVariable String id) {
        log.info("简历排版检查: {}", id);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        Map<String, Object> result = resumeAiService.layoutCheck(resume);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * AI简历诊断
     */
    @PostMapping("/{id}/diagnose")
    public ResponseEntity<Map<String, Object>> diagnoseResume(@PathVariable String id) {
        log.info("简历诊断: {}", id);
        Resume resume = resumeService.getResume(id)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + id));
        Map<String, Object> result = resumeAiService.diagnoseResume(resume);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    /**
     * 生成求职信
     */
    @PostMapping("/{id}/cover-letter")
    public ResponseEntity<Map<String, Object>> generateCoverLetter(
            @PathVariable String id,
            @RequestBody CoverLetterRequest request) {
        String result = resumeService.generateCoverLetter(
                id,
                request.getCompany(),
                request.getPosition(),
                request.getJobDescription()
        );
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("cover_letter", result)));
    }

    // ========== 模板相关 ==========

    /**
     * 获取简历模板列表
     */
    @GetMapping("/templates/list")
    public ResponseEntity<Map<String, Object>> getTemplates(
            @RequestParam(required = false) String category) {
        log.info("获取简历模板列表, category: {}", category);
        // 返回内置模板列表
        List<Map<String, Object>> templates = List.of(
                Map.of("id", "modern", "name", "现代风格", "description", "简洁现代的简历模板", "category", "通用", "preview", "/templates/modern.png", "is_builtin", true),
                Map.of("id", "classic", "name", "经典风格", "description", "传统经典的简历模板", "category", "通用", "preview", "/templates/classic.png", "is_builtin", true),
                Map.of("id", "creative", "name", "创意风格", "description", "适合设计师的创意模板", "category", "设计", "preview", "/templates/creative.png", "is_builtin", true),
                Map.of("id", "tech", "name", "技术风格", "description", "适合技术人员的简历模板", "category", "技术", "preview", "/templates/tech.png", "is_builtin", true),
                Map.of("id", "minimal", "name", "极简风格", "description", "极简主义的简历模板", "category", "通用", "preview", "/templates/minimal.png", "is_builtin", true)
        );
        return ResponseEntity.ok(Map.of("success", true, "data", templates));
    }

    /**
     * 获取模板分类列表
     */
    @GetMapping("/templates/categories")
    public ResponseEntity<Map<String, Object>> getTemplateCategories() {
        log.info("获取模板分类列表");
        List<Map<String, Object>> categories = List.of(
                Map.of("id", "general", "name", "通用", "count", 3),
                Map.of("id", "tech", "name", "技术", "count", 1),
                Map.of("id", "design", "name", "设计", "count", 1),
                Map.of("id", "business", "name", "商务", "count", 0)
        );
        return ResponseEntity.ok(Map.of("success", true, "data", categories));
    }

    /**
     * 获取模板详情
     */
    @GetMapping("/templates/{templateId}")
    public ResponseEntity<Map<String, Object>> getTemplateDetail(@PathVariable String templateId) {
        log.info("获取模板详情: {}", templateId);
        Map<String, Object> template = Map.of(
                "id", templateId,
                "name", getTemplateName(templateId),
                "description", "简历模板",
                "category", "通用",
                "preview", "/templates/" + templateId + ".png",
                "is_builtin", true,
                "config", Map.of(
                        "font_family", "Arial",
                        "font_size", "12pt",
                        "color_scheme", "blue",
                        "layout", "single_column"
                )
        );
        return ResponseEntity.ok(Map.of("success", true, "data", template));
    }

    /**
     * 获取热门模板列表
     */
    @GetMapping("/templates/popular/list")
    public ResponseEntity<Map<String, Object>> getPopularTemplates(
            @RequestParam(defaultValue = "5") int limit) {
        log.info("获取热门模板列表, limit: {}", limit);
        List<Map<String, Object>> templates = List.of(
                Map.of("id", "modern", "name", "现代风格", "description", "简洁现代的简历模板", "category", "通用", "preview", "/templates/modern.png", "is_builtin", true, "usage_count", 1250),
                Map.of("id", "tech", "name", "技术风格", "description", "适合技术人员的简历模板", "category", "技术", "preview", "/templates/tech.png", "is_builtin", true, "usage_count", 980),
                Map.of("id", "classic", "name", "经典风格", "description", "传统经典的简历模板", "category", "通用", "preview", "/templates/classic.png", "is_builtin", true, "usage_count", 850)
        );
        return ResponseEntity.ok(Map.of("success", true, "data", templates));
    }

    private String getTemplateName(String templateId) {
        return switch (templateId) {
            case "modern" -> "现代风格";
            case "classic" -> "经典风格";
            case "creative" -> "创意风格";
            case "tech" -> "技术风格";
            case "minimal" -> "极简风格";
            default -> "默认模板";
        };
    }

    // ========== Request DTOs ==========

    @lombok.Data
    public static class ResumeCreateRequest {
        private String name;
        private String targetPosition;
        private String template = "modern";
    }

    @lombok.Data
    public static class ResumeUpdateRequest {
        private String name;
        private String targetPosition;
        private String template;
    }

    @lombok.Data
    public static class OptimizeRequest {
        private String jobDescription;
    }

    @lombok.Data
    public static class CoverLetterRequest {
        private String company;
        private String position;
        private String jobDescription;
    }

    @lombok.Data
    public static class JobMatchRequest {
        private String jobDescription;
    }

    @lombok.Data
    public static class RewriteRequest {
        private Map<String, Object> healthAnalysis;
        private String model;
    }
}
