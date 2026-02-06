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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 基于 AgentScope 的 HR 面试官
 */
@Slf4j
@Component
public class HrInterviewer extends AgentScopeInterviewerAgent {

    private static final String SYSTEM_PROMPT = """
        你是一位资深的 HR 面试官，专注于考察候选人的综合素质和文化匹配度。

        你的职责：
        1. 评估候选人的职业素养和价值观
        2. 了解候选人的职业规划和发展期望
        3. 考察候选人的沟通能力和团队协作精神
        4. 评估候选人的抗压能力和工作态度

        面试风格：
        - 亲切友善，营造轻松的面试氛围
        - 善于倾听，引导候选人表达真实想法
        - 关注细节，捕捉候选人的潜在特质
        - 专业客观，避免主观偏见

        评估维度：
        - 文化匹配度（0-100）
        - 沟通能力（0-100）
        - 职业稳定性（0-100）
        - 团队协作（0-100）
        """;

    @Autowired
    public HrInterviewer(
            @org.springframework.lang.Nullable DashScopeChatModel chatModel,
            Memory memory,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            EvaluationRepository evaluationRepository) {
        super(
                InterviewerType.HR,
                "HR面试官",
                SYSTEM_PROMPT,
                0.8,
                chatModel,
                memory,
                questionRepository,
                answerRepository,
                evaluationRepository
        );
    }

    @Override
    protected String buildQuestionPrompt(Map<String, Object> candidateProfile, InterviewSessionState state) {
        String position = (String) candidateProfile.getOrDefault("position", "未知职位");
        int questionCount = state.getQuestionCount();

        return String.format("""
            作为 HR 面试官，请为以下候选人生成一个面试问题：
            
            目标职位：%s
            当前阶段：%s
            已提问数：%d
            
            要求：
            1. 考察综合素质和文化匹配度
            2. 问题要体现人文关怀
            3. 避免涉及隐私和歧视性问题
            4. 预期回答时长2-3分钟
            
            请直接输出问题内容，不要有多余解释。
            """, position, currentPhase.getDescription(), questionCount);
    }

    @Override
    protected String buildEvaluationPrompt(Question question, String answerContent) {
        return String.format("""
            请从 HR 角度评估候选人的回答：
            
            问题：%s
            
            候选人回答：
            %s
            
            请从以下维度评估：
            - 文化匹配度
            - 沟通能力
            - 职业稳定性
            - 团队协作
            
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
                .dimension("hr")
                .feedback(extractFeedback(evaluationText))
                .strengths(List.of("沟通良好", "态度积极"))
                .weaknesses(List.of("可更深入"))
                .confidence(0.75)
                .build();
    }

    @Override
    protected String getCategory() {
        return "HR面试";
    }

    @Override
    protected int calculateDifficulty(InterviewSessionState state) {
        return 2;
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
        return 80.0;
    }

    private String extractFeedback(String text) {
        return text.length() > 800 ? text.substring(0, 800) + "..." : text;
    }
}
