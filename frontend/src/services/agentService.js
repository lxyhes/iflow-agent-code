/**
 * Agent 管理 API 服务
 */

const API_BASE = '/api/agents';

/**
 * Agent 管理服务
 */
export const agentApi = {
  /**
   * 获取所有 Agent
   */
  async getAllAgents() {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('获取 Agent 列表失败');
    return response.json();
  },

  /**
   * 根据状态获取 Agent
   */
  async getAgentsByStatus(status) {
    const response = await fetch(`${API_BASE}/status/${status}`);
    if (!response.ok) throw new Error('获取 Agent 列表失败');
    return response.json();
  },

  /**
   * 获取单个 Agent
   */
  async getAgent(id) {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) throw new Error('获取 Agent 失败');
    return response.json();
  },

  /**
   * 注册新 Agent
   */
  async registerAgent(data) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '注册失败');
    }
    return response.json();
  },

  /**
   * 更新 Agent
   */
  async updateAgent(id, data) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '更新失败');
    }
    return response.json();
  },

  /**
   * 删除 Agent
   */
  async deleteAgent(id) {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('删除失败');
  },

  /**
   * 发现并注册所有可用 Agent
   */
  async discoverAndRegister() {
    const response = await fetch(`${API_BASE}/discover`, { method: 'POST' });
    if (!response.ok) throw new Error('发现 Agent 失败');
    return response.json();
  },

  /**
   * 检测本地 Agent (不注册)
   */
  async discoverAgents() {
    const response = await fetch(`${API_BASE}/discover/scan`);
    if (!response.ok) throw new Error('检测失败');
    return response.json();
  },

  /**
   * 检查 Agent 健康状态
   */
  async checkHealth(id) {
    const response = await fetch(`${API_BASE}/${id}/health`);
    if (!response.ok) throw new Error('健康检查失败');
    return response.json();
  },

  /**
   * 搜索 Agent
   */
  async searchAgents(keyword) {
    const response = await fetch(`${API_BASE}/search?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) throw new Error('搜索失败');
    return response.json();
  },

  /**
   * 获取支持的 Agent 类型
   */
  async getSupportedTypes() {
    const response = await fetch(`${API_BASE}/supported-types`);
    if (!response.ok) throw new Error('获取类型列表失败');
    return response.json();
  }
};

/**
 * 多 Agent 任务 API 服务
 */
export const multiAgentApi = {
  /**
   * 创建多 Agent 任务
   */
  async createTask(data) {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '创建任务失败');
    }
    return response.json();
  },

  /**
   * 执行多 Agent 任务
   */
  async executeTask(taskId, data) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '执行任务失败');
    }
    return response.json();
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/status`);
    if (!response.ok) throw new Error('获取任务状态失败');
    return response.json();
  },

  /**
   * 获取任务结果
   */
  async getTaskResults(taskId) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/results`);
    if (!response.ok) throw new Error('获取任务结果失败');
    return response.json();
  },

  /**
   * 获取任务历史
   */
  async getTaskHistory(userId = null, limit = 20) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('limit', limit);
    const response = await fetch(`${API_BASE}/tasks/history?${params}`);
    if (!response.ok) throw new Error('获取任务历史失败');
    return response.json();
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/cancel`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('取消任务失败');
  },

  /**
   * 获取所有任务
   */
  async getAllTasks() {
    const response = await fetch(`${API_BASE}/tasks`);
    if (!response.ok) throw new Error('获取任务列表失败');
    return response.json();
  },

  /**
   * 执行单个 Agent 任务
   */
  async executeAgent(agentId, prompt, context = '') {
    const response = await fetch(`${API_BASE}/execute?agentId=${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '执行失败');
    }
    return response.json();
  },

  /**
   * 批量执行 Agent 任务
   */
  async executeBatch(agentIds, prompt, context = '') {
    const response = await fetch(`${API_BASE}/execute/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentIds, prompt, context })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '批量执行失败');
    }
    return response.json();
  },

  /**
   * 获取 Agent 执行状态
   */
  async getAgentStatus(agentId) {
    const response = await fetch(`${API_BASE}/${agentId}/status`);
    if (!response.ok) throw new Error('获取状态失败');
    return response.json();
  },

  /**
   * 检查 Agent 是否可用
   */
  async checkAgentAvailable(agentId) {
    const response = await fetch(`${API_BASE}/${agentId}/available`);
    if (!response.ok) throw new Error('检查失败');
    return response.json();
  }
};

export default { agentApi, multiAgentApi };
