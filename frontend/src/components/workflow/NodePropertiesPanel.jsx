/**
 * Node Properties Panel
 * 节点属性编辑面板
 */

import React, { useState, useEffect } from 'react';
import {
  X, Settings, MessageSquare, GitBranch,
  Cpu, Sparkles,
  Save, Plus, Trash2
} from 'lucide-react';

const NodePropertiesPanel = ({ node, onUpdate, onClose, mcpServers = [] }) => {
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [gitCommand, setGitCommand] = useState('');
  const [command, setCommand] = useState('');
  const [selectedMcpServer, setSelectedMcpServer] = useState('');
  const [selectedMcpTool, setSelectedMcpTool] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [variables, setVariables] = useState([]);
  const [newVariable, setNewVariable] = useState({ name: '', defaultValue: '' });

  useEffect(() => {
    if (node) {
      setLabel(node.data?.label || '');
      setPrompt(node.data?.prompt || '');
      setCondition(node.data?.condition || '');
      setAction(node.data?.action || '');
      setFilePath(node.data?.filePath || '');
      setFileContent(node.data?.content || '');
      setSearchQuery(node.data?.searchQuery || '');
      setGitCommand(node.data?.gitCommand || '');
      setCommand(node.data?.command || '');
      setSelectedMcpServer(node.data?.mcpServer || '');
      setSelectedMcpTool(node.data?.mcpTool || '');
      setSelectedSkill(node.data?.skill || '');
      setVariables(node.data?.variables || []);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onUpdate({
      ...node,
      data: {
        ...node.data,
        label,
        prompt,
        condition,
        action,
        filePath,
        content: fileContent,
        searchQuery,
        gitCommand,
        command,
        mcpServer: selectedMcpServer,
        mcpTool: selectedMcpTool,
        skill: selectedSkill,
        variables,
      },
    });
    onClose();
  };

  const addVariable = () => {
    if (newVariable.name.trim()) {
      setVariables([...variables, { ...newVariable }]);
      setNewVariable({ name: '', defaultValue: '' });
    }
  };

  const removeVariable = (index) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const renderPromptNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            提示词内容
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入提示词，可以使用 {variableName} 引用变量"
            className="w-full h-32 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            提示：使用 {'{variableName}'} 语法定义变量
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Sparkles className="w-4 h-4 inline mr-1" />
            变量定义
          </label>
          <div className="space-y-2">
            {variables.map((variable, index) => {
              return (
                <div key={index} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">{`{{${variable.name}}}`}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">默认值: {variable.defaultValue || '无'}</span>
                  <button
                    onClick={() => removeVariable(index)}
                    className="ml-auto text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newVariable.name}
                onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                placeholder="变量名"
                className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                value={newVariable.defaultValue}
                onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                placeholder="默认值"
                className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={addVariable}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConditionNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <GitBranch className="w-4 h-4 inline mr-1" />
            条件表达式
          </label>
          <textarea
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="输入条件表达式，例如: issues_found || error_occurred"
            className="w-full h-24 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
    );
  };

  const renderActionNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Sparkles className="w-4 h-4 inline mr-1" />
            动作类型
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">选择动作类型</option>
            <option value="generate_fix">生成修复建议</option>
            <option value="send_notification">发送通知</option>
            <option value="log_event">记录日志</option>
            <option value="create_file">创建文件</option>
            <option value="run_command">运行命令</option>
          </select>
        </div>
      </div>
    );
  };

  const renderFileReadNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            文件路径
          </label>
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="例如：src/App.jsx"
            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">提示：建议填写相对项目根目录的路径</p>
        </div>
      </div>
    );
  };

  const renderFileWriteNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            文件路径
          </label>
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="例如：README.md"
            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            写入内容
          </label>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            placeholder="写入到文件的内容（可留空）"
            className="w-full h-28 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>
      </div>
    );
  };

  const renderSearchNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            搜索关键词
          </label>
          <textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="例如：authentication header / validateWorkflow"
            className="w-full h-24 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>
      </div>
    );
  };

  const renderGitNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Git 命令
          </label>
          <textarea
            value={gitCommand}
            onChange={(e) => setGitCommand(e.target.value)}
            placeholder={'例如：status / diff / checkout main / commit -m "msg"'}
            className="w-full h-24 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">提示：这里是高层指令，执行器会以 Agent 方式尝试完成</p>
        </div>
      </div>
    );
  };

  const renderShellNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shell 命令
          </label>
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="例如：npm test / python -m pytest"
            className="w-full h-24 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
          />
        </div>
      </div>
    );
  };

  const renderMcpNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Cpu className="w-4 h-4 inline mr-1" />
            MCP 服务器
          </label>
          <select
            value={selectedMcpServer}
            onChange={(e) => setSelectedMcpServer(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">选择 MCP 服务器</option>
            {mcpServers.map((server) => (
              <option key={server.name} value={server.name}>
                {server.name}
              </option>
            ))}
          </select>
        </div>

        {selectedMcpServer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              MCP 工具
            </label>
            <select
              value={selectedMcpTool}
              onChange={(e) => setSelectedMcpTool(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">选择 MCP 工具</option>
              <option value="tool1">工具 1</option>
              <option value="tool2">工具 2</option>
            </select>
          </div>
        )}
      </div>
    );
  };

  const renderSkillNode = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Sparkles className="w-4 h-4 inline mr-1" />
            选择 Skill
          </label>
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">选择 Skill</option>
            <option value="pdf-analyzer">PDF 分析器</option>
            <option value="code-reviewer">代码审查</option>
            <option value="document-summarizer">文档摘要</option>
          </select>
        </div>
        <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl">
          <Plus className="w-4 h-4" />
          <span>创建新 Skill</span>
        </button>
      </div>
    );
  };

  const renderBasicNode = () => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          此节点类型不需要额外配置。
        </p>
      </div>
    );
  };

  const renderContent = () => {
    switch (node.type) {
      case 'prompt':
        return renderPromptNode();
      case 'condition':
        return renderConditionNode();
      case 'action':
        return renderActionNode();
      case 'readFile':
      case 'fileRead':
        return renderFileReadNode();
      case 'writeFile':
      case 'fileWrite':
        return renderFileWriteNode();
      case 'searchFiles':
      case 'search':
        return renderSearchNode();
      case 'gitCommit':
      case 'gitBranch':
      case 'git':
        return renderGitNode();
      case 'shell':
        return renderShellNode();
      case 'mcp':
        return renderMcpNode();
      case 'skill':
        return renderSkillNode();
      default:
        return renderBasicNode();
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">节点属性</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 节点类型标签 */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">节点类型</span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 capitalize">{node.type}</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            节点名称
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {renderContent()}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center space-x-2 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>保存</span>
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
