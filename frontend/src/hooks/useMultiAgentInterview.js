/**
 * 多智能体面试系统 React Hook
 * 
 * 提供完整的前端状态管理和交互逻辑
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  interviewSessionService,
  interviewControlService,
  interviewResultService,
  InterviewWebSocket,
  handleInterviewError,
} from '../services/interviewService';

/**
 * 面试会话状态枚举
 */
export const InterviewStatus = {
  IDLE: 'idle',
  CREATING: 'creating',
  INITIALIZING: 'initializing',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ERROR: 'error',
};

/**
 * 多智能体面试 Hook
 * @param {Object} options - 配置选项
 * @returns {Object} 面试状态和操作方法
 */
export const useMultiAgentInterview = (options = {}) => {
  const {
    onMessage,
    onEvaluation,
    onAgentSwitch,
    onComplete,
    onError,
  } = options;

  // 会话状态
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(InterviewStatus.IDLE);
  const [error, setError] = useState(null);

  // 面试数据
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [result, setResult] = useState(null);

  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // WebSocket 引用
  const wsRef = useRef(null);

  /**
   * 创建面试会话
   */
  const createSession = useCallback(async (profile, config = null, jobPositionId = null) => {
    setIsLoading(true);
    setError(null);
    setStatus(InterviewStatus.CREATING);

    try {
      const response = await interviewSessionService.createSession(
        profile,
        config,
        jobPositionId
      );

      setSessionId(response.session_id);
      setCandidateProfile(profile);
      setStatus(InterviewStatus.READY);

      return response;
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      setStatus(InterviewStatus.ERROR);
      if (onError) onError(errorInfo);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * 开始面试
   * @param {boolean} demoMode - 是否启用演示模式（自动回答）
   * @param {number} demoDelay - 演示模式下自动回答的延迟（秒）
   */
  const startInterview = useCallback(async (demoMode = false, demoDelay = 3) => {
    if (!sessionId) {
      const errorInfo = { type: 'NO_SESSION', message: '会话未创建' };
      setError(errorInfo);
      if (onError) onError(errorInfo);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // REST API 启动面试
      await interviewControlService.startInterview(sessionId);

      // 建立 WebSocket 连接
      const ws = new InterviewWebSocket(
        sessionId,
        (data) => {
          handleWebSocketMessage(data);
        },
        (err) => {
          console.error('WebSocket 错误:', err);
          const errorInfo = handleInterviewError(err);
          setError(errorInfo);
          if (onError) onError(errorInfo);
        },
        (event) => {
          console.log('WebSocket 关闭:', event);
          setIsProcessing(false); // WebSocket 关闭时重置处理状态
          if (status === InterviewStatus.IN_PROGRESS) {
            setStatus(InterviewStatus.ERROR);
          }
        }
      );

      // 等待 WebSocket 连接建立
      await ws.connect();
      wsRef.current = ws;

      setStatus(InterviewStatus.IN_PROGRESS);

      // 开始面试流程（支持演示模式）
      ws.startInterview(demoMode, demoDelay);
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      setStatus(InterviewStatus.ERROR);
      if (onError) onError(errorInfo);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, status, onError]);

  /**
   * 处理 WebSocket 消息
   */
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'agent_switch':
        setCurrentAgent({
          type: data.agent_type,
          name: data.agent_name,
          persona: data.persona,
        });
        if (onAgentSwitch) onAgentSwitch(data);
        break;

      case 'question':
        setCurrentQuestion(data.content);
        setMessages((prev) => [
          ...prev,
          {
            type: 'question',
            content: data.content,
            agent: currentAgent,
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsProcessing(false); // 收到问题后重置处理状态
        if (onMessage) onMessage(data);
        break;

      case 'evaluation':
        setEvaluation({
          agentType: data.agent_type,
          agentName: data.agent_name,
          score: data.score,
          feedback: data.feedback,
          strengths: data.strengths,
          weaknesses: data.weaknesses,
          smartAnalysis: data.smart_analysis, // 智能分析结果
        });
        setMessages((prev) => [
          ...prev,
          {
            type: 'evaluation',
            ...data,
            timestamp: new Date().toISOString(),
          },
        ]);
        if (onEvaluation) onEvaluation(data);
        break;

      case 'follow_up':
        setMessages((prev) => [
          ...prev,
          {
            type: 'follow_up',
            agent: data.agent_name,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;

      case 'deep_follow_up':
        // 智能深度追问
        setMessages((prev) => [
          ...prev,
          {
            type: 'deep_follow_up',
            agent: data.agent_name,
            reason: data.reason,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;

      case 'demo_answer':
        // 演示模式：自动生成的回答
        setMessages((prev) => [
          ...prev,
          {
            type: 'answer',
            content: data.content,
            isDemo: true,
            timestamp: new Date().toISOString(),
          },
        ]);
        break;

      case 'completed':
        setResult(data.result);
        setStatus(InterviewStatus.COMPLETED);
        if (onComplete) onComplete(data.result);
        break;

      case 'error':
        const errorInfo = { type: 'WEBSOCKET_ERROR', message: data.message };
        setError(errorInfo);
        setIsProcessing(false); // 出错时重置处理状态
        if (onError) onError(errorInfo);
        break;

      case 'status':
        // 处理状态更新
        break;

      default:
        // 处理流式内容
        if (data.content) {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.type === 'stream') {
              // 追加到现有流消息
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: lastMessage.content + data.content,
                },
              ];
            } else {
              // 创建新的流消息
              return [
                ...prev,
                {
                  type: 'stream',
                  content: data.content,
                  agent: currentAgent,
                  timestamp: new Date().toISOString(),
                },
              ];
            }
          });
        }
        break;
    }
  }, [currentAgent, onMessage, onEvaluation, onAgentSwitch, onComplete, onError]);

  /**
   * 提交回答
   */
  const submitAnswer = useCallback((answer, duration = null) => {
    if (!wsRef.current || !wsRef.current.isConnected()) {
      const errorInfo = { type: 'NOT_CONNECTED', message: 'WebSocket 未连接' };
      setError(errorInfo);
      if (onError) onError(errorInfo);
      return;
    }

    setIsProcessing(true);
    setError(null);

    // 添加用户消息到列表
    setMessages((prev) => [
      ...prev,
      {
        type: 'answer',
        content: answer,
        duration,
        timestamp: new Date().toISOString(),
      },
    ]);

    // 发送回答
    wsRef.current.sendAnswer(answer, duration);
  }, [onError]);

  /**
   * 暂停面试
   */
  const pauseInterview = useCallback(async () => {
    if (!sessionId) return;

    try {
      if (wsRef.current && wsRef.current.isConnected()) {
        wsRef.current.pauseInterview();
      }
      await interviewControlService.pauseInterview(sessionId);
      setStatus(InterviewStatus.PAUSED);
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      if (onError) onError(errorInfo);
    }
  }, [sessionId, onError]);

  /**
   * 恢复面试
   */
  const resumeInterview = useCallback(async () => {
    if (!sessionId) return;

    try {
      if (wsRef.current && wsRef.current.isConnected()) {
        wsRef.current.resumeInterview();
      }
      await interviewControlService.resumeInterview(sessionId);
      setStatus(InterviewStatus.IN_PROGRESS);
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      if (onError) onError(errorInfo);
    }
  }, [sessionId, onError]);

  /**
   * 完成面试
   */
  const completeInterview = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      if (wsRef.current && wsRef.current.isConnected()) {
        wsRef.current.completeInterview();
      }

      const result = await interviewControlService.completeInterview(sessionId);
      setResult(result);
      setStatus(InterviewStatus.COMPLETED);

      // 关闭 WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect();
      }

      if (onComplete) onComplete(result);
      return result;
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      if (onError) onError(errorInfo);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onComplete, onError]);

  /**
   * 取消面试
   */
  const cancelInterview = useCallback(async () => {
    if (!sessionId) return;

    try {
      await interviewControlService.cancelInterview(sessionId);
      setStatus(InterviewStatus.CANCELLED);

      // 关闭 WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      if (onError) onError(errorInfo);
    }
  }, [sessionId, onError]);

  /**
   * 获取面试结果
   */
  const getResult = useCallback(async () => {
    if (!sessionId) return null;

    try {
      const result = await interviewResultService.getResult(sessionId);
      setResult(result);
      return result;
    } catch (err) {
      const errorInfo = handleInterviewError(err);
      setError(errorInfo);
      if (onError) onError(errorInfo);
      throw err;
    }
  }, [sessionId, onError]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    // 关闭 WebSocket
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    // 重置所有状态
    setSessionId(null);
    setStatus(InterviewStatus.IDLE);
    setError(null);
    setCandidateProfile(null);
    setCurrentAgent(null);
    setCurrentQuestion(null);
    setMessages([]);
    setEvaluation(null);
    setResult(null);
    setIsLoading(false);
    setIsProcessing(false);
  }, []);

  /**
   * 清理副作用
   */
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  return {
    // 状态
    sessionId,
    status,
    error,
    candidateProfile,
    currentAgent,
    currentQuestion,
    messages,
    evaluation,
    result,
    isLoading,
    isProcessing,

    // 操作方法
    createSession,
    startInterview,
    submitAnswer,
    pauseInterview,
    resumeInterview,
    completeInterview,
    cancelInterview,
    getResult,
    reset,

    // 工具
    InterviewStatus,
  };
};

export default useMultiAgentInterview;
