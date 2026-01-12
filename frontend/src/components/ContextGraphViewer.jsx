import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Position,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { File, Function, Package, RefreshCw, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const ContextGraphViewer = ({ projectName, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // 节点类型定义
  const nodeTypes = useMemo(() => ({
    file: ({ data }) => (
      <div className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg border-2 border-blue-600">
        <div className="flex items-center gap-2">
          <File size={16} />
          <span className="text-sm font-medium">{data.label}</span>
        </div>
      </div>
    ),
    function: ({ data }) => (
      <div className="px-3 py-2 bg-green-500 text-white rounded-lg shadow-lg border-2 border-green-600">
        <div className="flex items-center gap-2">
          <Function size={14} />
          <span className="text-xs font-medium">{data.label}</span>
        </div>
      </div>
    ),
    package: ({ data }) => (
      <div className="px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg border-2 border-purple-600">
        <div className="flex items-center gap-2">
          <Package size={16} />
          <span className="text-sm font-medium">{data.label}</span>
        </div>
      </div>
    ),
  }), []);

  // 加载依赖图数据
  const loadGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectName}/context-graph?max_depth=3`);
      const data = await response.json();

      if (data.success) {
        setGraphData(data.graph);
        
        // 转换为 ReactFlow 格式
        const flowNodes = data.graph.nodes.map((node, index) => ({
          id: node.id,
          type: node.type,
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          data: {
            label: node.label,
            fullPath: node.fullPath,
            fileType: node.data?.fileType,
            language: node.data?.language,
            size: node.data?.size
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left
        }));

        const flowEdges = data.graph.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: edge.type === 'call',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 10,
            height: 10,
            color: edge.type === 'import' ? '#3b82f6' : edge.type === 'call' ? '#22c55e' : '#8b5cf6'
          },
          style: {
            stroke: edge.type === 'import' ? '#3b82f6' : edge.type === 'call' ? '#22c55e' : '#8b5cf6',
            strokeWidth: 2
          },
          label: edge.label,
          labelStyle: { fontSize: 10, fill: '#6b7280' }
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } else {
        setError(data.error || '加载依赖图失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectName, setNodes, setEdges]);

  // 刷新依赖图
  const handleRefresh = async () => {
    try {
      const response = await fetch(`/api/projects/${projectName}/context-graph/refresh`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        loadGraphData();
      } else {
        setError(data.error || '刷新失败');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 导出依赖图
  const handleExport = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}-context-graph.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 连接节点
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // 节点点击处理
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // 自动布局
  const handleAutoLayout = () => {
    // 简单的层次布局
    const newNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 5) * 250 + 50,
        y: Math.floor(index / 5) * 150 + 50
      }
    }));
    setNodes(newNodes);
  };

  // 初始加载
  useEffect(() => {
    if (projectName) {
      loadGraphData();
    }
  }, [projectName, loadGraphData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">正在分析代码依赖关系...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <File size={48} className="mx-auto" />
          </div>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadGraphData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">代码依赖关系图</h2>
          {graphData && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>文件: {graphData.metadata?.totalFiles || 0}</span>
              <span>节点: {graphData.metadata?.totalNodes || 0}</span>
              <span>边: {graphData.metadata?.totalEdges || 0}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoLayout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="自动布局"
          >
            <Maximize2 size={20} />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="导出"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-xs text-gray-400">文件</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-400">函数</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-xs text-gray-400">包</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span className="text-xs text-gray-400">导入</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-green-500"></div>
          <span className="text-xs text-gray-400">调用</span>
        </div>
      </div>

      {/* 图形区域 */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#374151" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'file') return '#3b82f6';
              if (node.type === 'function') return '#22c55e';
              if (node.type === 'package') return '#8b5cf6';
              return '#6b7280';
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
          />
        </ReactFlow>
      </div>

      {/* 节点详情面板 */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">{selectedNode.data.label}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            {selectedNode.data.fullPath && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">路径:</span>
                <span className="text-gray-300 font-mono text-xs">{selectedNode.data.fullPath}</span>
              </div>
            )}
            {selectedNode.data.fileType && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">类型:</span>
                <span className="text-gray-300">{selectedNode.data.fileType}</span>
              </div>
            )}
            {selectedNode.data.language && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">语言:</span>
                <span className="text-gray-300">{selectedNode.data.language}</span>
              </div>
            )}
            {selectedNode.data.size && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">大小:</span>
                <span className="text-gray-300">{(selectedNode.data.size / 1024).toFixed(2)} KB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextGraphViewer;