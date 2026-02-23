import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Bot,
  RefreshCw,
  Download,
  Copy,
  Check
} from 'lucide-react';

/**
 * Agent 结果查看器组件
 * 用于查看和比较多 Agent 执行结果
 */
const AgentResultViewer = ({ taskId, onClose }) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskResults();
    }
  }, [taskId]);

  const fetchTaskResults = async () => {
    try {
      const response = await fetch(`/api/agents/tasks/${taskId}/results`);
      if (!response.ok) throw new Error('获取结果失败');
      const data = await response.json();
      setTask(data);
    } catch (error) {
      console.error('获取结果失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (task?.aggregatedResult) {
      navigator.clipboard.writeText(task.aggregatedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (task?.aggregatedResult) {
      const blob = new Blob([task.aggregatedResult], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-results-${taskId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            执行结果
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="复制"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="下载"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {task.agentResults?.filter(r => !r.error).length || 0}
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">成功</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {task.agentResults?.filter(r => r.error).length || 0}
              </div>
              <div className="text-sm text-red-700 dark:text-red-400">失败</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {task.agentResults?.length || 0}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-400">总计</div>
            </div>
          </div>

          {/* Agent 结果列表 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Agent 执行结果
            </h3>
            
            {task.agentResults?.map((result, idx) => (
              <div
                key={idx}
                className={`p-4 border rounded-lg ${
                  result.error
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                    {result.error ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {result.agentName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {result.agentId}
                    </div>
                  </div>
                  {result.executionTime && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {result.executionTime}ms
                    </div>
                  )}
                </div>
                
                {result.error ? (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {result.error}
                  </div>
                ) : (
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded max-h-48 overflow-y-auto">
                    {result.result}
                  </pre>
                )}
              </div>
            ))}
          </div>

          {/* 对比分析 */}
          {task.comparison && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                对比分析
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {task.comparison}
                </pre>
              </div>
            </div>
          )}

          {/* 建议 */}
          {task.recommendations && task.recommendations.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                建议
              </h3>
              <div className="space-y-2">
                {task.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentResultViewer;
