package com.iflow.agent.service.interview.agentscope;

import com.iflow.agent.domain.interview.entity.Answer;
import com.iflow.agent.domain.interview.entity.Evaluation;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.InterviewPhase;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.repository.AnswerRepository;
import com.iflow.agent.repository.EvaluationRepository;
import com.iflow.agent.repository.QuestionRepository;
import com.iflow.agent.service.llm.LLMService;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeoutException;

/**
 * 基于 AI 工作台 LLM 的面试官智能体基类
 * 使用 AI SDK 提供的 LLM 服务，无需 AgentScope DashScope
 */
@Slf4j
public abstract class AgentScopeInterviewerAgent {

    @Getter
    protected final InterviewerType type;

    @Getter
    protected final String name;

    @Getter
    protected final double weight;

    @Getter
    protected InterviewPhase currentPhase;

    protected final LLMService llmService;
    protected final QuestionRepository questionRepository;
    protected final AnswerRepository answerRepository;
    protected final EvaluationRepository evaluationRepository;

    // 会话级别的状态管理
    protected final Map<String, InterviewSessionState> sessionStates;
    
    // 是否启用了 AI
    protected final boolean aiEnabled;

    public AgentScopeInterviewerAgent(
            InterviewerType type,
            String name,
            double weight,
            LLMService llmService,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            EvaluationRepository evaluationRepository) {

        this.type = type;
        this.name = name;
        this.weight = weight;
        this.llmService = llmService;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.evaluationRepository = evaluationRepository;
        this.currentPhase = InterviewPhase.WARM_UP;
        this.sessionStates = new ConcurrentHashMap<>();
        
        // 检查 LLM 服务是否可用
        this.aiEnabled = llmService != null;
        
        if (!aiEnabled) {
            log.warn("[{}] LLMService not available, using mock mode", name);
        } else {
            log.info("[{}] LLMService initialized successfully", name);
        }
    }

    /**
     * 生成面试问题
     */
    public Question generateQuestion(String sessionId, Map<String, Object> candidateProfile) {
        log.info("[{}] 生成问题，session: {}", name, sessionId);

        InterviewSessionState state = getOrCreateSessionState(sessionId);
        String content;

        if (aiEnabled) {
            // 构建提示词
            String prompt = buildQuestionPrompt(candidateProfile, state);

            // 使用 AI 工作台 LLM 生成问题
            try {
                content = llmService.generate(prompt)
                        .timeout(Duration.ofSeconds(30))
                        .block();
                
                if (content == null || content.trim().isEmpty()) {
                    log.warn("[{}] LLM returned empty response, using mock question", name);
                    content = getMockQuestion();
                } else {
                    // 清理响应，移除可能的格式化字符
                    content = content.trim()
                            .replaceAll("^['\"]|['\"]$", "")
                            .replaceAll("^```.*\\n", "")
                            .replaceAll("\\n```$", "");
                }
            } catch (Exception e) {
                log.error("[{}] Failed to generate question with LLM", name, e);
                content = getMockQuestion();
            }
        } else {
            content = getMockQuestion();
            log.info("[{}] Using mock question: {}", name, content);
        }

        // 创建问题实体
        Question question = Question.builder()
                .sessionId(sessionId)
                .content(content)
                .type(type.getCode())
                .category(getCategory())
                .difficulty(calculateDifficulty(state))
                .expectedDuration(300)
                .build();

        Question saved = questionRepository.save(question);
        state.addQuestion(saved.getId());

        return saved;
    }

    /**
     * 评估候选人回答
     */
    public Evaluation evaluateAnswer(String sessionId, Question question, String answerContent) {
        log.info("[{}] 评估回答，session: {}, question: {}", name, sessionId, question.getId());

        // 保存回答
        Answer answer = Answer.builder()
                .sessionId(sessionId)
                .questionId(question.getId())
                .content(answerContent)
                .duration(0)
                .build();
        Answer savedAnswer = answerRepository.save(answer);

        String evaluationText;
        
        if (aiEnabled) {
            // 构建评估提示词
            String prompt = buildEvaluationPrompt(question, answerContent);

            // 使用 AI 工作台 LLM 进行评估
            try {
                evaluationText = llmService.generate(prompt)
                        .timeout(Duration.ofSeconds(30))
                        .block();
                
                if (evaluationText == null || evaluationText.trim().isEmpty()) {
                    log.warn("[{}] LLM returned empty evaluation, using mock", name);
                    evaluationText = getMockEvaluation();
                } else {
                    // 清理响应
                    evaluationText = evaluationText.trim()
                            .replaceAll("^```json\\n|```$", "")
                            .replaceAll("^```.*\\n", "")
                            .replaceAll("\\n```$", "");
                }
            } catch (Exception e) {
                log.error("[{}] Failed to evaluate answer with LLM", name, e);
                evaluationText = getMockEvaluation();
            }
        } else {
            evaluationText = getMockEvaluation();
            log.info("[{}] Using mock evaluation", name);
        }

        // 解析评估结果
        Evaluation evaluation = parseEvaluation(sessionId, question, savedAnswer, evaluationText);
        return evaluationRepository.save(evaluation);
    }

