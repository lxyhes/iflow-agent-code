package com.iflow.agent.service.interview.agentscope;

import com.iflow.agent.domain.interview.entity.Answer;
import com.iflow.agent.domain.interview.entity.Evaluation;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.repository.AnswerRepository;
import com.iflow.agent.repository.EvaluationRepository;
import com.iflow.agent.repository.QuestionRepository;
import com.iflow.agent.service.llm.LLMService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 基于 AI 工作台 LLM 的技术面试官
 * 使用 AI SDK 提供的 LLM 服务
 */
@Slf4j
@Component
public class TechnicalInterviewer extends AgentScopeInterviewerAgent {

    @Autowired
    public TechnicalInterviewer(
            LLMService llmService,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            EvaluationRepository evaluationRepository) {
        super(
                InterviewerType.TECHNICAL,
                "技术面试官",
                1.0,
                llmService,
                questionRepository,
                answerRepository,
                evaluationRepository
        );
    }

    @Override
    protected String buildQuestionPrompt(Map<String, Object> candidateProfile, InterviewSessionState state) {
        String position = (String) candidateProfile.getOrDefault("position", "Java开发工程师");
        String experience = (String) candidateProfile.getOrDefault("experience", "3年");
        int questionCount = state.getQuestionCount();

        return String.format("""
            作为技术面试官，请为以下候选人生成一个面试问题：
            
            目标职位：%s
            候选经验：%s
            当前阶段：%s
            已提问数：%d
            
            要求：
            1. 难度适中，符合候选经验水平
            2. 考察核心技术能力
            3. 问题清晰具体
            4. 预期回答时长3-5分钟
            
            请直接输出问题内容，不要有多余解释。
            """, position, experience, currentPhase.getDescription(), questionCount);
    }

    @Override
    protected String buildEvaluationPrompt(Question question, String answerContent) {
        return String.format("""
            请评估候选人的回答：
            
            问题：%s
            问题类别：%s
            难度：%d/5
            
            候选人回答：
            %s
            
            请以JSON格式输出评估结果：
            {
                "score": 总分0-100,
                "dimension": "technical",
                "feedback": "详细反馈，包括优点和不足",
                "strengths": ["优点1", "优点2"],
                "weaknesses": ["不足1", "不足2"]
            }
            """, question.getContent(), question.getCategory(), question.getDifficulty(), answerContent);
    }

    @Override
    protected Evaluation parseEvaluation(String sessionId, Question question, Answer answer, String evaluationText) {
        double score = extractScore(evaluationText);
        String feedback = extractFeedback(evaluationText);

        return Evaluation.builder()
                .sessionId(sessionId)
                .questionId(question.getId())
                .answerId(answer.getId())
                .score(score)
                .dimension("technical")
                .feedback(feedback)
                .strengths(extractStrengths(evaluationText))
                .weaknesses(extractWeaknesses(evaluationText))
                .confidence(0.8)
                .build();
    }

    @Override
    protected String getCategory() {
        return "技术面试";
    }

    @Override
    protected int calculateDifficulty(InterviewSessionState state) {
        int count = state.getQuestionCount();
        if (count < 2) return 2;
        if (count < 4) return 3;
        if (count < 6) return 4;
        return 5;
    }

    private double extractScore(String text) {
        try {
            if (text.contains("score")) {
                int start = text.indexOf("score");
                int colon = text.indexOf(":", start);
                int comma = text.indexOf(",", colon);
                if (comma < 0) comma = text.indexOf("}", colon);
                String scoreStr = text.substring(colon + 1, comma).trim();
                return Double.parseDouble(scoreStr);
            }
        } catch (Exception e) {
            log.warn("解析分数失败", e);
        }
        return 75.0;
    }

    private String extractFeedback(String text) {
        return text.length() > 1000 ? text.substring(0, 1000) + "..." : text;
    }

    private List<String> extractStrengths(String text) {
        return List.of("回答完整", "思路清晰");
    }

    private List<String> extractWeaknesses(String text) {
        return List.of("可以更深入");
    }
}
