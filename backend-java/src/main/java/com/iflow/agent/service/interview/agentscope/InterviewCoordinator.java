package com.iflow.agent.service.interview.agentscope;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.CoordinationMode;
import com.iflow.agent.domain.interview.enums.InterviewPhase;
import com.iflow.agent.domain.interview.enums.InterviewStatus;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.repository.InterviewSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 基于 AgentScope 的面试协调器
 * 管理多个面试官智能体的协作
 */
@Slf4j
@Component
public class InterviewCoordinator {

    private final Map<String, AgentScopeInterviewerAgent> agents;
    private final Map<String, InterviewContext> contexts;
    private final InterviewSessionRepository sessionRepository;

    public InterviewCoordinator(
            TechnicalInterviewer technicalInterviewer,
            HrInterviewer hrInterviewer,
            BehavioralInterviewer behavioralInterviewer,
            SystemDesignInterviewer systemDesignInterviewer,
            InterviewSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
        this.agents = new ConcurrentHashMap<>();
        this.contexts = new ConcurrentHashMap<>();

        // 注册所有面试官智能体
        registerAgent(technicalInterviewer);
        registerAgent(hrInterviewer);
        registerAgent(behavioralInterviewer);
        registerAgent(systemDesignInterviewer);

        log.info("面试协调器初始化完成，已注册 {} 个面试官智能体", agents.size());
    }

    /**
     * 注册面试官智能体
     */
    public void registerAgent(AgentScopeInterviewerAgent agent) {
        agents.put(agent.getType().getCode(), agent);
        log.info("注册面试官智能体: {}", agent.getName());
    }

    /**
     * 创建面试会话
     */
    public InterviewSession createSession(String userId, String candidateName, String position, CoordinationMode mode) {
        log.info("创建面试会话: candidate={}, position={}", candidateName, position);

        InterviewSession session = InterviewSession.builder()
                .userId(userId)
                .candidateName(candidateName)
                .position(position)
                .status(InterviewStatus.PENDING)
                .coordinationMode(mode != null ? mode : CoordinationMode.SEQUENTIAL)
                .totalRounds(5)
                .currentRound(0)
                .maxDuration(3600)
                .agentOrder(List.of(
                        InterviewerType.TECHNICAL.getCode(),
                        InterviewerType.SYSTEM_DESIGN.getCode(),
                        InterviewerType.BEHAVIORAL.getCode(),
                        InterviewerType.HR.getCode()
                ))
                .build();

        InterviewSession saved = sessionRepository.save(session);

        // 创建面试上下文
        InterviewContext context = new InterviewContext(saved.getId(), saved.getAgentOrder());
        contexts.put(saved.getId(), context);

        return saved;
    }

