package com.iflow.agent.controller;

import com.iflow.agent.domain.resume.entity.*;
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

    @PutMapping("/work-experience/{expId}")
    public ResponseEntity<Map<String, Object>> updateWorkExperience(
            @PathVariable Long expId,
            @RequestBody WorkExperience experience) {
        WorkExperience updated = resumeService.updateWorkExperience(expId, experience);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/work-experience/{expId}")
    public ResponseEntity<Map<String, Object>> deleteWorkExperience(@PathVariable Long expId) {
        resumeService.deleteWorkExperience(expId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Work experience deleted"));
    }

    // ========== 教育经历 ==========

    @PostMapping("/{id}/education")
    public ResponseEntity<Map<String, Object>> addEducation(
            @PathVariable String id,
            @RequestBody Education education) {
        Education added = resumeService.addEducation(id, education);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/education/{eduId}")
    public ResponseEntity<Map<String, Object>> updateEducation(
            @PathVariable Long eduId,
            @RequestBody Education education) {
        Education updated = resumeService.updateEducation(eduId, education);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/education/{eduId}")
    public ResponseEntity<Map<String, Object>> deleteEducation(@PathVariable Long eduId) {
        resumeService.deleteEducation(eduId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Education deleted"));
    }

    // ========== 技能 ==========

    @PostMapping("/{id}/skills")
    public ResponseEntity<Map<String, Object>> addSkill(
            @PathVariable String id,
            @RequestBody Skill skill) {
        Skill added = resumeService.addSkill(id, skill);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/skills/{skillId}")
    public ResponseEntity<Map<String, Object>> updateSkill(
            @PathVariable Long skillId,
            @RequestBody Skill skill) {
        Skill updated = resumeService.updateSkill(skillId, skill);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/skills/{skillId}")
    public ResponseEntity<Map<String, Object>> deleteSkill(@PathVariable Long skillId) {
        resumeService.deleteSkill(skillId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Skill deleted"));
    }

    // ========== 项目经历 ==========

    @PostMapping("/{id}/projects")
    public ResponseEntity<Map<String, Object>> addProject(
            @PathVariable String id,
            @RequestBody Project project) {
        Project added = resumeService.addProject(id, project);
        return ResponseEntity.ok(Map.of("success", true, "data", added));
    }

    @PutMapping("/projects/{projectId}")
    public ResponseEntity<Map<String, Object>> updateProject(
            @PathVariable Long projectId,
            @RequestBody Project project) {
        Project updated = resumeService.updateProject(projectId, project);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<Map<String, Object>> deleteProject(@PathVariable Long projectId) {
        resumeService.deleteProject(projectId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Project deleted"));
    }

    // ========== AI 功能 ==========

    @PostMapping("/{id}/optimize")
    public ResponseEntity<Map<String, Object>> optimizeResume(
            @PathVariable String id,
            @RequestBody OptimizeRequest request) {
        String result = resumeService.optimizeResume(id, request.getJobDescription());
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

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
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    @PostMapping("/{id}/match-job")
    public ResponseEntity<Map<String, Object>> matchJob(
            @PathVariable String id,
            @RequestBody JobMatchRequest request) {
        String result = resumeService.matchJob(id, request.getJobDescription());
        return ResponseEntity.ok(Map.of("success", true, "data", result));
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
}
