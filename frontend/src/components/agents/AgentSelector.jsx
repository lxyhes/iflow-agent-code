import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  Search
} from 'lucide-react';

/**
 * Agent 选择器组件
 * 用于在聊天界面中选择要使用的 AI Agent
 */
const AgentSelector = ({ selectedAgentId, onAgentSelect, className = '' }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 获取 Agent 列表
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('获取 Agent 列表失败');
      const data = await response.json();
      setAgents(data.agents || []);
      
      // 如果没有选中 Agent，默认选择第一个活跃的 Agent
      if (!selectedAgentId && data.agents && data.agents.length > 0) {
        const activeAgent = data.agents.find(a => a.status === 'active');
        if (activeAgent && onAgentSelect) {
          onAgentSelect(activeAgent.id);
        }
      }
    } catch (error) {
      console.error('获取 Agent 列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId, onAgentSelect]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // 过滤 Agent 列表
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取选中 Agent 的信息
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // 获取状态图标
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={`px-3 py-2 text-sm text-gray-500 ${className}`}>
        加载 Agent...
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* 选择器按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Bot className="w-4 h-4" />
        <span className="text-sm font-medium">
          {selectedAgent ? selectedAgent.name : '选择 Agent'}
        </span>
        {selectedAgent && getStatusIcon(selectedAgent.status)}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 菜单内容 */}
          <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            {/* 搜索框 */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索 Agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Agent 列表 */}
            <div className="max-h-64 overflow-y-auto">
              {filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  暂无 Agent
                </div>
              ) : (
                filteredAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      onAgentSelect?.(agent.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedAgentId === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <Bot className="w-4 h-4 text-blue-500" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {agent.name}
                        </span>
                        {getStatusIcon(agent.status)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.type} {agent.version && `· ${agent.version}`}
                      </div>
                    </div>
                    {selectedAgentId === agent.id && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* 底部操作 */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <a
                href="/agents"
                className="block w-full text-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  window.location.href = '/agents';
                }}
              >
                管理 Agent →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentSelector;
