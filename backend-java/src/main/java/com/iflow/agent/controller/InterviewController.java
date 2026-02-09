package com.iflow.agent.controller;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.entity.PracticeQuestion;
import com.iflow.agent.domain.interview.entity.PracticeSession;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.CoordinationMode;
import com.iflow.agent.dto.interview.*;
import com.iflow.agent.service.interview.InterviewService;
import com.iflow.agent.service.interview.PracticeSessionService;
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
    private final PracticeSessionService practiceSessionService;
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

    /**
     * 删除面试会话
     */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> deleteSession(@PathVariable String sessionId) {
        log.info("删除面试会话: {}", sessionId);
        boolean success = interviewService.deleteSession(sessionId);
        return ResponseEntity.ok(Map.of(
                "success", success,
                "session_id", sessionId,
                "message", success ? "会话已删除" : "删除失败"
        ));
    }

    /**
     * 列表面试会话
     */
    @GetMapping("/sessions")
    public ResponseEntity<Map<String, Object>> listSessions(
            @RequestParam(required = false) String candidateId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "100") int limit) {
        log.info("列表面试会话: candidateId={}, status={}, limit={}", candidateId, status, limit);
        List<Map<String, Object>> sessions = interviewService.listSessions(candidateId, status, limit);
        return ResponseEntity.ok(Map.of(
                "sessions", sessions,
                "total", sessions.size()
        ));
    }

    // ============ 练习模式 API ============

    /**
     * 创建练习会话
     */
    @PostMapping("/practice")
    public ResponseEntity<Map<String, Object>> createPracticeSession(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @RequestBody CreatePracticeRequest request) {
        log.info("创建练习会话: user={}, mode={}, difficulty={}", userId, request.getMode(), request.getDifficulty());

        PracticeSession session = practiceSessionService.createSession(
                userId,
                request.getMode(),
                request.getDifficulty(),
                request.getQuestionCount(),
                request.getFocusAreas()
        );

        // 启动会话
        practiceSessionService.startSession(session.getId());

        PracticeQuestion currentQuestion = session.getCurrentQuestion();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "session_id", session.getId(),
                "status", "created",
                "message", "练习会话创建成功",
                "data", Map.of(
                        "mode", session.getMode().getCode(),
                        "difficulty", session.getDifficulty().getCode(),
                        "total_questions", session.getQuestionCount(),
                        "current_question", currentQuestion != null ? Map.of(
                                "id", currentQuestion.getId(),
                                "content", currentQuestion.getContent(),
                                "category", currentQuestion.getCategory(),
                                "hints", currentQuestion.getHints()
                        ) : null
                )
        ));
    }

    /**
     * 获取练习会话信息
     */
    @GetMapping("/practice/{sessionId}")
    public ResponseEntity<Map<String, Object>> getPracticeSession(@PathVariable String sessionId) {
        log.info("获取练习会话: {}", sessionId);

        PracticeSession session = practiceSessionService.getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Practice session not found"));

        PracticeQuestion currentQuestion = session.getCurrentQuestion();
        PracticeSession.PracticeStats stats = session.getStats();

        return ResponseEntity.ok(Map.of(
                "session_id", sessionId,
                "mode", session.getMode().getCode(),
                "difficulty", session.getDifficulty().getCode(),
                "progress", session.getProgress(),
                "stats", Map.of(
                        "total_questions", stats.getTotalQuestions(),
                        "answered_questions", stats.getAnsweredQuestions(),
                        "correct_questions", stats.getCorrectQuestions(),
                        "accuracy_rate", stats.getAccuracyRate(),
                        "average_score", stats.getAverageScore()
                ),
                "current_question", currentQuestion != null ? Map.of(
                        "id", currentQuestion.getId(),
                        "content", currentQuestion.getContent(),
                        "category", currentQuestion.getCategory(),
                        "hints", currentQuestion.getHints()
                ) : null
        ));
    }

    /**
     * 提交练习回答
     */
    @PostMapping("/practice/{sessionId}/answer")
    public ResponseEntity<Map<String, Object>> submitPracticeAnswer(
            @PathVariable String sessionId,
            @RequestBody PracticeAnswerRequest request) {
        log.info("提交练习回答: {}", sessionId);

        Map<String, Object> result = practiceSessionService.submitAnswer(
                sessionId,
                request.getAnswer(),
                request.getDuration()
        );

        return ResponseEntity.ok(result);
    }

    /**
     * 获取提示
     */
    @PostMapping("/practice/{sessionId}/hint")
    public ResponseEntity<Map<String, Object>> getPracticeHint(@PathVariable String sessionId) {
        log.info("获取练习提示: {}", sessionId);

        String hint = practiceSessionService.getHint(sessionId);

        return ResponseEntity.ok(Map.of(
                "hint", hint,
                "has_more_hints", hint != null
        ));
    }

    /**
     * 完成练习会话
     */
    @PostMapping("/practice/{sessionId}/complete")
    public ResponseEntity<Map<String, Object>> completePracticeSession(@PathVariable String sessionId) {
        log.info("完成练习会话: {}", sessionId);

        Map<String, Object> result = practiceSessionService.completeSession(sessionId);

        return ResponseEntity.ok(result);
    }

    /**
     * 删除练习会话
     */
    @DeleteMapping("/practice/{sessionId}")
    public ResponseEntity<Map<String, Object>> deletePracticeSession(@PathVariable String sessionId) {
        log.info("删除练习会话: {}", sessionId);

        boolean success = practiceSessionService.deleteSession(sessionId);

        return ResponseEntity.ok(Map.of(
                "session_id", sessionId,
                "status", success ? "deleted" : "error",
                "message", success ? "练习会话已删除" : "删除失败"
        ));
    }

    /**
     * 生成面试问题参考答案
     */
    @PostMapping("/generate-answer")
    public ResponseEntity<Map<String, Object>> generateInterviewAnswer(
            @RequestBody GenerateAnswerRequest request) {
        log.info("生成面试答案: {}", request.getQuestion());

        String answer = practiceSessionService.generateAnswer(
                request.getQuestion(),
                request.getCategory(),
                request.getKeyPoints(),
                request.getProjectContext()
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "answer", answer
        ));
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

    @lombok.Data
    public static class CreatePracticeRequest {
        private String mode = "mixed"; // system_design, coding, behavioral, technical, mixed
        private String difficulty = "intermediate"; // beginner, intermediate, advanced, expert
        private int questionCount = 5;
        private List<String> focusAreas = List.of();
    }

    @lombok.Data
    public static class PracticeAnswerRequest {
        private String answer;
        private Integer duration; // 回答时长（秒）
    }

    @lombok.Data
    public static class GenerateAnswerRequest {
        private String question;
        private String category;
        private List<String> keyPoints = List.of();
        private Map<String, Object> projectContext;
    }
}
