/**
 * Node Library Component
 * 节点库，提供可拖拽的节点类型
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, GitBranch, MessageSquare,
  HelpCircle, Bot,
  Zap, FileText,
  Terminal, Search, Edit3,
  GitPullRequest, Cpu, StopCircle, Sparkles,
  ChevronDown, ChevronRight, Info
} from 'lucide-react';

const NodeLibrary = ({ showHeader = true, showFooter = true, showSearch = true, autoFocusSearch = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!autoFocusSearch) return;
    if (!searchInputRef.current) return;
    const t = setTimeout(() => searchInputRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [autoFocusSearch]);

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

  const filteredNodeTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return nodeTypes;
    return nodeTypes.filter((node) => {
      return (
        node.label.toLowerCase().includes(q) ||
        node.description.toLowerCase().includes(q) ||
        node.category.toLowerCase().includes(q) ||
        node.type.toLowerCase().includes(q)
      );
    });
  }, [nodeTypes, searchQuery]);

  const categorizedNodes = useMemo(() => {
    return filteredNodeTypes.reduce((acc, node) => {
      if (!acc[node.category]) {
        acc[node.category] = [];
      }
      acc[node.category].push(node);
      return acc;
    }, {});
  }, [filteredNodeTypes]);

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/60 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">节点库</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">拖拽节点到画布</p>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {filteredNodeTypes.length} 项
            </div>
          </div>

          {showSearch && (
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索节点..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!showHeader && showSearch && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索节点..."
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.keys(categorizedNodes).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">没有匹配的节点</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">试试换个关键词</p>
            </div>
          </div>
        ) : (
          Object.entries(categorizedNodes).map(([category, nodes]) => {
            const isCollapsed = collapsedCategories[category];
            return (
              <div key={category} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
                  }
                  className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{category}</h3>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    {nodes.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {nodes.map((node) => {
                      const Icon = node.icon;
                      return (
                        <div
                          key={node.type}
                          onDragStart={(event) => onDragStart(event, node.type)}
                          draggable
                          className="p-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-2xl cursor-grab transition-all duration-200 shadow-sm hover:shadow dark:bg-gray-900/40 dark:hover:bg-gray-900/70 dark:border-gray-800 dark:hover:border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-2xl ${node.color} shadow-sm`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {node.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {node.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 快捷提示 */}
      {showFooter && (
        <div className="p-4 bg-gradient-to-t from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/60 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            快捷提示
          </h3>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
              <span>拖拽节点到画布添加</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
              <span>点击节点编辑属性</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
              <span>从节点边缘拖拽创建连线</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
              <span>Delete 键删除选中节点</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
              <span>使用 AI 优化功能迭代改进</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default NodeLibrary;
