package com.iflow.agent.controller;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.CoordinationMode;
import com.iflow.agent.service.interview.agentscope.InterviewCoordinator;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewCoordinator coordinator;

    /**
     * 创建面试会话
     */
    @PostMapping("/sessions")
    public ResponseEntity<InterviewSession> createSession(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody CreateSessionRequest request) {

        log.info("创建面试会话: user={}, candidate={}", userId, request.getCandidateName());

        InterviewSession session = coordinator.createSession(
                userId,
                request.getCandidateName(),
                request.getPosition(),
                request.getCoordinationMode()
        );

        return ResponseEntity.ok(session);
    }

    /**
     * 开始面试
     */
    @PostMapping("/sessions/{sessionId}/start")
    public ResponseEntity<Map<String, String>> startInterview(@PathVariable String sessionId) {
        log.info("开始面试: {}", sessionId);
        coordinator.startInterview(sessionId);
        return ResponseEntity.ok(Map.of("status", "started", "sessionId", sessionId));
    }

    /**
     * 获取下一个问题
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
     * 提交回答
     */
    @PostMapping("/sessions/{sessionId}/answers")
    public ResponseEntity<Map<String, Object>> submitAnswer(
            @PathVariable String sessionId,
            @RequestBody SubmitAnswerRequest request) {

        log.info("提交回答: session={}, question={}", sessionId, request.getQuestionId());

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
     * 完成面试
     */
    @PostMapping("/sessions/{sessionId}/complete")
    public ResponseEntity<Map<String, String>> completeInterview(@PathVariable String sessionId) {
        log.info("完成面试: {}", sessionId);
        coordinator.completeInterview(sessionId);
        return ResponseEntity.ok(Map.of("status", "completed", "sessionId", sessionId));
    }

    /**
     * 获取面试报告
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

    @Data
    public static class CreateSessionRequest {
        private String candidateName;
        private String position;
        private CoordinationMode coordinationMode;
    }

    @Data
    public static class SubmitAnswerRequest {
        private String questionId;
        private String answer;
    }
}
