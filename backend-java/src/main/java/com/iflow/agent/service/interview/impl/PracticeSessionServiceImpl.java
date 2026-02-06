package com.iflow.agent.service.interview.impl;

import com.iflow.agent.domain.interview.entity.PracticeAnswer;
import com.iflow.agent.domain.interview.entity.PracticeQuestion;
import com.iflow.agent.domain.interview.entity.PracticeSession;
import com.iflow.agent.domain.interview.enums.InterviewStatus;
import com.iflow.agent.domain.interview.repository.PracticeSessionRepository;
import com.iflow.agent.service.ai.TongyiQianwenService;
import com.iflow.agent.service.interview.PracticeSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 练习会话服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PracticeSessionServiceImpl implements PracticeSessionService {

    private final PracticeSessionRepository practiceSessionRepository;
    private final TongyiQianwenService tongyiQianwenService;

    @Override
    @Transactional
    public PracticeSession createSession(String userId, String modeCode, String difficultyCode, int questionCount, List<String> focusAreas) {
        log.info("Creating practice session: user={}, mode={}, difficulty={}, count={}",
                userId, modeCode, difficultyCode, questionCount);

        PracticeSession.PracticeMode mode = PracticeSession.PracticeMode.fromCode(modeCode);
        PracticeSession.PracticeDifficulty difficulty = PracticeSession.PracticeDifficulty.fromCode(difficultyCode);

        PracticeSession session = PracticeSession.builder()
                .userId(userId)
                .mode(mode)
                .difficulty(difficulty)
                .questionCount(questionCount)
                .focusAreas(focusAreas != null ? focusAreas : new ArrayList<>())
                .status(InterviewStatus.CREATED)
                .currentQuestionIndex(0)
                .build();

        // 生成问题
        List<PracticeQuestion> questions = generateQuestions(session, mode, difficulty, questionCount);
        session.setQuestions(questions);

        return practiceSessionRepository.save(session);
    }

    @Override
    public Optional<PracticeSession> getSession(String sessionId) {
        return practiceSessionRepository.findById(sessionId);
    }

    @Override
    @Transactional
    public boolean startSession(String sessionId) {
        log.info("Starting practice session: {}", sessionId);

        PracticeSession session = practiceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (session.getStatus() != InterviewStatus.CREATED) {
            log.warn("Session {} is not in CREATED status", sessionId);
            return false;
        }

        session.setStatus(InterviewStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        practiceSessionRepository.save(session);

        return true;
    }

    @Override
    @Transactional
    public Map<String, Object> submitAnswer(String sessionId, String answer, Integer duration) {
        log.info("Submitting answer for session: {}", sessionId);

        PracticeSession session = practiceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (session.getStatus() != InterviewStatus.IN_PROGRESS) {
            throw new IllegalStateException("Session is not in progress");
        }

        PracticeQuestion currentQuestion = session.getCurrentQuestion();
        if (currentQuestion == null) {
            throw new IllegalStateException("No current question");
        }

        // 评估回答
        Map<String, Object> evaluation = evaluateAnswer(currentQuestion, answer);

        // 保存回答
        PracticeAnswer practiceAnswer = PracticeAnswer.builder()
                .session(session)
                .question(currentQuestion)
                .questionIndex(session.getCurrentQuestionIndex())
                .answerContent(answer)
                .duration(duration)
                .score((Integer) evaluation.get("score"))
                .evaluation((String) evaluation.get("evaluation"))
                .expectedPoints((List<String>) evaluation.get("expected_points"))
                .detailedFeedback((String) evaluation.get("detailed_feedback"))
                .build();

        session.getAnswers().add(practiceAnswer);

        // 更新总分
        int totalScore = session.getAnswers().stream()
                .mapToInt(a -> a.getScore() != null ? a.getScore() : 0)
                .sum();
        session.setTotalScore(totalScore);

        // 检查是否完成
        boolean isComplete = !session.nextQuestion();
        if (isComplete) {
            session.setStatus(InterviewStatus.COMPLETED);
            session.setCompletedAt(LocalDateTime.now());
        }

        practiceSessionRepository.save(session);

        // 构建响应
        Map<String, Object> result = new HashMap<>();
        result.put("evaluation", evaluation.get("evaluation"));
        result.put("expected_points", evaluation.get("expected_points"));
        result.put("detailed_feedback", evaluation.get("detailed_feedback"));
        result.put("score", evaluation.get("score"));
        result.put("progress", session.getProgress());
        result.put("is_complete", isComplete);

        if (!isComplete) {
            PracticeQuestion nextQuestion = session.getCurrentQuestion();
            result.put("next_question", Map.of(
                    "id", nextQuestion.getId(),
                    "content", nextQuestion.getContent(),
                    "category", nextQuestion.getCategory(),
                    "hints", nextQuestion.getHints()
            ));
        }

        return result;
    }

    @Override
    public String getHint(String sessionId) {
        log.info("Getting hint for session: {}", sessionId);

        PracticeSession session = practiceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        PracticeQuestion currentQuestion = session.getCurrentQuestion();
        if (currentQuestion == null) {
            return null;
        }

        List<String> hints = currentQuestion.getHints();
        if (hints == null || hints.isEmpty()) {
            // 使用AI生成提示
            return generateHint(currentQuestion);
        }

        // 返回下一个提示
        int answerCount = session.getAnswers() != null ? session.getAnswers().size() : 0;
        int hintIndex = answerCount % hints.size();
        return hints.get(hintIndex);
    }

    @Override
    @Transactional
    public Map<String, Object> completeSession(String sessionId) {
        log.info("Completing practice session: {}", sessionId);

        PracticeSession session = practiceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        session.setStatus(InterviewStatus.COMPLETED);
        session.setCompletedAt(LocalDateTime.now());
        practiceSessionRepository.save(session);

        PracticeSession.PracticeStats stats = session.getStats();

        Map<String, Object> result = new HashMap<>();
        result.put("session_id", sessionId);
        result.put("status", "completed");
        result.put("stats", Map.of(
                "total_questions", stats.getTotalQuestions(),
                "answered_questions", stats.getAnsweredQuestions(),
                "correct_questions", stats.getCorrectQuestions(),
                "accuracy_rate", stats.getAccuracyRate(),
                "average_score", stats.getAverageScore()
        ));
        result.put("total_time", session.getStartedAt() != null && session.getCompletedAt() != null ?
                java.time.Duration.between(session.getStartedAt(), session.getCompletedAt()).getSeconds() : 0);

        // 生成总结
        result.put("summary", generateSummary(session));

        return result;
    }

    @Override
    @Transactional
    public boolean deleteSession(String sessionId) {
        log.info("Deleting practice session: {}", sessionId);

        if (!practiceSessionRepository.existsById(sessionId)) {
            return false;
        }

        practiceSessionRepository.deleteById(sessionId);
        return true;
    }

    @Override
    public String generateAnswer(String question, String category, List<String> keyPoints, Map<String, Object> projectContext) {
        log.info("Generating answer for question: {}", question);

        StringBuilder prompt = new StringBuilder();
        prompt.append("请为以下面试问题生成一个详细、专业的参考答案。\n\n");
        prompt.append("问题：").append(question).append("\n");
        prompt.append("类别：").append(category).append("\n");

        if (keyPoints != null && !keyPoints.isEmpty()) {
            prompt.append("考察点：").append(String.join(", ", keyPoints)).append("\n");
        }

        if (projectContext != null && !projectContext.isEmpty()) {
            prompt.append("\n项目信息：\n");
            prompt.append("- 项目名称：").append(projectContext.getOrDefault("name", "未知")).append("\n");
            prompt.append("- 项目描述：").append(projectContext.getOrDefault("description", "")).append("\n");
            Object techStack = projectContext.get("techStack");
            if (techStack instanceof List) {
                prompt.append("- 技术栈：").append(String.join(", ", (List<String>) techStack)).append("\n");
            }
        }

        prompt.append("\n要求：\n");
        prompt.append("1. 答案应该结构清晰，包含：\n");
        prompt.append("   - 核心观点（简明扼要地回答）\n");
        prompt.append("   - 详细解释（展开说明）\n");
        prompt.append("   - 实际案例（结合项目经验，如果有项目信息的话）\n");
        prompt.append("   - 总结要点\n");
        prompt.append("2. 答案要体现专业性，适合技术面试场景\n");
        prompt.append("3. 内容要具体，避免空洞的套话\n");
        prompt.append("4. 如果有项目信息，请结合项目实际来回答\n");
        prompt.append("5. 答案长度控制在300-500字\n");
        prompt.append("\n请生成答案：");

        return tongyiQianwenService.generate(prompt.toString());
    }

    // ========== 私有辅助方法 ==========

    private List<PracticeQuestion> generateQuestions(PracticeSession session, PracticeSession.PracticeMode mode,
                                                      PracticeSession.PracticeDifficulty difficulty, int count) {
        List<PracticeQuestion> questions = new ArrayList<>();

        // 根据模式和难度生成问题
        Map<String, List<Map<String, Object>>> questionBank = buildQuestionBank();
        List<Map<String, Object>> availableQuestions = questionBank.getOrDefault(mode.getCode(), questionBank.get("mixed"));

        // 随机选择问题
        Collections.shuffle(availableQuestions);
        int questionCount = Math.min(count, availableQuestions.size());

        for (int i = 0; i < questionCount; i++) {
            Map<String, Object> qData = availableQuestions.get(i);

            PracticeQuestion question = PracticeQuestion.builder()
                    .session(session)
                    .questionIndex(i)
                    .content((String) qData.get("content"))
                    .category((String) qData.get("category"))
                    .difficulty(difficulty.getCode())
                    .expectedAnswer((String) qData.get("expected_answer"))
                    .keyPoints((List<String>) qData.get("key_points"))
                    .hints((List<String>) qData.get("hints"))
                    .timeLimit(300) // 默认5分钟
                    .build();

            questions.add(question);
        }

        return questions;
    }

    private Map<String, Object> evaluateAnswer(PracticeQuestion question, String answer) {
        Map<String, Object> result = new HashMap<>();

        // 使用AI评估回答
        String prompt = buildEvaluationPrompt(question, answer);
        String aiResponse = tongyiQianwenService.generate(prompt);

        // 解析评分
        int score = extractScoreFromResponse(aiResponse);
        result.put("score", score);
        result.put("evaluation", aiResponse);
        result.put("expected_points", question.getKeyPoints());
        result.put("detailed_feedback", generateFeedback(question, answer, score));

        return result;
    }

    private String buildEvaluationPrompt(PracticeQuestion question, String answer) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("请评估以下面试回答，并给出评分（0-100）和评价。\n\n");
        prompt.append("问题：").append(question.getContent()).append("\n");
        prompt.append("参考答案要点：").append(String.join(", ", question.getKeyPoints())).append("\n\n");
        prompt.append("候选人回答：").append(answer).append("\n\n");
        prompt.append("请从以下维度评估：\n");
        prompt.append("1. 准确性（回答是否正确）\n");
        prompt.append("2. 完整性（是否覆盖关键要点）\n");
        prompt.append("3. 清晰度（表达是否清晰）\n");
        prompt.append("4. 深度（是否有深入分析）\n\n");
        prompt.append("请返回JSON格式：\n");
        prompt.append("{\n");
        prompt.append("  \"score\": 85,\n");
        prompt.append("  \"evaluation\": \"总体评价...\",\n");
        prompt.append("  \"strengths\": [\"...\", \"...\"],\n");
        prompt.append("  \"weaknesses\": [\"...\", \"...\"],\n");
        prompt.append("  \"suggestions\": [\"...\", \"...\"]\n");
        prompt.append("}");
        return prompt.toString();
    }

    private int extractScoreFromResponse(String response) {
        try {
            // 尝试从JSON中提取分数
            if (response.contains("\"score\":")) {
                int start = response.indexOf("\"score\":") + 8;
                int end = response.indexOf(",", start);
                if (end == -1) end = response.indexOf("}", start);
                String scoreStr = response.substring(start, end).trim();
                return Integer.parseInt(scoreStr.replaceAll("[^0-9]", ""));
            }
        } catch (Exception e) {
            log.warn("Failed to extract score from response", e);
        }
        return 75; // 默认分数
    }

    private String generateFeedback(PracticeQuestion question, String answer, int score) {
        if (score >= 90) {
            return "回答优秀！涵盖了所有关键要点，表达清晰，分析深入。";
        } else if (score >= 80) {
            return "回答良好。基本覆盖了主要要点，但可以进一步补充细节。";
        } else if (score >= 70) {
            return "回答一般。建议加强对核心概念的理解，并补充更多实际案例。";
        } else if (score >= 60) {
            return "回答及格。需要进一步学习相关知识，建议多练习类似问题。";
        } else {
            return "回答需要改进。建议重新学习相关知识点，并参考标准答案。";
        }
    }

    private String generateHint(PracticeQuestion question) {
        String prompt = "请为以下面试问题提供一个简短的提示（不超过50字）：\n\n" +
                "问题：" + question.getContent() + "\n\n" +
                "提示：";
        return tongyiQianwenService.generate(prompt);
    }

    private String generateSummary(PracticeSession session) {
        PracticeSession.PracticeStats stats = session.getStats();

        StringBuilder summary = new StringBuilder();
        summary.append("本次练习共完成 ").append(stats.getTotalQuestions()).append(" 道题目，");
        summary.append("答对 ").append(stats.getCorrectQuestions()).append(" 道，");
        summary.append("正确率 ").append(String.format("%.1f%%", stats.getAccuracyRate() * 100)).append("。");

        if (stats.getAccuracyRate() >= 0.9) {
            summary.append("表现优秀！继续保持。");
        } else if (stats.getAccuracyRate() >= 0.7) {
            summary.append("表现良好，还有提升空间。");
        } else {
            summary.append("建议加强相关知识的学习和练习。");
        }

        return summary.toString();
    }

    private Map<String, List<Map<String, Object>>> buildQuestionBank() {
        Map<String, List<Map<String, Object>>> bank = new HashMap<>();

        // 技术面试题
        List<Map<String, Object>> technicalQuestions = new ArrayList<>();
        technicalQuestions.add(Map.of(
                "content", "请解释Java中的HashMap工作原理",
                "category", "Java基础",
                "expected_answer", "HashMap基于数组+链表/红黑树实现...",
                "key_points", List.of("数组+链表结构", "hash计算", "扩容机制", "线程不安全"),
                "hints", List.of("考虑哈希冲突如何解决", "想想扩容时的rehash操作")
        ));
        technicalQuestions.add(Map.of(
                "content", "什么是数据库索引？什么时候应该使用索引？",
                "category", "数据库",
                "expected_answer", "数据库索引是帮助快速查询的数据结构...",
                "key_points", List.of("B+树结构", "查询优化", "索引类型", "索引开销"),
                "hints", List.of("考虑索引的数据结构", "想想索引的优缺点")
        ));
        technicalQuestions.add(Map.of(
                "content", "请解释RESTful API设计原则",
                "category", "Web开发",
                "expected_answer", "RESTful API基于HTTP协议，使用URL定位资源...",
                "key_points", List.of("资源定位", "HTTP方法", "状态码", "无状态"),
                "hints", List.of("考虑URL设计", "想想HTTP方法的使用")
        ));

        // 系统设计题
        List<Map<String, Object>> systemDesignQuestions = new ArrayList<>();
        systemDesignQuestions.add(Map.of(
                "content", "如何设计一个高并发的秒杀系统？",
                "category", "系统设计",
                "expected_answer", "秒杀系统需要考虑流量控制、库存扣减、异步处理等...",
                "key_points", List.of("限流削峰", "库存预扣", "异步处理", "缓存策略"),
                "hints", List.of("考虑如何防止超卖", "想想如何应对高并发")
        ));
        systemDesignQuestions.add(Map.of(
                "content", "设计一个分布式ID生成器",
                "category", "系统设计",
                "expected_answer", "分布式ID需要保证唯一性、有序性、高性能...",
                "key_points", List.of("雪花算法", "号段模式", "UUID", "数据库自增"),
                "hints", List.of("考虑ID的唯一性", "想想性能要求")
        ));

        // 行为面试题
        List<Map<String, Object>> behavioralQuestions = new ArrayList<>();
        behavioralQuestions.add(Map.of(
                "content", "请描述一次你解决复杂技术问题的经历",
                "category", "行为面试",
                "expected_answer", "使用STAR法则描述...",
                "key_points", List.of("情境", "任务", "行动", "结果"),
                "hints", List.of("使用STAR法则", "突出你的贡献")
        ));
        behavioralQuestions.add(Map.of(
                "content", "如何处理团队中的技术分歧？",
                "category", "行为面试",
                "expected_answer", "通过沟通、数据支持、原型验证等方式...",
                "key_points", List.of("沟通技巧", "数据支持", "妥协方案", "团队利益"),
                "hints", List.of("强调沟通", "考虑团队目标")
        ));

        // 编程题
        List<Map<String, Object>> codingQuestions = new ArrayList<>();
        codingQuestions.add(Map.of(
                "content", "实现一个LRU缓存",
                "category", "算法",
                "expected_answer", "使用HashMap+双向链表实现...",
                "key_points", List.of("O(1)时间复杂度", "哈希表", "双向链表", "容量控制"),
                "hints", List.of("考虑时间复杂度", "想想如何维护访问顺序")
        ));
        codingQuestions.add(Map.of(
                "content", "反转一个单链表",
                "category", "算法",
                "expected_answer", "使用迭代或递归方法...",
                "key_points", List.of("迭代法", "递归法", "指针操作", "边界条件"),
                "hints", List.of("考虑指针的指向变化", "注意边界条件")
        ));

        bank.put("technical", technicalQuestions);
        bank.put("system_design", systemDesignQuestions);
        bank.put("behavioral", behavioralQuestions);
        bank.put("coding", codingQuestions);

        // 混合模式包含所有题目
        List<Map<String, Object>> mixedQuestions = new ArrayList<>();
        mixedQuestions.addAll(technicalQuestions);
        mixedQuestions.addAll(systemDesignQuestions);
        mixedQuestions.addAll(behavioralQuestions);
        mixedQuestions.addAll(codingQuestions);
        bank.put("mixed", mixedQuestions);

        return bank;
    }
}
