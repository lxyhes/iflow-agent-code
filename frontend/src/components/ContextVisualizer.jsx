/**
 * ContextVisualizer.jsx - 代码依赖关系可视化组件
 *
 * 使用 ReactFlow 可视化代码的函数调用、类继承、模块导入等关系
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, File, Code, Box, Zap, RefreshCw, Filter, Search, Maximize2, Minimize2 } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

const ContextVisualizer = ({ projectPath, visible, onClose, onFileClick }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 加载依赖关系数据
    const loadDependencies = useCallback(async () => {
        if (!projectPath || !visible) return;

        setLoading(true);
        setError(null);

        try {
            const response = await authenticatedFetch('/api/context/analyze-dependencies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectPath: projectPath
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStats(data.data.stats);
                    transformToReactFlow(data.data);
                } else {
                    setError(data.error || '加载依赖关系失败');
                }
            } else {
                setError('加载依赖关系失败');
            }
        } catch (err) {
            setError(`加载依赖关系失败: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [projectPath, visible]);

    // 将后端数据转换为 ReactFlow 格式
    const transformToReactFlow = (data) => {
        const flowNodes = data.nodes.map((node, index) => {
            const type = node.type;
            let icon = <Box className="w-4 h-4" />;
            let color = '#6366f1';

            switch (type) {
                case 'file':
                    icon = <File className="w-4 h-4" />;
                    color = '#8b5cf6';
                    break;
                case 'class':
                    icon = <Code className="w-4 h-4" />;
                    color = '#ec4899';
                    break;
                case 'function':
                    icon = <Zap className="w-4 h-4" />;
                    color = '#10b981';
                    break;
                case 'module':
                    icon = <Network className="w-4 h-4" />;
                    color = '#f59e0b';
                    break;
            }

            return {
                id: node.id,
                type: 'custom',
                position: {
                    x: (index % 5) * 300,
                    y: Math.floor(index / 5) * 150
                },
                data: {
                    label: node.label,
                    type: node.type,
                    language: node.language,
                    path: node.path,
                    icon: icon,
                    color: color,
                    onClick: () => handleNodeClick(node)
                },
                style: {
                    background: 'white',
                    border: `2px solid ${color}`,
                    borderRadius: '8px',
                    width: 200,
                    height: 60,
                    fontSize: '12px'
                }
            };
        });

        const flowEdges = data.edges.map((edge, index) => {
            let animated = false;
            let strokeColor = '#94a3b8';

            switch (edge.type) {
                case 'import':
                    strokeColor = '#f59e0b';
                    animated = true;
                    break;
                case 'extends':
                    strokeColor = '#ec4899';
                    break;
                case 'calls':
                    strokeColor = '#10b981';
                    animated = true;
                    break;
                case 'contains':
                    strokeColor = '#6366f1';
                    break;
            }

            return {
                id: `edge-${index}`,
                source: edge.source,
                target: edge.target,
                type: 'smoothstep',
                animated: animated,
                style: { stroke: strokeColor, strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: strokeColor,
                },
                label: edge.label,
                labelStyle: { fontSize: 10, fill: '#64748b' }
            };
        });

        setNodes(flowNodes);
        setEdges(flowEdges);
    };

    // 处理节点点击
    const handleNodeClick = useCallback((node) => {
        if (onFileClick && node.path) {
            onFileClick(node.path);
        }
    }, [onFileClick]);

    // 处理连接
    const onConnect = useCallback((params) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

    // 过滤节点和边
    const filteredNodes = useMemo(() => {
        if (filterType === 'all' && !searchQuery) return nodes;

        return nodes.filter(node => {
            const matchesType = filterType === 'all' || node.data.type === filterType;
            const matchesSearch = !searchQuery || 
                node.data.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (node.data.path && node.data.path.toLowerCase().includes(searchQuery.toLowerCase()));
            
            return matchesType && matchesSearch;
        });
    }, [nodes, filterType, searchQuery]);

    const filteredEdges = useMemo(() => {
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        return edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    }, [edges, filteredNodes]);

    // 自定义节点组件
    const CustomNode = ({ data }) => {
        return (
            <div
                className="custom-node"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'white',
                    border: `2px solid ${data.color}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
                onClick={data.onClick}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${data.color}40`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <div style={{ color: data.color }}>
                    {data.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {data.label}
                    </div>
                    {data.path && (
                        <div style={{ 
                            fontSize: '10px', 
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {data.path}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 节点类型映射
    const nodeTypes = useMemo(() => ({
        custom: CustomNode,
    }), []);

    // 加载数据
    useEffect(() => {
        loadDependencies();
    }, [loadDependencies]);

    if (!visible) return null;

    return (
        <div className={`context-visualizer ${isFullscreen ? 'fullscreen' : ''}`}>
            <div className="context-visualizer-header">
                <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        代码依赖关系
                    </h2>
                    {stats && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            ({stats.total_files} 文件, {stats.total_nodes} 节点, {stats.total_edges} 关系)
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* 搜索框 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索节点..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            style={{ width: '200px' }}
                        />
                    </div>

                    {/* 过滤器 */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">全部类型</option>
                        <option value="file">文件</option>
                        <option value="class">类</option>
                        <option value="function">函数</option>
                        <option value="module">模块</option>
                    </select>

                    {/* 刷新按钮 */}
                    <button
                        onClick={loadDependencies}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="刷新"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* 全屏按钮 */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title={isFullscreen ? "退出全屏" : "全屏"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        ) : (
                            <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                    </button>

                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="关闭"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {loading && (
                <div className="context-visualizer-loading">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
                </div>
            )}

            {error && (
                <div className="context-visualizer-error">
                    <span className="text-red-600 dark:text-red-400">{error}</span>
                </div>
            )}

            {!loading && !error && (
                <div className="context-visualizer-content">
                    <ReactFlow
                        nodes={filteredNodes}
                        edges={filteredEdges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-left"
                    >
                        <Background color="#aaa" gap={16} />
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => node.data.color}
                            nodeStrokeWidth={3}
                            zoomable
                            pannable
                        />
                    </ReactFlow>
                </div>
            )}

            {/* 图例 */}
            {!loading && !error && (
                <div className="context-visualizer-legend">
                    <div className="legend-title">图例</div>
                    <div className="legend-items">
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: '#8b5cf6' }}></div>
                            <span>文件</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: '#ec4899' }}></div>
                            <span>类</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: '#10b981' }}></div>
                            <span>函数</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
                            <span>模块</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextVisualizer;