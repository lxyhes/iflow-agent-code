package com.iflow.agent.controller;

import com.iflow.agent.entity.Resume;
import com.iflow.agent.service.resume.ResumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    @GetMapping
    public ResponseEntity<List<Resume>> getResumes(@RequestHeader("X-User-Id") String userId) {
        List<Resume> resumes = resumeService.getResumesByUserId(userId);
        return ResponseEntity.ok(resumes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resume> getResume(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") String userId) {
        return resumeService.getResumeById(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Resume> createResume(
            @RequestBody Resume resume,
            @RequestHeader("X-User-Id") String userId) {
        resume.setUserId(userId);
        Resume created = resumeService.createResume(resume);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resume> updateResume(
            @PathVariable Long id,
            @RequestBody Resume resume,
            @RequestHeader("X-User-Id") String userId) {
        try {
            Resume updated = resumeService.updateResume(id, userId, resume);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteResume(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") String userId) {
        resumeService.deleteResume(id, userId);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
