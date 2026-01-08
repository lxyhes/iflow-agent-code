/**
 * ContextVisualizer.jsx - 上下文可视化组件
 *
 * 可视化展示代码依赖关系、函数调用关系、类继承关系
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
    Position,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Network, GitBranch, Zap, FileCode, X, RefreshCw, Download, ZoomIn, ZoomOut } from 'lucide-react';

// 自定义节点组件
const CustomNode = ({ data, onNodeClick }) => {
    const Icon = data.type === 'module' ? FileCode :
                  data.type === 'function' ? Zap :
                  data.type === 'class' ? GitBranch : Network;

    const getNodeStyle = (type) => {
        const styles = {
            module: {
                background: '#3b82f6',
                color: '#fff',
                border: '2px solid #1d4ed8',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '150px',
                textAlign: 'center'
            },
            function: {
                background: '#10b981',
                color: '#fff',
                border: '2px solid #059669',
                borderRadius: '6px',
                padding: '8px',
                minWidth: '120px',
                textAlign: 'center'
            },
            class: {
                background: '#8b5cf6',
                color: '#fff',
                border: '2px solid #7c3aed',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '150px',
                textAlign: 'center'
            }
        };
        return styles[type] || styles.module;
    };

    return (
        <div
            className="custom-node relative"
            style={getNodeStyle(data.type)}
            onClick={(e) => onNodeClick(e, { data })}
        >
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#555' }}
            />
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{data.label}</span>
            </div>
            {data.file_path && (
                <div className="text-xs opacity-75 mt-1 truncate">
                    {data.file_path}
                </div>
            )}
            <Handle
                type="source"
                position={Position.Right}
                style={{ background: '#555' }}
            />
        </div>
    );
};

// 节点类型配置
const nodeTypes = {
    custom: CustomNode
};

const ContextVisualizer = ({ projectPath, visible, onClose, onNodeClick }) => {
    const [viewType, setViewType] = useState('dependency'); // 'dependency', 'call', 'class'
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // React Flow 状态
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // 节点点击事件
    const handleNodeClick = useCallback((event, node) => {
        if (onNodeClick) {
            onNodeClick(node.data);
        }
    }, [onNodeClick]);

    // 连接边
    const onConnect = useCallback((params) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

    // 获取节点样式
    const getNodeStyle = (type) => {
        const styles = {
            module: {
                background: '#3b82f6',
                color: '#fff',
                border: '2px solid #1d4ed8',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '150px',
                textAlign: 'center'
            },
            function: {
                background: '#10b981',
                color: '#fff',
                border: '2px solid #059669',
                borderRadius: '6px',
                padding: '8px',
                minWidth: '120px',
                textAlign: 'center'
            },
            class: {
                background: '#8b5cf6',
                color: '#fff',
                border: '2px solid #7c3aed',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '150px',
                textAlign: 'center'
            }
        };
        return styles[type] || styles.module;
    };

    // 获取边颜色
    const getEdgeColor = (type) => {
        const colors = {
            import: '#3b82f6',
            from_import: '#60a5fa',
            call: '#f59e0b',
            inheritance: '#8b5cf6'
        };
        return colors[type] || '#94a3b8';
    };

    // 转换数据为图形格式
    const transformToGraph = useCallback((graphData) => {
        console.log('[ContextVisualizer] 转换图形数据:', graphData);

        const newNodes = graphData.nodes.map((node, index) => ({
            id: node.id,
            type: 'custom',
            position: {
                x: (index % 5) * 200,
                y: Math.floor(index / 5) * 150
            },
            data: {
                label: node.label,
                type: node.type,
                file_path: node.file_path,
                module: node.module,
                line: node.line,
                is_async: node.is_async,
                is_method: node.is_method,
                class_name: node.class_name,
                methods: node.methods,
                attributes: node.attributes,
                onNodeClick: handleNodeClick
            },
            style: getNodeStyle(node.type)
        }));

        const newEdges = graphData.edges.map((edge, index) => ({
            id: `edge-${index}`,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: edge.type === 'call',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: getEdgeColor(edge.type)
            },
            style: {
                stroke: getEdgeColor(edge.type),
                strokeWidth: 2
            },
            label: edge.type,
            labelStyle: {
                fontSize: 10,
                fontWeight: 500
            }
        }));

        console.log('[ContextVisualizer] 创建节点:', newNodes.length, '边:', newEdges.length);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [setNodes, setEdges, handleNodeClick]);

    // 分析项目上下文
    const analyzeContext = useCallback(async () => {
        if (!projectPath) {
            setError('项目路径不能为空');
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            console.log('[ContextVisualizer] 开始分析项目:', projectPath);
            const response = await fetch('/api/context/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectPath: projectPath,
                    includeDirs: []
                })
            });

            const result = await response.json();
            console.log('[ContextVisualizer] 分析结果:', result);

            if (result.success) {
                setData(result.data);
                // 默认显示依赖图
                if (result.data.dependency_graph) {
                    transformToGraph(result.data.dependency_graph);
                } else {
                    setError('没有找到依赖图数据');
                }
            } else {
                setError(result.error || '分析失败');
            }
        } catch (err) {
            console.error('[ContextVisualizer] 分析错误:', err);
            setError(`分析失败: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    }, [projectPath, transformToGraph]);

    // 切换视图类型
    const switchView = (type) => {
        setViewType(type);
        if (data) {
            const graphData = data[`${type}_graph`];
            if (graphData) {
                transformToGraph(graphData);
            }
        }
    };

    // 组件挂载时自动分析
    useEffect(() => {
        console.log('[ContextVisualizer] 组件状态:', { visible, projectPath });
        if (visible && projectPath) {
            analyzeContext();
        }
    }, [visible, projectPath, analyzeContext]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
                {/* 头部 */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Network className="w-6 h-6 text-white" />
                        <h2 className="text-xl font-bold text-white">上下文可视化</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* 工具栏 */}
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => switchView('dependency')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                viewType === 'dependency'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            <GitBranch className="w-4 h-4" />
                            依赖关系
                        </button>
                        <button
                            onClick={() => switchView('call')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                viewType === 'call'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                            调用关系
                        </button>
                        <button
                            onClick={() => switchView('class')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                viewType === 'class'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            <FileCode className="w-4 h-4" />
                            类继承
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={analyzeContext}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isAnalyzing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    分析中...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    重新分析
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                    {isAnalyzing ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">正在分析项目...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-500 mb-2">{error}</p>
                                <button
                                    onClick={analyzeContext}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    重试
                                </button>
                            </div>
                        </div>
                    ) : data && nodes.length > 0 ? (
                        <div style={{ width: '100%', height: '100%' }}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeClick={handleNodeClick}
                                nodeTypes={nodeTypes}
                                fitView
                                style={{ width: '100%', height: '100%' }}
                            >
                                <Background />
                                <Controls />
                                <MiniMap
                                    nodeColor={(node) => {
                                        const colors = {
                                            module: '#3b82f6',
                                            function: '#10b981',
                                            class: '#8b5cf6'
                                        };
                                        return colors[node.data.type] || '#94a3b8';
                                    }}
                                />
                            </ReactFlow>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">暂无数据</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    data: {data ? '存在' : '不存在'}, nodes: {nodes.length}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 图例 */}
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">模块</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">函数</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-purple-500 rounded"></div>
                            <span className="text-gray-700 dark:text-gray-300">类</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-blue-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">导入</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-yellow-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">调用</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-purple-500"></div>
                            <span className="text-gray-700 dark:text-gray-300">继承</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContextVisualizer;