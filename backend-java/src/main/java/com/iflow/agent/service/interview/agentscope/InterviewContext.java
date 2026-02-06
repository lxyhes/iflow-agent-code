package com.iflow.agent.service.interview.agentscope;

import lombok.Data;

import java.util.*;

/**
 * 面试上下文
 * 管理单个面试会话的状态
 */
@Data
public class InterviewContext {

    private final String sessionId;
    private final List<String> agentOrder;

    private int currentAgentIndex;
    private String currentAgentType;
    private String currentQuestionId;
    private int totalQuestionCount;
    private int currentAgentQuestionCount;

    private final List<String> askedQuestions;
    private final Map<String, Double> evaluations;
    private final Map<String, Object> metadata;

    public InterviewContext(String sessionId, List<String> agentOrder) {
        this.sessionId = sessionId;
        this.agentOrder = new ArrayList<>(agentOrder);
        this.currentAgentIndex = -1;
        this.currentAgentType = null;
        this.currentQuestionId = null;
        this.totalQuestionCount = 0;
        this.currentAgentQuestionCount = 0;
        this.askedQuestions = new ArrayList<>();
        this.evaluations = new HashMap<>();
        this.metadata = new HashMap<>();
    }

    /**
     * 获取下一个面试官类型
     */
    public String getNextAgentType() {
        currentAgentIndex++;
        if (currentAgentIndex < agentOrder.size()) {
            return agentOrder.get(currentAgentIndex);
        }
        return null;
    }

    /**
     * 切换到下一个面试官
     */
    public String moveToNextAgent() {
        currentAgentQuestionCount = 0;
        return getNextAgentType();
    }

    /**
     * 设置当前面试官
     */
    public void setCurrentAgentType(String agentType) {
        this.currentAgentType = agentType;
        this.currentAgentQuestionCount = 0;
    }

    /**
     * 增加问题计数
     */
    public void incrementQuestionCount() {
        totalQuestionCount++;
        currentAgentQuestionCount++;
    }

    /**
     * 添加问题
     */
    public void addQuestion(String questionId) {
        askedQuestions.add(questionId);
    }

    /**
     * 添加评估
     */
    public void addEvaluation(String evaluationId, double score) {
        evaluations.put(evaluationId, score);
    }

    /**
     * 获取平均分
     */
    public double getAverageScore() {
        if (evaluations.isEmpty()) return 0.0;
        return evaluations.values().stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    /**
     * 设置元数据
     */
    public void setMetadata(String key, Object value) {
        metadata.put(key, value);
    }

    /**
     * 获取元数据
     */
    public Object getMetadata(String key) {
        return metadata.get(key);
    }

    /**
     * 获取问题总数
     */
    public int getQuestionCount() {
        return totalQuestionCount;
    }

    /**
     * 获取当前面试官问题数
     */
    public int getCurrentAgentQuestionCount() {
        return currentAgentQuestionCount;
    }
}
