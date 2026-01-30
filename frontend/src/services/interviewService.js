/**
 * 多智能体面试系统 API 服务层
 * 
 * 提供与后端面试系统 API 的完整交互功能
 */

import { authenticatedFetch } from '../utils/api';

const API_BASE_URL = '/api/interview';

/**
 * 面试会话服务
 */
export const interviewSessionService = {
  /**
   * 创建面试会话
   * @param {Object} candidateProfile - 候选人画像
   * @param {Object} config - 面试配置
   * @param {string} jobPositionId - 职位ID
   * @returns {Promise<Object>} 创建的会话信息
   */
  async createSession(candidateProfile, config = null, jobPositionId = null) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_profile: candidateProfile,
        config: config,
        job_position_id: jobPositionId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '创建会话失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 获取会话信息
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 会话信息
   */
  async getSession(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '获取会话失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 列表面试会话
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 会话列表
   */
  async listSessions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.candidateId) params.append('candidate_id', filters.candidateId);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await authenticatedFetch(`${API_BASE_URL}/sessions?${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '获取会话列表失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 删除会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteSession(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '删除会话失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

/**
 * 面试控制服务
 */
export const interviewControlService = {
  /**
   * 开始面试
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 开始结果
   */
  async startInterview(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '开始面试失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 提交回答
   * @param {string} sessionId - 会话ID
   * @param {string} answer - 候选人回答
   * @param {number} duration - 回答时长（秒）
   * @returns {Promise<Object>} 处理结果
   */
  async submitAnswer(sessionId, answer, duration = null) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer,
        duration,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '提交回答失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 暂停面试
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 暂停结果
   */
  async pauseInterview(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/pause`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '暂停面试失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 恢复面试
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 恢复结果
   */
  async resumeInterview(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/resume`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '恢复面试失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 完成面试
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 面试结果
   */
  async completeInterview(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/complete`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '完成面试失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 取消面试
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 取消结果
   */
  async cancelInterview(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '取消面试失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

/**
 * 面试结果服务
 */
export const interviewResultService = {
  /**
   * 获取面试结果
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 面试结果
   */
  async getResult(sessionId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/sessions/${sessionId}/result`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '获取面试结果失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * 导出面试报告
   * @param {string} sessionId - 会话ID
   * @param {string} format - 导出格式 (json|markdown|pdf)
   * @returns {Promise<Blob>} 报告文件
   */
  async exportReport(sessionId, format = 'json') {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/sessions/${sessionId}/export?format=${format}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '导出报告失败' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.blob();
  },
};

/**
 * WebSocket 连接管理
 */
export class InterviewWebSocket {
  constructor(sessionId, onMessage, onError, onClose) {
    this.sessionId = sessionId;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onClose = onClose;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * 建立 WebSocket 连接
   * @returns {Promise} 连接成功返回 Promise
   */
  connect() {
    return new Promise((resolve, reject) => {
      // 构建完整的 WebSocket URL
      // 在开发环境中直接连接后端，生产环境使用相对路径
      const isDev = import.meta.env.DEV;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = isDev ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/api/interview/ws/${this.sessionId}`;

      console.log('正在连接 WebSocket:', wsUrl);
      
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error('创建 WebSocket 失败:', err);
        reject(new Error('创建 WebSocket 连接失败'));
        return;
      }

      // 设置连接超时
      const timeout = setTimeout(() => {
        console.error('WebSocket 连接超时');
        if (this.ws) {
          this.ws.close();
        }
        reject(new Error('WebSocket 连接超时'));
      }, 10000);

      this.ws.onopen = () => {
        console.log('面试 WebSocket 连接已建立');
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        clearTimeout(timeout);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) {
            this.onMessage(data);
          }
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error);
          if (this.onError) {
            this.onError(error);
          }
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭:', event.code, event.reason);
        clearTimeout(timeout);
        
        if (this.onClose) {
          this.onClose(event);
        }

        // 自动重连
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect().catch(() => {}), this.reconnectDelay * this.reconnectAttempts);
        }
      };
    });
  }

  /**
   * 发送消息
   * @param {Object} data - 要发送的数据
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket 未连接');
      throw new Error('WebSocket 未连接');
    }
  }

  /**
   * 发送回答
   * @param {string} answer - 候选人回答
   * @param {number} duration - 回答时长
   */
  sendAnswer(answer, duration = null) {
    this.send({
      action: 'answer',
      answer,
      duration,
    });
  }

  /**
   * 开始面试
   * @param {boolean} demoMode - 是否启用演示模式（自动回答）
   * @param {number} demoDelay - 演示模式下自动回答的延迟（秒）
   */
  startInterview(demoMode = false, demoDelay = 3) {
    this.send({
      action: 'start',
      demo_mode: demoMode,
      demo_delay: demoDelay,
    });
  }

  /**
   * 暂停面试
   */
  pauseInterview() {
    this.send({ action: 'pause' });
  }

  /**
   * 恢复面试
   */
  resumeInterview() {
    this.send({ action: 'resume' });
  }

  /**
   * 完成面试
   */
  completeInterview() {
    this.send({ action: 'complete' });
  }

  /**
   * 获取状态
   */
  getStatus() {
    this.send({ action: 'get_status' });
  }

  /**
   * 关闭连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, '正常关闭');
      this.ws = null;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * 错误处理工具
 */
export const handleInterviewError = (error) => {
  console.error('面试系统错误:', error);

  // 根据错误类型返回友好的错误信息
  if (error.message.includes('404')) {
    return {
      type: 'NOT_FOUND',
      message: '会话不存在或已被删除',
    };
  } else if (error.message.includes('400')) {
    return {
      type: 'BAD_REQUEST',
      message: '请求参数错误，请检查输入',
    };
  } else if (error.message.includes('401')) {
    return {
      type: 'UNAUTHORIZED',
      message: '未授权，请重新登录',
    };
  } else if (error.message.includes('403')) {
    return {
      type: 'FORBIDDEN',
      message: '没有权限执行此操作',
    };
  } else if (error.message.includes('500')) {
    return {
      type: 'SERVER_ERROR',
      message: '服务器内部错误，请稍后重试',
    };
  } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
    return {
      type: 'NETWORK_ERROR',
      message: '网络连接失败，请检查网络',
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: error.message || '发生未知错误',
  };
};

// 导出默认对象
export default {
  session: interviewSessionService,
  control: interviewControlService,
  result: interviewResultService,
  WebSocket: InterviewWebSocket,
  handleError: handleInterviewError,
};
