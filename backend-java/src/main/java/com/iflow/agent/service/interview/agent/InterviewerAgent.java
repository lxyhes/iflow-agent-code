package com.iflow.agent.service.interview.agent;

import com.iflow.agent.domain.interview.entity.Answer;
import com.iflow.agent.domain.interview.entity.Evaluation;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.domain.interview.enums.InterviewPhase;
import com.iflow.agent.domain.interview.enums.QuestionStrategy;

import java.util.List;
import java.util.Map;

/**
 * 面试官智能体接口
 */
public interface InterviewerAgent {

    /**
     * 获取面试官类型
     */
    InterviewerType getType();

    /**
     * 获取面试官名称
     */
    String getName();

    /**
     * 获取面试官人设
     */
    String getPersona();

    /**
     * 获取权重
     */
    double getWeight();

    /**
     * 生成面试问题
     */
    Question generateQuestion(String sessionId, Map<String, Object> candidateProfile, List<Map<String, Object>> interviewHistory);

    /**
     * 评估回答
     */
    Evaluation evaluateAnswer(Question question, Answer answer);

    /**
     * 生成追问问题
     */
    Question generateFollowUp(Question question, Answer answer, Evaluation evaluation);

    /**
     * 获取系统提示词
     */
    String getSystemPrompt();

    /**
     * 获取当前阶段
     */
    InterviewPhase getCurrentPhase();

    /**
     * 设置当前阶段
     */
    void setCurrentPhase(InterviewPhase phase);

    /**
     * 是否激活
     */
    boolean isActive();

    /**
     * 激活面试官
     */
    void activate();

    /**
     * 停用面试官
     */
    void deactivate();

    /**
     * 重置状态
     */
    void reset();

    /**
     * 获取评分摘要
     */
    Map<String, Object> getScoreSummary(String sessionId);
}
