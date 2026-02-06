package com.iflow.agent.controller;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.CoordinationMode;
import com.iflow.agent.dto.interview.*;
import com.iflow.agent.service.interview.InterviewService;
import com.iflow.agent.service.interview.agentscope.InterviewCoordinator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 面试系统 API - 对应 Python 的 interview.py
 */
@Slf4j
@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;
    private final InterviewCoordinator coordinator;

    // ============ 会话管理 ============

    /**
     * 创建面试会话
     */
    @PostMapping("/sessions")
    public ResponseEntity<InterviewResponse> createSession(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @RequestBody CreateSessionRequest request) {
        log.info("创建面试会话: user={}", userId);
        InterviewResponse response = interviewService.createSession(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 获取会话信息
     */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSession(@PathVariable String sessionId) {
        log.info("获取会话信息: {}", sessionId);
        InterviewSession session = interviewService.getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        return ResponseEntity.ok(Map.of(
                "session_id", sessionId,
                "status", session.getStatus().name(),
                "candidate_name", session.getCandidateName(),
                "position", session.getPosition()
        ));
    }

    /**
     * 开始面试
     */
    @PostMapping("/sessions/{sessionId}/start")
    public ResponseEntity<InterviewResponse> startInterview(@PathVariable String sessionId) {
        log.info("开始面试: {}", sessionId);
        InterviewResponse response = interviewService.startInterview(sessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * 提交回答
     */
    @PostMapping("/sessions/{sessionId}/answer")
    public ResponseEntity<InterviewResponse> submitAnswer(
            @PathVariable String sessionId,
            @RequestBody AnswerRequest request) {
        log.info("提交回答: {}", sessionId);
        InterviewResponse response = interviewService.submitAnswer(sessionId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 暂停面试
     */
    @PostMapping("/sessions/{sessionId}/pause")
    public ResponseEntity<InterviewResponse> pauseInterview(@PathVariable String sessionId) {
        log.info("暂停面试: {}", sessionId);
        InterviewResponse response = interviewService.pauseInterview(sessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * 恢复面试
     */
    @PostMapping("/sessions/{sessionId}/resume")
    public ResponseEntity<InterviewResponse> resumeInterview(@PathVariable String sessionId) {
        log.info("恢复面试: {}", sessionId);
        InterviewResponse response = interviewService.resumeInterview(sessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * 完成面试
     */
    @PostMapping("/sessions/{sessionId}/complete")
    public ResponseEntity<InterviewResponse> completeInterview(@PathVariable String sessionId) {
        log.info("完成面试: {}", sessionId);
        InterviewResponse response = interviewService.completeInterview(sessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * 取消面试
     */
    @PostMapping("/sessions/{sessionId}/cancel")
    public ResponseEntity<InterviewResponse> cancelInterview(@PathVariable String sessionId) {
        log.info("取消面试: {}", sessionId);
        InterviewResponse response = interviewService.cancelInterview(sessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * 获取面试结果
     */
    @GetMapping("/sessions/{sessionId}/result")
    public ResponseEntity<Map<String, Object>> getInterviewResult(@PathVariable String sessionId) {
        log.info("获取面试结果: {}", sessionId);
        Map<String, Object> result = interviewService.getInterviewResult(sessionId);
        return ResponseEntity.ok(result);
    }

    /**
     * 导出面试报告
     */
    @GetMapping("/sessions/{sessionId}/export")
    public ResponseEntity<String> exportInterviewReport(
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "json") String format) {
        log.info("导出面试报告: {}, format={}", sessionId, format);
        String report = interviewService.exportInterviewReport(sessionId, format);
        return ResponseEntity.ok(report);
    }

    // ============ 旧版 API (保持兼容) ============

    /**
     * 创建面试会话 (旧版)
     */
    @PostMapping("/sessions/legacy")
    public ResponseEntity<InterviewSession> createSessionLegacy(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody CreateSessionLegacyRequest request) {
        log.info("创建面试会话(旧版): user={}, candidate={}", userId, request.getCandidateName());

        InterviewSession session = coordinator.createSession(
                userId,
                request.getCandidateName(),
                request.getPosition(),
                request.getCoordinationMode()
        );

        return ResponseEntity.ok(session);
    }

    /**
     * 获取下一个问题 (旧版)
     */
    @PostMapping("/sessions/{sessionId}/questions/next")
    public ResponseEntity<Question> getNextQuestion(
            @PathVariable String sessionId,
            @RequestBody Map<String, Object> candidateProfile) {
        log.info("获取下一个问题: {}", sessionId);
        Question question = coordinator.getNextQuestion(sessionId, candidateProfile);
        return ResponseEntity.ok(question);
    }

    /**
     * 提交回答 (旧版)
     */
    @PostMapping("/sessions/{sessionId}/answers")
    public ResponseEntity<Map<String, Object>> submitAnswerLegacy(
            @PathVariable String sessionId,
            @RequestBody SubmitAnswerRequest request) {
        log.info("提交回答(旧版): session={}, question={}", sessionId, request.getQuestionId());

        Map<String, Object> result = coordinator.submitAnswer(
                sessionId,
                request.getQuestionId(),
                request.getAnswer()
        );

        return ResponseEntity.ok(result);
    }

    /**
     * 切换到下一个面试官
     */
    @PostMapping("/sessions/{sessionId}/agents/next")
    public ResponseEntity<Map<String, String>> switchAgent(@PathVariable String sessionId) {
        log.info("切换面试官: {}", sessionId);
        String nextAgent = coordinator.switchToNextAgent(sessionId);

        if (nextAgent == null) {
            return ResponseEntity.ok(Map.of(
                    "status", "completed",
                    "message", "面试已结束"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", "switched",
                "currentAgent", nextAgent
        ));
    }

    /**
     * 获取面试报告 (旧版)
     */
    @GetMapping("/sessions/{sessionId}/report")
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable String sessionId) {
        log.info("获取面试报告: {}", sessionId);
        Map<String, Object> report = coordinator.generateReport(sessionId);
        return ResponseEntity.ok(report);
    }

    /**
     * 获取可用的协调模式
     */
    @GetMapping("/coordination-modes")
    public ResponseEntity<List<Map<String, String>>> getCoordinationModes() {
        return ResponseEntity.ok(List.of(
                Map.of("code", "sequential", "name", "顺序模式", "description", "智能体按顺序轮流"),
                Map.of("code", "collaborative", "name", "协作模式", "description", "多智能体同时参与"),
                Map.of("code", "arbitrated", "name", "仲裁模式", "description", "主控智能体协调")
        ));
    }

    // ============ 请求类 ============

    @lombok.Data
    public static class CreateSessionLegacyRequest {
        private String candidateName;
        private String position;
        private CoordinationMode coordinationMode;
    }

    @lombok.Data
    public static class SubmitAnswerRequest {
        private String questionId;
        private String answer;
    }
}
