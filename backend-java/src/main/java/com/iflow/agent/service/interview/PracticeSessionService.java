package com.iflow.agent.service.interview;

import com.iflow.agent.domain.interview.entity.PracticeSession;

import java.util.Map;
import java.util.Optional;

/**
 * 练习会话服务接口
 */
public interface PracticeSessionService {

    /**
     * 创建练习会话
     */
    PracticeSession createSession(String userId, String mode, String difficulty, int questionCount, java.util.List<String> focusAreas);

    /**
     * 获取练习会话
     */
    Optional<PracticeSession> getSession(String sessionId);

    /**
     * 开始练习会话
     */
    boolean startSession(String sessionId);

    /**
     * 提交回答
     */
    Map<String, Object> submitAnswer(String sessionId, String answer, Integer duration);

    /**
     * 获取提示
     */
    String getHint(String sessionId);

    /**
     * 完成练习会话
     */
    Map<String, Object> completeSession(String sessionId);

    /**
     * 删除练习会话
     */
    boolean deleteSession(String sessionId);

    /**
     * 生成面试问题参考答案
     */
    String generateAnswer(String question, String category, java.util.List<String> keyPoints, Map<String, Object> projectContext);
}