    /**
     * 开始面试
     */
    public void startInterview(String sessionId) {
        log.info("开始面试: {}", sessionId);

        InterviewSession session = getSession(sessionId);
        session.setStatus(InterviewStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        sessionRepository.save(session);

        InterviewContext context = contexts.get(sessionId);
        if (context == null) {
            throw new IllegalStateException("面试上下文不存在: " + sessionId);
        }

        // 激活第一个面试官
        String firstAgentType = context.getNextAgentType();
        activateAgent(sessionId, firstAgentType);
    }

    /**
     * 获取下一个问题
     */
    public Question getNextQuestion(String sessionId, Map<String, Object> candidateProfile) {
        InterviewContext context = getContext(sessionId);
        InterviewSession session = getSession(sessionId);

        String currentAgentType = context.getCurrentAgentType();
        AgentScopeInterviewerAgent agent = getAgent(currentAgentType);

        log.info("获取问题: session={}, agent={}", sessionId, agent.getName());

        // 生成问题
        Question question = agent.generateQuestion(sessionId, candidateProfile);

        // 更新上下文
        context.setCurrentQuestionId(question.getId());
        context.incrementQuestionCount();

        return question;
    }

    /**
     * 提交回答并获取评估
     */
    public Map<String, Object> submitAnswer(String sessionId, String questionId, String answerContent) {
        InterviewContext context = getContext(sessionId);
        String currentAgentType = context.getCurrentAgentType();
        AgentScopeInterviewerAgent agent = getAgent(currentAgentType);

        log.info("提交回答: session={}, agent={}", sessionId, agent.getName());

        // 获取问题
        Question question = getQuestion(sessionId, questionId);

        // 评估回答
        var evaluation = agent.evaluateAnswer(sessionId, question, answerContent);

        // 保存评估到上下文
        context.addEvaluation(evaluation.getId(), evaluation.getScore());

        // 检查是否需要追问
        Question followUp = null;
        if (evaluation.getScore() < 85) {
            var answer = getAnswer(sessionId, questionId);
            followUp = agent.generateFollowUp(sessionId, question, answer, evaluation);
        }

        // 构建响应
        Map<String, Object> response = new HashMap<>();
        response.put("evaluation", evaluation);
        response.put("followUp", followUp);
        response.put("shouldSwitchAgent", shouldSwitchAgent(context));

        return response;
    }

    /**
     * 切换到下一个面试官
     */
    public String switchToNextAgent(String sessionId) {
        InterviewContext context = getContext(sessionId);
        InterviewSession session = getSession(sessionId);

        // 停用当前面试官
        String currentAgentType = context.getCurrentAgentType();
        if (currentAgentType != null) {
            AgentScopeInterviewerAgent currentAgent = getAgent(currentAgentType);
            currentAgent.deactivate(sessionId);
        }

        // 获取下一个面试官
        String nextAgentType = context.moveToNextAgent();
        if (nextAgentType == null) {
            // 面试结束
            completeInterview(sessionId);
            return null;
        }

        // 激活下一个面试官
        activateAgent(sessionId, nextAgentType);

        // 更新会话
        session.setCurrentRound(session.getCurrentRound() + 1);
        sessionRepository.save(session);

        return nextAgentType;
    }

    /**
     * 完成面试
     */
    public void completeInterview(String sessionId) {
        log.info("完成面试: {}", sessionId);

        InterviewSession session = getSession(sessionId);
        session.setStatus(InterviewStatus.COMPLETED);
        session.setEndedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // 停用所有面试官
        InterviewContext context = contexts.get(sessionId);
        if (context != null) {
            String currentAgentType = context.getCurrentAgentType();
            if (currentAgentType != null) {
                AgentScopeInterviewerAgent agent = getAgent(currentAgentType);
                agent.deactivate(sessionId);
            }
        }
    }

    /**
     * 获取面试报告
     */
    public Map<String, Object> generateReport(String sessionId) {
        InterviewSession session = getSession(sessionId);
        InterviewContext context = getContext(sessionId);

        Map<String, Object> report = new HashMap<>();
        report.put("sessionId", sessionId);
        report.put("candidateName", session.getCandidateName());
        report.put("position", session.getPosition());
        report.put("status", session.getStatus());
        report.put("totalQuestions", context.getQuestionCount());

        // 收集各面试官的评分
        Map<String, Object> agentScores = new HashMap<>();
        for (String agentType : session.getAgentOrder()) {
            AgentScopeInterviewerAgent agent = agents.get(agentType);
            if (agent != null) {
                agentScores.put(agentType, agent.getScoreSummary(sessionId));
            }
        }
        report.put("agentScores", agentScores);

        // 计算总分
        double totalScore = calculateTotalScore(agentScores);
        report.put("totalScore", totalScore);

        return report;
    }

    // ============ 私有方法 ============

    private void activateAgent(String sessionId, String agentType) {
        AgentScopeInterviewerAgent agent = getAgent(agentType);
        agent.activate(sessionId);

        InterviewContext context = getContext(sessionId);
        context.setCurrentAgentType(agentType);

        log.info("激活面试官: {} (session: {})", agent.getName(), sessionId);
    }

    private boolean shouldSwitchAgent(InterviewContext context) {
        // 每个面试官提问3个问题后切换
        return context.getCurrentAgentQuestionCount() >= 3;
    }

    private double calculateTotalScore(Map<String, Object> agentScores) {
        if (agentScores.isEmpty()) return 0.0;

        double totalWeight = 0.0;
        double weightedScore = 0.0;

        for (Object scoreObj : agentScores.values()) {
            if (scoreObj instanceof Map) {
                Map<String, Object> scoreMap = (Map<String, Object>) scoreObj;
                Double avgScore = (Double) scoreMap.getOrDefault("averageScore", 0.0);
                Double weight = (Double) scoreMap.getOrDefault("weight", 1.0);

                weightedScore += avgScore * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? weightedScore / totalWeight : 0.0;
    }

    private InterviewSession getSession(String sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("面试会话不存在: " + sessionId));
    }

    private InterviewContext getContext(String sessionId) {
        InterviewContext context = contexts.get(sessionId);
        if (context == null) {
            throw new IllegalStateException("面试上下文不存在: " + sessionId);
        }
        return context;
    }

    private AgentScopeInterviewerAgent getAgent(String agentType) {
        AgentScopeInterviewerAgent agent = agents.get(agentType);
        if (agent == null) {
            throw new IllegalStateException("面试官智能体不存在: " + agentType);
        }
        return agent;
    }

    private Question getQuestion(String sessionId, String questionId) {
        // 简化实现，实际应该从 repository 查询
        return Question.builder()
                .id(questionId)
                .sessionId(sessionId)
                .content("问题内容")
                .build();
    }

    private com.iflow.agent.domain.interview.entity.Answer getAnswer(String sessionId, String questionId) {
        // 简化实现
        return com.iflow.agent.domain.interview.entity.Answer.builder()
                .sessionId(sessionId)
                .questionId(questionId)
                .content("回答内容")
                .build();
    }
}
