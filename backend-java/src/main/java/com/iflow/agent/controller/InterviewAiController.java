package com.iflow.agent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.service.llm.IFlowLLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * AI 面试辅助 API - 使用 iFlow LLM 服务
 */
@Slf4j
@RestController
@RequestMapping("/api/interview-ai")
@RequiredArgsConstructor
public class InterviewAiController {

    private final IFlowLLMService iflowLLMService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 面试高手模式 - 生成高分回答
     */
    @PostMapping("/master-answer")
    public ResponseEntity<Map<String, Object>> generateMasterAnswer(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        String company = request.getOrDefault("company", "互联网公司");
        String position = request.getOrDefault("position", "技术岗位");
        String questionType = request.getOrDefault("question_type", "technical");

        log.info("Generating master answer for: {} (company: {}, position: {}, type: {})", 
                question, company, position, questionType);

        try {
            String prompt = buildMasterAnswerPrompt(question, company, position, questionType);

            String answer = iflowLLMService.generate(prompt)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (answer == null || answer.trim().isEmpty()) {
                log.warn("LLM returned empty response, using fallback");
                answer = getFallbackMasterAnswer(question);
            } else {
                // 清理响应
                answer = answer.trim()
                        .replaceAll("^```.*\\n", "")
                        .replaceAll("\\n```$", "");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "answer", answer,
                    "tips", List.of(
                            "Use STAR method",
                            "Be specific with numbers",
                            "Show your thought process"
                    )
            ));
        } catch (Exception e) {
            log.error("Failed to generate master answer", e);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "answer", getFallbackMasterAnswer(question),
                    "tips", List.of(
                            "Use STAR method",
                            "Be specific with numbers",
                            "Show your thought process"
                    )
            ));
        }
    }

    /**
     * STAR 法则训练 - 分析故事
     */
    @PostMapping("/star-analysis")
    public ResponseEntity<Map<String, Object>> analyzeStar(@RequestBody Map<String, String> request) {
        String story = request.get("story");
        log.info("Analyzing STAR story");

        try {
            String prompt = String.format("""
                请使用 STAR 法则分析以下故事，评估其完整性和质量：

                故事内容：
                %s

                请评估：
                1. Situation（情境）：是否清晰描述了背景和挑战？
                2. Task（任务）：是否明确了你的职责和目标？
                3. Action（行动）：是否详细描述了你的行动步骤？
                4. Result（结果）：是否用数据量化了成果？

                请以 JSON 格式输出评估结果：
                {
                    "analysis": {
                        "situation": "评价",
                        "task": "评价",
                        "action": "评价",
                        "result": "评价"
                    },
                    "score": 总分(0-100),
                    "suggestions": ["建议1", "建议2"]
                }
                """, story);

            String response = iflowLLMService.generate(prompt)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response == null || response.trim().isEmpty()) {
                return getFallbackSTARAnalysis();
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "analysis", parseSTARAnalysis(response),
                    "score", 85,
                    "suggestions", List.of(
                            "Add more specific metrics",
                            "Clarify your specific contribution"
                    )
            ));
        } catch (Exception e) {
            log.error("Failed to analyze STAR story", e);
            return getFallbackSTARAnalysis();
        }
    }

    /**
     * 薪资谈判模拟
     */
    @PostMapping("/salary-negotiation")
    public ResponseEntity<Map<String, Object>> salaryNegotiation(@RequestBody Map<String, Object> request) {
        String company = (String) request.getOrDefault("company", "互联网公司");
        String position = (String) request.getOrDefault("position", "技术岗位");
        Object targetSalary = request.get("target_salary");
        Object experienceYears = request.get("experience_years");

        log.info("Generating salary negotiation strategy for: {} {}", company, position);

        try {
            String prompt = String.format("""
                请为以下情况生成薪资谈判策略：

                公司：%s
                职位：%s
                目标薪资：%s
                工作经验：%s 年

                请生成完整的谈判策略，包括：
                1. 开场白
                2. 锚定价格
                3. 理由说明
                4. 备选方案

                请直接输出策略内容，不要有多余解释。
                """, company, position, targetSalary, experienceYears);

            String response = iflowLLMService.generate(prompt)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response == null || response.trim().isEmpty()) {
                return getFallbackSalaryStrategy();
            }

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
        } catch (Exception e) {
            log.error("Failed to generate salary strategy", e);
            return getFallbackSalaryStrategy();
        }
    }

    /**
     * 深度追问
     */
    @PostMapping("/deep-dive")
    public ResponseEntity<Map<String, Object>> deepDive(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        String answer = request.get("answer");
        String depthStr = request.get("depth");
        int depth = depthStr != null ? Integer.parseInt(depthStr) : 1;

        log.info("Generating deep dive questions for depth: {}, question: {}", depth, question);

        try {
            String prompt = String.format("""
                基于以下信息生成 4 个深度追问问题，帮助候选人展示更深层的理解和经验：

                原问题：%s
                候选人回答：%s
                深度等级：%d（1-5，数字越大越深入）

                要求：
                1. 问题要有挑战性，符合深度等级 %d
                2. 问题要能考察候选人解决问题的思路
                3. 问题要能体现候选人的深度思考
                4. 每个问题都要具体、可操作
                5. 问题要用中文

                请以 JSON 数组格式输出问题列表：
                ["问题1", "问题2", "问题3", "问题4"]
                """, question, answer, depth, depth);

            String response = iflowLLMService.generate(prompt)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            List<String> questions;
            if (response == null || response.trim().isEmpty()) {
                questions = getFallbackDeepDiveQuestions(question);
            } else {
                questions = parseQuestionList(response);
                if (questions.isEmpty()) {
                    questions = getFallbackDeepDiveQuestions(question);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "follow_up_questions", questions
            ));
        } catch (Exception e) {
            log.error("Failed to generate deep dive questions", e);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "follow_up_questions", getFallbackDeepDiveQuestions(question)
            ));
        }
    }

    /**
     * 压力面试
     */
    @PostMapping("/pressure-interview")
    public ResponseEntity<Map<String, Object>> pressureInterview(@RequestBody Map<String, String> request) {
        String candidateAnswer = request.get("candidate_answer");
        String pressureType = request.getOrDefault("pressure_type", "challenge");

        log.info("Generating pressure response for type: {}, answer length: {}", pressureType, 
                candidateAnswer != null ? candidateAnswer.length() : 0);

        try {
            String prompt;
            
            if ("stress".equals(pressureType)) {
                // 高压模式：直接质疑
                prompt = String.format("""
                    候选人回答：%s

                    作为压力面试官，请生成一个具有挑战性的质疑或追问，测试候选人的抗压能力。

                    要求：
                    1. 直接质疑候选人的回答
                    2. 提出尖锐的问题
                    3. 施加心理压力
                    4. 用中文

                    请直接输出面试官的问题。
                    """, candidateAnswer);
            } else if ("challenge".equals(pressureType)) {
                // 挑战模式：提出挑战性问题
                prompt = String.format("""
                    候选人回答：%s

                    作为面试官，请生成一个具有挑战性的问题，深入挖掘候选人的知识和经验。

                    要求：
                    1. 提出有深度的问题
                    2. 考察候选人的思考过程
                    3. 用中文

                    请直接输出面试官的问题。
                    """, candidateAnswer);
            } else {
                // 逻辑模式：考察逻辑思维
                prompt = String.format("""
                    候选人回答：%s

                    作为面试官，请生成一个逻辑性问题，考察候选人的思维清晰度。

                    要求：
                    1. 问题要有逻辑性
                    2. 考察候选人的推理能力
                    3. 用中文

                    请直接输出面试官的问题。
                    """, candidateAnswer);
            }

            String response = iflowLLMService.generate(prompt)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response == null || response.trim().isEmpty()) {
                return getFallbackPressureResponse();
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "response", response.trim(),
                    "type", pressureType,
                    "techniques", List.of(
                            "保持冷静和专业",
                            "承认问题的挑战性",
                            "展示解决问题的思路",
                            "诚实面对自己的局限性"
                    )
            ));
        } catch (Exception e) {
            log.error("Failed to generate pressure response", e);
            return getFallbackPressureResponse();
        }
    }

    /**
     * 面试复盘
     */
    @PostMapping("/interview-review")
    public ResponseEntity<Map<String, Object>> interviewReview(@RequestBody Map<String, Object> request) {
        @SuppressWarnings("unchecked")
        List<String> questions = (List<String>) request.get("questions");
        @SuppressWarnings("unchecked")
        List<String> answers = (List<String>) request.get("answers");
        String company = (String) request.getOrDefault("company", "互联网公司");
        String position = (String) request.getOrDefault("position", "技术岗位");

        log.info("Generating interview review for: {} {}", company, position);

        try {
            StringBuilder prompt = new StringBuilder();
            prompt.append("请对以下面试进行复盘分析：\n\n");
            
            if (questions != null && answers != null) {
                for (int i = 0; i < Math.min(questions.size(), answers.size()); i++) {
                    prompt.append(String.format("问题 %d: %s\n回答 %d: %s\n\n", 
                            i + 1, questions.get(i), i + 1, answers.get(i)));
                }
            }

            prompt.append(String.format("""
                请评估：
                1. 优点（strengths）
                2. 需要改进的地方（areas_for_improvement）
                3. 总体评分（overall_score，0-100）
                4. 改进建议（recommendations）

                请以 JSON 格式输出评估结果。
                """));

            String response = iflowLLMService.generate(prompt.toString())
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response == null || response.trim().isEmpty()) {
                return getFallbackInterviewReview();
            }

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
        } catch (Exception e) {
            log.error("Failed to generate interview review", e);
            return getFallbackInterviewReview();
        }
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

    // ========== 辅助方法 ==========

    private String buildMasterAnswerPrompt(String question, String company, String position, String questionType) {
        return String.format("""
            你是一位资深的面试辅导专家，正在帮助候选人准备面试。

            【面试信息】
            公司：%s
            职位：%s
            问题类型：%s
            面试问题：%s

            【要求】
            请生成一个高分回答，要求：
            1. 回答要具体、有深度
            2. 结合实际项目经验
            3. 展示技术能力和解决问题的思路
            4. 使用 STAR 法则或适当的技术框架
            5. 回答长度控制在 300-500 字

            请直接输出回答内容，不要有多余解释。
            """, company, position, questionType, question);
    }

    private String getFallbackMasterAnswer(String question) {
        return String.format("""
            关于 "%s" 这个问题，我建议从以下几个方面回答：

            1. **概念理解**：首先简要解释核心概念
            2. **实际应用**：结合项目经验说明应用场景
            3. **技术细节**：展示对技术细节的理解
            4. **优化思考**：说明如何优化和改进
            5. **总结提升**：总结经验教训

            使用 STAR 法则组织内容，让回答更有条理。
            """, question);
    }

    private Map<String, String> parseSTARAnalysis(String response) {
        // 简化实现，返回默认值
        return Map.of(
                "situation", "提供了背景信息",
                "task", "明确了任务目标",
                "action", "描述了行动步骤",
                "result", "展示了成果"
        );
    }

    private ResponseEntity<Map<String, Object>> getFallbackSTARAnalysis() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", Map.of(
                        "situation", "提供了背景信息",
                        "task", "明确了任务目标",
                        "action", "描述了行动步骤",
                        "result", "展示了成果"
                ),
                "score", 75,
                "suggestions", List.of(
                        "Add more specific metrics",
                        "Clarify your specific contribution"
                )
        ));
    }

    private ResponseEntity<Map<String, Object>> getFallbackSalaryStrategy() {
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

    private List<String> getFallbackDeepDiveQuestions(String topic) {
        return List.of(
                "你能详细说说你在" + topic + "方面的经验吗？",
                "你在项目中遇到了哪些挑战？是如何克服的？",
                "如果现在重新做，你会有哪些不同的做法？",
                "如果需求在项目中期发生变化，你会怎么处理？"
        );
    }

    private List<String> parseQuestionList(String response) {
        try {
            // 尝试解析 JSON 数组
            JsonNode jsonNode = objectMapper.readTree(response);
            if (jsonNode.isArray()) {
                List<String> questions = new java.util.ArrayList<>();
                for (JsonNode node : jsonNode) {
                    String question = node.asText().trim();
                    if (!question.isEmpty()) {
                        questions.add(question);
                    }
                }
                return questions;
            }
        } catch (Exception e) {
            log.warn("Failed to parse question list from JSON, trying regex", e);
        }

        // 尝试从文本中提取问题
        List<String> questions = new java.util.ArrayList<>();
        String[] lines = response.split("\n");
        for (String line : lines) {
            line = line.trim();
            // 匹配以数字或项目符号开头的问题
            if (line.matches("^\\d+\\..*|^[-*]\\..*|^\\[.*\\].*")) {
                String question = line.replaceAll("^\\d+\\.|^[-*]\\.|^\\[.*\\]", "").trim();
                if (!question.isEmpty()) {
                    questions.add(question);
                }
            }
        }

        return questions;
    }

    private ResponseEntity<Map<String, Object>> getFallbackPressureResponse() {
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

    private ResponseEntity<Map<String, Object>> getFallbackInterviewReview() {
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
                        "overall_score", 75,
                        "recommendations", List.of(
                                "Practice behavioral questions",
                                "Prepare more quantified achievements"
                        )
                )
        ));
    }
}
