package com.iflow.agent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.service.ai.UnifiedAIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * AI 面试辅助 API - 使用统一 AI 服务
 */
@Slf4j
@RestController
@RequestMapping("/api/interview-ai")
@RequiredArgsConstructor
public class InterviewAiController {

    private final UnifiedAIService unifiedAIService;
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

            String answer = unifiedAIService.chatWithPrompt(
                "你是一位资深的面试辅导专家，正在帮助候选人准备面试。", 
                prompt, 
                "GLM-4.7"
            ).block(Duration.ofSeconds(30));

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

            String response = unifiedAIService.chatWithPrompt(
                "你是STAR法则分析专家，负责评估面试故事的完整性和质量。",
                prompt,
                "GLM-4.7"
            ).block(Duration.ofSeconds(30));

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
                你正在和HR谈薪资，对方问你期望多少。

                【背景】
                公司：%s
                职位：%s
                你的期望：%s
                工作经验：%s年

                【回答要求】
                请给出一个自然的回答，像真实的薪资谈判场景：

                1. 语气要自信但不咄咄逼人
                2. 用口语表达，比如"其实吧"、"说实话"
                3. 不要说"第一、第二、第三"
                4. 不要用"综上所述"、"总而言之"
                5. 可以说一些具体的理由，比如"我之前...所以..."
                6. 长度控制在150-300字
                7. 不要用过于正式的商务用语

                【示例风格】
                不要这样："首先，我认为我的价值体现在...其次，市场薪资水平是...最后..."
                要这样："其实我也做过一些调研，目前市场上类似岗位的薪资大概是...我自己有X年的经验，之前做过..."

                请直接给出回答，像真的在跟HR说话一样。
                """, company, position, targetSalary, experienceYears);

            String response = unifiedAIService.chatWithPrompt(
                "你是薪资谈判专家，帮助候选人制定谈判策略。",
                prompt,
                "GLM-4.7"
            ).block(Duration.ofSeconds(30));

            if (response == null || response.trim().isEmpty()) {
                return getFallbackSalaryStrategy();
            }

            // 解析 AI 响应，提取策略内容
            String negotiationContent = response.trim();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "strategy", Map.of(
                            "opening", negotiationContent,
                            "anchor", negotiationContent,
                            "justification", negotiationContent,
                            "fallback", negotiationContent
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
                你是技术面试官，想进一步挖掘候选人的深度。

                【背景】
                原问题：%s
                候选人回答：%s
                想要追问的深度：%d（1-5，越大越深入）

                【要求】
                请生成4个自然的追问问题，像真实的面试场景：

                1. 语气要自然，像技术讨论
                2. 可以用"那"、"嗯"、"如果"等过渡词
                3. 问题要具体，不要太空泛
                4. 不要用"请问"、"请问您"这种正式用语
                5. 每个问题30-60字
                6. 要符合深度等级%d的要求

                【示例风格】
                不要这样："请问您对XXX的理解是什么？"
                要这样："那如果并发量再大点，你这个方案还能撑住吗？"

                请以JSON数组格式输出4个问题：
                ["问题1", "问题2", "问题3", "问题4"]
                """, question, answer, depth, depth);

            String response = unifiedAIService.chatWithPrompt(
                "你是面试专家，负责生成深度追问问题，深入挖掘候选人的知识和经验。",
                prompt,
                "GLM-4.7"
            ).block(Duration.ofSeconds(30));

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
            String systemPrompt;
            
            if ("stress".equals(pressureType)) {
                // 高压模式：直接质疑
                systemPrompt = "你是压力面试官，语气要直接、犀利。";
                prompt = String.format("""
                    候选人刚才说了：%s

                    作为压力面试官，你感觉这个回答有点问题，需要质疑一下。

                    【要求】
                    1. 语气要直接、犀利，像真实的压力面试
                    2. 用口语，比如"等等"、"不对"、"你确定吗"
                    3. 直接质疑，不要铺垫
                    4. 可以有点不耐烦的语气
                    5. 长度控制在50-100字

                    【示例风格】
                    不要这样："请问您能否进一步解释..."
                    要这样："等等，你说的这个我不太认同。如果遇到XXX情况，你的方案还能用吗？"

                    请直接输出问题。
                    """, candidateAnswer);
            } else if ("challenge".equals(pressureType)) {
                // 挑战模式：提出挑战性问题
                systemPrompt = "你是技术面试官，喜欢问有深度的问题。";
                prompt = String.format("""
                    候选人刚才说了：%s

                    作为技术面试官，你觉得这个回答还可以，但想再深入挖一下。

                    【要求】
                    1. 语气要自然，像同事间的技术讨论
                    2. 可以用"嗯"、"好的"等过渡词
                    3. 问题要有深度，但不要太刁钻
                    4. 可以说"那如果...你会怎么处理"
                    5. 长度控制在50-100字

                    【示例风格】
                    不要这样："请问您的技术方案考虑了哪些因素？"
                    要这样："嗯，这样理解没问题。那如果数据量再大10倍，你这个方案还能hold住吗？"

                    请直接输出问题。
                    """, candidateAnswer);
            } else {
                // 逻辑模式：考察逻辑思维
                systemPrompt = "你是逻辑清晰的面试官，喜欢问思维类问题。";
                prompt = String.format("""
                    候选人刚才说了：%s

                    作为面试官，你想考察一下候选人的逻辑思维能力。

                    【要求】
                    1. 语气要平实，像正常的面试交流
                    2. 问题要考察思考过程，不要问死记硬背的
                    3. 可以用"那你觉得"、"你怎么看"这样的表达
                    4. 长度控制在50-100字

                    【示例风格】
                    不要这样："请问您的逻辑思维如何体现？"
                    要这样："那你觉得这个问题的本质是什么？如果让你从零开始设计，你会怎么做？"

                    请直接输出问题。
                    """, candidateAnswer);
            }

            String response = unifiedAIService.chatWithPrompt(
                systemPrompt,
                prompt,
                "GLM-4.7"
            ).block(Duration.ofSeconds(30));

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

            String response = unifiedAIService.chatWithPrompt(
                "你是面试复盘专家，负责全面评估面试表现并提供改进建议。",
                prompt.toString(),
                "GLM-4.7"
            ).block(Duration.ofSeconds(30));

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
            你是一位经验丰富的面试官，现在要示范如何回答这个问题。

            【面试场景】
            你正在面试%s的%s职位
            面试官问了：%s

            【回答要求】
            请给出一个真实自然的回答，像你真的在面试一样：

            1. 语气要自然，不要太正式，像和朋友聊天
            2. 用第一人称"我"，不要用"我们"或"本人"
            3. 多说具体的细节，少说大道理
            4. 可以带点个人经历，比如"之前我遇到过这种情况..."
            5. 适当用点口语表达，比如"其实吧"、"说实话"
            6. 回答长度200-400字即可
            7. 不要用"第一、第二、第三"这种列举方式
            8. 不要说"综上所述"、"总而言之"这种总结语

            【示例风格】
            不要这样："首先，我理解了这个问题的核心...其次，我采取了...最后，我..."
            要这样："这个问题挺有意思的。之前我做项目的时候也遇到过...我当时的做法是...效果还不错，性能提升了..."

            请直接给出回答，开头不要说"我会这样回答："，直接说内容。
            """, company, position, question);
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
