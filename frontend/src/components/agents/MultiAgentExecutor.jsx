import React, { useState, useCallback } from 'react';
import { 
  Bot, 
  Play, 
  Plus, 
  X, 
  Loader, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Cpu,
  Zap,
  TrendingUp
} from 'lucide-react';

/**
 * 多 Agent 执行器组件
 * 用于创建和执行多 Agent 协作任务
 */
const MultiAgentExecutor = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [taskDescription, setTaskDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [executionMode, setExecutionMode] = useState('parallel'); // parallel, sequential, collaborative
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // 获取可用 Agent
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents?status=active');
      if (!response.ok) throw new Error('获取 Agent 列表失败');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('获取 Agent 列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // 切换 Agent 选择
  const toggleAgent = (agentId) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // 执行多 Agent 任务
  const handleExecute = async () => {
    if (selectedAgents.length === 0) {
      alert('请至少选择一个 Agent');
      return;
    }
    if (!taskDescription.trim()) {
      alert('请输入任务描述');
      return;
    }

    setExecuting(true);
    setResults(null);

    try {
      // 创建任务
      const createResponse = await fetch('/api/agents/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription,
          agentIds: selectedAgents,
          executionMode
        })
      });

      if (!createResponse.ok) throw new Error('创建任务失败');
      const task = await createResponse.json();

      // 执行任务
      const executeResponse = await fetch(`/api/agents/tasks/${task.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription,
          agentIds: selectedAgents,
          executionMode,
          prompt,
          context: ''
        })
      });

      if (!executeResponse.ok) throw new Error('执行任务失败');
      const result = await executeResponse.json();
      setResults(result);

    } catch (error) {
      console.error('执行任务失败:', error);
      alert('执行任务失败：' + error.message);
    } finally {
      setExecuting(false);
    }
  };

  // 获取执行模式说明
  const getModeDescription = (mode) => {
    switch (mode) {
      case 'parallel':
        return '所有 Agent 同时执行相同任务，结果聚合对比';
      case 'sequential':
        return 'Agent 依次执行，前一个 Agent 的输出作为下一个的输入';
      case 'collaborative':
        return 'Agent 之间相互通信，多轮对话共同完成任务';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        多 Agent 执行器
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：配置面板 */}
        <div className="space-y-6">
          {/* Agent 选择 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5" />
              选择 Agent ({selectedAgents.length})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {agents.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  暂无可用的 Agent
                </div>
              ) : (
                agents.map(agent => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Bot className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.type}
                      </div>
                    </div>
                    {agent.status === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 执行模式选择 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              执行模式
            </h2>
            <div className="space-y-3">
              {[
                { value: 'parallel', label: '并行执行', icon: Cpu },
                { value: 'sequential', label: '顺序执行', icon: TrendingUp },
                { value: 'collaborative', label: '协作执行', icon: Bot }
              ].map(mode => (
                <label
                  key={mode.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    executionMode === mode.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="executionMode"
                    value={mode.value}
                    checked={executionMode === mode.value}
                    onChange={(e) => setExecutionMode(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <mode.icon className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {mode.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getModeDescription(mode.value)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 任务描述 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              任务描述
            </h2>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="描述要执行的任务..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* 提示词 (可选) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              提示词 (可选)
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入具体的提示词或指令..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* 执行按钮 */}
          <button
            onClick={handleExecute}
            disabled={executing || selectedAgents.length === 0}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {executing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                执行中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                执行任务
              </>
            )}
          </button>
        </div>

        {/* 右侧：结果面板 */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            执行结果
          </h2>
          
          {executing && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  正在执行任务，请稍候...
                </p>
              </div>
            </div>
          )}

          {!executing && !results && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无执行结果</p>
                <p className="text-sm mt-2">配置任务并点击"执行任务"开始</p>
              </div>
            </div>
          )}

          {!executing && results && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* 结果摘要 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium mb-2">执行摘要</h3>
                {results.agentResults && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">成功:</span>
                      <span className="ml-2 text-green-600">
                        {results.agentResults.filter(r => !r.error).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">失败:</span>
                      <span className="ml-2 text-red-600">
                        {results.agentResults.filter(r => r.error).length}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 各 Agent 结果 */}
              {results.agentResults && results.agentResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 border rounded-lg ${
                    result.error
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.error ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <span className="font-medium">{result.agentName}</span>
                    {result.executionTime && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {result.executionTime}ms
                      </span>
                    )}
                  </div>
                  {result.error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                  ) : (
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto">
                      {result.result}
                    </pre>
                  )}
                </div>
              ))}

              {/* 对比分析 */}
              {results.comparison && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="font-medium mb-2">对比分析</h3>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {results.comparison}
                  </pre>
                </div>
              )}

              {/* 建议 */}
              {results.recommendations && results.recommendations.length > 0 && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="font-medium mb-2">建议</h3>
                  <ul className="space-y-1">
                    {results.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiAgentExecutor;
