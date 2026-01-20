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
  GitPullRequest, Cpu
} from 'lucide-react';

const NodeLibrary = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

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
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {category}
            </h3>
            <div className="space-y-2">
              {nodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.type}
                    onDragStart={(event) => onDragStart(event, node.type)}
                    draggable
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-grab transition-colors border border-gray-600 hover:border-gray-500"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${node.color}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-400">
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
        <h3 className="text-sm font-semibold text-white mb-2">快捷提示</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 拖拽节点到画布添加</li>
          <li>• 点击节点边缘创建连线</li>
          <li>• 双击节点编辑属性</li>
          <li>• Delete 键删除选中节点</li>
          <li>• Ctrl+C/V 复制粘贴</li>
        </ul>
      </div>
    </div>
  );
};

export default NodeLibrary;