/**
 * Node Library Component
 * 节点库，提供可拖拽的节点类型
 */

import React from 'react';
import {
  Play, GitBranch, MessageSquare,
  Settings, HelpCircle, Bot,
  Zap, Code, Database, FileText,
  Terminal, Search, Edit3, Folder,
  GitPullRequest, Cpu, StopCircle, Sparkles
} from 'lucide-react';

const NodeLibrary = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // 节点类型定义 - 按照 cc-wf-studio 风格分类
  const nodeTypes = [
    // Basic Nodes (基础节点)
    {
      type: 'start',
      label: '开始',
      description: '工作流入口点',
      icon: Play,
      color: 'bg-green-500',
      category: '基础节点'
    },
    {
      type: 'end',
      label: '结束',
      description: '工作流结束点',
      icon: StopCircle,
      color: 'bg-red-500',
      category: '基础节点'
    },
    {
      type: 'prompt',
      label: '提示词',
      description: 'AI 处理任务',
      icon: MessageSquare,
      color: 'bg-purple-500',
      category: '基础节点'
    },
    {
      type: 'subAgent',
      label: '子代理',
      description: '调用子代理',
      icon: Bot,
      color: 'bg-purple-400',
      category: '基础节点'
    },
    // Control Flow (控制流)
    {
      type: 'condition',
      label: '条件判断',
      description: '根据条件分支',
      icon: GitBranch,
      color: 'bg-blue-500',
      category: '控制流'
    },
    {
      type: 'askUser',
      label: '询问用户',
      description: '等待用户输入',
      icon: HelpCircle,
      color: 'bg-yellow-500',
      category: '控制流'
    },
    // Integration (集成节点)
    {
      type: 'skill',
      label: '技能',
      description: 'Claude Code Skills',
      icon: Sparkles,
      color: 'bg-pink-500',
      category: '集成节点'
    },
    {
      type: 'mcp',
      label: 'MCP 工具',
      description: 'Model Context Protocol',
      icon: Cpu,
      color: 'bg-cyan-500',
      category: '集成节点'
    },
    // Actions (动作节点)
    {
      type: 'action',
      label: '执行动作',
      description: '执行操作',
      icon: Zap,
      color: 'bg-orange-500',
      category: '动作节点'
    },
    {
      type: 'shell',
      label: 'Shell 命令',
      description: '执行终端命令',
      icon: Terminal,
      color: 'bg-gray-500',
      category: '动作节点'
    },
    // File Operations (文件操作)
    {
      type: 'readFile',
      label: '读取文件',
      description: '读取文件内容',
      icon: FileText,
      color: 'bg-teal-500',
      category: '文件操作'
    },
    {
      type: 'writeFile',
      label: '写入文件',
      description: '写入文件内容',
      icon: Edit3,
      color: 'bg-teal-600',
      category: '文件操作'
    },
    {
      type: 'searchFiles',
      label: '搜索文件',
      description: '搜索项目文件',
      icon: Search,
      color: 'bg-teal-700',
      category: '文件操作'
    },
    // Git Operations (Git 操作)
    {
      type: 'gitCommit',
      label: 'Git 提交',
      description: '提交代码',
      icon: GitPullRequest,
      color: 'bg-emerald-500',
      category: 'Git 操作'
    },
    {
      type: 'gitBranch',
      label: 'Git 分支',
      description: '切换/创建分支',
      icon: GitBranch,
      color: 'bg-emerald-600',
      category: 'Git 操作'
    },
  ];

  // 按类别分组节点
  const categorizedNodes = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-1">节点库</h2>
        <p className="text-xs text-gray-400">拖拽节点到画布</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(categorizedNodes).map(([category, nodes]) => (
          <div key={category} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                {category}
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {nodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.type}
                    onDragStart={(event) => onDragStart(event, node.type)}
                    draggable
                    className="p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg cursor-grab transition-all duration-200 border border-gray-600 hover:border-gray-500 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${node.color} shadow-sm`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 快捷提示 */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
          <span className="text-blue-400 mr-2">💡</span>
          快捷提示
        </h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>拖拽节点到画布添加</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>点击节点编辑属性</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>从节点边缘拖拽创建连线</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>Delete 键删除选中节点</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>使用 AI 优化功能迭代改进</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NodeLibrary;
