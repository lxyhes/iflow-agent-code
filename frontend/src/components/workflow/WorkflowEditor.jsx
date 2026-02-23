import React, { useState, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Download, 
  Upload,
  Zap,
  Bot,
  GitBranch,
  Tool,
  CheckCircle,
  FileText,
  X,
  Settings,
  Users
} from 'lucide-react';

/**
 * 简化版工作流编辑器组件
 * 支持节点拖拽、连接、配置
 */
const WorkflowEditor = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectionStart, setConnectionStart] = useState(null);
  const canvasRef = useRef(null);

  // 节点类型定义
  const nodeTypes = [
    { type: 'trigger', label: '触发器', icon: Zap, color: 'bg-green-500' },
    { type: 'prompt', label: '提示词', icon: FileText, color: 'bg-blue-500' },
    { type: 'agent', label: 'Agent', icon: Bot, color: 'bg-purple-500' },
    { type: 'condition', label: '条件', icon: GitBranch, color: 'bg-yellow-500' },
    { type: 'tool', label: '工具', icon: Tool, color: 'bg-orange-500' },
    { type: 'approval', label: '人工确认', icon: CheckCircle, color: 'bg-teal-500' },
    { type: 'output', label: '输出', icon: Users, color: 'bg-pink-500' },
  ];

  // 添加节点
  const addNode = useCallback((nodeType) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeType.type,
      label: nodeType.label,
      x: 100 + nodes.length * 50,
      y: 100 + nodes.length * 30,
      config: {},
    };
    setNodes([...nodes, newNode]);
  }, [nodes]);

  // 更新节点位置
  const updateNodePosition = useCallback((nodeId, x, y) => {
    setNodes(nodes.map(node => 
      node.id === nodeId ? { ...node, x, y } : node
    ));
  }, [nodes]);

  // 删除节点
  const deleteNode = useCallback((nodeId) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [nodes, edges]);

  // 开始连接
  const startConnection = useCallback((nodeId) => {
    setConnectionStart(nodeId);
  }, []);

  // 完成连接
  const completeConnection = useCallback((targetNodeId) => {
    if (connectionStart && connectionStart !== targetNodeId) {
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: connectionStart,
        target: targetNodeId,
      };
      setEdges([...edges, newEdge]);
    }
    setConnectionStart(null);
  }, [connectionStart, edges]);

  // 保存工作流
  const saveWorkflow = useCallback(() => {
    const workflow = { nodes, edges };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // 加载工作流
  const loadWorkflow = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target.result);
          setNodes(workflow.nodes || []);
          setEdges(workflow.edges || []);
        } catch (err) {
          alert('加载工作流失败：' + err.message);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // 节点拖拽处理
  const handleNodeMouseDown = (e, node) => {
    setIsDragging(true);
    setSelectedNode(node);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging && selectedNode) {
      updateNodePosition(
        selectedNode.id,
        e.clientX - dragOffset.x,
        e.clientY - dragOffset.y
      );
    }
  }, [isDragging, selectedNode, dragOffset, updateNodePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            工作流编辑器
          </h1>
          <div className="flex gap-2">
            <button
              onClick={saveWorkflow}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
            <label className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              加载
              <input type="file" accept=".json" onChange={loadWorkflow} className="hidden" />
            </label>
          </div>
        </div>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
          <Play className="w-4 h-4" />
          运行工作流
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧节点库 */}
        <aside className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            节点库
          </h2>
          <div className="space-y-2">
            {nodeTypes.map((nodeType) => (
              <button
                key={nodeType.type}
                onClick={() => addNode(nodeType)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`w-8 h-8 ${nodeType.color} rounded-lg flex items-center justify-center`}>
                  <nodeType.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {nodeType.label}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* 中间画布 */}
        <main 
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-gray-900"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 网格背景 */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* 连接线 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((edge) => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              return (
                <path
                  key={edge.id}
                  d={`M ${source.x + 160} ${source.y + 40} 
                      C ${source.x + 200} ${source.y + 40}, 
                        ${target.x - 40} ${target.y + 40}, 
                        ${target.x} ${target.y + 40}`}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>
          </svg>

          {/* 节点 */}
          {nodes.map((node) => {
            const nodeType = nodeTypes.find(t => t.type === node.type);
            const Icon = nodeType?.icon || FileText;

            return (
              <div
                key={node.id}
                className={`absolute w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${
                  selectedNode?.id === node.id 
                    ? 'border-blue-500' 
                    : 'border-gray-200 dark:border-gray-700'
                } cursor-move`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
              >
                {/* 节点头部 */}
                <div className={`h-10 ${nodeType?.color || 'bg-gray-500'} rounded-t-md flex items-center px-3 gap-2`}>
                  <Icon className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white truncate">{node.label}</span>
                </div>

                {/* 节点内容 */}
                <div className="p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {node.type}
                  </div>
                </div>

                {/* 连接点 */}
                <div className="absolute -right-2 top-10 w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full cursor-crosshair hover:bg-blue-500"
                  onClick={() => startConnection(node.id)}
                />
                {connectionStart && connectionStart !== node.id && (
                  <div 
                    className="absolute -left-2 top-10 w-4 h-4 bg-green-500 rounded-full cursor-pointer"
                    onClick={() => completeConnection(node.id)}
                  />
                )}

                {/* 删除按钮 */}
                <button
                  onClick={() => deleteNode(node.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </main>

        {/* 右侧属性面板 */}
        {selectedNode && (
          <aside className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              节点属性
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  节点 ID
                </label>
                <input
                  type="text"
                  value={selectedNode.id}
                  readOnly
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  节点类型
                </label>
                <input
                  type="text"
                  value={selectedNode.type}
                  readOnly
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  位置 X
                </label>
                <input
                  type="number"
                  value={selectedNode.x}
                  onChange={(e) => updateNodePosition(selectedNode.id, parseInt(e.target.value), selectedNode.y)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  位置 Y
                </label>
                <input
                  type="number"
                  value={selectedNode.y}
                  onChange={(e) => updateNodePosition(selectedNode.id, selectedNode.x, parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  删除节点
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 底部状态栏 */}
      <footer className="h-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 text-xs text-gray-500 dark:text-gray-400">
        <div>
          节点数：{nodes.length} | 连接数：{edges.length}
        </div>
        <div>
          {connectionStart ? '点击另一个节点创建连接' : '拖拽节点移动，点击右侧连接点创建连接'}
        </div>
      </footer>
    </div>
  );
};

export default WorkflowEditor;
