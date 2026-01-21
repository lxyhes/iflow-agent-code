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
  Plus, Save, Play, Trash2, RefreshCw,
  Sparkles, Download, Upload, Settings, ChevronDown, CheckCircle,
  X, ChevronRight, Terminal, FileText, Layout, PlayCircle
} from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import NodeLibrary from './workflow/NodeLibrary';
import { nodeTypes } from './workflow/CustomNodes';
import NodePropertiesPanel from './workflow/NodePropertiesPanel';
import AiRefinementDialog from './workflow/AiRefinementDialog';
import WorkflowValidationPanel from './workflow/WorkflowValidationPanel';
import { authenticatedFetch } from '../utils/api';
import {
  downloadIFlowFile,
  validateWorkflow,
  downloadClaudeAgentFile,
  downloadClaudeCommandFile
} from '../utils/iflowWorkflowExporter';
import { validateWorkflow as validateWorkflowStructure } from '../utils/workflowValidator';

const WorkflowEditor = ({ projectName, selectedProject }) => {
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
  const [finalResult, setFinalResult] = useState(null);
  const logEndRef = useRef(null);

  // 自动滚动日志到底部
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // 初始化示例工作流
  const initialNodes = [
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

  const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true, label: '是' },
    { id: 'e3-5', source: '3', target: '5', animated: true, label: '否' },
  ];

  // 初始化节点和边
  if (nodes.length === 0 && edges.length === 0) {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }

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
        console.error('Failed to load MCP servers:', error);
      }
    };
    loadMcpServers();
  }, []);

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

      console.log('Saving workflow:', workflowData);

      const response = await authenticatedFetch('/api/workflows/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        alert('工作流保存成功！');
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      alert('保存失败: ' + error.message);
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
      alert('请输入工作流描述');
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
      } else {
        alert('生成失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('AI 生成失败:', error);
      alert('生成失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 清空画布
  const handleClear = () => {
    if (confirm('确定要清空画布吗？')) {
      setNodes([]);
      setEdges([]);
    }
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
      alert(`工作流验证失败:\n${validation.errors.join('\n')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      const proceed = confirm(`工作流验证通过，但有警告:\n${validation.warnings.join('\n')}\n\n是否继续导出？`);
      if (!proceed) return;
    }

    downloadIFlowFile(workflowData, selectedProject?.name || 'default', 'agent');
    setShowExportMenu(false);
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
      alert(`工作流验证失败:\n${validation.errors.join('\n')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      const proceed = confirm(`工作流验证通过，但有警告:\n${validation.warnings.join('\n')}\n\n是否继续导出？`);
      if (!proceed) return;
    }

    downloadIFlowFile(workflowData, selectedProject?.name || 'default', 'command');
    setShowExportMenu(false);
  };

  // 执行工作流
  const handleExecute = async () => {
    if (!selectedProject) {
      alert('请先选择项目');
      return;
    }

    try {
      setExecuting(true);
      setExecutionLogs([]);
      setShowLogs(true);

      // 验证工作流
      const workflowData = {
        name: workflowName,
        nodes,
        edges,
        created_at: new Date().toISOString(),
      };

      const validation = validateWorkflow(workflowData);
      if (!validation.valid) {
        alert(`工作流验证失败:\n${validation.errors.join('\n')}`);
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
        alert('保存工作流失败');
        setExecuting(false);
        return;
      }

      const workflowId = saveData.workflow_id;
      const projectNameStr = selectedProject.name;

      // 使用 SSE 执行工作流
      const eventSource = new EventSource(`/api/workflows/${workflowId}/execute-stream?project_name=${encodeURIComponent(projectNameStr)}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const now = new Date().toISOString();

        if (data.type === 'start') {
          setFinalResult(null);
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: '工作流开始执行...', timestamp: now }
          ]);
        } else if (data.type === 'plan') {
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: `计划执行 ${data.steps_total} 个步骤`, timestamp: now }
          ]);
        } else if (data.type === 'step_start') {
          // 更新节点状态为执行中
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === data.node_id) {
                return { ...node, data: { ...node.data, status: 'executing' } };
              }
              return node;
            })
          );
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: `开始执行节点: ${data.step_type}`, timestamp: now }
          ]);
        } else if (data.type === 'chunk') {
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
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'success', message: data.output, timestamp: now }
          ]);
          // 如果是最后一个节点或有重要输出，保存为最终结果
          setFinalResult(data.output);
        } else if (data.type === 'step_complete') {
          // 更新节点状态为完成
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === data.node_id) {
                return { ...node, data: { ...node.data, status: 'success' } };
              }
              return node;
            })
          );
        } else if (data.type === 'complete') {
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'info', message: '工作流执行成功完成！', timestamp: now }
          ]);
          setExecuting(false);
          eventSource.close();
        } else if (data.type === 'error') {
          setExecutionLogs((prev) => [
            ...prev,
            { type: 'error', message: `执行出错: ${data.error}`, timestamp: now }
          ]);
          setExecuting(false);
          eventSource.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setExecutionLogs((prev) => [
          ...prev,
          { type: 'error', message: '连接中断或服务器错误', timestamp: new Date().toISOString() }
        ]);
        setExecuting(false);
        eventSource.close();
      };

    } catch (error) {
      console.error('Workflow execution error:', error);
      setExecutionLogs([
        { type: 'error', message: `执行错误: ${error.message}`, timestamp: new Date().toISOString() }
      ]);
      setExecuting(false);
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
          } catch (error) {
            alert('导入失败: 无效的文件格式');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          {isEditingName ? (
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="bg-gray-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h1 
              className="text-xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              {workflowName}
            </h1>
          )}
          
          <span className="text-sm text-gray-400">
            {nodes.length} 个节点, {edges.length} 条连线
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAiPanel(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI 生成</span>
          </button>

          <button
            onClick={handleAiRefinement}
            className="flex items-center space-x-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI 优化</span>
          </button>

          <button
            onClick={handleValidate}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>验证</span>
          </button>

          <button
            onClick={handleExecute}
            disabled={executing || !selectedProject}
            className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{executing ? '执行中...' : '执行'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? '保存中...' : '保存'}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* 导出下拉菜单 */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 rounded-t-lg text-sm"
                >
                  导出为 JSON
                </button>
                <button
                  onClick={handleExportAgent}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 text-sm"
                >
                  导出为 iFlow Agent
                </button>
                <button
                  onClick={handleExportCommand}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 text-sm"
                >
                  导出为 iFlow Command
                </button>
                <div className="border-t border-gray-600 my-1"></div>
                <button
                  onClick={() => {
                    const workflowData = { name: workflowName, nodes, edges };
                    downloadClaudeAgentFile(workflowData, selectedProject?.name || 'default');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 text-sm"
                >
                  导出为 Claude Agent (.claude)
                </button>
                <button
                  onClick={() => {
                    const workflowData = { name: workflowName, nodes, edges };
                    downloadClaudeCommandFile(workflowData, selectedProject?.name || 'default');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 rounded-b-lg text-sm"
                >
                  导出为 Claude Command (.claude)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>导入</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>清空</span>
          </button>
        </div>
      </div>

      {/* AI 生成面板 */}
      {showAiPanel && (
        <div className="mx-6 mt-4 p-4 bg-purple-900/30 border border-purple-600 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-medium">AI 辅助生成工作流</h3>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="描述你想要创建的工作流，例如：'创建一个代码审查工作流，先获取 PR 详情，然后分析代码，如果有问题就通知用户，审查通过就请求批准权限'"
            className="w-full h-24 bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <div className="flex items-center justify-end space-x-2 mt-3">
            <button
              onClick={() => setShowAiPanel(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAiGenerate}
              disabled={loading || !aiPrompt.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成工作流'}
            </button>
          </div>
        </div>
      )}

      {/* 执行日志面板 */}
      {showLogs && (
        <div className="mx-6 mt-4 flex flex-col bg-gray-900/40 border border-gray-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={`p-1.5 rounded-lg ${executing ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
                <Terminal className={`w-4 h-4 ${executing ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">执行控制台</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  {executing ? 'Status: Running' : 'Status: Idle'} • {executionLogs.length} Events
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setExecutionLogs([])}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all"
                title="清空日志"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowLogs(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden h-[400px]">
            {/* 左侧：实时日志流 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm scrollbar-thin scrollbar-thumb-gray-700">
              {executionLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
                  <Terminal className="w-8 h-8" />
                  <p>等待工作流启动...</p>
                </div>
              ) : (
                executionLogs.map((log, index) => (
                  <div key={index} className="group animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 text-[10px] text-gray-600 mt-1 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        {log.type === 'chunk' || log.type === 'success' ? (
                          <div className={`p-3 rounded-lg border ${log.type === 'success' ? 'bg-green-500/5 border-green-500/20' : 'bg-gray-800/50 border-gray-700'}`}>
                            <MarkdownRenderer className="text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                              {log.message}
                            </MarkdownRenderer>
                          </div>
                        ) : (
                          <div className={`flex items-center space-x-2 ${
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'info' ? 'text-blue-400' :
                            'text-gray-400'
                          }`}>
                            {log.type === 'info' && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                            {log.type === 'error' && <X className="w-3 h-3 flex-shrink-0" />}
                            <span className="font-medium">{log.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>

            {/* 右侧：最终结果摘要（如果有） */}
            {finalResult && (
              <div className="w-80 border-l border-gray-700 bg-gray-800/30 p-4 overflow-y-auto animate-in slide-in-from-right duration-500">
                <div className="flex items-center space-x-2 mb-4">
                  <PlayCircle className="w-4 h-4 text-green-400" />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">最终执行结果</h4>
                </div>
                <div className="bg-gray-900/60 rounded-xl p-4 border border-green-500/20 shadow-inner">
                  <MarkdownRenderer className="text-sm text-gray-200 prose prose-invert prose-sm">
                    {finalResult}
                  </MarkdownRenderer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* 左侧：节点库 */}
        <div className="w-72 flex-shrink-0">
          <NodeLibrary />
        </div>

        {/* 右侧：画布区域 */}
        <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden" ref={reactFlowWrapper}>
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
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#6b7280" />
            <Controls />
            <MiniMap 
              nodeColor="#3b82f6"
              nodeStrokeColor="#1e293b"
              maskColor="rgba(0, 0, 0, 0.5)"
            />
          </ReactFlow>
        </div>

        {/* 右侧属性面板 */}
        {showPropertiesPanel && selectedNode && (
          <NodePropertiesPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => {
              setShowPropertiesPanel(false);
              setSelectedNode(null);
            }}
            mcpServers={mcpServers}
          />
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
  };
  return labels[type] || '节点';
}

export default WorkflowEditor;
