import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeMirrorMerge from 'react-codemirror-merge';
import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTaskMaster } from '../contexts/TaskMasterContext';
import { 
  Brain, 
  Image as ImageIcon, 
  Code, 
  FileText, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Layers,
  Search,
  ArrowRight,
  Activity,
  GitBranch,
  Shield,
  Database,
  Download,
  PlusCircle,
  Loader2,
  Eye,
  X,
  Save,
  MessageSquare,
  Sparkles,
  History,
  Trash2,
  Clock,
  FileJson,
  List,
  CheckSquare,
  FileOutput,
  ChevronLeft,
  ChevronDown,
  ClipboardList,
  Timer
} from 'lucide-react';
import RequirementGraph from './visualizations/RequirementGraph';
import ApiDocViewer from './visualizations/ApiDocViewer';
import ImpactMatrix from './visualizations/ImpactMatrix';
import TestScenarios from './visualizations/TestScenarios';
import EffortEstimation from './visualizations/EffortEstimation';

const SmartRequirementAnalysis = ({ project }) => {
  const { refreshTasks } = useTaskMaster();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ step: 0, message: '' });
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [error, setError] = useState('');
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [contextData, setContextData] = useState(null); // Business context data
  
  // File Preview State
  const [previewFile, setPreviewFile] = useState(null); // { path, content }
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // History state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false); // Toggle history sidebar
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [showRefinementInput, setShowRefinementInput] = useState(false);
  
  // Diff View State
  const [showDiff, setShowDiff] = useState(false);
  const [prevSolutionDoc, setPrevSolutionDoc] = useState(null);
  
  // Version History State
  const [currentVersions, setCurrentVersions] = useState([]); // [{ timestamp, action, note, result }]
  const [historyTab, setHistoryTab] = useState('sessions'); // 'sessions' | 'versions'
  
  // Current History Item Metadata (for report view)
  const [currentHistoryItem, setCurrentHistoryItem] = useState(null);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null); // { optimized_text, changes, suggestions }
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  
  // Analysis Mode State
  const [analysisMode, setAnalysisMode] = useState('requirement'); // 'requirement' | 'project_optimization'

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('smartReqHistoryV2');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    } else {
        // Migration from V1 (text only)
        const oldHistory = localStorage.getItem('smartReqHistory');
        if (oldHistory) {
            try {
                const parsed = JSON.parse(oldHistory);
                if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                    const newFormat = parsed.map(text => ({
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(),
                        text: text,
                        summary: text.slice(0, 50) + '...',
                        result: null,
                        versions: []
                    }));
                    setHistory(newFormat);
                    localStorage.setItem('smartReqHistoryV2', JSON.stringify(newFormat));
                }
            } catch (e) {
                console.error('Migration failed', e);
            }
        }
    }
  }, []);

  const saveHistoryItem = (item) => {
      // Update item with current versions
      const itemWithVersions = { ...item, versions: currentVersions };
      const newHistory = [itemWithVersions, ...history.filter(h => h.id !== item.id)].slice(0, 10); // Limit to 10 items
      setHistory(newHistory);
      localStorage.setItem('smartReqHistoryV2', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id, e) => {
      e.stopPropagation();
      const newHistory = history.filter(h => h.id !== id);
      setHistory(newHistory);
      localStorage.setItem('smartReqHistoryV2', JSON.stringify(newHistory));
  };

  const loadHistoryItem = (item) => {
      setText(item.text);
      if (item.result) {
          setResult(item.result);
          setActiveTab('report'); // Switch to Report tab by default
          setPrevSolutionDoc(null);
          setCurrentHistoryItem(item); // Set metadata
          
          // Load versions if available, otherwise init with current result
          if (item.versions && item.versions.length > 0) {
              setCurrentVersions(item.versions);
          } else {
              setCurrentVersions([{
                  timestamp: item.timestamp,
                  action: 'create',
                  note: 'Initial Analysis',
                  result: item.result
              }]);
          }
      }
      setShowHistory(false);
  };

  const handleOptimizeRequirement = async () => {
    if (!text.trim()) {
        alert("请先输入需求描述");
        return;
    }

    setIsOptimizing(true);
    try {
        const res = await fetch('/api/smart-requirement/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                project_name: project?.name
            })
        });
        
        if (!res.ok) throw new Error('Optimization failed');
        const data = await res.json();
        
        setOptimizationResult(data.result);
        setShowOptimizationModal(true);
    } catch (e) {
        console.error(e);
        alert("优化失败: " + e.message);
    } finally {
        setIsOptimizing(false);
    }
  };

  const applyOptimization = () => {
      if (optimizationResult) {
          setText(optimizationResult.optimized_text);
          setShowOptimizationModal(false);
      }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file) => {
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processImageFile(file);
        // e.preventDefault(); // Optional: prevent pasting image into text area if we want to intercept it completely
        break;
      }
    }
  };

  const handleAnalyze = async () => {
    // Validation based on mode
    if (analysisMode === 'requirement' && !text.trim() && !image) {
      setError('Please enter text or upload an image.');
      return;
    }
    // For project optimization, text (focus) is optional but recommended

    setIsLoading(true);
    setProgress({ step: 1, message: analysisMode === 'requirement' ? '正在分析需求意图...' : '正在扫描项目结构...' });
    setError('');
    setResult(null);
    setSelectedTasks(new Set());

    try {
      if (analysisMode === 'project_optimization') {
          // --- Project Optimization Flow ---
          const payload = {
              focus: text, // Use text input as focus area
              project_name: project?.name
          };
          
          const res = await fetch('/api/smart-requirement/optimize-project', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          if (!res.ok) throw new Error(`Optimization Analysis failed: ${res.statusText}`);
          const data = await res.json();
          const finalResult = data.result;
          
          setResult(finalResult);
          setActiveTab('solution'); // Jump to report/solution directly
          
          // Create history item
          saveHistoryItem({
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              text: text || "全项目智能诊断",
              summary: finalResult.analysis.summary,
              result: finalResult,
              versions: []
          });

      } else {
          // --- Standard Requirement Analysis Flow ---
          // Step 1: Analyze Requirement
          const payloadStep1 = {
            text: text,
            project_name: project?.name,
            image_path: image ? image.name : null 
          };

          const res1 = await fetch('/api/smart-requirement/step1-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadStep1)
          });
          if (!res1.ok) throw new Error(`Step 1 Analysis failed: ${res1.statusText}`);
          const data1 = await res1.json();
          const analysis = data1.analysis;

          // Update intermediate result (optional, but good for feedback if we had a way to partial render)
          setProgress({ step: 2, message: `已识别需求类型: ${analysis.type}，正在扫描关联模块...` });

          // Step 2: Match Modules
          const payloadStep2 = {
            keywords: analysis.keywords,
            project_name: project?.name
          };

          const res2 = await fetch('/api/smart-requirement/step2-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadStep2)
          });
          if (!res2.ok) throw new Error(`Step 2 Matching failed: ${res2.statusText}`);
          const data2 = await res2.json();
          const matched_modules = data2.matched_modules;

          setProgress({ step: 2.5, message: `正在分析现有业务逻辑...` });
          
          // Step 2.5: Generate Context (Parallel with Step 3 if we wanted, but let's do sequential for progress clarity)
          try {
              const resContext = await fetch('/api/smart-requirement/step2-5-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matched_modules })
              });
              if (resContext.ok) {
                  const dataContext = await resContext.json();
                  setContextData(dataContext.context);
              }
          } catch (e) {
              console.error("Context generation failed", e);
          }

          setProgress({ step: 3, message: `找到 ${matched_modules.length} 个关联模块，正在生成技术方案...` });

          // Step 3: Generate Solution
          const payloadStep3 = {
            analysis: analysis,
            matched_modules: matched_modules
          };

          const res3 = await fetch('/api/smart-requirement/step3-solution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadStep3)
          });
          if (!res3.ok) throw new Error(`Step 3 Generation failed: ${res3.statusText}`);
          const data3 = await res3.json();

          // Combine all results
          const finalResult = {
            analysis: analysis,
            matched_modules: matched_modules,
            solution_doc: data3.solution_doc,
            execution_plan: data3.execution_plan,
            api_design: data3.api_design,
            effort_estimation: data3.effort_estimation,
            test_scenarios: data3.test_scenarios
          };

          setResult(finalResult);
          setPrevSolutionDoc(null); // Reset previous solution
          setActiveTab('analysis'); // New analysis stays on overview
          setCurrentHistoryItem(null); // Clear history context for new analysis
          
          // Init versions
          const initialVersions = [{
              timestamp: Date.now(),
              action: 'create',
              note: 'Initial Analysis',
              result: finalResult
          }];
          setCurrentVersions(initialVersions);

          // Save to history (V2)
          saveHistoryItem({
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              text: text,
              summary: analysis.summary,
              result: finalResult,
              versions: initialVersions
          });
          
          // Auto-select all tasks by default
          const allTasks = new Set();
          if (data3.execution_plan?.milestones) {
            data3.execution_plan.milestones.forEach(ms => {
                ms.tasks?.forEach(t => allTasks.add(t));
            });
          }
          setSelectedTasks(allTasks);
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setProgress({ step: 0, message: '' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      if (history.length > 0 && historyIndex < history.length - 1) {
        e.preventDefault();
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setText(history[newIndex].text);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex >= 0) {
        e.preventDefault();
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        if (newIndex === -1) {
          setText('');
        } else {
          setText(history[newIndex].text);
        }
      }
    }
  };

  const handleCreateTasks = async () => {
    if (!result?.execution_plan?.milestones || !project?.name) return;
    
    // Check if any task is selected
    if (selectedTasks.size === 0) {
      alert("请至少选择一个任务。");
      return;
    }

    setIsCreatingTasks(true);
    try {
      let createdCount = 0;
      const milestones = result.execution_plan.milestones;
      
      for (const ms of milestones) {
        if (!ms.tasks) continue;
        
        for (const taskDesc of ms.tasks) {
          // Only create selected tasks
          if (!selectedTasks.has(taskDesc)) continue;

          const taskPayload = {
            title: taskDesc,
            description: `Generated from Smart Requirement Analysis.\nMilestone: ${ms.name}\nTarget Date: ${ms.date}`,
            project_name: project.name,
            status: 'pending',
            priority: 'medium',
            tags: ['AI-Generated', 'SmartReq']
          };

          await fetch(`/api/taskmaster/tasks/${encodeURIComponent(project.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskPayload)
          });
          createdCount++;
        }
      }
      
      // Refresh tasks in context
      await refreshTasks();
      alert(`成功创建 ${createdCount} 个任务！`);
      setActiveTab('plan'); // Stay on plan tab
    } catch (err) {
      console.error('Failed to create tasks:', err);
      alert('任务创建失败，请重试。');
    } finally {
      setIsCreatingTasks(false);
    }
  };

  const toggleTaskSelection = (taskDesc) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskDesc)) {
      newSelection.delete(taskDesc);
    } else {
      newSelection.add(taskDesc);
    }
    setSelectedTasks(newSelection);
  };

  const handleViewFile = async (path) => {
    if (!project?.name) return;
    setIsPreviewLoading(true);
    setPreviewFile({ path, content: 'Loading...' });
    
    try {
      const response = await fetch(`/api/project/file-content?path=${encodeURIComponent(path)}&project_name=${encodeURIComponent(project.name)}`);
      if (!response.ok) throw new Error('Failed to load file');
      const data = await response.json();
      setPreviewFile({ path, content: data.content });
    } catch (err) {
      console.error(err);
      setPreviewFile({ path, content: `Error loading file: ${err.message}` });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSaveToProject = async () => {
    if (!result?.solution_doc || !project?.name) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/smart-requirement/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: project.name,
          title: result.analysis.summary.slice(0, 30),
          content: result.solution_doc
        })
      });
      
      if (!response.ok) throw new Error('Failed to save');
      const data = await response.json();
      alert(`已成功保存到项目: ${data.path}`);
    } catch (err) {
      console.error(err);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementText.trim() || !result) return;
    
    setIsRefining(true);
    try {
      const payload = {
        previous_solution: {
            solution_doc: result.solution_doc,
            execution_plan: result.execution_plan
        },
        feedback: refinementText
      };

      const response = await fetch('/api/smart-requirement/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Refinement failed');
      
      const data = await response.json();
      const updated = data.updated_solution;
      
      // Save previous solution for diff view
      setPrevSolutionDoc(result.solution_doc);
      
      // Update local state
      const newResult = {
        ...result,
        solution_doc: updated.solution_doc,
        execution_plan: updated.execution_plan,
        api_design: updated.api_design || result.api_design // Optional update for APIs
      };
      
      setResult(newResult);
      
      // Update versions
      const newVersions = [...currentVersions, {
          timestamp: Date.now(),
          action: 'refine',
          note: refinementText,
          result: newResult
      }];
      setCurrentVersions(newVersions);
      
      // Update history in storage implicitly (by finding current item and updating it)
      // Note: In a real app we would track currentHistoryId. Here we rely on user manually saving or just session state.
      // But to be safe, let's try to update the latest matching history item if it exists
      const currentHistoryItem = history.find(h => h.text === text); // Simple matching by text
      if (currentHistoryItem) {
          saveHistoryItem({ ...currentHistoryItem, result: newResult, versions: newVersions });
      }

      setRefinementText('');
      setShowRefinementInput(false);
      setShowDiff(true); // Auto-show diff after refinement
      alert('方案已根据您的反馈更新！');
      
    } catch (err) {
      console.error(err);
      alert('优化失败，请重试');
    } finally {
      setIsRefining(false);
    }
  };

  const handleExportSolution = () => {
    if (!result?.solution_doc) return;
    
    const blob = new Blob([result.solution_doc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTabs = () => (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
      <button
        onClick={() => setActiveTab('analysis')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'analysis' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Brain className="w-4 h-4" />
        分析概览
      </button>
      <button
        onClick={() => setActiveTab('modules')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'modules' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Code className="w-4 h-4" />
        模块匹配
        {result?.matched_modules?.length > 0 && (
          <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded-full text-xs">
            {result.matched_modules.length}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab('graph')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'graph' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <GitBranch className="w-4 h-4" />
        关联图谱
      </button>
      <button
        onClick={() => setActiveTab('context')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'context' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <List className="w-4 h-4" />
        业务背景
      </button>
      <button
        onClick={() => setActiveTab('api')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'api' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Database className="w-4 h-4" />
        接口文档
      </button>
      <button
        onClick={() => setActiveTab('qa')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'qa' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <ClipboardList className="w-4 h-4" />
        测试验收
      </button>
      <button
        onClick={() => setActiveTab('impact')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'impact' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Shield className="w-4 h-4" />
        影响评估
      </button>
      <button
        onClick={() => setActiveTab('solution')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'solution' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <FileText className="w-4 h-4" />
        技术方案
      </button>
      <button
        onClick={() => setActiveTab('plan')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'plan' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Calendar className="w-4 h-4" />
        执行计划
      </button>
      <button
        onClick={() => setActiveTab('report')}
        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'report' 
            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <FileOutput className="w-4 h-4" />
        完整报告
      </button>
    </div>
  );



  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  const renderContext = () => {
    if (!contextData) {
       return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500 opacity-50" />
          <p>正在深入分析业务逻辑，请稍候...</p>
        </div>
       );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
         {/* 1. Logic Summary */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
               <FileText className="w-5 h-5 text-blue-500" />
               现有业务逻辑说明
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
               {contextData.current_logic}
            </p>
         </div>

         {/* 2. Sequence Diagram */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
               <Activity className="w-5 h-5 text-blue-500" />
               核心流程时序图
            </h3>
            <div className="overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex justify-center">
               <MermaidChart chart={contextData.sequence_diagram} />
            </div>
         </div>

         {/* 3. Domain Terms */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
               <List className="w-5 h-5 text-blue-500" />
               关键业务术语表
            </h3>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500">
                     <tr>
                        <th className="p-3">术语 (Term)</th>
                        <th className="p-3">定义/含义 (Definition)</th>
                     </tr>
                  </thead>
                  <tbody>
                     {contextData.domain_terms.length > 0 ? (
                        contextData.domain_terms.map((term, i) => (
                           <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400">{term.term}</td>
                              <td className="p-3 text-gray-700 dark:text-gray-300">{term.definition}</td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="2" className="p-4 text-center text-gray-400">未提取到特定术语</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    );
  };
  
  // Helper component for Mermaid
  const MermaidChart = ({ chart }) => {
     const ref = React.useRef(null);
     
     useEffect(() => {
        if (chart && ref.current) {
           try {
              ref.current.innerHTML = ''; // Clear previous
              mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then(result => {
                  ref.current.innerHTML = result.svg;
              });
           } catch (e) {
              console.error('Mermaid render error:', e);
              ref.current.innerHTML = '<div class="text-red-500 text-xs">图表生成失败，请检查语法</div>';
           }
        }
     }, [chart]);

     if (!chart) return <div className="text-gray-400 text-sm">暂无流程图数据</div>;

     return <div ref={ref} className="w-full" />;
  };

  const renderAnalysis = () => {
    const { analysis } = result;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            需求摘要
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">需求类型</h4>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{analysis.type}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">复杂度评分</h4>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${analysis.complexity_score * 10}%` }}
                ></div>
              </div>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.complexity_score}/10</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">关键技术词汇</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords.map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-gray-700">
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              核心功能
            </h4>
            <ul className="space-y-2">
              {analysis.key_features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              技术约束
            </h4>
            <ul className="space-y-2">
              {analysis.tech_constraints.map((constraint, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderModules = () => {
    const modules = result.matched_modules;
    if (!modules || modules.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无高置信度的模块匹配结果。</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          基于需求关键词，系统识别出以下相关项目模块：
        </p>
        {modules.map((mod, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                  {mod.path}
                </h4>
                <button 
                  onClick={() => handleViewFile(mod.path)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-blue-600 transition-colors"
                  title="查看源码"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                mod.relevance_score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                mod.relevance_score >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {mod.relevance_score}% 匹配度
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mod.reason}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderReport = () => {
    const { analysis, matched_modules, solution_doc, api_design } = result;
    const metadata = currentHistoryItem || { 
        id: 'current', 
        timestamp: Date.now(), 
        summary: analysis.summary 
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-300 pb-20">
        {/* Report Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                智能需求分析报告
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  生成时间: {new Date(metadata.timestamp).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <FileJson className="w-4 h-4" />
                  版本ID: {metadata.id}
                </span>
              </div>
            </div>
            {currentHistoryItem && (
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                返回历史列表
              </button>
            )}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">需求摘要</h3>
            <p className="text-gray-700 dark:text-gray-300">{analysis.summary}</p>
          </div>
        </div>

        {/* 1. Analysis Process Flow */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            1. 分析过程溯源
          </h2>
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">1</div>
                <h4 className="font-semibold mb-1">意图识别</h4>
                <p className="text-xs text-gray-500">提取关键特征: {analysis.keywords.slice(0,3).join(', ')}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">2</div>
                <h4 className="font-semibold mb-1">上下文扫描</h4>
                <p className="text-xs text-gray-500">匹配项目模块: {matched_modules.length} 个</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">3</div>
                <h4 className="font-semibold mb-1">方案生成</h4>
                <p className="text-xs text-gray-500">生成 API 设计与执行计划</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Visualizations Snapshot */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              2. 影响评估概览
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-80">
               <ImpactMatrix risks={result.execution_plan?.risks} complexity={analysis.complexity_score} matchedModules={matched_modules} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-500" />
              3. 关联模块图谱
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-80">
               <RequirementGraph requirements={analysis} modules={matched_modules} />
            </div>
          </div>
        </section>

        {/* 3. Detailed Solution */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            4. 技术方案详情
          </h2>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm prose dark:prose-invert max-w-none">
            <ReactMarkdown>{solution_doc}</ReactMarkdown>
          </div>
        </section>

        {/* 4. API Design */}
        {api_design && api_design.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              5. 接口设计规范
            </h2>
            <ApiDocViewer modules={matched_modules} apiDesign={api_design} />
          </section>
        )}

        {/* 5. Raw Data (Collapsible) */}
        <section>
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <FileJson className="w-4 h-4" />
              查看原始分析数据 (JSON)
              <span className="ml-auto text-xs text-gray-500 group-open:rotate-180 transition-transform">
                <ChevronDown className="w-4 h-4" />
              </span>
            </summary>
            <div className="mt-2 p-4 bg-gray-900 rounded-lg overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </details>
        </section>
      </div>
    );
  };

  const renderSolution = () => {
    return (
      <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base animate-in fade-in duration-300 relative pb-20">
        <div className="flex justify-end mb-4 gap-2">
          {prevSolutionDoc && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors ${
                showDiff 
                  ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              {showDiff ? '查看最终稿' : '查看变更对比'}
            </button>
          )}
          <button
            onClick={handleSaveToProject}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存到项目
          </button>
          <button
            onClick={handleExportSolution}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出方案 (Markdown)
          </button>
        </div>

        {showDiff && prevSolutionDoc ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-500">
              <span>原始方案</span>
              <span>优化后方案</span>
            </div>
            <CodeMirrorMerge
              original={prevSolutionDoc}
              modified={result.solution_doc}
              height="500px"
              theme={oneDark}
              extensions={[markdown(), EditorView.lineWrapping]}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <ReactMarkdown>{result.solution_doc}</ReactMarkdown>
          </div>
        )}

        {/* Floating Refinement Button */}
        <div className="fixed bottom-8 right-8 flex flex-col items-end gap-2 z-40">
           {showRefinementInput && (
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-80 animate-in slide-in-from-bottom-5">
               <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-purple-500" />
                 AI 优化助手
               </h4>
               <textarea
                 value={refinementText}
                 onChange={(e) => setRefinementText(e.target.value)}
                 placeholder="例如：请增加单元测试环节，或者将数据库改为 PostgreSQL..."
                 className="w-full h-24 p-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 mb-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
               />
               <div className="flex justify-end gap-2">
                 <button 
                   onClick={() => setShowRefinementInput(false)}
                   className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                 >
                   取消
                 </button>
                 <button 
                   onClick={handleRefine}
                   disabled={isRefining || !refinementText.trim()}
                   className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                 >
                   {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : '提交优化'}
                 </button>
               </div>
             </div>
           )}
           <button
             onClick={() => setShowRefinementInput(!showRefinementInput)}
             className={`p-3 rounded-full shadow-lg transition-all ${
               showRefinementInput 
                 ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rotate-45' 
                 : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-110'
             }`}
             title="优化方案"
           >
             {showRefinementInput ? <PlusCircle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
           </button>
        </div>
      </div>
    );
  };

  const renderPlan = () => {
    const { execution_plan, effort_estimation } = result;
    const { milestones, risks } = execution_plan || { milestones: [], risks: [] };

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Effort Estimation Widget */}
        {effort_estimation && (
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Timer className="w-5 h-5 text-blue-500" />
                    资源与工时评估
                </h3>
                <EffortEstimation estimation={effort_estimation} />
            </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            项目时间线与里程碑
          </h3>
          <div className="flex justify-end mb-4 -mt-10">
            <button
              onClick={handleCreateTasks}
              disabled={isCreatingTasks}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm ${
                isCreatingTasks ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isCreatingTasks ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在创建...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  一键生成任务
                </>
              )}
            </button>
          </div>
          <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8 pb-4">
            {milestones.length === 0 && (
              <div className="pl-8 text-gray-500 dark:text-gray-400 italic">
                暂无里程碑计划。请尝试优化需求描述并重新分析。
              </div>
            )}
            {milestones.map((ms, i) => (
              <div key={i} className="relative pl-8">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-2 border-blue-500"></span>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{ms.name}</h4>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {ms.date}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {ms.tasks?.map((task, j) => (
                      <li key={j} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded" onClick={() => toggleTaskSelection(task)}>
                         <div className={`w-4 h-4 mt-0.5 border rounded flex items-center justify-center transition-colors ${
                          selectedTasks.has(task) 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800'
                        }`}>
                          {selectedTasks.has(task) && <CheckCircle className="w-3 h-3" />}
                        </div>
                        <span className={selectedTasks.has(task) ? 'text-gray-900 dark:text-white' : ''}>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {risks && risks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              风险评估
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risks.map((risk, i) => (
                <div key={i} className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">{risk.risk}</h4>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <span className="font-medium">应对措施:</span> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const restoreVersion = (version) => {
      setResult(version.result);
      setPrevSolutionDoc(null);
      // Don't update currentVersions array, just restore view
      alert(`已恢复到版本: ${version.note}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
      {/* History Sidebar */}
      {showHistory && (
        <>
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setShowHistory(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <History className="w-4 h-4 text-blue-500" />
                  历史记录
                </h3>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Sidebar Tabs */}
              <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setHistoryTab('sessions')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    historyTab === 'sessions' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  分析会话
                </button>
                <button
                  onClick={() => setHistoryTab('versions')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    historyTab === 'versions' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  当前版本流
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyTab === 'sessions' ? (
                // Sessions List
                history.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    暂无历史记录
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id} 
                      className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer shadow-sm"
                      onClick={() => loadHistoryItem(item)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-400 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"
                          title="删除记录"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 font-medium mb-2">
                        {item.summary}
                      </p>
                      {item.result ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                              {item.result.analysis?.type || 'Unknown'}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span className={`${
                              (item.result.analysis?.complexity_score || 0) > 7 ? 'text-red-500' : 
                              (item.result.analysis?.complexity_score || 0) > 4 ? 'text-yellow-500' : 
                              'text-green-500'
                            }`}>
                              复杂度: {item.result.analysis?.complexity_score || 0}/10
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(item.result.analysis?.keywords || []).slice(0, 3).map((kw, k) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700">
                                {kw}
                              </span>
                            ))}
                            {(item.result.analysis?.keywords || []).length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                                +{item.result.analysis.keywords.length - 3}
                              </span>
                            )}
                          </div>
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                             <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               点击恢复 <ArrowRight className="w-3 h-3" />
                             </span>
                          </div>
                        </div>
                      ) : (
                          <div className="mt-2 flex gap-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded border border-gray-200 dark:border-gray-700">
                                  仅文本草稿
                              </span>
                          </div>
                      )}
                    </div>
                  ))
                )
              ) : (
                // Versions List
                currentVersions.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    当前会话暂无版本历史
                  </div>
                ) : (
                  <div className="space-y-4 relative pl-4 border-l border-gray-200 dark:border-gray-700 ml-2">
                    {currentVersions.map((ver, i) => (
                      <div key={i} className="relative">
                        <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${
                          i === currentVersions.length - 1 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                        }`}></span>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              {ver.action === 'create' ? '初始分析' : '优化调整'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(ver.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 italic">
                            "{ver.note.length > 40 ? ver.note.slice(0, 40) + '...' : ver.note}"
                          </p>
                          <div className="flex justify-end">
                            <button
                              onClick={() => restoreVersion(ver)}
                              className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                            >
                              恢复此版本
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* Optimization Modal */}
      {showOptimizationModal && optimizationResult && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          需求描述智能优化
                      </h3>
                      <button onClick={() => setShowOptimizationModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                          <X className="w-5 h-5 text-gray-500" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                      {/* Comparison View */}
                      <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full overflow-hidden">
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 flex justify-between">
                              <span>原始描述</span>
                              <span>优化后描述</span>
                          </div>
                          <div className="flex-1 overflow-auto">
                              <CodeMirrorMerge
                                  original={text}
                                  modified={optimizationResult.optimized_text}
                                  height="100%"
                                  theme={oneDark}
                                  extensions={[markdown(), EditorView.lineWrapping]}
                              />
                          </div>
                      </div>
                      
                      {/* Sidebar Info */}
                      <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              优化点 ({optimizationResult.changes.length})
                          </h4>
                          <ul className="space-y-2 mb-6">
                              {optimizationResult.changes.map((change, i) => (
                                  <li key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                                      {change}
                                  </li>
                              ))}
                          </ul>

                          {optimizationResult.suggestions.length > 0 && (
                              <>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-amber-600">
                                      <AlertTriangle className="w-4 h-4" />
                                      建议补充
                                  </h4>
                                  <ul className="space-y-2">
                                      {optimizationResult.suggestions.map((sugg, i) => (
                                          <li key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                                              {sugg}
                                          </li>
                                      ))}
                                  </ul>
                              </>
                          )}
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-end gap-3">
                      <button 
                          onClick={() => setShowOptimizationModal(false)}
                          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                          取消
                      </button>
                      <button 
                          onClick={applyOptimization}
                          className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-2"
                      >
                          <CheckSquare className="w-4 h-4" />
                          采纳优化结果
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-mono text-sm font-semibold flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-500" />
                {previewFile.path}
              </h3>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4 text-sm">
              {isPreviewLoading && previewFile.content === 'Loading...' ? (
                <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading file content...
                </div>
              ) : (
                <SyntaxHighlighter
                  language={previewFile.path.endsWith('.py') ? 'python' : 'javascript'}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
                  showLineNumbers={true}
                >
                  {previewFile.content}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            智能需求分析
          </h2>
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <Clock className="w-4 h-4" />
            历史记录
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          基于 AI 的智能分析系统，可自动解析需求、匹配项目模块并生成执行计划。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Mode Switcher */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
                 <button
                   onClick={() => setAnalysisMode('requirement')}
                   className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                     analysisMode === 'requirement'
                       ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                       : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                   }`}
                 >
                   ✨ 新功能开发
                 </button>
                 <button
                   onClick={() => setAnalysisMode('project_optimization')}
                   className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                     analysisMode === 'project_optimization'
                       ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-white shadow-sm'
                       : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                   }`}
                 >
                   🛠️ 项目优化诊断
                 </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {analysisMode === 'requirement' ? '需求描述' : '诊断关注点 (可选)'}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                    analysisMode === 'requirement' 
                    ? "请详细描述您的功能需求... (按 ↑/↓ 键查看历史记录，支持 Ctrl+V 粘贴图片)"
                    : "例如：优化数据库查询性能、检查代码规范、重构核心业务逻辑... (留空则进行全项目扫描)"
                }
                className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
              />
            </div>

            {analysisMode === 'requirement' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                设计图 / 原型图 (可选)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  <span>上传图片</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {image && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {image.name}
                    <button onClick={() => { setImage(null); setImagePreview(null); }} className="text-red-500 hover:text-red-700">×</button>
                  </span>
                )}
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700" />
                </div>
              )}
            </div>
            )}

            <div className="flex justify-end gap-3">
              {analysisMode === 'requirement' && (
              <button
                onClick={handleOptimizeRequirement}
                disabled={isOptimizing || !text.trim()}
                className={`px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 ${
                  (isOptimizing || !text.trim()) ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                 {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                 AI 润色需求
              </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow flex items-center gap-2 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progress.message || '正在分析...'}
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    {analysisMode === 'requirement' ? '开始分析' : '开始诊断'}
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[500px] flex flex-col">
              <div className="p-2">
                {renderTabs()}
              </div>
              <div className="p-6 pt-2 flex-1">
                {activeTab === 'analysis' && renderAnalysis()}
                {activeTab === 'modules' && renderModules()}
                {activeTab === 'graph' && <RequirementGraph requirements={result.analysis} modules={result.matched_modules} onNodeClick={(path) => handleViewFile(path)} />}
                {activeTab === 'context' && renderContext()}
                {activeTab === 'api' && <ApiDocViewer modules={result.matched_modules} apiDesign={result.api_design} existingApis={contextData?.existing_apis || []} />}
                {activeTab === 'qa' && <TestScenarios scenarios={result.test_scenarios} />}
                {activeTab === 'impact' && <ImpactMatrix risks={result.execution_plan?.risks} complexity={result.analysis.complexity_score} matchedModules={result.matched_modules} />}
                {activeTab === 'solution' && renderSolution()}
                {activeTab === 'plan' && renderPlan()}
                {activeTab === 'report' && renderReport()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartRequirementAnalysis;
