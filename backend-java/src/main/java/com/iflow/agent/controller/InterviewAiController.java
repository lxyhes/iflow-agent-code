package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 面试辅助 API - 对应 Python 的 interview_ai.py
 */
@Slf4j
@RestController
@RequestMapping("/interview-ai")
@RequiredArgsConstructor
public class InterviewAiController {

    /**
     * 面试高手模式 - 生成高分回答
     */
    @PostMapping("/master-answer")
    public ResponseEntity<Map<String, Object>> generateMasterAnswer(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        log.info("Generating master answer for: {}", question);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "answer", "Here's a high-scoring answer to \"" + question + "\":\n\n" +
                        "1. First, let me provide context...\n" +
                        "2. Then, I'll share my specific experience...\n" +
                        "3. Finally, I'll highlight the results achieved...",
                "tips", List.of(
                        "Use STAR method",
                        "Be specific with numbers",
                        "Show your thought process"
                )
        ));
    }

    /**
     * STAR 法则训练 - 分析故事
     */
    @PostMapping("/star-analysis")
    public ResponseEntity<Map<String, Object>> analyzeStar(@RequestBody Map<String, String> request) {
        String story = request.get("story");
        log.info("Analyzing STAR story");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", Map.of(
                        "situation", "Clear context provided ✓",
                        "task", "Well-defined objective ✓",
                        "action", "Detailed steps described ✓",
                        "result", "Quantified outcomes ✓"
                ),
                "score", 85,
                "suggestions", List.of(
                        "Add more specific metrics",
                        "Clarify your specific contribution"
                )
        ));
    }

    /**
     * 薪资谈判模拟
     */
    @PostMapping("/salary-negotiation")
    public ResponseEntity<Map<String, Object>> salaryNegotiation(@RequestBody Map<String, Object> request) {
        log.info("Generating salary negotiation strategy");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "strategy", Map.of(
                        "opening", "Based on my research and experience...",
                        "anchor", "I'm looking for a range of X to Y",
                        "justification", "My skills in A, B, and C bring value...",
                        "fallback", "If the base is fixed, can we discuss benefits?"
                ),
                "tips", List.of(
                        "Research market rates beforehand",
                        "Consider total compensation package",
                        "Practice your delivery"
                )
        ));
    }

    /**
     * 深度追问
     */
    @PostMapping("/deep-dive")
    public ResponseEntity<Map<String, Object>> deepDive(@RequestBody Map<String, String> request) {
        String topic = request.get("topic");
        log.info("Generating deep dive questions for: {}", topic);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "follow_up_questions", List.of(
                        "Can you elaborate on your experience with " + topic + "?",
                        "What challenges did you face and how did you overcome them?",
                        "How would you approach this differently today?",
                        "What would you do if the requirements changed mid-project?"
                )
        ));
    }

    /**
     * 压力面试
     */
    @PostMapping("/pressure-interview")
    public ResponseEntity<Map<String, Object>> pressureInterview(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        log.info("Generating pressure response for: {}", question);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "response", "I understand this is a challenging situation. " +
                        "Let me address this directly...",
                "techniques", List.of(
                        "Stay calm and composed",
                        "Acknowledge the difficulty",
                        "Focus on solutions, not problems",
                        "Be honest about limitations"
                )
        ));
    }

    /**
     * 面试复盘
     */
    @PostMapping("/interview-review")
    public ResponseEntity<Map<String, Object>> interviewReview(@RequestBody Map<String, Object> request) {
        log.info("Generating interview review");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "review", Map.of(
                        "strengths", List.of(
                                "Clear communication",
                                "Strong technical knowledge"
                        ),
                        "areas_for_improvement", List.of(
                                "Provide more specific examples",
                                "Be more concise in answers"
                        ),
                        "overall_score", 82,
                        "recommendations", List.of(
                                "Practice behavioral questions",
                                "Prepare more quantified achievements"
                        )
                )
        ));
    }

    /**
     * 获取服务状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "active",
                "features", List.of(
                        "master_answer",
                        "star_analysis",
                        "salary_negotiation",
                        "deep_dive",
                        "pressure_interview",
                        "interview_review"
                )
        ));
    }
}
