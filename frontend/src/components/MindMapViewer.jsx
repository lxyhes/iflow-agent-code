import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Clock, XCircle } from 'lucide-react';
import { parseMarkdownToMindMap, parseTaskList, getTaskStatusColor } from '../utils/mindMapParser';

export function MindMapViewer({ markdown, onMarkdownChange }) {
  const [viewMode, setViewMode] = useState('mindmap'); // 'markdown' or 'mindmap'
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // 解析任务列表
  const tasks = parseTaskList(markdown || '');

  // 解析思维导图结构
  const mindMapData = parseMarkdownToMindMap(markdown || '');

  // 构建树形结构
  const treeStructure = buildTreeStructure(mindMapData.nodes, mindMapData.edges);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = level * 24;

    return (
      <div key={node.id} style={{ paddingLeft }}>
        <div
          className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          style={{
            backgroundColor: node.data.level === 1 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            borderLeft: node.data.level === 1 ? '3px solid #6366f1' : 'none'
          }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            <span className="text-gray-400">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          
          <span
            className="font-medium"
            style={{
              color: node.data.level === 1 ? '#6366f1' : 'inherit',
              fontSize: `${16 - node.data.level}px`
            }}
          >
            {node.data.label}
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderTaskList = () => {
    return (
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="mt-0.5">
              {task.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : task.status === 'in-progress' ? (
                <Clock className="w-5 h-5 text-blue-500" />
              ) : task.status === 'blocked' ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <span
              className={`flex-1 text-sm ${
                task.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {task.text}
            </span>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>没有找到任务列表</p>
            <p className="text-xs mt-2">使用 "- [ ] 任务名称" 格式添加任务</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">思维导图</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('mindmap')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'mindmap'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            树形视图
          </button>
          <button
            onClick={() => setViewMode('tasklist')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'tasklist'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            任务列表
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'mindmap' ? (
          <div className="space-y-1">
            {treeStructure.length > 0 ? (
              treeStructure.map(node => renderTreeNode(node))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>没有找到思维导图结构</p>
                <p className="text-xs mt-2">使用 Markdown 标题 (# ## ###) 创建层级结构</p>
              </div>
            )}
          </div>
        ) : (
          renderTaskList()
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tasks.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">总任务</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {tasks.filter(t => t.completed).length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">已完成</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {tasks.filter(t => !t.completed).length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">进行中</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTreeStructure(nodes, edges) {
  const nodeMap = new Map();
  const rootNodes = [];

  // 创建节点映射
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // 构建父子关系
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);

    if (parent && child) {
      parent.children.push(child);
    }
  });

  // 提取根节点（level 1）
  nodeMap.forEach(node => {
    if (node.data.level === 1) {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

export default MindMapViewer;