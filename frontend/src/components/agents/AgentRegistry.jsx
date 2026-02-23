import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Search, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Cpu,
  Terminal,
  Zap
} from 'lucide-react';

/**
 * Agent 注册管理组件
 * 用于管理 AI Agent 的注册、发现和健康检查
 */
const AgentRegistry = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  // 获取 Agent 列表
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('获取 Agent 列表失败');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('获取 Agent 列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 发现并注册 Agent
  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const response = await fetch('/api/agents/discover', { method: 'POST' });
      if (!response.ok) throw new Error('发现 Agent 失败');
      const data = await response.json();
      alert(`发现 ${data.found} 个 Agent，已注册 ${data.registered} 个`);
      fetchAgents();
    } catch (error) {
      console.error('发现 Agent 失败:', error);
      alert('发现 Agent 失败：' + error.message);
    } finally {
      setDiscovering(false);
    }
  };

  // 检查 Agent 健康状态
  const checkHealth = async (agentId) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/health`);
      if (!response.ok) throw new Error('健康检查失败');
      const data = await response.json();
      alert(`健康状态：${data.healthy ? '✅ 健康' : '❌ 异常'}\n${data.message}`);
      fetchAgents();
    } catch (error) {
      console.error('健康检查失败:', error);
      alert('健康检查失败：' + error.message);
    }
  };

  // 删除 Agent
  const handleDelete = async (agentId, agentName) => {
    if (!confirm(`确定要删除 Agent "${agentName}" 吗？`)) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('删除失败');
      alert('删除成功');
      fetchAgents();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + error.message);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // 过滤 Agent 列表
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 获取状态图标
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // 获取类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'claude-code':
        return <Bot className="w-5 h-5" />;
      case 'gemini-cli':
        return <Zap className="w-5 h-5" />;
      case 'qwen-code':
        return <Cpu className="w-5 h-5" />;
      default:
        return <Terminal className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Agent 管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            注册和管理您的 AI Agent (Claude Code, Gemini CLI, Qwen Code 等)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
            {discovering ? '检测中...' : '发现 Agent'}
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            注册 Agent
          </button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索 Agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="inactive">未激活</option>
          <option value="error">错误</option>
        </select>
      </div>

      {/* Agent 列表 */}
      <div className="grid gap-4">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无 Agent</p>
            <p className="text-sm mt-2">点击"发现 Agent"或"注册 Agent"开始</p>
          </div>
        ) : (
          filteredAgents.map(agent => (
            <div
              key={agent.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    {getTypeIcon(agent.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      {getStatusIcon(agent.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>类型：{agent.type}</span>
                      <span>版本：{agent.version || '未知'}</span>
                      {agent.lastHealthCheck && (
                        <span>
                          最后检查：{new Date(agent.lastHealthCheck).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => checkHealth(agent.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="健康检查"
                  >
                    <Activity className="w-5 h-5" />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="编辑"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id, agent.name)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {agent.capabilities.map((cap, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 注册 Agent 模态框 */}
      {showRegisterModal && (
        <RegisterAgentModal
          onClose={() => setShowRegisterModal(false)}
          onRegistered={() => {
            setShowRegisterModal(false);
            fetchAgents();
          }}
        />
      )}
    </div>
  );
};

/**
 * 注册 Agent 模态框组件
 */
const RegisterAgentModal = ({ onClose, onRegistered }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'claude-code',
    cliPath: '',
    version: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '注册失败');
      }

      alert('注册成功');
      onRegistered();
    } catch (error) {
      alert('注册失败：' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          注册新 Agent
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                名称
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="例如：My Claude Agent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="claude-code">Claude Code</option>
                <option value="gemini-cli">Gemini CLI</option>
                <option value="qwen-code">Qwen Code</option>
                <option value="codex">Codex</option>
                <option value="goose">Goose</option>
                <option value="iflow">iFlow</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                CLI 路径
              </label>
              <input
                type="text"
                value={formData.cliPath}
                onChange={(e) => setFormData({ ...formData, cliPath: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="例如：/usr/local/bin/claude (可选)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                版本
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="例如：1.0.0 (可选)"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '注册中...' : '注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentRegistry;
