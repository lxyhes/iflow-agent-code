package com.iflow.agent.service.interview.agent;

import com.iflow.agent.domain.interview.entity.Answer;
import com.iflow.agent.domain.interview.entity.Evaluation;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.InterviewPhase;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.domain.interview.enums.QuestionStrategy;
import com.iflow.agent.repository.EvaluationRepository;
import com.iflow.agent.repository.QuestionRepository;
import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * 面试官智能体抽象基类
 */
@Slf4j
public abstract class AbstractInterviewerAgent implements InterviewerAgent {

    protected final TongyiQianwenService aiService;
    protected final QuestionRepository questionRepository;
    protected final EvaluationRepository evaluationRepository;

    @Getter
    protected final InterviewerType type;

    @Getter
    protected final String name;

    @Getter
    protected final String persona;

    @Getter
    protected final double weight;

    @Getter
    protected final QuestionStrategy strategy;

    @Getter
    @Setter
    protected InterviewPhase currentPhase;

    @Getter
    protected boolean active;

    protected final Map<String, List<String>> sessionQuestions;

    public AbstractInterviewerAgent(
            InterviewerType type,
            String name,
            String persona,
            double weight,
            QuestionStrategy strategy,
            TongyiQianwenService aiService,
            QuestionRepository questionRepository,
            EvaluationRepository evaluationRepository) {
        this.type = type;
        this.name = name;
        this.persona = persona;
        this.weight = weight;
        this.strategy = strategy;
        this.aiService = aiService;
        this.questionRepository = questionRepository;
        this.evaluationRepository = evaluationRepository;
        this.currentPhase = InterviewPhase.WARM_UP;
        this.active = false;
        this.sessionQuestions = new HashMap<>();
    }

    @Override
    public void activate() {
        this.active = true;
        log.info("{} 已激活", name);
    }

    @Override
    public void deactivate() {
        this.active = false;
        log.info("{} 已停用", name);
    }

    @Override
    public void reset() {
        this.currentPhase = InterviewPhase.WARM_UP;
        this.active = false;
        this.sessionQuestions.clear();
        log.info("{} 已重置", name);
    }

    @Override
    public Map<String, Object> getScoreSummary(String sessionId) {
        List<Evaluation> evaluations = evaluationRepository.findBySessionId(sessionId);

        if (evaluations.isEmpty()) {
            return Map.of(
                    "averageScore", 0.0,
                    "evaluationsCount", 0,
                    "dimensions", Map.of(),
                    "weight", weight
            );
        }

        double averageScore = evaluations.stream()
                .mapToDouble(Evaluation::getScore)
                .average()
                .orElse(0.0);

        Map<String, List<Double>> dimensionScores = new HashMap<>();
        for (Evaluation eval : evaluations) {
            dimensionScores.computeIfAbsent(eval.getDimension(), k -> new ArrayList<>())
                    .add(eval.getScore());
        }

        Map<String, Double> dimensionAverages = new HashMap<>();
        dimensionScores.forEach((dim, scores) -> {
            double avg = scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            dimensionAverages.put(dim, avg);
        });

        return Map.of(
                "averageScore", averageScore,
                "evaluationsCount", evaluations.size(),
                "dimensions", dimensionAverages,
                "weight", weight
        );
    }

    @Override
    public Question generateFollowUp(Question question, Answer answer, Evaluation evaluation) {
        if (evaluation.getScore() >= 85) {
            return null;
        }

        String prompt = String.format("""
            基于以下信息生成一个追问问题：

            原问题：%s
            候选人回答：%s
            评估分数：%.0f/100
            评估反馈：%s

            请生成一个针对性的追问问题，深入挖掘候选人在该领域的理解深度。
            追问应该：
            1. 针对回答中的薄弱环节
            2. 考察更深层次的理解
            3. 保持专业和礼貌

            只输出追问问题本身，不要有多余内容。
            """, question.getContent(), answer.getContent(), evaluation.getScore(), evaluation.getFeedback());

        String response = aiService.generate(prompt);

        if (response != null && !response.startsWith("Error:") && response.length() > 10) {
            return Question.builder()
                    .sessionId(question.getSessionId())
                    .content(response.trim())
                    .type("follow_up")
                    .difficulty(Math.min(question.getDifficulty() + 1, 5))
                    .category(question.getCategory())
                    .build();
        }

        return null;
    }

    protected void recordQuestion(String sessionId, String questionId) {
        sessionQuestions.computeIfAbsent(sessionId, k -> new ArrayList<>()).add(questionId);
    }

    protected List<String> getAskedQuestions(String sessionId) {
        return sessionQuestions.getOrDefault(sessionId, new ArrayList<>());
    }
}
