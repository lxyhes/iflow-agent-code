package com.iflow.agent.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.service.interview.InterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import javax.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 面试 WebSocket 处理器
 * 处理面试会话的实时通信
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final InterviewService interviewService;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = extractSessionId(session);
        log.info("[Interview] WebSocket connection established: sessionId={}", sessionId);

        sessions.put(sessionId, session);

        // 发送连接成功消息
        sendMessage(sessionId, Map.of(
                "type", "connected",
                "session_id", sessionId,
                "message", "WebSocket 连接已建立"
        ));

        // 通知面试服务连接已建立
        interviewService.handleWebSocketConnected(sessionId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = extractSessionId(session);
        String payload = message.getPayload();

        log.debug("[Interview] Received message: sessionId={}, payload={}", sessionId, payload);

        try {
            JsonNode jsonNode = objectMapper.readTree(payload);
            String action = jsonNode.has("action") ? jsonNode.get("action").asText() : "";

            switch (action) {
                case "start":
                    handleStart(sessionId, jsonNode);
                    break;
                case "answer":
                    handleAnswer(sessionId, jsonNode);
                    break;
                case "pause":
                    handlePause(sessionId);
                    break;
                case "resume":
                    handleResume(sessionId);
                    break;
                case "complete":
                    handleComplete(sessionId);
                    break;
                case "get_status":
                    handleGetStatus(sessionId);
                    break;
                default:
                    log.warn("[Interview] Unknown action: {}", action);
                    sendError(sessionId, "Unknown action: " + action);
            }
        } catch (Exception e) {
            log.error("[Interview] Error handling message: sessionId={}", sessionId, e);
            sendError(sessionId, "处理消息失败: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = extractSessionId(session);
        log.info("[Interview] WebSocket connection closed: sessionId={}, status={}", sessionId, status);

        sessions.remove(sessionId);
        interviewService.handleWebSocketDisconnected(sessionId);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = extractSessionId(session);
        log.error("[Interview] WebSocket transport error: sessionId={}", sessionId, exception);

        sessions.remove(sessionId);
        sendError(sessionId, "WebSocket 传输错误: " + exception.getMessage());
    }

    @PreDestroy
    public void destroy() {
        log.info("[Interview] Shutting down WebSocket handler");
        sessions.keySet().forEach(this::closeSession);
    }

    // ========== 处理方法 ==========

    private void handleStart(String sessionId, JsonNode jsonNode) {
        boolean demoMode = jsonNode.has("demo_mode") && jsonNode.get("demo_mode").asBoolean();
        int demoDelay = jsonNode.has("demo_delay") ? jsonNode.get("demo_delay").asInt() : 3;

        log.info("[Interview] Start interview: sessionId={}, demoMode={}", sessionId, demoMode);

        try {
            interviewService.startInterviewWebSocket(sessionId, demoMode, demoDelay);
        } catch (Exception e) {
            log.error("[Interview] Failed to start interview: sessionId={}", sessionId, e);
            sendError(sessionId, "启动面试失败: " + e.getMessage());
        }
    }

    private void handleAnswer(String sessionId, JsonNode jsonNode) {
        String answer = jsonNode.has("answer") ? jsonNode.get("answer").asText() : "";
        Integer duration = jsonNode.has("duration") ? jsonNode.get("duration").asInt() : null;

        log.info("[Interview] Submit answer: sessionId={}, length={}", sessionId, answer.length());

        try {
            interviewService.submitAnswerWebSocket(sessionId, answer, duration);
        } catch (Exception e) {
            log.error("[Interview] Failed to submit answer: sessionId={}", sessionId, e);
            sendError(sessionId, "提交回答失败: " + e.getMessage());
        }
    }

    private void handlePause(String sessionId) {
        log.info("[Interview] Pause interview: sessionId={}", sessionId);

        try {
            interviewService.pauseInterviewWebSocket(sessionId);
        } catch (Exception e) {
            log.error("[Interview] Failed to pause interview: sessionId={}", sessionId, e);
            sendError(sessionId, "暂停面试失败: " + e.getMessage());
        }
    }

    private void handleResume(String sessionId) {
        log.info("[Interview] Resume interview: sessionId={}", sessionId);

        try {
            interviewService.resumeInterviewWebSocket(sessionId);
        } catch (Exception e) {
            log.error("[Interview] Failed to resume interview: sessionId={}", sessionId, e);
            sendError(sessionId, "恢复面试失败: " + e.getMessage());
        }
    }

    private void handleComplete(String sessionId) {
        log.info("[Interview] Complete interview: sessionId={}", sessionId);

        try {
            interviewService.completeInterviewWebSocket(sessionId);
        } catch (Exception e) {
            log.error("[Interview] Failed to complete interview: sessionId={}", sessionId, e);
            sendError(sessionId, "完成面试失败: " + e.getMessage());
        }
    }

    private void handleGetStatus(String sessionId) {
        log.info("[Interview] Get status: sessionId={}", sessionId);

        try {
            Map<String, Object> status = interviewService.getInterviewStatus(sessionId);
            sendMessage(sessionId, Map.of(
                    "type", "status",
                    "data", status
            ));
        } catch (Exception e) {
            log.error("[Interview] Failed to get status: sessionId={}", sessionId, e);
            sendError(sessionId, "获取状态失败: " + e.getMessage());
        }
    }

    // ========== 工具方法 ==========

    /**
     * 发送消息到客户端
     */
    public void sendMessage(String sessionId, Map<String, Object> message) {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                log.debug("[Interview] Sent message: sessionId={}, type={}", sessionId, message.get("type"));
            } catch (IOException e) {
                log.error("[Interview] Failed to send message: sessionId={}", sessionId, e);
            }
        } else {
            log.warn("[Interview] Session not found or not open: sessionId={}", sessionId);
        }
    }

    /**
     * 发送错误消息
     */
    public void sendError(String sessionId, String errorMessage) {
        sendMessage(sessionId, Map.of(
                "type", "error",
                "message", errorMessage
        ));
    }

    /**
     * 关闭会话
     */
    public void closeSession(String sessionId) {
        WebSocketSession session = sessions.remove(sessionId);
        if (session != null && session.isOpen()) {
            try {
                session.close();
            } catch (IOException e) {
                log.error("[Interview] Failed to close session: sessionId={}", sessionId, e);
            }
        }
    }

    /**
     * 从 URI 中提取 sessionId
     */
    private String extractSessionId(WebSocketSession session) {
        String uri = session.getUri().toString();
        String[] parts = uri.split("/");
        return parts[parts.length - 1];
    }
}