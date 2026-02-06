package com.iflow.agent.service.interview.agentscope;

import com.iflow.agent.domain.interview.enums.InterviewPhase;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 面试会话状态
 */
@Data
public class InterviewSessionState {

    private final String sessionId;
    private InterviewPhase phase;
    private boolean active;
    private int currentQuestionIndex;
    private final List<String> askedQuestions;
    private final List<String> evaluations;

    public InterviewSessionState(String sessionId) {
        this.sessionId = sessionId;
        this.phase = InterviewPhase.WARM_UP;
        this.active = false;
        this.currentQuestionIndex = 0;
        this.askedQuestions = new ArrayList<>();
        this.evaluations = new ArrayList<>();
    }

    public void addQuestion(String questionId) {
        askedQuestions.add(questionId);
        currentQuestionIndex++;
    }

    public void addEvaluation(String evaluationId) {
        evaluations.add(evaluationId);
    }

    public int getQuestionCount() {
        return askedQuestions.size();
    }
}
