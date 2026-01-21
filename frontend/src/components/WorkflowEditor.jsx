/**
 * Workflow Editor Component
 * 可视化工作流编辑器，支持拖拽节点、连线、AI 辅助生成
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Save, Play, Trash2, RefreshCw,
  Sparkles, Download, Upload, ChevronDown, CheckCircle,
  LayoutGrid, PanelLeft, X
} from 'lucide-react';
import NodeLibrary from './workflow/NodeLibrary';
import { nodeTypes } from './workflow/CustomNodes';
import NodePropertiesPanel from './workflow/NodePropertiesPanel';
import AiRefinementDialog from './workflow/AiRefinementDialog';
import WorkflowValidationPanel from './workflow/WorkflowValidationPanel';
import { authenticatedFetch } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import {
  downloadIFlowFile,
  validateWorkflow,
  downloadClaudeAgentFile,
  downloadClaudeCommandFile
} from '../utils/iflowWorkflowExporter';
import { validateWorkflow as validateWorkflowStructure } from '../utils/workflowValidator';

const SAMPLE_NODES = [
  {
    id: '1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: '开始' },
  },
  {
    id: '2',
    type: 'prompt',
    position: { x: 250, y: 150 },
    data: {
      label: '分析代码',
      prompt: '请分析以下代码的质量和潜在问题'
    },
  },
  {
    id: '3',
    type: 'condition',
    position: { x: 250, y: 280 },
    data: {
      label: '是否有问题?',
      condition: 'issues_found'
    },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 100, y: 400 },
    data: {
      label: '生成修复建议',
      action: 'generate_fix'
    },
  },
  {
    id: '5',
    type: 'end',
    position: { x: 400, y: 400 },
    data: { label: '结束' },
  },
];

const SAMPLE_EDGES = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true, label: '是' },
  { id: 'e3-5', source: '3', target: '5', animated: true, label: '否' },
];

const WorkflowEditor = ({ projectName, selectedProject }) => {
  const toast = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showAiRefinementDialog, setShowAiRefinementDialog] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [executionStats, setExecutionStats] = useState({
    stepsTotal: 0,
    stepsCompleted: 0,
    currentStepIndex: -1,
    currentNodeId: null,
    currentNodeLabel: null,
  });
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const exportMenuRef = useRef(null);
  const eventSourceRef = useRef(null);
  const lastExecutingNodeIdRef = useRef(null);
  const currentExecutingNodeIdRef = useRef(null);
  const [logsDock, setLogsDock] = useState('side');

  useEffect(() => {
    if (hasInitialized) return;
    if (nodes.length === 0 && edges.length === 0) {
      setNodes(SAMPLE_NODES);
      setEdges(SAMPLE_EDGES);
    }
    setHasInitialized(true);
  }, [hasInitialized, nodes.length, edges.length, setNodes, setEdges]);

  // 加载 MCP 服务器列表
  useEffect(() => {
    const loadMcpServers = async () => {
      try {
        const response = await authenticatedFetch('/api/mcp/servers');
        const data = await response.json();
        if (data.success) {
          setMcpServers(data.servers || []);
        }
      } catch (error) {
        toast.error('加载 MCP 服务器失败');
      }
    };
    loadMcpServers();
  }, [toast]);

  useEffect(() => {
    if (!showExportMenu) return;
    const onPointerDown = (e) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [showExportMenu]);

  // 节点点击处理
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowPropertiesPanel(true);
  }, []);

  // 连接节点
  const handleNodesChange = useCallback((changes) => {
    // 如果节点被删除，关闭属性面板
    if (changes.some(change => change.type === 'remove' && change.id === selectedNode?.id)) {
      setShowPropertiesPanel(false);
      setSelectedNode(null);
    }
    onNodesChange(changes);
  }, [selectedNode, onNodesChange]);

  // 节点更新处理
  const handleNodeUpdate = (updatedNode) => {
    setNodes((nds) => nds.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  };

  // 连接节点
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3b82f6',
      },
    }, eds));
  }, [setEdges]);

  // 添加节点
  const onDrop = useCallback((event) => {
    event.preventDefault();

    if (!reactFlowWrapper.current) {
      return;
    }

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    const newNode = {
      id: `${Date.now()}`,
      type: type,
      position,
      data: { label: getNodeLabel(type) },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 保存工作流
  const handleSave = async () => {
    try {
      setLoading(true);

      const workflowData = {
        project_name: projectName || 'default',
        workflow_name: workflowName || 'Untitled Workflow',
        nodes: nodes,
        edges: edges,
      };

      const response = await authenticatedFetch('/api/workflows/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('工作流保存成功');
      } else {
        toast.error(`保存失败：${data.error || '未知错误'}`);
      }
    } catch (error) {
      toast.error(`保存失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // AI 迭代优化
  const handleAiRefinement = () => {
    setShowAiRefinementDialog(true);
  };

  const handleApplyAiRefinement = (updatedWorkflow) => {
    setNodes(updatedWorkflow.nodes);
    setEdges(updatedWorkflow.edges);
  };

  // 验证工作流
  const handleValidate = () => {
    const result = validateWorkflowStructure(nodes, edges);
    setValidationResult(result);
    setShowValidationPanel(true);
  };

  // AI 生成工作流
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.warning('请输入工作流描述');
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/workflows/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: aiPrompt,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNodes(data.nodes);
        setEdges(data.edges);
        setShowAiPanel(false);
        setAiPrompt('');
        toast.success('已生成工作流');
      } else {
        toast.error(`生成失败：${data.error || '未知错误'}`);
      }
    } catch (error) {
      toast.error(`生成失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 清空画布
  const handleClear = () => {
    setConfirmDialog({
      title: '清空画布',
      message: '将删除所有节点与连线，此操作不可撤销。',
      confirmText: '清空',
      confirmVariant: 'danger',
      onConfirm: () => {
        setNodes([]);
        setEdges([]);
        setShowPropertiesPanel(false);
        setSelectedNode(null);
        toast.info('画布已清空');
      },
    });
  };

  // 导出工作流（JSON 格式）
  const handleExportJSON = () => {
    const workflowData = {
      name: workflowName,
      nodes,
      edges,
      created_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    toast.success('已导出 JSON');
  };

  // 导出为 iFlow Agent 格式
  const handleExportAgent = () => {
    const workflowData = {
      name: workflowName,
      nodes,
      edges,
      created_at: new Date().toISOString(),
    };

    // 验证工作流
    const validation = validateWorkflow(workflowData);
    if (!validation.valid) {
      setConfirmDialog({
        title: '无法导出：验证失败',
        message: validation.errors.join('\n'),
        confirmText: '知道了',
        confirmVariant: 'primary',
        onConfirm: () => {}
      });
      return;
    }

    if (validation.warnings.length > 0) {
      setConfirmDialog({
        title: '继续导出？',
        message: validation.warnings.join('\n'),
        confirmText: '继续导出',
        cancelText: '取消',
        confirmVariant: 'primary',
        onConfirm: () => {
          downloadIFlowFile(workflowData, selectedProject?.name || 'default', 'agent');
          toast.success('已导出 iFlow Agent');
        }
      });
      return;
    }

    downloadIFlowFile(workflowData, selectedProject?.name || 'default', 'agent');
    setShowExportMenu(false);
    toast.success('已导出 iFlow Agent');
  };

  // 导出为 iFlow Command 格式
  const handleExportCommand = () => {
    const workflowData = {
      name: workflowName,
      nodes,
      edges,
      created_at: new Date().toISOString(),
    };

    // 验证工作流
    const validation = validateWorkflow(workflowData);
    if (!validation.valid) {
      setConfirmDialog({
        title: '无法导出：验证失败',
        message: validation.errors.join('\n'),
        confirmText: '知道了',
        confirmVariant: 'primary',
        onConfirm: () => {}
      });
      return;
    }

    if (validation.warnings.length > 0) {
      setConfirmDialog({
        title: '继续导出？',
        message: validation.warnings.join('\n'),
        confirmText: '继续导出',
        cancelText: '取消',
        confirmVariant: 'primary',
        onConfirm: () => {
          downloadIFlowFile(workflowData, selectedProject?.name || 'default', 'command');
          toast.success('已导出 iFlow Command');
        }
      });
      return;
    }

    downloadIFlowFile(workflowData, selectedProject?.name || 'default', 'command');
    setShowExportMenu(false);
    toast.success('已导出 iFlow Command');
  };

  // 执行工作流
  const handleExecute = async () => {
    if (!selectedProject) {
      toast.warning('请先选择项目');
      return;
    }

    try {
      const structureValidation = validateWorkflowStructure(nodes, edges);
      if (!structureValidation.valid) {
        setValidationResult(structureValidation);
        setShowValidationPanel(true);
        toast.error('工作流结构不完整，无法执行');
        return;
      }

      eventSourceRef.current?.close?.();
      eventSourceRef.current = null;
      lastExecutingNodeIdRef.current = null;

      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: undefined } })));
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: false,
          style: { ...(e.style || {}), strokeWidth: 1.5, opacity: 0.9 },
        }))
      );

      setExecuting(true);
      setExecutionLogs([]);
      setShowLogs(true);
      setExecutionStats({
        stepsTotal: 0,
        stepsCompleted: 0,
        currentStepIndex: -1,
        currentNodeId: null,
        currentNodeLabel: null,
      });

      // 验证工作流
      const workflowData = {
        name: workflowName,
        nodes,
        edges,
        created_at: new Date().toISOString(),
      };

      const validation = validateWorkflow(workflowData);
      if (!validation.valid) {
        setValidationResult(structureValidation);
        setShowValidationPanel(true);
        toast.error('工作流验证失败，无法执行');
        setExecuting(false);
        return;
      }

      // 先保存工作流
      const saveResponse = await authenticatedFetch('/api/workflows/save', {
        method: 'POST',
        body: JSON.stringify({
          project_name: selectedProject.name,
          workflow_name: workflowName,
          nodes: nodes,
          edges: edges,
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        toast.error('保存工作流失败');
        setExecuting(false);
        return;
      }

      const workflowId = saveData.workflow_id;
      const projectNameStr = selectedProject.name;

      // 使用 SSE 执行工作流
      const eventSource = new EventSource(`/api/workflows/stream/${workflowId}/execute?project_name=${encodeURIComponent(projectNameStr)}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const now = new Date().toISOString();

        if (data.type === 'start') {
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: '工作流开始执行...', timestamp: now }
          ]);
        } else if (data.type === 'plan') {
          setExecutionStats((prev) => ({
            ...prev,
            stepsTotal: Number(data.steps_total) || 0
          }));
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: `计划执行 ${data.steps_total} 个步骤`, timestamp: now }
          ]);
        } else if (data.type === 'step_start') {
          const nodeId = data.node_id || null;
          const nodeLabel = data.node_label || null;
          currentExecutingNodeIdRef.current = nodeId;
          setExecutionStats((prev) => ({
            ...prev,
            currentStepIndex: typeof data.step_index === 'number' ? data.step_index : prev.currentStepIndex,
            currentNodeId: nodeId,
            currentNodeLabel: nodeLabel
          }));

          // 更新节点状态为执行中
          setNodes((nds) =>
            nds.map((node) => {
              if (nodeId && node.id === nodeId) {
                return { ...node, data: { ...node.data, status: 'executing', liveOutput: '', lastOutput: '' } };
              }
              return node;
            })
          );

          const fromNodeId = lastExecutingNodeIdRef.current;
          if (fromNodeId && nodeId) {
            setEdges((eds) =>
              eds.map((e) => {
                const isActive = e.source === fromNodeId && e.target === nodeId;
                if (!isActive) {
                  return {
                    ...e,
                    animated: false,
                    style: { ...(e.style || {}), opacity: 0.45, strokeWidth: 1.5 },
                  };
                }
                return {
                  ...e,
                  animated: true,
                  style: { ...(e.style || {}), opacity: 1, strokeWidth: 3 },
                };
              })
            );
          }
          lastExecutingNodeIdRef.current = nodeId || fromNodeId;

          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: `开始执行节点: ${data.step_type}${nodeLabel ? `（${nodeLabel}）` : ''}`, timestamp: now }
          ]);
        } else if (data.type === 'chunk') {
          const nodeId = data.node_id || currentExecutingNodeIdRef.current;

          if (nodeId) {
            const content = String(data.content ?? '');
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id !== nodeId) return node;
                const prevLive = String(node.data?.liveOutput ?? '');
                const nextLive = (prevLive + content).slice(-1200);
                return { ...node, data: { ...node.data, liveOutput: nextLive } };
              })
            );
          }

          // 实时显示输出片段
          setExecutionLogs((prev) => {
            const lastLog = prev[prev.length - 1];
            if (lastLog && lastLog.type === 'chunk') {
              return [
                ...prev.slice(0, -1),
                { ...lastLog, message: lastLog.message + data.content }
              ];
            }
            return [...prev, { type: 'chunk', message: data.content, timestamp: now }];
          });
        } else if (data.type === 'step_output') {
          const nodeId = data.node_id || currentExecutingNodeIdRef.current;
          if (nodeId) {
            const output = String(data.output ?? '');
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id !== nodeId) return node;
                return { ...node, data: { ...node.data, liveOutput: '', lastOutput: output.slice(0, 6000) } };
              })
            );
          }

          setExecutionLogs((prev) => [
            ...prev,
            { type: 'success', message: `节点输出: ${data.output}`, timestamp: now }
          ]);
        } else if (data.type === 'step_complete') {
          const nodeId = data.node_id || null;
          setExecutionStats((prev) => ({
            ...prev,
            stepsCompleted: Math.min(prev.stepsTotal || Number.MAX_SAFE_INTEGER, prev.stepsCompleted + 1),
          }));
          // 更新节点状态为完成
          setNodes((nds) =>
            nds.map((node) => {
              if (nodeId && node.id === nodeId) {
                return { ...node, data: { ...node.data, status: 'success' } };
              }
              return node;
            })
          );
        } else if (data.type === 'complete') {
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: '工作流执行完成', timestamp: now }
          ]);
          setExecuting(false);
          eventSourceRef.current?.close?.();
          eventSourceRef.current = null;
          currentExecutingNodeIdRef.current = null;

          setExecutionStats((prev) => ({
            ...prev,
            currentStepIndex: prev.stepsTotal ? prev.stepsTotal - 1 : prev.currentStepIndex,
            currentNodeId: null,
            currentNodeLabel: null,
          }));
        } else if (data.type === 'error') {
          const nodeId = data.node_id || null;
          if (nodeId) {
            setNodes((nds) =>
              nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n))
            );
          }
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'error', message: `错误: ${data.error}`, timestamp: now }
          ]);
          setExecuting(false);
          eventSourceRef.current?.close?.();
          eventSourceRef.current = null;
          currentExecutingNodeIdRef.current = null;
        }
      };

      eventSource.onerror = (error) => {
        setExecutionLogs((prev) => [
          ...prev,
          { type: 'error', message: '连接中断或服务器错误', timestamp: new Date().toISOString() }
        ]);
        setExecuting(false);
        eventSourceRef.current?.close?.();
        eventSourceRef.current = null;
        currentExecutingNodeIdRef.current = null;
      };

    } catch (error) {
      setExecutionLogs([
        { type: 'error', message: `执行错误: ${error.message}`, timestamp: new Date().toISOString() }
      ]);
      setExecuting(false);
      toast.error(`执行失败：${error.message}`);
    }
  };

  // 导入工作流
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            setWorkflowName(data.name || 'Imported Workflow');
            toast.success('已导入工作流');
          } catch (error) {
            toast.error('导入失败：无效的文件格式');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleFitView = () => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 300 });
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close?.();
      eventSourceRef.current = null;
      currentExecutingNodeIdRef.current = null;
    };
  }, []);

  const closeConfirmDialog = () => setConfirmDialog(null);

  const ConfirmDialog = ({ title, message, confirmText, cancelText, confirmVariant, onConfirm }) => {
    const confirmButtonClass =
      confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white';

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <button
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeConfirmDialog}
          aria-label="Close dialog"
        />
        <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{message}</p>
            </div>
            <button
              onClick={closeConfirmDialog}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 py-4 flex items-center justify-end gap-2 bg-gray-50 dark:bg-gray-900">
            {(cancelText || (confirmText && confirmText !== '知道了')) && (
              <button
                onClick={closeConfirmDialog}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
              >
                {cancelText || '取消'}
              </button>
            )}
            <button
              onClick={() => {
                closeConfirmDialog();
                onConfirm?.();
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${confirmButtonClass}`}
            >
              {confirmText || '确定'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          {isEditingName ? (
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h1 
              className="text-lg md:text-xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
              onClick={() => setIsEditingName(true)}
            >
              {workflowName}
            </h1>
          )}
          
          <span className="hidden sm:inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
              {nodes.length} 节点
            </span>
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
              {edges.length} 连线
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowLibrary(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
            title="打开节点库"
          >
            <PanelLeft className="w-4 h-4" />
            <span className="hidden sm:inline">节点库</span>
          </button>

          <button
            onClick={handleFitView}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
            title="适配视图"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>居中</span>
          </button>

          <button
            onClick={() => setShowAiPanel(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI 生成</span>
          </button>

          <button
            onClick={handleAiRefinement}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI 优化</span>
          </button>

          <button
            onClick={handleValidate}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>验证</span>
          </button>

          <button
            onClick={handleExecute}
            disabled={executing || !selectedProject}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">{executing ? '执行中...' : '执行'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? '保存中...' : '保存'}</span>
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-950 text-white rounded-lg text-sm font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">导出</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* 导出下拉菜单 */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2.5 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  导出为 JSON
                </button>
                <button
                  onClick={handleExportAgent}
                  className="w-full px-4 py-2.5 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  导出为 iFlow Agent
                </button>
                <button
                  onClick={handleExportCommand}
                  className="w-full px-4 py-2.5 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  导出为 iFlow Command
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    const workflowData = { name: workflowName, nodes, edges };
                    downloadClaudeAgentFile(workflowData, selectedProject?.name || 'default');
                    setShowExportMenu(false);
                    toast.success('已导出 Claude Agent');
                  }}
                  className="w-full px-4 py-2.5 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  导出为 Claude Agent (.claude)
                </button>
                <button
                  onClick={() => {
                    const workflowData = { name: workflowName, nodes, edges };
                    downloadClaudeCommandFile(workflowData, selectedProject?.name || 'default');
                    setShowExportMenu(false);
                    toast.success('已导出 Claude Command');
                  }}
                  className="w-full px-4 py-2.5 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  导出为 Claude Command (.claude)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
          >
            <Upload className="w-4 h-4" />
            <span>导入</span>
          </button>

          <button
            onClick={handleClear}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>清空</span>
          </button>
        </div>
      </div>

      {/* AI 生成面板 */}
      {showAiPanel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAiPanel(false)}
            aria-label="Close AI generate modal"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/15 flex items-center justify-center border border-purple-600/20">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">AI 辅助生成工作流</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">用自然语言描述你想要的流程</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiPanel(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例如：创建一个代码审查工作流，获取 PR 详情 → 分析代码 → 有问题则生成修复建议并通知用户 → 否则结束"
                className="w-full h-32 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleAiGenerate}
                  disabled={loading || !aiPrompt.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                >
                  {loading ? '生成中...' : '生成工作流'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogs && logsDock !== 'side' && (
        <div
          className={
            logsDock === 'bottom'
              ? 'fixed left-4 right-4 bottom-4 z-[90]'
              : 'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[560px] z-[90]'
          }
        >
          <div
            className={
              logsDock === 'bottom'
                ? 'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-2xl overflow-hidden'
                : 'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-2xl overflow-hidden'
            }
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <RefreshCw className={`w-4 h-4 ${executing ? 'animate-spin' : ''} text-blue-600 dark:text-blue-400`} />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">执行日志</h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  {executionLogs.length} 条
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-1">
                  <button
                    type="button"
                    onClick={() => setLogsDock('side')}
                    className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                      logsDock === 'side'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    侧边
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsDock('bottom')}
                    className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                      logsDock === 'bottom'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    底部
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsDock('floating')}
                    className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                      logsDock === 'floating'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    悬浮
                  </button>
                </div>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label="Close logs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className={logsDock === 'bottom' ? 'px-4 py-3 h-56 overflow-y-auto bg-gray-50 dark:bg-gray-900' : 'px-4 py-3 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900'}>
              {executionLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">暂无日志</p>
              ) : (
                executionLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-3 text-sm ${
                      log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                      log.type === 'success' ? 'text-green-700 dark:text-green-400' :
                      log.type === 'chunk' ? 'text-gray-800 dark:text-gray-200' :
                      'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-500 text-[11px] font-mono whitespace-nowrap mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none">
                          {String(log.message ?? '')}
                        </MarkdownRenderer>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex overflow-hidden p-4 md:p-6 gap-4 md:gap-6">
          <div className="hidden lg:block w-80 flex-shrink-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <NodeLibrary />
          </div>

          <div className="flex-1 min-w-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={() => setShowPropertiesPanel(false)}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              className="w-full h-full"
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#94a3b8" />
              <Controls />
              <MiniMap
                nodeColor="#3b82f6"
                nodeStrokeColor="#1e293b"
                maskColor="rgba(0, 0, 0, 0.35)"
              />
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center px-6">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
                      <PanelLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">画布为空</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      从左侧拖拽节点，或使用 “AI 生成” 快速创建
                    </p>
                  </div>
                </div>
              )}
            </ReactFlow>

            {executing && (
              <div className="absolute top-4 right-4 z-10">
                <div className="w-[280px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 backdrop-blur shadow-xl overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400">执行进度</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {executionStats.currentNodeLabel || executionStats.currentNodeId || '准备中...'}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {executionStats.stepsTotal > 0 ? `${Math.min(executionStats.stepsCompleted + 1, executionStats.stepsTotal)}/${executionStats.stepsTotal}` : '--'}
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                        style={{
                          width:
                            executionStats.stepsTotal > 0
                              ? `${Math.min(100, Math.round(((executionStats.stepsCompleted) / executionStats.stepsTotal) * 100))}%`
                              : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShowLibrary(true)}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                title="打开节点库"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowLogs((v) => !v)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                title="切换执行日志"
              >
                <RefreshCw className={`w-4 h-4 ${executing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setLogsDock((prev) => (prev === 'side' ? 'bottom' : prev === 'bottom' ? 'floating' : 'side'))}
                className="hidden md:inline-flex items-center justify-center h-10 px-3 rounded-xl bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 transition-colors text-xs font-medium"
                title="切换日志位置"
              >
                {logsDock === 'side' ? '侧边' : logsDock === 'bottom' ? '底部' : '悬浮'}
              </button>
              <button
                onClick={handleFitView}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                title="适配视图"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showLogs && logsDock === 'side' && (
            <div className="hidden xl:block w-[420px] flex-shrink-0">
              <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <RefreshCw className={`w-4 h-4 ${executing ? 'animate-spin' : ''} text-blue-600 dark:text-blue-400`} />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">执行日志</h3>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      {executionLogs.length} 条
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-1">
                      <button
                        type="button"
                        onClick={() => setLogsDock('side')}
                        className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                          logsDock === 'side'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        侧边
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogsDock('bottom')}
                        className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                          logsDock === 'bottom'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        底部
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogsDock('floating')}
                        className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                          logsDock === 'floating'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        悬浮
                      </button>
                    </div>
                    <button
                      onClick={() => setShowLogs(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      aria-label="Close logs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {executionLogs.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">暂无日志</p>
                  ) : (
                    executionLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`mb-3 text-sm ${
                          log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                          log.type === 'success' ? 'text-green-700 dark:text-green-400' :
                          log.type === 'chunk' ? 'text-gray-800 dark:text-gray-200' :
                          'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 dark:text-gray-500 text-[11px] font-mono whitespace-nowrap mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none">
                              {String(log.message ?? '')}
                            </MarkdownRenderer>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {showPropertiesPanel && selectedNode && (
            <div className="hidden xl:block w-80 flex-shrink-0">
              <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <NodePropertiesPanel
                  node={selectedNode}
                  onUpdate={handleNodeUpdate}
                  onClose={() => {
                    setShowPropertiesPanel(false);
                    setSelectedNode(null);
                  }}
                  mcpServers={mcpServers}
                />
              </div>
            </div>
          )}
        </div>

        {showLibrary && (
          <div className="lg:hidden fixed inset-0 z-[100]">
            <button
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowLibrary(false)}
              aria-label="Close node library"
            />
            <div className="absolute left-0 top-0 bottom-0 w-[340px] max-w-[92vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <PanelLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">节点库</span>
                  </div>
                  <button
                    onClick={() => setShowLibrary(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <NodeLibrary showHeader={false} />
                </div>
              </div>
            </div>
          </div>
        )}

        {showPropertiesPanel && selectedNode && (
          <div className="xl:hidden fixed inset-0 z-[105]">
            <button
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowPropertiesPanel(false);
                setSelectedNode(null);
              }}
              aria-label="Close node properties"
            />
            <div className="absolute right-0 top-0 bottom-0 w-[360px] max-w-[92vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
              <NodePropertiesPanel
                node={selectedNode}
                onUpdate={handleNodeUpdate}
                onClose={() => {
                  setShowPropertiesPanel(false);
                  setSelectedNode(null);
                }}
                mcpServers={mcpServers}
              />
            </div>
          </div>
        )}
      </div>

      {/* AI 优化对话框 */}
      <AiRefinementDialog
        isOpen={showAiRefinementDialog}
        onClose={() => setShowAiRefinementDialog(false)}
        currentWorkflow={{ nodes, edges }}
        onApply={handleApplyAiRefinement}
        loading={loading}
      />

      {/* 工作流验证面板 */}
      {showValidationPanel && validationResult && (
        <WorkflowValidationPanel
          validationResult={validationResult}
          onClose={() => setShowValidationPanel(false)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </div>
  );
};

// 获取节点标签
function getNodeLabel(type) {
  const labels = {
    start: '开始',
    end: '结束',
    prompt: '提示词',
    condition: '条件判断',
    action: '执行动作',
    askUser: '询问用户',
    subAgent: '子代理',
    mcp: 'MCP 工具',
    skill: '技能',
    shell: 'Shell 命令',
    readFile: '读取文件',
    writeFile: '写入文件',
    searchFiles: '搜索文件',
    gitCommit: 'Git 提交',
    gitBranch: 'Git 分支',
  };
  return labels[type] || '节点';
}

export default WorkflowEditor;
