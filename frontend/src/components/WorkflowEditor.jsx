/**
 * Workflow Editor Component
 * 可视化工作流编辑器，支持拖拽节点、连线、AI 辅助生成
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Save, Play, Trash2, RefreshCw,
  Sparkles, Download, Upload, CheckCircle,
  LayoutGrid, PanelLeft, X, Undo2, Redo2, MoreHorizontal, Copy, Box
} from 'lucide-react';
import NodeLibrary from './workflow/NodeLibrary';
import { nodeTypes } from './workflow/CustomNodes';
import NodePropertiesPanel from './workflow/NodePropertiesPanel';
import AiRefinementDialog from './workflow/AiRefinementDialog';
import WorkflowValidationPanel from './workflow/WorkflowValidationPanel';
import ExecutionHistoryPanel from './workflow/ExecutionHistoryPanel';
import WorkflowTemplateModal from './workflow/WorkflowTemplateModal';
import WorkflowDraftBanner from './workflow/WorkflowDraftBanner';
import NodeSearchDialog from './workflow/NodeSearchDialog';
import SaveTemplateDialog from './workflow/SaveTemplateDialog';
import { useWorkflowHistory } from './workflow/useWorkflowHistory';
import { useWorkflowAutosave } from './workflow/useWorkflowAutosave';
import { useWorkflowShortcuts } from './workflow/useWorkflowShortcuts';
import { normalizeImportedWorkflow } from './workflow/workflowImportExport';
import { computeGraphSignature } from './workflow/workflowGraphUtils';
import { upsertCustomTemplate } from './workflow/workflowTemplateStorage';
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
import { cloneWorkflowTemplate } from './workflow/workflowTemplates';

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
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showAiRefinementDialog, setShowAiRefinementDialog] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [logQuery, setLogQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [selection, setSelection] = useState({ nodes: [], edges: [] });
  const [showNodeSearch, setShowNodeSearch] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
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
  const actionsMenuRef = useRef(null);
  const eventSourceRef = useRef(null);
  const lastExecutingNodeIdRef = useRef(null);
  const currentExecutingNodeIdRef = useRef(null);
  const [logsDock, setLogsDock] = useState('side');
  const [is3DMode, setIs3DMode] = useState(false);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);
  const [lastManualSavedSignature, setLastManualSavedSignature] = useState(null);
  const [saveFlash, setSaveFlash] = useState(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem('iflow:workflow:logsDock');
      if (v === 'side' || v === 'bottom' || v === 'floating') {
        setLogsDock(v);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem('iflow:workflow:3dMode');
      if (v === '1') setIs3DMode(true);
      else if (v === '0') setIs3DMode(false);
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('iflow:workflow:logsDock', logsDock);
    } catch {
    }
  }, [logsDock]);

  useEffect(() => {
    try {
      localStorage.setItem('iflow:workflow:3dMode', is3DMode ? '1' : '0');
    } catch {
    }
  }, [is3DMode]);

  const history = useWorkflowHistory({ initialNodes: [], initialEdges: [] });
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    history.replacePresent({ nodes, edges });
  }, [history, nodes, edges]);

  const autosaveProjectKey = selectedProject?.name || projectName || 'default';
  const { meta: autosaveMeta, draft: workflowDraft, restoreDraft, discardDraft, markSaved } = useWorkflowAutosave({
    projectName: autosaveProjectKey,
    workflowName,
    nodes,
    edges,
    enabled: true,
  });

  const currentSignature = computeGraphSignature({ workflowName, nodes, edges });
  const draftSignature = workflowDraft
    ? computeGraphSignature({ workflowName: workflowDraft.workflow_name, nodes: workflowDraft.nodes, edges: workflowDraft.edges })
    : null;
  const showDraftBanner = autosaveMeta.hadDraftOnInit && !draftBannerDismissed && workflowDraft && draftSignature !== currentSignature;
  const isDirty = lastManualSavedSignature !== null && currentSignature !== lastManualSavedSignature;

  useEffect(() => {
    if (!hasInitialized) return;
    setLastManualSavedSignature((prev) => (prev === null ? currentSignature : prev));
  }, [currentSignature, hasInitialized]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const applyGraph = useCallback((graph) => {
    setNodes(graph.nodes || []);
    setEdges(graph.edges || []);
    setShowPropertiesPanel(false);
    setSelectedNode(null);
  }, [setEdges, setNodes]);

  const commitGraph = useCallback((graph) => {
    history.commit({ nodes: graph.nodes || [], edges: graph.edges || [] });
    applyGraph(graph);
  }, [applyGraph, history]);

  const handleUndo = useCallback(() => {
    const graph = history.undo();
    applyGraph(graph);
  }, [applyGraph, history]);

  const handleRedo = useCallback(() => {
    const graph = history.redo();
    applyGraph(graph);
  }, [applyGraph, history]);

  const handleSelectionChange = useCallback((sel) => {
    if (!sel) {
      setSelection({ nodes: [], edges: [] });
      return;
    }
    setSelection({
      nodes: Array.isArray(sel.nodes) ? sel.nodes : [],
      edges: Array.isArray(sel.edges) ? sel.edges : [],
    });
  }, []);

  const focusNode = useCallback((node) => {
    if (!node || !reactFlowInstance) return;
    try {
      reactFlowInstance.fitView({ nodes: [node], padding: 0.35, duration: 300 });
    } catch {
    }
  }, [reactFlowInstance]);

  const focusCurrentExecutingNode = useCallback(() => {
    const nodeId = currentExecutingNodeIdRef.current;
    if (!nodeId) return;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    focusNode(node);
  }, [focusNode]);

  const copyText = useCallback(async (text) => {
    const value = String(text ?? '');
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('已复制');
    } catch (_e) {
      toast.error('复制失败');
    }
  }, [toast]);

  useEffect(() => {
    if (hasInitialized) return;
    if (nodes.length === 0 && edges.length === 0) {
      setNodes(SAMPLE_NODES);
      setEdges(SAMPLE_EDGES);
      history.reset({ nodes: SAMPLE_NODES, edges: SAMPLE_EDGES });
    }
    setHasInitialized(true);
  }, [edges.length, hasInitialized, history, nodes.length, setEdges, setNodes]);

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
    if (!showActionsMenu) return;
    const onPointerDown = (e) => {
      if (!actionsMenuRef.current) return;
      if (!actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [showActionsMenu]);

  // 节点点击处理
  const onNodeClick = useCallback((_event, node) => {
    setSelectedNode(node);
    setShowPropertiesPanel(true);
  }, []);

  const shouldCommitNodeChanges = useCallback((changes) => {
    return changes.some((c) => {
      if (c.type === 'add' || c.type === 'remove') return true;
      if (c.type === 'position' && c.dragging === false) return true;
      if (c.type === 'dimensions') return true;
      return false;
    });
  }, []);

  const shouldCommitEdgeChanges = useCallback((changes) => {
    return changes.some((c) => c.type === 'add' || c.type === 'remove');
  }, []);

  const handleNodesChange = useCallback((changes) => {
    if (changes.some((change) => change.type === 'remove' && change.id === selectedNode?.id)) {
      setShowPropertiesPanel(false);
      setSelectedNode(null);
    }

    const shouldCommit = shouldCommitNodeChanges(changes);
    setNodes((current) => {
      const next = applyNodeChanges(changes, current);
      if (shouldCommit) {
        history.commit({ nodes: next, edges: edgesRef.current });
      }
      return next;
    });
  }, [history, selectedNode?.id, setNodes, shouldCommitNodeChanges]);

  // 节点更新处理
  const handleNodeUpdate = (updatedNode) => {
    setNodes((current) => {
      const next = current.map((n) => (n.id === updatedNode.id ? updatedNode : n));
      history.commit({ nodes: next, edges: edgesRef.current });
      return next;
    });
  };

  const handleEdgesChange = useCallback((changes) => {
    const shouldCommit = shouldCommitEdgeChanges(changes);
    setEdges((current) => {
      const next = applyEdgeChanges(changes, current);
      if (shouldCommit) {
        history.commit({ nodes: nodesRef.current, edges: next });
      }
      return next;
    });
  }, [history, setEdges, shouldCommitEdgeChanges]);

  const onConnect = useCallback((params) => {
    setEdges((current) => {
      const next = addEdge({
        ...params,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
      }, current);
      history.commit({ nodes: nodesRef.current, edges: next });
      return next;
    });
  }, [history, setEdges]);

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

    setNodes((current) => {
      const next = current.concat(newNode);
      history.commit({ nodes: next, edges: edgesRef.current });
      return next;
    });
  }, [history, setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 保存工作流
  const handleSave = async () => {
    try {
      setSaveFlash(null);
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
        markSaved();
        setLastManualSavedSignature(computeGraphSignature({ workflowName, nodes: nodesRef.current, edges: edgesRef.current }));
        setSaveFlash('saved');
        window.setTimeout(() => setSaveFlash(null), 1200);
        toast.success('工作流保存成功');
      } else {
        setSaveFlash('error');
        window.setTimeout(() => setSaveFlash(null), 1200);
        toast.error(`保存失败：${data.error || '未知错误'}`);
      }
    } catch (error) {
      setSaveFlash('error');
      window.setTimeout(() => setSaveFlash(null), 1200);
      toast.error(`保存失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelection = useCallback(() => {
    const selectedNodes = selection.nodes || [];
    const selectedEdges = selection.edges || [];
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    const removedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const removedEdgeIds = new Set(selectedEdges.map((e) => e.id));

    const nextNodes = nodesRef.current.filter((n) => !removedNodeIds.has(n.id));
    const nextEdges = edgesRef.current.filter((e) => {
      if (removedEdgeIds.has(e.id)) return false;
      if (removedNodeIds.has(e.source) || removedNodeIds.has(e.target)) return false;
      return true;
    });

    history.commit({ nodes: nextNodes, edges: nextEdges });
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (selectedNode && removedNodeIds.has(selectedNode.id)) {
      setSelectedNode(null);
      setShowPropertiesPanel(false);
    }
  }, [history, selectedNode, selection.edges, selection.nodes, setEdges, setNodes]);

  const handleDuplicate = useCallback(() => {
    const base = selection.nodes?.[0] || selectedNode;
    if (!base) return;

    const newId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const dataClone = typeof globalThis.structuredClone === 'function'
      ? globalThis.structuredClone(base.data)
      : JSON.parse(JSON.stringify(base.data || {}));

    const newNode = {
      ...base,
      id: newId,
      position: { x: (base.position?.x || 0) + 40, y: (base.position?.y || 0) + 40 },
      data: dataClone,
      selected: true,
    };

    const nextNodes = nodesRef.current
      .map((n) => ({ ...n, selected: false }))
      .concat(newNode);

    history.commit({ nodes: nextNodes, edges: edgesRef.current });
    setNodes(nextNodes);
    setSelectedNode(newNode);
    setShowPropertiesPanel(true);
  }, [history, selectedNode, selection.nodes, setNodes]);

  useWorkflowShortcuts({
    enabled: true,
    onSave: handleSave,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleLibrary: () => setShowLibrary((v) => !v),
    onDeleteSelection: handleDeleteSelection,
    onDuplicate: handleDuplicate,
    onFind: () => setShowNodeSearch(true),
  });

  // AI 迭代优化
  const handleAiRefinement = () => {
    setShowAiRefinementDialog(true);
  };

  const handleApplyAiRefinement = (updatedWorkflow) => {
    commitGraph({ nodes: updatedWorkflow.nodes, edges: updatedWorkflow.edges });
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
        commitGraph({ nodes: data.nodes, edges: data.edges });
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
        commitGraph({ nodes: [], edges: [] });
        toast.info('画布已清空');
      },
    });
  };

  // 导出工作流（JSON 格式）
  const handleExportJSON = () => {
    setShowActionsMenu(false);
    const workflowData = {
      name: workflowName,
      version: 1,
      project_name: selectedProject?.name || projectName || 'default',
      workflow_name: workflowName,
      nodes,
      edges,
      exported_at: new Date().toISOString(),
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
    toast.success('已导出 JSON');
  };

  // 导出为 iFlow Agent 格式
  const handleExportAgent = () => {
    setShowActionsMenu(false);
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
    toast.success('已导出 iFlow Agent');
  };

  // 导出为 iFlow Command 格式
  const handleExportCommand = () => {
    setShowActionsMenu(false);
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
          const output = String(data.output ?? '');
          if (nodeId) {
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id !== nodeId) return node;
                return { ...node, data: { ...node.data, liveOutput: '', lastOutput: output.slice(0, 6000) } };
              })
            );
          }

          const outputForLog = output.length > 2000 ? `${output.slice(0, 2000)}…` : output;
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'success', message: `节点输出: ${outputForLog}`, timestamp: now, data: { output, nodeId } }
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
            const node = nodesRef.current.find((n) => n.id === nodeId);
            if (node) {
              focusNode(node);
              setSelectedNode(node);
              setShowPropertiesPanel(true);
            }
          }
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'error', message: `错误: ${data.error}`, timestamp: now, data: { nodeId } }
          ]);
          setExecuting(false);
          eventSourceRef.current?.close?.();
          eventSourceRef.current = null;
          currentExecutingNodeIdRef.current = null;
        }
      };

      eventSource.onerror = (_error) => {
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
            const normalized = normalizeImportedWorkflow(data);

            if (normalized.errors.length > 0) {
              setConfirmDialog({
                title: '导入失败',
                message: normalized.errors.join('\n'),
                confirmText: '知道了',
                confirmVariant: 'primary',
                onConfirm: () => {},
              });
              return;
            }

            const applyImported = () => {
              setWorkflowName(normalized.workflowName || 'Imported Workflow');
              commitGraph({ nodes: normalized.nodes, edges: normalized.edges });
              toast.success('已导入工作流');
            };

            if (normalized.warnings.length > 0) {
              setConfirmDialog({
                title: '导入完成（有提醒）',
                message: normalized.warnings.join('\n'),
                confirmText: '继续导入',
                cancelText: '取消',
                confirmVariant: 'primary',
                onConfirm: applyImported,
              });
              return;
            }

            applyImported();
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

  const visibleExecutionLogs = executionLogs.filter((log) => {
    if (logFilter === 'error' && log.type !== 'error') return false;
    if (logFilter === 'output' && !(log.type === 'success' || log.type === 'chunk')) return false;

    const q = logQuery.trim().toLowerCase();
    if (!q) return true;
    const message = String(log.message ?? '').toLowerCase();
    const output = String(log.data?.output ?? '').slice(0, 4000).toLowerCase();
    const nodeId = String(log.data?.nodeId ?? '').toLowerCase();
    return message.includes(q) || output.includes(q) || nodeId.includes(q);
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* 顶部工具栏 */}
      <div className="relative z-[60] flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-white/75 dark:bg-gray-900/55 backdrop-blur border-b border-gray-200/70 dark:border-gray-800 shadow-sm">
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
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className="truncate">{workflowName}</span>
                {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
              </span>
            </h1>
          )}
          
          <span className="hidden sm:inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
              {nodes.length} 节点
            </span>
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
              {edges.length} 连线
            </span>
            {lastManualSavedSignature !== null && (
              <span
                className={`px-2 py-1 rounded-full border ${
                  isDirty
                    ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/70 dark:text-amber-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/70 dark:text-emerald-200'
                }`}
              >
                {isDirty ? '未保存' : '已保存'}
              </span>
            )}
            {autosaveMeta.lastSavedAtText && (
              <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600">
                草稿 {autosaveMeta.lastSavedAtText}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowLibrary(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
            title="打开节点库 (Ctrl/Cmd+K)"
          >
            <PanelLeft className="w-4 h-4" />
            <span className="hidden sm:inline">节点库</span>
          </button>

          <button
            onClick={() => setIs3DMode((v) => !v)}
            className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              is3DMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600'
            }`}
            title="3D 视觉效果"
            aria-label="3D 视觉效果"
          >
            <Box className="w-4 h-4" />
            <span>3D</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={!history.canUndo}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="撤销 (Ctrl/Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            disabled={!history.canRedo}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="重做 (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
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
            <span>
              {loading ? '保存中...' : saveFlash === 'saved' ? '已保存' : saveFlash === 'error' ? '失败' : '保存'}
            </span>
          </button>

          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-950 text-white rounded-lg text-sm font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
              aria-expanded={showActionsMenu}
              title="菜单"
              aria-label="菜单"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>菜单</span>
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-[70] overflow-hidden">
                <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800">
                  快速操作
                </div>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    setShowTemplateModal(true);
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <LayoutGrid className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="flex-1">模板库</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    setShowSaveTemplate(true);
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">保存为模板</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    setShowExecutionHistory(true);
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="flex-1">执行历史</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleFitView();
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <LayoutGrid className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">居中</span>
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-800" />

                <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800">
                  AI 与校验
                </div>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    setShowAiPanel(true);
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="flex-1">AI 生成</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleAiRefinement();
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  <span className="flex-1">AI 优化</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleValidate();
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="flex-1">验证</span>
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-800" />

                <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800">
                  导入 / 导出
                </div>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleImport();
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Upload className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">导入 JSON</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">导出 JSON</span>
                </button>
                <button
                  onClick={handleExportAgent}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">导出 iFlow Agent</span>
                </button>
                <button
                  onClick={handleExportCommand}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">导出 iFlow Command</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    const workflowData = { name: workflowName, nodes, edges };
                    downloadClaudeAgentFile(workflowData, selectedProject?.name || 'default');
                    toast.success('已导出 Claude Agent');
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">导出 Claude Agent</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    const workflowData = { name: workflowName, nodes, edges };
                    downloadClaudeCommandFile(workflowData, selectedProject?.name || 'default');
                    toast.success('已导出 Claude Command');
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">导出 Claude Command</span>
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-800" />

                <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800">
                  编辑
                </div>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleUndo();
                  }}
                  disabled={!history.canUndo}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Undo2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">撤销</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">⌘Z</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleRedo();
                  }}
                  disabled={!history.canRedo}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Redo2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">重做</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">⇧⌘Z</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleDuplicate();
                  }}
                  disabled={!selectedNode && (!selection.nodes || selection.nodes.length === 0)}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">复制节点</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">⌘D</span>
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleDeleteSelection();
                  }}
                  disabled={(!selection.nodes || selection.nodes.length === 0) && (!selection.edges || selection.edges.length === 0)}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  <span className="flex-1">删除选中</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">Del</span>
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-800" />
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    handleClear();
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="flex-1">清空画布</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDraftBanner && (
        <div className="px-4 md:px-6 pt-3">
          <WorkflowDraftBanner
            draft={workflowDraft}
            onRestore={() => {
              const draft = restoreDraft();
              if (!draft) return;
              setWorkflowName(draft.workflow_name || 'Untitled Workflow');
              setNodes(draft.nodes || []);
              setEdges(draft.edges || []);
              history.reset({ nodes: draft.nodes || [], edges: draft.edges || [] });
              setDraftBannerDismissed(true);
              toast.success('已恢复草稿');
            }}
            onDiscard={() => {
              discardDraft();
              setDraftBannerDismissed(true);
              toast.info('已丢弃草稿');
            }}
          />
        </div>
      )}

      <NodeSearchDialog
        open={showNodeSearch}
        nodes={nodes}
        onClose={() => setShowNodeSearch(false)}
        onPick={(node) => {
          setShowNodeSearch(false);
          focusNode(node);
          setSelectedNode(node);
          setShowPropertiesPanel(true);
        }}
      />

      <SaveTemplateDialog
        open={showSaveTemplate}
        initialName={workflowName}
        onClose={() => setShowSaveTemplate(false)}
        onSave={(meta) => {
          const id = `custom_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
          upsertCustomTemplate({
            id,
            name: meta.name,
            category: meta.category,
            tags: meta.tags,
            description: meta.description,
            nodes: nodesRef.current,
            edges: edgesRef.current,
          });
          setShowSaveTemplate(false);
          toast.success('已保存为模板（我的）');
        }}
      />

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
                  {visibleExecutionLogs.length} 条
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="搜索日志"
                  className="hidden md:block w-44 px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = visibleExecutionLogs
                      .map((log) => {
                        const ts = new Date(log.timestamp).toLocaleString();
                        const body = log.data?.output ? String(log.data.output) : String(log.message ?? '');
                        return `[${ts}] [${log.type}] ${body}`;
                      })
                      .join('\n\n');
                    copyText(text);
                  }}
                  disabled={visibleExecutionLogs.length === 0}
                  className="hidden sm:inline-flex items-center px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  复制可见
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('确定清空执行日志？')) return;
                    setExecutionLogs([]);
                    setLogQuery('');
                  }}
                  disabled={executionLogs.length === 0}
                  className="hidden sm:inline-flex items-center px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  清空
                </button>
                <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-1">
                  <button
                    type="button"
                    onClick={() => setLogFilter('all')}
                    className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                      logFilter === 'all'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter('error')}
                    className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                      logFilter === 'error'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    错误
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter('output')}
                    className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                      logFilter === 'output'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    输出
                  </button>
                </div>
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
              {visibleExecutionLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">暂无日志</p>
              ) : (
                visibleExecutionLogs.map((log, index) => (
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
                      {(log.type === 'success' || log.type === 'error') && log.data?.nodeId && (
                        <button
                          type="button"
                          onClick={() => {
                            const node = nodesRef.current.find((n) => n.id === log.data.nodeId);
                            if (!node) return;
                            focusNode(node);
                            setSelectedNode(node);
                            setShowPropertiesPanel(true);
                          }}
                          className="mt-0.5 px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors text-[11px]"
                        >
                          定位
                        </button>
                      )}
                      {log.type === 'success' && log.data?.output && (
                        <button
                          type="button"
                          onClick={() => copyText(log.data.output)}
                          className="mt-0.5 w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors flex items-center justify-center"
                          aria-label="复制输出"
                          title="复制输出"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
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

          <div
            className={`flex-1 min-w-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden relative ${is3DMode ? 'iflow-workflow-3d' : ''}`}
            ref={reactFlowWrapper}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onSelectionChange={handleSelectionChange}
              onPaneClick={() => {
                setShowPropertiesPanel(false);
                setSelectedNode(null);
              }}
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
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={focusCurrentExecutingNode}
                        disabled={!executionStats.currentNodeId}
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        定位当前
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLogs(true)}
                        className="flex-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                      >
                        打开日志
                      </button>
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
                      {visibleExecutionLogs.length} 条
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={logQuery}
                      onChange={(e) => setLogQuery(e.target.value)}
                      placeholder="搜索"
                      className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const text = visibleExecutionLogs
                          .map((log) => {
                            const ts = new Date(log.timestamp).toLocaleString();
                            const body = log.data?.output ? String(log.data.output) : String(log.message ?? '');
                            return `[${ts}] [${log.type}] ${body}`;
                          })
                          .join('\n\n');
                        copyText(text);
                      }}
                      disabled={visibleExecutionLogs.length === 0}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm('确定清空执行日志？')) return;
                        setExecutionLogs([]);
                        setLogQuery('');
                      }}
                      disabled={executionLogs.length === 0}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      清空
                    </button>
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-1">
                      <button
                        type="button"
                        onClick={() => setLogFilter('all')}
                        className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                          logFilter === 'all'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        全部
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('error')}
                        className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                          logFilter === 'error'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        错误
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('output')}
                        className={`px-2 py-1 text-[11px] rounded-lg transition-colors ${
                          logFilter === 'output'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        输出
                      </button>
                    </div>
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
                  {visibleExecutionLogs.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">暂无日志</p>
                  ) : (
                    visibleExecutionLogs.map((log, index) => (
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
                          {(log.type === 'success' || log.type === 'error') && log.data?.nodeId && (
                            <button
                              type="button"
                              onClick={() => {
                                const node = nodesRef.current.find((n) => n.id === log.data.nodeId);
                                if (!node) return;
                                focusNode(node);
                                setSelectedNode(node);
                                setShowPropertiesPanel(true);
                              }}
                              className="mt-0.5 px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors text-[11px]"
                            >
                              定位
                            </button>
                          )}
                          {log.type === 'success' && log.data?.output && (
                            <button
                              type="button"
                              onClick={() => copyText(log.data.output)}
                              className="mt-0.5 w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors flex items-center justify-center"
                              aria-label="复制输出"
                              title="复制输出"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
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
                  <NodeLibrary showHeader={false} showSearch autoFocusSearch />
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

      <ExecutionHistoryPanel
        isOpen={showExecutionHistory}
        onClose={() => setShowExecutionHistory(false)}
        projectName={selectedProject?.name || projectName}
        workflowId={null}
      />

      <WorkflowTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onPickTemplate={(tpl) => {
          const graph = cloneWorkflowTemplate(tpl);
          setWorkflowName(tpl.name);
          setNodes(graph.nodes);
          setEdges(graph.edges);
          history.reset({ nodes: graph.nodes, edges: graph.edges });
          setShowPropertiesPanel(false);
          setSelectedNode(null);
          setShowLogs(false);
          setShowTemplateModal(false);
          toast.success(`已应用模板：${tpl.name}`);
        }}
      />
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
