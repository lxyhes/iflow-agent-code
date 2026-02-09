package com.iflow.agent.service.interview;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.enums.InterviewStatus;
import com.iflow.agent.dto.interview.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 面试服务接口 - 对应 Python 的 InterviewSessionManager
 */
public interface InterviewService {

    /**
     * 创建面试会话
     */
    InterviewResponse createSession(String userId, CreateSessionRequest request);

    /**
     * 获取会话信息
     */
    Optional<InterviewSession> getSession(String sessionId);

    /**
     * 开始面试
     */
    InterviewResponse startInterview(String sessionId);

    /**
     * 提交回答
     */
    InterviewResponse submitAnswer(String sessionId, AnswerRequest request);

    /**
     * 暂停面试
     */
    InterviewResponse pauseInterview(String sessionId);

    /**
     * 恢复面试
     */
    InterviewResponse resumeInterview(String sessionId);

    /**
     * 完成面试
     */
    InterviewResponse completeInterview(String sessionId);

    /**
     * 取消面试
     */
    InterviewResponse cancelInterview(String sessionId);

    /**
     * 获取面试结果
     */
    Map<String, Object> getInterviewResult(String sessionId);

    /**
     * 导出面试报告
     */
    String exportInterviewReport(String sessionId, String format);

    /**
     * 列表面试会话
     */
    List<Map<String, Object>> listSessions(String candidateId, String status, int limit);

    /**
     * 删除面试会话
     */
    boolean deleteSession(String sessionId);

    // ========== WebSocket 方法 ==========

    /**
     * WebSocket 连接建立
     */
    void handleWebSocketConnected(String sessionId);

    /**
     * WebSocket 连接断开
     */
    void handleWebSocketDisconnected(String sessionId);

    /**
     * WebSocket 开始面试
     */
    void startInterviewWebSocket(String sessionId, boolean demoMode, int demoDelay);

    /**
     * WebSocket 提交回答
     */
    void submitAnswerWebSocket(String sessionId, String answer, Integer duration);

    /**
     * WebSocket 暂停面试
     */
    void pauseInterviewWebSocket(String sessionId);

    /**
     * WebSocket 恢复面试
     */
    void resumeInterviewWebSocket(String sessionId);

    /**
     * WebSocket 完成面试
     */
    void completeInterviewWebSocket(String sessionId);

    /**
     * 获取面试状态
     */
    Map<String, Object> getInterviewStatus(String sessionId);
}
