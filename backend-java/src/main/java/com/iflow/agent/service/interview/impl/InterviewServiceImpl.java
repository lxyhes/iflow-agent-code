package com.iflow.agent.service.interview.impl;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.enums.CoordinationMode;
import com.iflow.agent.domain.interview.enums.InterviewStatus;
import com.iflow.agent.domain.interview.repository.InterviewSessionRepository;
import com.iflow.agent.dto.interview.*;
import com.iflow.agent.service.interview.InterviewService;
import com.iflow.agent.service.interview.agentscope.InterviewCoordinator;
import com.iflow.agent.service.interview.agentscope.InterviewContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 面试服务实现 - 对应 Python 的 InterviewSessionManager
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewServiceImpl implements InterviewService {

    private final InterviewSessionRepository sessionRepository;
    private final InterviewCoordinator interviewCoordinator;
    private final org.springframework.context.ApplicationContext applicationContext;

    // 内存中缓存活跃的会话
    private final Map<String, InterviewSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * 获取 InterviewWebSocketHandler（延迟加载以避免循环依赖）
     */
    private com.iflow.agent.handler.InterviewWebSocketHandler getWebSocketHandler() {
        return applicationContext.getBean(com.iflow.agent.handler.InterviewWebSocketHandler.class);
    }

    @Override
    @Transactional
    public InterviewResponse createSession(String userId, CreateSessionRequest request) {
        log.info("Creating interview session for user: {}", userId);

        try {
            CandidateProfileDTO profile = request.getCandidateProfile();
            InterviewConfigDTO config = request.getConfig();

            // 创建面试会话
            InterviewSession session = InterviewSession.builder()
                    .userId(userId)
                    .candidateName(profile != null ? profile.getName() : "候选人")
                    .position(profile != null ? profile.getTargetPosition() : "")
                    .status(InterviewStatus.PENDING)
                    .coordinationMode(CoordinationMode.SEQUENTIAL)
                    .totalRounds(config != null ? config.getTotalRounds() : 5)
                    .currentRound(0)
                    .maxDuration(config != null ? config.getMaxDuration() : 3600)
                    .agentOrder(config != null ? config.getAgentOrder() : List.of("technical", "behavioral", "hr"))
                    .build();

            InterviewSession saved = sessionRepository.save(session);
            activeSessions.put(saved.getId(), saved);

            // 初始化协调器
            interviewCoordinator.initializeSession(saved.getId(), profile);

            return InterviewResponse.builder()
                    .sessionId(saved.getId())
                    .status("created")
                    .message("面试会话创建成功")
                    .data(Map.of(
                            "candidate_name", profile != null ? profile.getName() : "候选人",
                            "session_status", saved.getStatus().name()
                    ))
                    .build();

        } catch (Exception e) {
            log.error("Failed to create interview session", e);
            return InterviewResponse.builder()
                    .sessionId("")
                    .status("error")
                    .message("创建会话失败: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Optional<InterviewSession> getSession(String sessionId) {
        // 先从内存缓存查找
        InterviewSession session = activeSessions.get(sessionId);
        if (session != null) {
            return Optional.of(session);
        }

        // 从数据库查找
        return sessionRepository.findById(sessionId);
    }

    @Override
    @Transactional
    public InterviewResponse startInterview(String sessionId) {
        log.info("Starting interview session: {}", sessionId);

        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (session.getStatus() != InterviewStatus.PENDING) {
            return InterviewResponse.builder()
                    .sessionId(sessionId)
                    .status("error")
                    .message("无法开始面试，会话状态不正确")
                    .build();
        }

        session.setStatus(InterviewStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // 启动协调器
        interviewCoordinator.startSession(sessionId);

        return InterviewResponse.builder()
                .sessionId(sessionId)
                .status("started")
                .message("面试已开始")
                .build();
    }

    @Override
    @Transactional
    public InterviewResponse submitAnswer(String sessionId, AnswerRequest request) {
        log.info("Submitting answer for session: {}", sessionId);

        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (session.getStatus() != InterviewStatus.IN_PROGRESS) {
            return InterviewResponse.builder()
                    .sessionId(sessionId)
                    .status("error")
                    .message("面试未在进行中")
                    .build();
        }

        // 处理回答
        String answer = request.getAnswer();
        String truncatedAnswer = answer.length() > 100 ? answer.substring(0, 100) + "..." : answer;

        return InterviewResponse.builder()
                .sessionId(sessionId)
                .status("processing")
                .message("回答已接收，正在处理")
                .data(Map.of("answer", truncatedAnswer))
                .build();
    }

    @Override
    @Transactional
    public InterviewResponse pauseInterview(String sessionId) {
        log.info("Pausing interview session: {}", sessionId);

        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        session.setStatus(InterviewStatus.PAUSED);
        sessionRepository.save(session);

        return InterviewResponse.builder()
                .sessionId(sessionId)
                .status("paused")
                .message("面试已暂停")
                .build();
    }

    @Override
    @Transactional
    public InterviewResponse resumeInterview(String sessionId) {
        log.info("Resuming interview session: {}", sessionId);

        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (session.getStatus() != InterviewStatus.PAUSED) {
            return InterviewResponse.builder()
                    .sessionId(sessionId)
                    .status("error")
                    .message("面试未处于暂停状态")
                    .build();
        }

        session.setStatus(InterviewStatus.IN_PROGRESS);
        sessionRepository.save(session);

        return InterviewResponse.builder()
                .sessionId(sessionId)
                .status("resumed")
                .message("面试已恢复")
                .build();
    }

    @Override
    @Transactional
    public InterviewResponse completeInterview(String sessionId) {
        log.info("Completing interview session: {}", sessionId);

        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        session.setStatus(InterviewStatus.COMPLETED);
        session.setEndedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // 生成结果
        Map<String, Object> result = generateInterviewResult(session);

        // 从活跃会话中移除
        activeSessions.remove(sessionId);

        return InterviewResponse.builder()
                .sessionId(sessionId)
                .status("completed")
                .message("面试已完成")
                .data(result)
                .build();
    }

    @Override
    @Transactional
    public InterviewResponse cancelInterview(String sessionId) {
        log.info("Cancelling interview session: {}", sessionId);

        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        session.setStatus(InterviewStatus.CANCELLED);
        session.setEndedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // 从活跃会话中移除
        activeSessions.remove(sessionId);

        return InterviewResponse.builder()
                .sessionId(sessionId)
                .status("cancelled")
                .message("面试已取消")
                .build();
    }

    @Override
    public Map<String, Object> getInterviewResult(String sessionId) {
        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (session.getStatus() != InterviewStatus.COMPLETED) {
            throw new IllegalStateException("面试结果尚未生成");
        }

        return generateInterviewResult(session);
    }

    @Override
    public String exportInterviewReport(String sessionId, String format) {
        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        Map<String, Object> result = generateInterviewResult(session);

        if ("json".equalsIgnoreCase(format)) {
            return result.toString();
        } else if ("markdown".equalsIgnoreCase(format)) {
            return generateMarkdownReport(session, result);
        }

        return result.toString();
    }

    // ========== 私有辅助方法 ==========

    private Map<String, Object> generateInterviewResult(InterviewSession session) {
        Map<String, Object> result = new HashMap<>();
        result.put("session_id", session.getId());
        result.put("candidate_name", session.getCandidateName());
        result.put("position", session.getPosition());
        result.put("status", session.getStatus().name());
        result.put("started_at", session.getStartedAt());
        result.put("ended_at", session.getEndedAt());
        result.put("total_rounds", session.getTotalRounds());
        result.put("current_round", session.getCurrentRound());

        // 模拟评分
        result.put("overall_score", 85);
        result.put("technical_score", 88);
        result.put("behavioral_score", 82);
        result.put("communication_score", 85);

        return result;
    }

    private String generateMarkdownReport(InterviewSession session, Map<String, Object> result) {
        StringBuilder sb = new StringBuilder();
        sb.append("# 面试报告\n\n");
        sb.append("## 基本信息\n\n");
        sb.append("- **候选人**: ").append(session.getCandidateName()).append("\n");
        sb.append("- **职位**: ").append(session.getPosition()).append("\n");
        sb.append("- **状态**: ").append(session.getStatus().name()).append("\n");
        sb.append("- **开始时间**: ").append(session.getStartedAt()).append("\n");
        sb.append("- **结束时间**: ").append(session.getEndedAt()).append("\n\n");

        sb.append("## 评分\n\n");
        sb.append("- **综合评分**: ").append(result.get("overall_score")).append("/100\n");
        sb.append("- **技术能力**: ").append(result.get("technical_score")).append("/100\n");
        sb.append("- **行为表现**: ").append(result.get("behavioral_score")).append("/100\n");
        sb.append("- **沟通能力**: ").append(result.get("communication_score")).append("/100\n\n");

        sb.append("## 总结\n\n");
        sb.append("候选人在面试中表现良好...\n");

        return sb.toString();
    }

    @Override
    public List<Map<String, Object>> listSessions(String candidateId, String status, int limit) {
        log.info("Listing interview sessions: candidateId={}, status={}, limit={}", candidateId, status, limit);

        List<InterviewSession> sessions;
        if (candidateId != null && !candidateId.isEmpty()) {
            sessions = sessionRepository.findByUserIdOrderByCreatedAtDesc(candidateId);
        } else {
            sessions = sessionRepository.findAll();
        }

        // 按状态过滤
        if (status != null && !status.isEmpty()) {
            try {
                InterviewStatus statusEnum = InterviewStatus.valueOf(status.toUpperCase());
                sessions = sessions.stream()
                        .filter(s -> s.getStatus() == statusEnum)
                        .toList();
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", status);
            }
        }

        // 限制数量
        if (sessions.size() > limit) {
            sessions = sessions.subList(0, limit);
        }

        return sessions.stream()
                .map(session -> Map.<String, Object>of(
                        "session_id", session.getId(),
                        "candidate_name", session.getCandidateName(),
                        "position", session.getPosition(),
                        "status", session.getStatus().name(),
                        "created_at", session.getCreatedAt(),
                        "started_at", session.getStartedAt(),
                        "ended_at", session.getEndedAt()
                ))
                .toList();
    }

    @Override
    public Map<String, Object> getInterviewStatus(String sessionId) {
        log.info("Get interview status: sessionId={}", sessionId);
        
        InterviewSession session = getSession(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
        
        return Map.of(
                "session_id", sessionId,
                "status", session.getStatus().name(),
                "current_round", session.getCurrentRound(),
                "total_rounds", session.getTotalRounds(),
                "started_at", session.getStartedAt(),
                "duration", session.getStartedAt() != null 
                        ? java.time.Duration.between(session.getStartedAt(), LocalDateTime.now()).getSeconds() 
                        : 0
        );
    }

    @Override
    @Transactional
    public boolean deleteSession(String sessionId) {
        log.info("Deleting interview session: {}", sessionId);
        
        try {
            // 从内存缓存中移除
            activeSessions.remove(sessionId);
            
            // 从数据库中删除
            if (sessionRepository.existsById(sessionId)) {
                sessionRepository.deleteById(sessionId);
                log.info("Successfully deleted session: {}", sessionId);
                return true;
            } else {
                log.warn("Session not found for deletion: {}", sessionId);
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to delete session: {}", sessionId, e);
            return false;
        }
    }

    // ========== WebSocket 方法实现 ==========

    @Override
    public void handleWebSocketConnected(String sessionId) {
        log.info("WebSocket connected: sessionId={}", sessionId);
        // 获取会话状态并通知
        try {
            InterviewSession session = getSession(sessionId).orElse(null);
            if (session != null) {
                // 如果会话已存在，恢复其状态
                InterviewContext context = interviewCoordinator.getContext(sessionId);
                if (context != null) {
                    log.info("Restored interview context for session: {}", sessionId);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to restore session context: {}", sessionId, e);
        }
    }

    @Override
    public void handleWebSocketDisconnected(String sessionId) {
        log.info("WebSocket disconnected: sessionId={}", sessionId);
        // 保持会话状态，不自动清理，允许重新连接
    }

    @Override
    public void startInterviewWebSocket(String sessionId, boolean demoMode, int demoDelay) {
        log.info("WebSocket start interview: sessionId={}, demoMode={}", sessionId, demoMode);

        try {
            // 确保会话存在
            InterviewSession session = getSession(sessionId)
                    .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

            // 如果会话还未开始，先启动
            if (session.getStatus() == InterviewStatus.PENDING) {
                startInterview(sessionId);
            }

            // 生成第一个问题
            String currentAgentType = interviewCoordinator.getCurrentAgentType(sessionId);
            if (currentAgentType == null) {
                currentAgentType = "technical"; // 默认从技术面试官开始
            }

            String question = interviewCoordinator.generateQuestion(sessionId);
            
            // 通过 WebSocket 发送问题
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendMessage(sessionId, Map.of(
                        "type", "question",
                        "agent_type", currentAgentType,
                        "content", question,
                        "round", session.getCurrentRound()
                ));
            }

            log.info("Interview started and first question sent: sessionId={}", sessionId);

        } catch (Exception e) {
            log.error("Failed to start interview via WebSocket: sessionId={}", sessionId, e);
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendError(sessionId, "启动面试失败: " + e.getMessage());
            }
        }
    }

    @Override
    public void submitAnswerWebSocket(String sessionId, String answer, Integer duration) {
        log.info("WebSocket submit answer: sessionId={}, length={}", sessionId, answer.length());

        try {
            InterviewSession session = getSession(sessionId)
                    .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

            if (session.getStatus() != InterviewStatus.IN_PROGRESS) {
                com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
                if (handler != null) {
                    handler.sendError(sessionId, "面试未在进行中");
                }
                return;
            }

            // 获取当前问题 ID（从上下文中）
            InterviewContext context = interviewCoordinator.getContext(sessionId);
            String currentQuestionId = context != null ? context.getCurrentQuestionId() : null;

            if (currentQuestionId == null) {
                log.warn("No current question found for session: {}", sessionId);
                return;
            }

            // 提交回答并获取评估
            Map<String, Object> result = interviewCoordinator.submitAnswer(
                    sessionId,
                    currentQuestionId,
                    answer
            );

            // 发送评估结果
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendMessage(sessionId, Map.of(
                        "type", "evaluation",
                        "data", result
                ));
            }

            // 检查是否需要切换到下一个面试官
            Boolean shouldSwitch = (Boolean) result.get("shouldSwitchAgent");
            if (shouldSwitch != null && shouldSwitch) {
                String nextAgent = interviewCoordinator.switchToNextAgent(sessionId);
                
                if (nextAgent == null) {
                    // 面试结束
                    completeInterviewWebSocket(sessionId);
                } else {
                    // 生成下一个问题
                    String nextQuestion = interviewCoordinator.generateQuestion(sessionId);
                    
                    if (handler != null) {
                        handler.sendMessage(sessionId, Map.of(
                                "type", "agent_switched",
                                "current_agent", nextAgent,
                                "next_question", nextQuestion
                        ));
                    }
                }
            } else {
                // 检查是否有追问
                Object followUp = result.get("followUp");
                if (followUp != null && followUp instanceof Map) {
                    Map<String, Object> followUpQuestion = (Map<String, Object>) followUp;
                    if (handler != null) {
                        handler.sendMessage(sessionId, Map.of(
                                "type", "follow_up_question",
                                "content", followUpQuestion.get("content")
                        ));
                    }
                }
            }

            log.info("Answer processed successfully: sessionId={}", sessionId);

        } catch (Exception e) {
            log.error("Failed to submit answer via WebSocket: sessionId={}", sessionId, e);
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendError(sessionId, "提交回答失败: " + e.getMessage());
            }
        }
    }

    @Override
    public void pauseInterviewWebSocket(String sessionId) {
        log.info("WebSocket pause interview: sessionId={}", sessionId);

        try {
            InterviewResponse response = pauseInterview(sessionId);
            
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendMessage(sessionId, Map.of(
                        "type", "paused",
                        "status", response.getStatus(),
                        "message", response.getMessage()
                ));
            }

        } catch (Exception e) {
            log.error("Failed to pause interview via WebSocket: sessionId={}", sessionId, e);
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendError(sessionId, "暂停面试失败: " + e.getMessage());
            }
        }
    }

    @Override
    public void resumeInterviewWebSocket(String sessionId) {
        log.info("WebSocket resume interview: sessionId={}", sessionId);

        try {
            InterviewResponse response = resumeInterview(sessionId);
            
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendMessage(sessionId, Map.of(
                        "type", "resumed",
                        "status", response.getStatus(),
                        "message", response.getMessage()
                ));
            }

        } catch (Exception e) {
            log.error("Failed to resume interview via WebSocket: sessionId={}", sessionId, e);
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendError(sessionId, "恢复面试失败: " + e.getMessage());
            }
        }
    }

    @Override
    public void completeInterviewWebSocket(String sessionId) {
        log.info("WebSocket complete interview: sessionId={}", sessionId);

        try {
            // 生成面试报告
            Map<String, Object> report = interviewCoordinator.generateReport(sessionId);
            
            // 完成面试会话
            InterviewResponse response = completeInterview(sessionId);
            
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendMessage(sessionId, Map.of(
                        "type", "completed",
                        "status", response.getStatus(),
                        "message", response.getMessage(),
                        "report", report
                ));
            }

            log.info("Interview completed via WebSocket: sessionId={}", sessionId);

        } catch (Exception e) {
            log.error("Failed to complete interview via WebSocket: sessionId={}", sessionId, e);
            com.iflow.agent.handler.InterviewWebSocketHandler handler = getWebSocketHandler();
            if (handler != null) {
                handler.sendError(sessionId, "完成面试失败: " + e.getMessage());
            }
        }
    }
}
