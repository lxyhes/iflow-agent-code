package com.iflow.agent.service.interview.agentscope;

import com.iflow.agent.domain.interview.entity.Answer;
import com.iflow.agent.domain.interview.entity.Evaluation;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.repository.AnswerRepository;
import com.iflow.agent.repository.EvaluationRepository;
import com.iflow.agent.repository.QuestionRepository;
import io.agentscope.core.model.DashScopeChatModel;
import io.agentscope.core.memory.Memory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 基于 AgentScope 的行为面试官
 */
@Slf4j
@Component
public class BehavioralInterviewer extends AgentScopeInterviewerAgent {

    private static final String SYSTEM_PROMPT = """
        你是一位专业的行为面试官，专注于通过行为面试法（STAR法则）考察候选人的过往经历。
        
        你的职责：
        1. 通过具体事例了解候选人的行为模式
        2. 评估候选人的问题解决能力
        3. 考察候选人在压力下的表现
        4. 了解候选人的学习能力和成长潜力
        
        面试风格：
        - 使用 STAR 法则引导（情境-任务-行动-结果）
        - 追问细节，深入挖掘
        - 关注具体行为而非泛泛而谈
        - 保持中立，避免引导性提问
        
        评估维度：
        - 问题解决能力（0-100）
        - 学习能力（0-100）
        - 抗压能力（0-100）
        - 领导力潜力（0-100）
        """;

    public BehavioralInterviewer(
            @Qualifier("agentScopeDashScopeChatModel") DashScopeChatModel chatModel,
            Memory memory,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            EvaluationRepository evaluationRepository) {
        super(
                InterviewerType.BEHAVIORAL,
                "行为面试官",
                SYSTEM_PROMPT,
                0.9,
                chatModel,
                memory,
                questionRepository,
                answerRepository,
                evaluationRepository
        );
    }

    @Override
    protected String buildQuestionPrompt(Map<String, Object> candidateProfile, InterviewSessionState state) {
        int questionCount = state.getQuestionCount();

        String[] behavioralQuestions = {
            "请描述一个你在工作中遇到的具有挑战性的问题，以及你是如何解决的？",
            "请分享一个你与团队成员产生分歧的经历，你是如何处理的？",
            "描述一个你在紧迫 deadline 下完成项目的经历。",
            "请举例说明你如何学习一项新技术并应用到工作中。",
            "描述一次你领导团队完成重要项目的经历。"
        };

        String question = behavioralQuestions[questionCount % behavioralQuestions.length];

        return String.format("""
            作为行为面试官，请基于以下主题生成一个面试问题：
            
            主题：%s
            当前阶段：%s
            已提问数：%d
            
            要求：
            1. 使用 STAR 法则引导候选人回答
            2. 问题要具体，便于候选人举例
            3. 鼓励候选人描述具体情境和行为
            4. 预期回答时长5-8分钟
            
            请直接输出问题内容。
            """, question, currentPhase.getDescription(), questionCount);
    }

    @Override
    protected String buildEvaluationPrompt(Question question, String answerContent) {
        return String.format("""
            请使用 STAR 法则评估候选人的回答：
            
            问题：%s
            
            候选人回答：
            %s
            
            请评估：
            1. 是否清晰描述了情境（Situation）
            2. 是否明确了任务（Task）
            3. 是否详细说明了行动（Action）
            4. 是否展示了结果（Result）
            
            同时评估：
            - 问题解决能力
            - 学习能力
            - 抗压能力
            - 领导力潜力
            
            以JSON格式输出评估结果。
            """, question.getContent(), answerContent);
    }

    @Override
    protected Evaluation parseEvaluation(String sessionId, Question question, Answer answer, String evaluationText) {
        double score = extractScore(evaluationText);

        return Evaluation.builder()
                .sessionId(sessionId)
                .questionId(question.getId())
                .answerId(answer.getId())
                .score(score)
                .dimension("behavioral")
                .feedback(extractFeedback(evaluationText))
                .strengths(List.of("举例具体", "思路清晰"))
                .weaknesses(List.of("可更详细"))
                .confidence(0.85)
                .build();
    }

    @Override
    protected String getCategory() {
        return "行为面试";
    }

    @Override
    protected int calculateDifficulty(InterviewSessionState state) {
        return 3;
    }

    private double extractScore(String text) {
        try {
            if (text.contains("score")) {
                int start = text.indexOf("score");
                int colon = text.indexOf(":", start);
                int comma = text.indexOf(",", colon);
                if (comma < 0) comma = text.indexOf("}", colon);
                return Double.parseDouble(text.substring(colon + 1, comma).trim());
            }
        } catch (Exception e) {
            log.warn("解析分数失败", e);
        }
        return 78.0;
    }

    private String extractFeedback(String text) {
        return text.length() > 900 ? text.substring(0, 900) + "..." : text;
    }
}
