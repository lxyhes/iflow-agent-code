import React, { useState, useEffect } from 'react';
import { Tool, Play, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * MCP 工具浏览器组件
 */
const McpToolBrowser = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/mcp/tools');
      if (!response.ok) throw new Error('获取工具失败');
      const data = await response.json();
      setTools(data.tools || getMockTools());
    } catch (error) {
      console.error('获取工具失败:', error);
      setTools(getMockTools());
    } finally {
      setLoading(false);
    }
  };

  const getMockTools = () => [
    { id: 1, name: 'github.get_pr', server: 'GitHub MCP', description: '获取 Pull Request 详情' },
    { id: 2, name: 'github.create_comment', server: 'GitHub MCP', description: '创建 PR 评论' },
    { id: 3, name: 'filesystem.read_file', server: 'FileSystem MCP', description: '读取文件内容' },
    { id: 4, name: 'filesystem.write_file', server: 'FileSystem MCP', description: '写入文件' },
  ];

  const handleExecuteTool = async (tool) => {
    setExecuting(tool.id);
    try {
      const response = await fetch('/api/mcp/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: tool.name, input: {} }),
      });
      if (!response.ok) throw new Error('执行失败');
      const data = await response.json();
      setResult({ tool: tool.name, success: true, output: data.output });
    } catch (error) {
      setResult({ tool: tool.name, success: false, error: error.message });
    } finally {
      setExecuting(null);
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
        MCP 工具浏览器
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        {tools.map(tool => (
          <div
            key={tool.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Tool className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {tool.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tool.server}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {tool.description}
            </p>
            <button
              onClick={() => handleExecuteTool(tool)}
              disabled={executing === tool.id}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {executing === tool.id ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  执行中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  执行工具
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {result && (
        <div className={`mt-6 p-4 rounded-lg ${
          result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">
              {result.success ? '执行成功' : '执行失败'}
            </span>
          </div>
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {result.success ? JSON.stringify(result.output, null, 2) : result.error}
          </pre>
        </div>
      )}
    </div>
  );
};

export default McpToolBrowser;