    /**
     * 生成追问问题
     */
    public Question generateFollowUp(String sessionId, Question question, Answer answer, Evaluation evaluation) {
        if (evaluation.getScore() >= 85) {
            return null;
        }

        String content;
        
        if (aiEnabled) {
            String prompt = String.format("""
                基于以下信息生成一个追问问题：

                原问题：%s
                候选人回答：%s
                评估分数：%.0f/100
                评估反馈：%s

                请生成一个针对性的追问问题，深入挖掘候选人在该领域的理解深度。
                只输出追问问题本身，不要有多余内容。
                """, question.getContent(), answer.getContent(), evaluation.getScore(), evaluation.getFeedback());

            try {
                content = llmService.generate(prompt)
                        .timeout(Duration.ofSeconds(30))
                        .block();
                
                if (content == null || content.trim().isEmpty()) {
                    content = "能详细说说你在项目中遇到的最大挑战是什么吗？";
                } else {
                    content = content.trim()
                            .replaceAll("^['\"]|['\"]$", "")
                            .replaceAll("^```.*\\n", "")
                            .replaceAll("\\n```$", "");
                }
            } catch (Exception e) {
                log.error("[{}] Failed to generate follow-up question", name, e);
                content = "能详细说说你在项目中遇到的最大挑战是什么吗？";
            }
        } else {
            content = "能详细说说你在项目中遇到的最大挑战是什么吗？";
        }

        if (content.length() > 10) {
            Question followUp = Question.builder()
                    .sessionId(sessionId)
                    .content(content.trim())
                    .type("follow_up")
                    .difficulty(Math.min(question.getDifficulty() + 1, 5))
                    .category(question.getCategory())
                    .build();
            return questionRepository.save(followUp);
        }

        return null;
    }

    /**
     * 获取评分摘要
     */
    public Map<String, Object> getScoreSummary(String sessionId) {
        List<Evaluation> evaluations = evaluationRepository.findBySessionId(sessionId);

        if (evaluations.isEmpty()) {
            return Map.of(
                    "averageScore", 0.0,
                    "evaluationsCount", 0,
                    "weight", weight
            );
        }

        double averageScore = evaluations.stream()
                .mapToDouble(Evaluation::getScore)
                .average()
                .orElse(0.0);

        return Map.of(
                "averageScore", averageScore,
                "evaluationsCount", evaluations.size(),
                "weight", weight
        );
    }

    /**
     * 激活智能体
     */
    public void activate(String sessionId) {
        InterviewSessionState state = getOrCreateSessionState(sessionId);
        state.setActive(true);
        log.info("[{}] 已激活，session: {}", name, sessionId);
    }

    /**
     * 停用智能体
     */
    public void deactivate(String sessionId) {
        InterviewSessionState state = sessionStates.get(sessionId);
        if (state != null) {
            state.setActive(false);
        }
        log.info("[{}] 已停用，session: {}", name, sessionId);
    }

    /**
     * 是否激活
     */
    public boolean isActive(String sessionId) {
        InterviewSessionState state = sessionStates.get(sessionId);
        return state != null && state.isActive();
    }

    /**
     * 设置面试阶段
     */
    public void setPhase(String sessionId, InterviewPhase phase) {
        this.currentPhase = phase;
        InterviewSessionState state = getOrCreateSessionState(sessionId);
        state.setPhase(phase);
    }

    /**
     * 重置状态
     */
    public void reset(String sessionId) {
        sessionStates.remove(sessionId);
        log.info("[{}] 已重置，session: {}", name, sessionId);
    }

    // ============ 抽象方法 ============

    protected abstract String buildQuestionPrompt(Map<String, Object> candidateProfile, InterviewSessionState state);

    protected abstract String buildEvaluationPrompt(Question question, String answerContent);

    protected abstract Evaluation parseEvaluation(String sessionId, Question question, Answer answer, String evaluationText);

    protected abstract String getCategory();

    protected abstract int calculateDifficulty(InterviewSessionState state);

    // ============ 模拟数据方法 ============
    
    protected String getMockQuestion() {
        return "请介绍一下你自己，包括你的技术背景和最擅长的领域。";
    }
    
    protected String getMockEvaluation() {
        return """
            {
                "score": 75,
                "dimension": "technical",
                "feedback": "回答较为完整，展示了一定的技术能力，但可以更深入地阐述技术细节。",
                "strengths": ["表达清晰", "有项目经验"],
                "weaknesses": ["技术深度不够", "缺少具体案例"]
            }
            """;
    }

    // ============ 辅助方法 ============

    protected InterviewSessionState getOrCreateSessionState(String sessionId) {
        return sessionStates.computeIfAbsent(sessionId, InterviewSessionState::new);
    }
}
