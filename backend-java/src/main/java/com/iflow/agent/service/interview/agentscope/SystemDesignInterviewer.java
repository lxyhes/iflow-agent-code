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
 * 基于 AI 工作台 LLM 的系统架构师面试官
 */
@Slf4j
@Component
public class SystemDesignInterviewer extends AgentScopeInterviewerAgent {

    @Autowired
    public SystemDesignInterviewer(
            LLMService llmService,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            EvaluationRepository evaluationRepository) {
        super(
                InterviewerType.SYSTEM_DESIGN,
                "系统架构师",
                1.1,
                llmService,
                questionRepository,
                answerRepository,
                evaluationRepository
        );
    }

    @Override
    protected String buildQuestionPrompt(Map<String, Object> candidateProfile, InterviewSessionState state) {
        String position = (String) candidateProfile.getOrDefault("position", "系统架构师");
        int questionCount = state.getQuestionCount();

        String[] designScenarios = {
            "设计一个高并发的电商系统",
            "设计一个实时消息推送系统",
            "设计一个分布式任务调度系统",
            "设计一个海量数据存储系统",
            "设计一个微服务网关"
        };

        String scenario = designScenarios[questionCount % designScenarios.length];

        return String.format("""
            作为系统架构师面试官，请生成一个系统设计问题：
            
            场景：%s
            目标职位：%s
            当前阶段：%s
            
            要求：
            1. 问题要具体，有明确的业务场景
            2. 考察候选人的整体架构设计能力
            3. 鼓励候选人画图说明
            4. 预期回答时长10-15分钟
            
            请直接输出问题内容。
            """, scenario, position, currentPhase.getDescription());
    }

    @Override
    protected String buildEvaluationPrompt(Question question, String answerContent) {
        return String.format("""
            请评估候选人的系统设计回答：
            
            问题：%s
            
            候选人回答：
            %s
            
            请从以下维度评估：
            1. 架构设计的合理性
            2. 对分布式系统的理解
            3. 技术选型的合理性
            4. 可扩展性和高可用考虑
            5. 对 trade-off 的理解
            
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
                .dimension("system_design")
                .feedback(extractFeedback(evaluationText))
                .strengths(List.of("架构清晰", "考虑全面"))
                .weaknesses(List.of("可更深入"))
                .confidence(0.9)
                .build();
    }

    @Override
    protected String getCategory() {
        return "系统设计";
    }

    @Override
    protected int calculateDifficulty(InterviewSessionState state) {
        return 4;
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
        return text.length() > 1000 ? text.substring(0, 1000) + "..." : text;
    }
}
