/**
 * Interview Preparation Component
 * 项目面试准备页面 - 针对选中的项目生成面试问题
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Code2, BrainCircuit, Target, TrendingUp,
  CheckCircle2, Clock, Award, Lightbulb, FileText,
  ChevronRight, PlayCircle, PauseCircle, RefreshCw,
  Sparkles, FolderTree, GitBranch, Database, Globe, MessageSquare, Send,
  Save, Download, History, Mic, MicOff, Timer, Star, TrendingUp as TrendingUpIcon,
  BarChart3, Zap, AlertCircle
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { authenticatedFetch } from '../utils/api';
import IFlowModelSelector from './IFlowModelSelector';
import ReactMarkdown from 'react-markdown';
import OCRBlocksOverlay from './OCRBlocksOverlay';

const InterviewPreparation = ({ selectedProject }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answers, setAnswers] = useState({});
  const [projectAnalysis, setProjectAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatOnlyMode, setChatOnlyMode] = useState(true); // 默认为仅聊天模式
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // 新增状态
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [currentInterviewId, setCurrentInterviewId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState('');
  
  // 多轮面试模式状态
  const [multiRoundMode, setMultiRoundMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds] = useState(5);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [currentRoundQuestionIndex, setCurrentRoundQuestionIndex] = useState(0);
  const [roundAnswers, setRoundAnswers] = useState([]);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  
  // 复盘功能状态
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [highlightedPoints, setHighlightedPoints] = useState([]);
  const [learningPlan, setLearningPlan] = useState([]);
  
  // 简历面试状态
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeContent, setResumeContent] = useState('');
  
  // 面试评分系统状态
  const [interviewScores, setInterviewScores] = useState({});
  const [overallScore, setOverallScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
    codeQuality: 0,
    systemDesign: 0
  });
  const [showScorePanel, setShowScorePanel] = useState(false);
  const scorePanelRef = useRef(null);
  
  // 学习进度追踪状态
  const [knowledgePoints, setKnowledgePoints] = useState([
    { id: 1, name: 'JavaScript/TypeScript', category: '前端', progress: 0, total: 10 },
    { id: 2, name: 'React', category: '前端', progress: 0, total: 10 },
    { id: 3, name: '算法与数据结构', category: '基础', progress: 0, total: 10 },
    { id: 4, name: '系统设计', category: '架构', progress: 0, total: 10 },
    { id: 5, name: '数据库', category: '后端', progress: 0, total: 10 },
    { id: 6, name: 'API 设计', category: '后端', progress: 0, total: 10 },
    { id: 7, name: '性能优化', category: '进阶', progress: 0, total: 10 },
    { id: 8, name: '安全', category: '进阶', progress: 0, total: 10 }
  ]);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [progressTab, setProgressTab] = useState('progress');
  const [recommendations, setRecommendations] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [isResumeMode, setIsResumeMode] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadStage, setUploadStage] = useState('');
  const [resumePreview, setResumePreview] = useState(null);
  const [resumePreviewPageIndex, setResumePreviewPageIndex] = useState(0);
  const [resumePreviewBlockIndex, setResumePreviewBlockIndex] = useState(null);
  
  // 从 localStorage 读取模型，与主聊天页面保持一致
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('iflow-model') || 'GLM-4.7';
  });

  // 监听模型变化
  useEffect(() => {
    const handleModelChange = (event) => {
      setSelectedModel(event.detail.model);
    };
    
    window.addEventListener('iflow-model-changed', handleModelChange);
    
    return () => {
      window.removeEventListener('iflow-model-changed', handleModelChange);
    };
  }, []);

  // 分析项目
  useEffect(() => {
    if (selectedProject) {
      analyzeProject(selectedProject);
    }
  }, [selectedProject]);

  // 加载面试历史
  useEffect(() => {
    loadInterviewHistory();
  }, []);

  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
      setQuestionTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadInterviewHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('interview_history') || '[]');
      // 加载时去重，防止历史数据中已有重复 ID 导致 key 冲突
      const uniqueHistory = [];
      const seenIds = new Set();
      
      for (const item of history) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueHistory.push(item);
        }
      }
      
      setInterviewHistory(uniqueHistory);
    } catch (error) {
      console.error('Failed to load interview history:', error);
    }
  };

  const saveInterviewRecord = () => {
    console.log('[Interview] 点击保存记录按钮');
    if (chatMessages.length === 0) {
      console.warn('[Interview] 没有聊天消息,无法保存记录');
      alert('请先进行一些对话,然后再保存记录');
      return;
    }

    const record = {
      id: currentInterviewId || Date.now(),
      projectId: selectedProject?.id || selectedProject?.path,
      projectName: selectedProject?.name,
      date: new Date().toISOString(),
      duration: timer,
      messages: chatMessages,
      model: selectedModel,
      chatOnlyMode
    };

    try {
      const history = JSON.parse(localStorage.getItem('interview_history') || '[]');
      // 过滤掉已存在的同 ID 记录，避免 key 重复
      const filteredHistory = history.filter(r => r.id !== record.id);
      const updatedHistory = [record, ...filteredHistory].slice(0, 50); // 保留最近50条
      localStorage.setItem('interview_history', JSON.stringify(updatedHistory));
      setInterviewHistory(updatedHistory);
      setCurrentInterviewId(record.id);
      console.log('[Interview] 面试记录保存成功');
      alert('✅ 面试记录保存成功!');
    } catch (error) {
      console.error('Failed to save interview record:', error);
      alert('❌ 保存失败: ' + error.message);
    }
  };

  const startNewInterview = () => {
    setCurrentInterviewId(Date.now());
    setChatMessages([]);
    setTimer(0);
    setQuestionTimer(0);
    setEvaluation(null);
    setIsResumeMode(false);
    setResumeFile(null);
    setResumeContent('');
    setResumePreview(null);
    setResumePreviewPageIndex(0);
    setResumePreviewBlockIndex(null);
  };

  const revokePreviewUrls = (preview) => {
    try {
      const pages = preview?.pages || [];
      pages.forEach((p) => {
        if (p?.preview_image && typeof p.preview_image === 'string' && p.preview_image.startsWith('blob:')) {
          URL.revokeObjectURL(p.preview_image);
        }
      });
    } catch (e) {
    }
  };

  const fetchPreviewObjectUrl = async (url) => {
    if (!url) return null;
    const resp = await authenticatedFetch(url, { method: 'GET' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    console.log('[简历上传] 文件选择:', file);
    if (!file) return;

    setIsUploadingResume(true);
    setUploadProgress('正在读取文件...');
    setUploadStage('reading');
    
    try {
      let content = '';
      console.log('[简历上传] 文件类型:', file.type, '文件名:', file.name, '文件大小:', file.size);
      
      // 根据文件类型处理
      if (file.type === 'application/pdf') {
        setUploadProgress('正在读取 PDF 文件...');
        setUploadStage('reading');
        console.log('[简历上传] 开始处理 PDF 文件...');
        
        const projectName = selectedProject?.name || 'default';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('technology', 'rapidocr');
        formData.append('dpi', '200');
        formData.append('preprocess', 'true');
        formData.append('deskew', 'true');
        formData.append('max_side', '2200');
        formData.append('return_images', 'true');
        formData.append('preview_max_side', '900');
        formData.append('max_preview_pages', '1');

        setUploadProgress('正在进行 OCR 文字识别...');
        setUploadStage('ocr');
        console.log('[简历上传] 发送 OCR 请求（上传文件）...');

        const response = await authenticatedFetch(`/api/projects/${encodeURIComponent(projectName)}/ocr/recognize`, {
          method: 'POST',
          body: formData,
        });

        console.log('[简历上传] OCR 响应状态:', response.status);

        const rawText = await response.text().catch(() => '');
        let result = {};
        try {
          result = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
          result = {};
        }
        if (response.ok) {
          console.log('[简历上传] OCR 结果:', result);
          if (result && result.success === false) {
            throw new Error(result.detail || result.error || 'PDF 处理失败');
          }
          content = result.text || result.content || '';
          if (!content || String(content).trim().length === 0) {
            const pageTexts = (result.pages || [])
              .map((p) => p?.text)
              .filter((t) => t && String(t).trim().length > 0)
              .join('\n\n');
            if (pageTexts) content = pageTexts;
          }
          if (!content || String(content).trim().length === 0) {
            const blockTexts = (result.pages || [])
              .flatMap((p) => p?.blocks || [])
              .map((b) => b?.text)
              .filter((t) => t && String(t).trim().length > 0)
              .join('\n');
            if (blockTexts) content = blockTexts;
          }
          console.log('[简历上传] 提取文本长度:', content?.length || 0);
          const pagesWithPreview = (result.pages || []).filter((p) => p && p.preview_url);
          if (pagesWithPreview.length > 0) {
            const p0 = pagesWithPreview[0];
            const objectUrl = await fetchPreviewObjectUrl(p0.preview_url);
            revokePreviewUrls(resumePreview);
            const pages = [
              {
                page: p0.page,
                preview_image: objectUrl,
                width: p0.width,
                height: p0.height,
                blocks: p0.blocks || [],
              },
            ].filter((p) => p.preview_image);
            setResumePreview(pages.length ? { kind: 'pdf', pages } : null);
          } else {
            revokePreviewUrls(resumePreview);
            setResumePreview(null);
          }
          setResumePreviewPageIndex(0);
          setResumePreviewBlockIndex(null);
        } else {
          console.error('[简历上传] OCR 错误:', result);
          const message = result.detail || result.error || rawText || 'PDF 处理失败';
          throw new Error(message);
        }
      } else if (file.type === 'text/plain') {
        setUploadProgress('正在读取文本文件...');
        setUploadStage('reading');
        console.log('[简历上传] 开始处理 TXT 文件...');
        // TXT 文件 - 直接读取
        content = await readFileAsText(file);
        console.log('[简历上传] TXT 内容长度:', content?.length || 0);
        revokePreviewUrls(resumePreview);
        setResumePreview(null);
        setResumePreviewPageIndex(0);
        setResumePreviewBlockIndex(null);
      } else if (file.type?.startsWith('image/')) {
        setUploadProgress('正在读取图片文件...');
        setUploadStage('reading');
        console.log('[简历上传] 开始处理图片文件...');

        const projectName = selectedProject?.name || 'default';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('technology', 'rapidocr');
        formData.append('preprocess', 'true');
        formData.append('deskew', 'true');
        formData.append('max_side', '2200');
        formData.append('return_images', 'true');
        formData.append('preview_max_side', '900');

        setUploadProgress('正在进行 OCR 文字识别...');
        setUploadStage('ocr');
        console.log('[简历上传] 发送 OCR 请求（上传图片）...');

        const response = await authenticatedFetch(`/api/projects/${encodeURIComponent(projectName)}/ocr/recognize`, {
          method: 'POST',
          body: formData,
        });

        console.log('[简历上传] OCR 响应状态:', response.status);

        const rawText = await response.text().catch(() => '');
        let result = {};
        try {
          result = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
          result = {};
        }
        if (response.ok) {
          console.log('[简历上传] OCR 结果:', result);
          if (result && result.success === false) {
            throw new Error(result.detail || result.error || '图片 OCR 处理失败');
          }
          content = result.text || result.content || '';
          if ((!content || String(content).trim().length === 0) && Array.isArray(result.blocks)) {
            const blockTexts = result.blocks
              .map((b) => b?.text)
              .filter((t) => t && String(t).trim().length > 0)
              .join('\n');
            if (blockTexts) content = blockTexts;
          }
          console.log('[简历上传] 提取文本长度:', content?.length || 0);
          if (result.preview_url) {
            const objectUrl = await fetchPreviewObjectUrl(result.preview_url);
            revokePreviewUrls(resumePreview);
            setResumePreview(
              objectUrl
                ? {
                    kind: 'image',
                    pages: [
                      {
                        page: 1,
                        preview_image: objectUrl,
                        width: result.processed_width || result.width,
                        height: result.processed_height || result.height,
                        blocks: result.blocks || [],
                      },
                    ],
                  }
                : null
            );
          } else {
            revokePreviewUrls(resumePreview);
            setResumePreview(null);
          }
          setResumePreviewPageIndex(0);
          setResumePreviewBlockIndex(null);
        } else {
          console.error('[简历上传] OCR 错误:', result);
          const message = result.detail || result.error || rawText || '图片 OCR 处理失败';
          throw new Error(message);
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.type === 'application/msword') {
        // DOC/DOCX 文件 - 提示用户转换为 PDF 或 TXT
        throw new Error('请将 Word 文档转换为 PDF 或 TXT 格式后再上传');
      } else {
        throw new Error('不支持的文件格式,请上传 PDF/TXT 或图片文件');
      }

      console.log('[简历上传] 提取的内容长度:', content?.length || 0);

      if (!content || content.trim().length === 0) {
        throw new Error('无法提取简历内容,可能是扫描件/图片过糊/字体过小。建议提高 PDF DPI 或上传更清晰的图片');
      }

      setUploadProgress('正在处理简历内容...');
      setUploadStage('processing');
      
      setResumeContent(content);
      setResumeFile(file);
      setIsResumeMode(true);
      
      console.log('[简历上传] 简历上传成功，设置聊天消息');
      
          // 添加系统消息
      setChatMessages([{
        role: 'ai',
        content: `✅ 简历已上传成功!\n\n**文件名**: ${file.name}\n**文件大小**: ${(file.size / 1024).toFixed(2)} KB\n**提取文本长度**: ${content.length} 字符\n\n简历内容:\n\n${content}\n\n现在我将根据这份简历开始面试。`
      }]);
      
      alert(`✅ 简历上传成功!\n\n文件名: ${file.name}\n提取文本: ${content.length} 字符\n\n现在将根据简历进行面试。`);
} catch (error) {
      console.error('简历上传失败:', error);
      
      // 提供更详细的错误信息和解决方案
      let errorMessage = '简历上传失败';
      let solution = '';
      
      if (error.message.includes('所有 OCR 服务都不可用')) {
        errorMessage = 'OCR 服务未安装';
        solution = '请安装小型 OCR 依赖: backend/requirements-ocr-small.txt';
      } else if (error.message.includes('网络') || error.message.includes('SSLError')) {
        errorMessage = '网络连接失败';
        solution = '请检查网络连接,或配置代理访问 Hugging Face';
      } else if (error.message.includes('模型不可用')) {
        errorMessage = 'OCR 模型加载失败';
        solution = '请安装 backend/requirements-ocr-small.txt，并确认 onnxruntime 可用';
      } else if (error.message.includes('不支持的文件格式')) {
        errorMessage = '不支持的文件格式';
        solution = '请将简历转换为 PDF/TXT 或上传清晰图片';
      } else {
        errorMessage = error.message || '未知错误';
        solution = '请检查文件格式和网络连接';
      }
      
      alert(`❌ ${errorMessage}\n\n💡 解决方案:\n${solution}\n\n详细错误: ${error.message}`);
    } finally {
      setIsUploadingResume(false);
      setUploadProgress('');
      setUploadStage('');
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  const loadInterview = (record) => {
    setCurrentInterviewId(record.id);
    setChatMessages(record.messages);
    setTimer(record.duration);
    setQuestionTimer(0);
    setEvaluation(null);
    setShowEvaluation(false);
  };

  const exportInterview = (format = 'markdown') => {
    const record = interviewHistory.find(r => r.id === currentInterviewId);
    if (!record) return;

    let content = '';
    const filename = `interview_${record.projectName}_${new Date(record.date).toISOString().split('T')[0]}`;

    if (format === 'markdown') {
      content = `# 面试记录 - ${record.projectName}\n\n`;
      content += `**日期**: ${new Date(record.date).toLocaleString('zh-CN')}\n`;
      content += `**时长**: ${Math.floor(timer / 60)}分${timer % 60}秒\n`;
      content += `**模型**: ${record.model}\n\n`;
      content += `---\n\n`;
      record.messages.forEach((msg, index) => {
        content += `## ${msg.role === 'user' ? '你' : '面试官'}\n\n${msg.content}\n\n`;
      });
    } else if (format === 'json') {
      content = JSON.stringify(record, null, 2);
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analyzeProject = async (project) => {
    setLoading(true);
    try {
      // 根据项目路径分析项目结构
      const response = await authenticatedFetch('/api/analyze-project-for-interview', {
        method: 'POST',
        body: JSON.stringify({ project_path: project.path }),
      });

      if (response.ok) {
        const data = await response.json();
        setProjectAnalysis(data);
        generateQuestions(data);
      }
    } catch (error) {
      console.error('Failed to analyze project:', error);
      // 使用默认分析
      setProjectAnalysis(generateDefaultAnalysis(project));
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultAnalysis = (project) => {
    return {
      project_name: project.name,
      tech_stack: {
        languages: ['JavaScript', 'TypeScript', 'Python'],
        frameworks: ['React', 'Node.js', 'Express'],
        databases: ['PostgreSQL', 'MongoDB'],
        tools: ['Git', 'Docker', 'Webpack']
      },
      features: [],
      architecture: '前后端分离架构',
      complexity: '中等'
    };
  };

  const generateQuestions = (analysis) => {
    const techStack = analysis.tech_stack || {};
    const languages = techStack.languages || [];
    const frameworks = techStack.frameworks || [];
    const databases = techStack.databases || [];

    // 根据技术栈动态生成题目
    const techQuestions = [];

    // JavaScript/TypeScript 题目
    if (languages.some(l => ['JavaScript', 'TypeScript'].includes(l))) {
      techQuestions.push({
        category: 'JavaScript/TypeScript',
        questions: [
          {
            id: 'js-1',
            question: '请解释 JavaScript 的事件循环机制',
            difficulty: '中等',
            keyPoints: ['宏任务', '微任务', '调用栈', '执行顺序']
          },
          {
            id: 'js-2',
            question: 'TypeScript 相比 JavaScript 有哪些优势？',
            difficulty: '基础',
            keyPoints: ['类型系统', '编译时检查', 'IDE 支持', '可维护性']
          },
          {
            id: 'js-3',
            question: '请解释闭包的概念及其应用场景',
            difficulty: '中等',
            keyPoints: ['词法作用域', '内存管理', '模块化', '封装']
          },
          {
            id: 'js-4',
            question: '如何优化 React 组件的性能？',
            difficulty: '困难',
            keyPoints: ['useMemo', 'useCallback', 'React.memo', '虚拟化']
          }
        ]
      });
    }

    // Python 题目
    if (languages.some(l => ['Python'].includes(l))) {
      techQuestions.push({
        category: 'Python',
        questions: [
          {
            id: 'py-1',
            question: '请解释 Python 的 GIL（全局解释器锁）',
            difficulty: '中等',
            keyPoints: ['线程安全', '多线程限制', '多进程替代', '性能影响']
          },
          {
            id: 'py-2',
            question: 'Python 中的装饰器是如何工作的？',
            difficulty: '中等',
            keyPoints: ['函数作为对象', '闭包', '语法糖', '应用场景']
          },
          {
            id: 'py-3',
            question: '请解释 Python 的内存管理机制',
            difficulty: '困难',
            keyPoints: ['引用计数', '垃圾回收', '内存池', '循环引用']
          }
        ]
      });
    }

    // React 题目
    if (frameworks.some(f => ['React', 'Next.js'].includes(f))) {
      techQuestions.push({
        category: 'React',
        questions: [
          {
            id: 'react-1',
            question: '请解释 React 的虚拟 DOM 和 Diff 算法',
            difficulty: '中等',
            keyPoints: ['虚拟 DOM', 'Diff 算法', '性能优化', 'Reconciliation']
          },
          {
            id: 'react-2',
            question: 'React Hooks 相比类组件有哪些优势？',
            difficulty: '基础',
            keyPoints: ['函数组件', '状态逻辑复用', '代码简洁', '性能']
          },
          {
            id: 'react-3',
            question: '请解释 React 的状态管理方案',
            difficulty: '中等',
            keyPoints: ['useState', 'useContext', 'Redux', '状态提升']
          },
          {
            id: 'react-4',
            question: '如何处理 React 中的异步操作？',
            difficulty: '中等',
            keyPoints: ['useEffect', 'Promise', 'async/await', '错误处理']
          }
        ]
      });
    }

    // Node.js 题目
    if (frameworks.some(f => ['Node.js', 'Express'].includes(f))) {
      techQuestions.push({
        category: 'Node.js',
        questions: [
          {
            id: 'node-1',
            question: '请解释 Node.js 的事件驱动架构',
            difficulty: '中等',
            keyPoints: ['事件循环', '非阻塞 I/O', '回调', '异步编程']
          },
          {
            id: 'node-2',
            question: '如何处理 Node.js 中的错误？',
            difficulty: '基础',
            keyPoints: ['try-catch', '错误事件', '错误中间件', '日志记录']
          },
          {
            id: 'node-3',
            question: '请解释 Node.js 的模块系统',
            difficulty: '基础',
            keyPoints: ['CommonJS', 'ES Modules', 'require', 'import']
          }
        ]
      });
    }

    // 数据库题目
    if (databases.length > 0) {
      const dbQuestions = [];
      
      if (databases.some(d => ['PostgreSQL', 'MySQL', 'SQLite'].includes(d))) {
        dbQuestions.push(
          {
            id: 'sql-1',
            question: '请解释 SQL 中的索引及其作用',
            difficulty: '中等',
            keyPoints: ['索引类型', '查询优化', 'B树', '性能影响']
          },
          {
            id: 'sql-2',
            question: '如何优化 SQL 查询性能？',
            difficulty: '困难',
            keyPoints: ['索引优化', '查询计划', '避免全表扫描', '连接优化']
          }
        );
      }
      
      if (databases.some(d => ['MongoDB', 'Redis'].includes(d))) {
        dbQuestions.push(
          {
            id: 'nosql-1',
            question: 'NoSQL 数据库相比关系型数据库有哪些优势？',
            difficulty: '中等',
            keyPoints: ['灵活性', '水平扩展', 'Schema-less', '性能']
          }
        );
      }

      if (dbQuestions.length > 0) {
        techQuestions.push({
          category: '数据库',
          questions: dbQuestions
        });
      }
    }

    // 通用项目题目
    const generalQuestions = [
      {
        category: '项目介绍',
        questions: [
          {
            id: 'proj-1',
            question: `请介绍一下 ${analysis.project_name} 这个项目`,
            difficulty: '基础',
            keyPoints: ['项目背景', '核心功能', '技术栈', '个人贡献']
          },
          {
            id: 'proj-2',
            question: '你在项目中主要负责哪些模块？',
            difficulty: '基础',
            keyPoints: ['负责模块', '具体工作', '技术难点', '成果']
          }
        ]
      },
      {
        category: '技术实现',
        questions: [
          {
            id: 'tech-1',
            question: `项目中使用了 ${frameworks.join(', ') || '相关技术'} 等技术，为什么选择这些技术？`,
            difficulty: '中等',
            keyPoints: ['技术选型理由', '优缺点对比', '适用场景']
          },
          {
            id: 'tech-2',
            question: '请描述一下项目的架构设计',
            difficulty: '中等',
            keyPoints: ['整体架构', '模块划分', '数据流', '技术选型']
          }
        ]
      },
      {
        category: '问题解决',
        questions: [
          {
            id: 'prob-1',
            question: '项目中遇到的最大技术挑战是什么？你是如何解决的？',
            difficulty: '困难',
            keyPoints: ['问题描述', '解决方案', '技术细节', '收获体会']
          },
          {
            id: 'prob-2',
            question: '有没有遇到过性能问题？如何优化的？',
            difficulty: '中等',
            keyPoints: ['性能瓶颈', '优化方案', '效果对比', '经验总结']
          }
        ]
      },
      {
        category: '团队协作',
        questions: [
          {
            id: 'team-1',
            question: '你是如何与团队成员协作的？',
            difficulty: '基础',
            keyPoints: ['沟通方式', '代码审查', 'Git 工作流', '文档']
          },
          {
            id: 'team-2',
            question: '如何处理团队中的技术分歧？',
            difficulty: '中等',
            keyPoints: ['沟通技巧', '技术论证', '折中方案', '团队决策']
          }
        ]
      }
    ];

    // 合并所有题目
    const allQuestions = [...generalQuestions, ...techQuestions];
    setQuestions(allQuestions);
  };

  // 常见问题
  const faqs = [
    {
      question: '如何准备项目介绍？',
      answer: '从项目背景、你的角色、使用的技术、遇到的问题和解决方案这几个方面准备，突出你的贡献和成果。'
    },
    {
      question: '面试官问"项目中遇到的最大挑战"怎么回答？',
      answer: '使用 STAR 法则：描述情境（Situation）、任务（Task）、行动（Action）和结果（Result），重点突出你的思考过程和解决问题的能力。'
    },
    {
      question: '如何展示项目的技术深度？',
      answer: '准备 2-3 个技术细节问题，比如架构设计、性能优化、并发处理等，展示你对技术的理解深度。'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>正在分析项目...</span>
          </div>
        </div>
      ) : projectAnalysis ? (
        <>
          {/* 丰富的渐变头部 */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {selectedProject?.name || '未选择项目'}
                </h2>
                <p className="text-blue-100 mb-4 text-sm">
                  {selectedProject?.path || '请先选择一个项目'}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    projectAnalysis.complexity === '高' ? 'bg-red-500/30' :
                    projectAnalysis.complexity === '中' ? 'bg-yellow-500/30' :
                    'bg-green-500/30'
                  }`}>
                    复杂度: {projectAnalysis.complexity || '未知'}
                  </span>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {projectAnalysis.file_count || 0} 个文件
                  </span>
                </div>
              </div>
              <div className="text-6xl opacity-80">
                📊
              </div>
            </div>
          </div>

          {/* 4个技术栈卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">编程语言</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectAnalysis.tech_stack?.languages?.length > 0 ? (
                  projectAnalysis.tech_stack.languages.map(lang => (
                    <span key={lang} className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs">
                      {lang}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">未检测到</span>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-3">
                <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">框架</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectAnalysis.tech_stack?.frameworks?.length > 0 ? (
                  projectAnalysis.tech_stack.frameworks.map(fw => (
                    <span key={fw} className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs">
                      {fw}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">未检测到</span>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">数据库</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectAnalysis.tech_stack?.databases?.length > 0 ? (
                  projectAnalysis.tech_stack.databases.map(db => (
                    <span key={db} className="px-2 py-1 bg-green-600 text-white rounded-full text-xs">
                      {db}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">未检测到</span>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">工具</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectAnalysis.tech_stack?.tools?.length > 0 ? (
                  projectAnalysis.tech_stack.tools.map(tool => (
                    <span key={tool} className="px-2 py-1 bg-orange-600 text-white rounded-full text-xs">
                      {tool}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">未检测到</span>
                )}
              </div>
            </div>
          </div>

          {/* 架构分析 */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">项目架构分析</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {projectAnalysis.architecture || '前后端分离架构'}
            </p>
          </div>

          {/* 功能特性 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">核心功能特性</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {projectAnalysis.features?.length > 0 ? (
                projectAnalysis.features.map((feature, index) => (
                  <span 
                    key={index} 
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      index % 3 === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                      index % 3 === 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                      'bg-gradient-to-r from-pink-500 to-pink-600 text-white'
                    }`}
                  >
                    {feature}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm">未检测到</span>
              )}
            </div>
          </div>

          {/* 技术栈统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white text-center">
              <div className="text-4xl font-bold mb-1">
                {projectAnalysis.tech_stack?.languages?.length || 0}
              </div>
              <div className="text-blue-100 text-sm">编程语言</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white text-center">
              <div className="text-4xl font-bold mb-1">
                {projectAnalysis.tech_stack?.frameworks?.length || 0}
              </div>
              <div className="text-purple-100 text-sm">框架</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white text-center">
              <div className="text-4xl font-bold mb-1">
                {projectAnalysis.tech_stack?.databases?.length || 0}
              </div>
              <div className="text-green-100 text-sm">数据库</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center">
              <div className="text-4xl font-bold mb-1">
                {projectAnalysis.tech_stack?.tools?.length || 0}
              </div>
              <div className="text-orange-100 text-sm">工具</div>
            </div>
          </div>

          {/* 增强的面试准备建议 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">面试准备建议</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">熟悉项目整体</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      了解项目的背景、目标和你的具体贡献，准备用STAR法则描述项目经历
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">梳理技术难点</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      准备 2-3 个项目中遇到的技术挑战和解决方案，展示问题解决能力
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">准备数据支撑</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      用具体的数据和成果来证明你的贡献，如性能提升、用户增长等
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">深入技术细节</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      准备回答技术栈的深度问题，如设计模式、性能优化、架构选择等
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 快速操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveSection('practice')}
              className="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              开始模拟面试
            </button>
            <button
              onClick={() => setActiveSection('questions')}
              className="flex-1 min-w-[200px] px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              查看面试题库
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderTree className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            请先选择一个项目
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            选择项目后，系统将自动分析技术栈并生成面试准备建议
          </p>
        </div>
      )}
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      {/* 问题分类 */}
      <div className="flex flex-wrap gap-2">
        {questions.map((category, index) => (
          <button
            key={index}
            onClick={() => setActiveSection(`question-${index}`)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === `question-${index}`
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category.category}
          </button>
        ))}
      </div>

      {/* 问题列表 */}
      <div className="space-y-4">
        {questions.map((category, catIndex) => (
          <div key={catIndex} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              {category.category}
            </h4>
            <div className="space-y-3">
              {category.questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setCurrentQuestionIndex(qIndex);
                    setActiveSection(`question-${catIndex}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white font-medium mb-2">
                        {q.question}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded ${
                          q.difficulty === '基础' ? 'bg-green-100 text-green-700' :
                          q.difficulty === '中等' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFAQ = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-500" />
        常见问题
      </h3>
      {faqs.map((faq, index) => (
        <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {faq.question}
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            {faq.answer}
          </p>
        </div>
      ))}
    </div>
  );

  const renderHistory = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          面试历史记录
        </h3>
        {interviewHistory.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('确定要清空所有历史记录吗?')) {
                localStorage.removeItem('interview_history');
                setInterviewHistory([]);
              }
            }}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors"
          >
            清空记录
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {interviewHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              暂无面试记录
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              完成面试后点击"保存记录"按钮,记录将显示在这里
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
          {interviewHistory.map((record) => (
            <div key={record.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {record.projectName || '未知项目'}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      record.chatOnlyMode 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {record.chatOnlyMode ? '仅对话' : '完整模式'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(record.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {record.messages?.length || 0} 条消息
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      {record.model || 'GLM-4.7'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(record.date).toLocaleString('zh-CN')}
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setChatMessages(record.messages || []);
                    setTimer(record.duration || 0);
                    setCurrentInterviewId(record.id);
                    setActiveSection('practice');
                  }}
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  查看详情
                </button>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(record, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `interview_${record.projectName}_${new Date(record.date).toISOString().slice(0, 10)}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                >
                  导出
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('确定要删除这条记录吗?')) {
                      const updatedHistory = interviewHistory.filter(r => r.id !== record.id);
                      localStorage.setItem('interview_history', JSON.stringify(updatedHistory));
                      setInterviewHistory(updatedHistory);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [showResumePanel, setShowResumePanel] = useState(true);

  const renderPractice = () => (
    <div className="flex h-full min-h-0 gap-4">
      {/* 左侧：聊天主区域 */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* 聊天头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {multiRoundMode ? `多轮面试 (第 ${currentRound + 1}/${totalRounds} 轮)` : '模拟面试'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {/* 多轮面试模式开关 */}
              <button
                onClick={() => {
                  if (multiRoundMode) {
                    setMultiRoundMode(false);
                    setCurrentRound(0);
                    setRoundQuestions([]);
                    setCurrentRoundQuestionIndex(0);
                    setRoundAnswers([]);
                    setShowRoundSummary(false);
                  } else {
                    startMultiRoundInterview();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-xs font-medium ${
                  multiRoundMode
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {multiRoundMode ? '退出多轮' : '多轮面试'}
              </button>
              
              {/* 计时器显示 */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg text-xs font-mono">
                <Timer className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {formatTime(timer)}
                </span>
              </div>

              {resumePreview && (
                <button
                  onClick={() => setShowResumePanel(!showResumePanel)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showResumePanel
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'hover:bg-gray-100 text-gray-500 dark:hover:bg-gray-700'
                  }`}
                  title={showResumePanel ? "收起简历" : "查看简历"}
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                点击下方输入框开始模拟面试
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                AI 将根据选中的项目扮演面试官角色
              </p>
            </div>
          ) : (
            chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words">
                    {msg.role === 'ai' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl px-4 py-3 rounded-bl-none">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          {/* 上传进度提示 */}
          {isUploadingResume && (
            <div className="flex justify-center my-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 flex items-center gap-3 shadow-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {uploadProgress || '处理中...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {/* 功能按钮行 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
             {/* 仅在多轮模式显示 */}
             {multiRoundMode && (
              <button
                onClick={nextQuestion}
                disabled={isChatLoading}
                className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-medium whitespace-nowrap"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                {currentRoundQuestionIndex < roundQuestions.length - 1 ? '下一题' : '下一轮'}
              </button>
            )}
            
            <button
              onClick={generateEvaluation}
              disabled={chatMessages.length === 0 || isChatLoading}
              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs font-medium whitespace-nowrap"
            >
              <TrendingUpIcon className="w-3.5 h-3.5" />
              评估报告
            </button>
            
            <button
              onClick={generateReview}
              disabled={chatMessages.length === 0 || isChatLoading}
              className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 dark:text-pink-300 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs font-medium whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              面试复盘
            </button>

            <button
              onClick={getHint}
              disabled={chatMessages.length === 0 || isChatLoading}
              className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 dark:text-yellow-300 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs font-medium whitespace-nowrap"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              获取提示
            </button>

            <div className="flex-1" /> {/* Spacer */}
            
            <button
              onClick={() => saveInterviewRecord()}
              disabled={chatMessages.length === 0}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs font-medium whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              保存
            </button>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isResumeMode ? "回答面试官的问题..." : "输入你的回答或问题... (Shift+Enter 换行)"}
                className="w-full bg-transparent p-3 max-h-32 text-sm focus:outline-none resize-none"
                rows={1}
                style={{ minHeight: '44px' }}
              />
              <div className="flex justify-between items-center px-2 pb-2">
                 <div className="flex gap-1">
                   <label className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isUploadingResume
                        ? 'bg-blue-50 text-blue-500 cursor-not-allowed'
                        : isResumeMode
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`} title={isResumeMode ? `已上传: ${resumeFile?.name}` : "上传简历"}>
                      {isUploadingResume ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <input
                        type="file"
                        accept=".pdf,.txt,image/*"
                        onChange={handleResumeUpload}
                        disabled={isUploadingResume}
                        className="hidden"
                        onClick={(e) => { e.target.value = ''; }}
                      />
                   </label>
                   <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 self-center" />
                   <div className="transform scale-90 origin-left">
                     <IFlowModelSelector />
                   </div>
                 </div>
                 
                 <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:scale-95 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowScorePanel(true)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:scale-95 shadow-sm"
                    title="查看评分"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowProgressPanel(true)}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:scale-95 shadow-sm"
                    title="学习进度"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 评分面板 */}
      {showScorePanel && (
        <div ref={scorePanelRef} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">面试评分</h3>
                </div>
                <button
                  onClick={() => setShowScorePanel(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 总分展示 */}
              <div className="text-center">
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  {overallScore}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">综合评分 / 100</div>
              </div>

              {/* 分数明细 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">技术能力</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scoreBreakdown.technical}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${scoreBreakdown.technical}%`}}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">沟通表达</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">{scoreBreakdown.communication}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${scoreBreakdown.communication}%`}}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">问题解决</span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{scoreBreakdown.problemSolving}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${scoreBreakdown.problemSolving}%`}}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">代码质量</span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{scoreBreakdown.codeQuality}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${scoreBreakdown.codeQuality}%`}}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">系统设计</span>
                    <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">{scoreBreakdown.systemDesign}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-pink-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${scoreBreakdown.systemDesign}%`}}
                    />
                  </div>
                </div>
              </div>

              {/* 能力雷达图 */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  能力评估雷达图
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { dimension: '技术能力', value: scoreBreakdown.technical },
                      { dimension: '沟通表达', value: scoreBreakdown.communication },
                      { dimension: '问题解决', value: scoreBreakdown.problemSolving },
                      { dimension: '代码质量', value: scoreBreakdown.codeQuality },
                      { dimension: '系统设计', value: scoreBreakdown.systemDesign }
                    ]}>
                      <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <PolarAngleAxis 
                        dataKey="dimension" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                      />
                      <Radar
                        name="当前能力"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="理想水平"
                        dataKey="value"
                        stroke="#22c55e"
                        fill="none"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        data={[{ dimension: '技术能力', value: 80 }, { dimension: '沟通表达', value: 80 }, { dimension: '问题解决', value: 80 }, { dimension: '代码质量', value: 80 }, { dimension: '系统设计', value: 80 }]}
                      />
                      <Legend 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '10px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 评分建议 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  改进建议
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {overallScore >= 80 ? (
                    <>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p>表现优秀！继续保持，可以尝试更有挑战性的题目。</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p>建议准备系统设计和架构相关的问题。</p>
                      </div>
                    </>
                  ) : overallScore >= 60 ? (
                    <>
                      <div className="flex items-start gap-2">
                        <Target className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p>表现良好！建议加强薄弱环节的练习。</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Target className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p>多练习算法和数据结构相关题目。</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p>需要加强基础知识的复习。</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p>建议从基础题目开始练习，循序渐进。</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={exportPDF}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  导出报告
                </button>
                <button
                  onClick={() => setShowScorePanel(false)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 学习进度面板 */}
      {showProgressPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-purple-500" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">学习进度追踪</h3>
                </div>
                <button
                  onClick={() => setShowProgressPanel(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setProgressTab('progress')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    progressTab === 'progress'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  学习进度
                </button>
                <button
                  onClick={() => setProgressTab('recommendations')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    progressTab === 'recommendations'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  智能推荐
                </button>
                <button
                  onClick={() => setProgressTab('history')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    progressTab === 'history'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  历史分析
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {progressTab === 'progress' && (
                <>
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm opacity-90">总体学习进度</div>
                        <div className="text-3xl font-bold mt-1">
                          {Math.round(knowledgePoints.reduce((sum, kp) => sum + (kp.progress / kp.total * 100), 0) / knowledgePoints.length)}%
                        </div>
                      </div>
                      <TrendingUp className="w-12 h-12 opacity-80" />
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                      <div 
                        className="bg-white h-3 rounded-full transition-all duration-500"
                        style={{ width: `${knowledgePoints.reduce((sum, kp) => sum + (kp.progress / kp.total * 100), 0) / knowledgePoints.length}%`}}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['前端', '基础', '架构', '后端', '进阶'].map(category => {
                      const categoryPoints = knowledgePoints.filter(kp => kp.category === category);
                      const avgProgress = categoryPoints.length > 0 
                        ? categoryPoints.reduce((sum, kp) => sum + (kp.progress / kp.total * 100), 0) / categoryPoints.length
                        : 0;
                      return (
                        <div key={category} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(avgProgress)}%</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{category}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      知识点掌握情况
                    </h4>
                    <div className="space-y-3">
                      {knowledgePoints.map(kp => (
                        <div key={kp.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{kp.name}</span>
                              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                {kp.category}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {kp.progress}/{kp.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                kp.progress / kp.total >= 0.8 ? 'bg-green-500' :
                                kp.progress / kp.total >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${kp.progress / kp.total * 100}%`}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {progressTab === 'recommendations' && (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    智能推荐功能开发中...
                  </p>
                </div>
              )}

              {progressTab === 'history' && (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    历史分析功能开发中...
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {progressTab === 'progress' && (
                  <button
                    onClick={() => {
                      if (window.confirm('确定要重置所有学习进度吗？')) {
                        const resetPoints = knowledgePoints.map(kp => ({ ...kp, progress: 0 }));
                        setKnowledgePoints(resetPoints);
                        localStorage.setItem('interview-knowledge-points', JSON.stringify(resetPoints));
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                  >
                    重置进度
                  </button>
                )}
                <button
                  onClick={() => setShowProgressPanel(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all hover:shadow-lg"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 右侧：简历预览/辅助面板 (可折叠) */}
      {showResumePanel && resumePreview?.pages?.length > 0 && (
        <div className="w-1/3 min-w-[320px] max-w-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
             <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[150px]" title={resumeFile?.name}>
                  {resumeFile?.name || '简历预览'}
                </span>
             </div>
             <button 
               onClick={() => setShowResumePanel(false)}
               className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
             >
               <span className="text-xs">收起</span>
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {/* 分页控制 */}
            {resumePreview.kind === 'pdf' && resumePreview.pages.length > 1 && (
              <div className="flex gap-1 flex-wrap mb-3">
                {resumePreview.pages.map((p, idx) => (
                  <button
                    key={p.page || idx}
                    onClick={() => {
                      setResumePreviewPageIndex(idx);
                      setResumePreviewBlockIndex(null);
                    }}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      idx === resumePreviewPageIndex
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    第{p.page}页
                  </button>
                ))}
              </div>
            )}

            {/* OCR 预览与文本 */}
            {(() => {
              const p = resumePreview.pages[resumePreviewPageIndex] || resumePreview.pages[0];
              const active = resumePreviewBlockIndex;
              
              return (
                <div className="space-y-4">
                  {/* 图片层 */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <OCRBlocksOverlay
                      imageSrc={p?.preview_image}
                      imageWidth={p?.width}
                      imageHeight={p?.height}
                      blocks={p?.blocks || []}
                      activeIndex={active}
                      onSelect={(i) => setResumePreviewBlockIndex(i)}
                    />
                  </div>
                  
                  {/* 识别文本层 */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between items-center">
                      <span>识别内容</span>
                      {active !== null && (
                         <button 
                           onClick={() => setResumePreviewBlockIndex(null)}
                           className="text-blue-500 hover:text-blue-600"
                         >
                           取消选择
                         </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                      {(p?.blocks || []).map((b, idx) => (
                        <div
                          key={idx}
                          onClick={() => setResumePreviewBlockIndex(idx)}
                          className={`px-3 py-2 text-xs border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                            idx === active
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-2 border-l-blue-500'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-l-transparent'
                          }`}
                        >
                          {String(b?.text || '').trim() || <span className="text-gray-300 italic">(空)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 弹窗层：复盘/评估/提示 */}
      {(showHints || showReview || showEvaluation) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => {
           if(e.target === e.currentTarget) {
             setShowHints(false);
             setShowReview(false);
             setShowEvaluation(false);
           }
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 animate-in fade-in zoom-in duration-200">
             {showHints && currentHint && (
                <div>
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                         <Lightbulb className="w-5 h-5 text-yellow-500" />
                         关键知识点提示
                      </h3>
                      <button onClick={() => setShowHints(false)} className="text-gray-400 hover:text-gray-600">×</button>
                   </div>
                   {/* ... Hint Content ... */}
                   <div className="space-y-4">
                      {currentHint.hints?.map((h, i) => (
                        <div key={i} className="flex gap-2">
                           <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold mt-0.5">{i+1}</span>
                           <p className="text-gray-700 dark:text-gray-300 text-sm">{h}</p>
                        </div>
                      ))}
                      {currentHint.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {currentHint.keywords.map((k, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                   </div>
                </div>
             )}
             
             {/* 复盘与评估内容的渲染逻辑保留，或按需简化为组件 */}
             {showReview && reviewData && (
               <div>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                         <History className="w-5 h-5 text-pink-500" />
                         面试复盘
                      </h3>
                      <button onClick={() => setShowReview(false)} className="text-gray-400 hover:text-gray-600">×</button>
                   </div>
                   {/* 复盘内容 */}
                   <div className="space-y-4">
                      {reviewData.summary && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                           {reviewData.summary}
                        </div>
                      )}
                      {/* ...更多复盘细节... */}
                   </div>
               </div>
             )}

             {showEvaluation && evaluation && (
               <div>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                         <Award className="w-5 h-5 text-purple-500" />
                         面试评估报告
                      </h3>
                      <button onClick={() => setShowEvaluation(false)} className="text-gray-400 hover:text-gray-600">×</button>
                   </div>
                   <div className="text-center mb-6">
                      <div className="text-5xl font-bold text-purple-600">{evaluation.overall_score}</div>
                      <div className="text-sm text-gray-500">综合得分</div>
                   </div>
                   {/* ...更多评估细节... */}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );

  // 计算面试评分
  const calculateScores = () => {
    const messages = chatMessages.filter(m => m.role === 'user');
    const aiMessages = chatMessages.filter(m => m.role === 'ai');
    
    if (messages.length === 0) return;

    const answerCount = messages.length;
    const avgAnswerLength = messages.reduce((sum, m) => sum + m.content.length, 0) / answerCount;
    const hasCodeAnswers = messages.some(m => m.content.includes('```'));

    const technicalScore = Math.min(100, Math.floor(
      (avgAnswerLength > 200 ? 30 : 15) +
      (hasCodeAnswers ? 25 : 0) +
      (answerCount >= 3 ? 25 : answerCount * 8) +
      20
    ));

    const communicationScore = Math.min(100, Math.floor(
      (messages.some(m => m.content.includes('首先') || m.content.includes('其次')) ? 30 : 15) +
      (messages.some(m => m.content.includes('因为') || m.content.includes('所以')) ? 25 : 10) +
      (answerCount >= 2 ? 25 : answerCount * 12) +
      20
    ));

    const problemSolvingScore = Math.min(100, Math.floor(
      (messages.some(m => m.content.includes('解决') || m.content.includes('方法')) ? 30 : 15) +
      (messages.some(m => m.content.includes('步骤') || m.content.includes('流程')) ? 25 : 10) +
      (answerCount >= 2 ? 25 : answerCount * 12) +
      20
    ));

    const codeQualityScore = Math.min(100, Math.floor(
      (hasCodeAnswers ? 40 : 0) +
      (messages.some(m => m.content.includes('function') || m.content.includes('class')) ? 30 : 10) +
      (messages.some(m => m.content.includes('import') || m.content.includes('export')) ? 20 : 10) +
      10
    ));

    const systemDesignScore = Math.min(100, Math.floor(
      (messages.some(m => m.content.includes('架构') || m.content.includes('设计')) ? 30 : 10) +
      (messages.some(m => m.content.includes('模块') || m.content.includes('组件')) ? 25 : 10) +
      (messages.some(m => m.content.includes('数据库') || m.content.includes('缓存')) ? 25 : 10) +
      20
    ));

    const overall = Math.floor(
      (technicalScore + communicationScore + problemSolving + codeQualityScore + systemDesignScore) / 5
    );

    setScoreBreakdown({
      technical: technicalScore,
      communication: communicationScore,
      problemSolving: problemSolving,
      codeQuality: codeQualityScore,
      systemDesign: systemDesignScore
    });
    setOverallScore(overall);

    const newHistoryEntry = {
      date: new Date().toLocaleDateString('zh-CN'),
      timestamp: Date.now(),
      overall: overall,
      breakdown: {
        technical: technicalScore,
        communication: communicationScore,
        problemSolving: problemSolving,
        codeQuality: codeQualityScore,
        systemDesign: systemDesignScore
      }
    };
    
    const newHistory = [...scoreHistory, newHistoryEntry].slice(-10);
    setScoreHistory(newHistory);
    localStorage.setItem('interview-score-history', JSON.stringify(newHistory));
  };

  const exportPDF = async () => {
    if (!scorePanelRef.current) return;

    try {
      const element = scorePanelRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`面试评分报告_${new Date().toLocaleDateString('zh-CN')}.pdf`);
    } catch (error) {
      console.error('导出 PDF 失败:', error);
      alert('导出 PDF 失败，请重试');
    }
  };

  const updateLearningProgress = () => {
    const messages = chatMessages.filter(m => m.role === 'user');
    
    if (messages.length === 0) return;

    const newKnowledgePoints = knowledgePoints.map(kp => {
      let progress = kp.progress;
      
      if (kp.name === 'JavaScript/TypeScript') {
        const hasJSContent = messages.some(m => 
          m.content.includes('JavaScript') || 
          m.content.includes('TypeScript') ||
          m.content.includes('async') ||
          m.content.includes('await') ||
          m.content.includes('Promise')
        );
        if (hasJSContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === 'React') {
        const hasReactContent = messages.some(m => 
          m.content.includes('React') || 
          m.content.includes('useState') ||
          m.content.includes('useEffect') ||
          m.content.includes('component')
        );
        if (hasReactContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === '算法与数据结构') {
        const hasAlgoContent = messages.some(m => 
          m.content.includes('算法') || 
          m.content.includes('数据结构') ||
          m.content.includes('数组') ||
          m.content.includes('链表') ||
          m.content.includes('树') ||
          m.content.includes('图') ||
          m.content.includes('排序') ||
          m.content.includes('查找')
        );
        if (hasAlgoContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === '系统设计') {
        const hasDesignContent = messages.some(m => 
          m.content.includes('系统设计') || 
          m.content.includes('架构') ||
          m.content.includes('微服务') ||
          m.content.includes('分布式') ||
          m.content.includes('负载均衡')
        );
        if (hasDesignContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === '数据库') {
        const hasDBContent = messages.some(m => 
          m.content.includes('数据库') || 
          m.content.includes('SQL') ||
          m.content.includes('MySQL') ||
          m.content.includes('MongoDB') ||
          m.content.includes('Redis')
        );
        if (hasDBContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === 'API 设计') {
        const hasAPIContent = messages.some(m => 
          m.content.includes('API') || 
          m.content.includes('REST') ||
          m.content.includes('GraphQL') ||
          m.content.includes('接口') ||
          m.content.includes('请求')
        );
        if (hasAPIContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === '性能优化') {
        const hasPerfContent = messages.some(m => 
          m.content.includes('性能') || 
          m.content.includes('优化') ||
          m.content.includes('缓存') ||
          m.content.includes('CDN') ||
          m.content.includes('懒加载')
        );
        if (hasPerfContent) progress = Math.min(kp.total, progress + 1);
      }
      
      if (kp.name === '安全') {
        const hasSecurityContent = messages.some(m => 
          m.content.includes('安全') || 
          m.content.includes('认证') ||
          m.content.includes('授权') ||
          m.content.includes('加密') ||
          m.content.includes('XSS') ||
          m.content.includes('CSRF')
        );
        if (hasSecurityContent) progress = Math.min(kp.total, progress + 1);
      }
      
      return { ...kp, progress };
    });
    
    setKnowledgePoints(newKnowledgePoints);
    localStorage.setItem('interview-knowledge-points', JSON.stringify(newKnowledgePoints));
  };

  useEffect(() => {
    const savedScoreHistory = localStorage.getItem('interview-score-history');
    if (savedScoreHistory) {
      try {
        setScoreHistory(JSON.parse(savedScoreHistory));
      } catch (e) {
        console.error('加载历史评分失败:', e);
      }
    }
    
    const savedKnowledgePoints = localStorage.getItem('interview-knowledge-points');
    if (savedKnowledgePoints) {
      try {
        setKnowledgePoints(JSON.parse(savedKnowledgePoints));
      } catch (e) {
        console.error('加载学习进度失败:', e);
      }
    }
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // 构建面试上下文作为消息的一部分
      let interviewContext = `
【面试模式】
仅聊天模式: ${chatOnlyMode ? '是' : '否'}
`;

      if (isResumeMode && resumeContent) {
        interviewContext += `
【简历信息】
${resumeContent}

请根据这份简历进行面试，重点关注候选人的技能、经验和项目经历。
`;
      } else if (selectedProject) {
        interviewContext += `
【项目信息】
项目名称: ${selectedProject?.name || 'unknown'}
项目路径: ${selectedProject?.path || ''}
技术栈: ${projectAnalysis?.tech_stack?.languages?.join(', ') || '未知'}
框架: ${projectAnalysis?.tech_stack?.frameworks?.join(', ') || '未知'}

请扮演面试官角色，根据这个项目的技术栈进行面试。
${chatOnlyMode ? '注意：你只能进行对话，不能使用任何工具修改文件。' : ''}
`;
      }

      const fullMessage = interviewContext + '\n\n用户回答: ' + userMessage;

      // 使用 GET 请求，参数放在 URL 中，包含选中的模型
      const streamUrl = `/stream?message=${encodeURIComponent(fullMessage)}&cwd=${encodeURIComponent(selectedProject?.path || '')}&project=${encodeURIComponent(selectedProject?.name || '')}&persona=partner&model=${encodeURIComponent(selectedModel)}`;

      const response = await authenticatedFetch(streamUrl);

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // 处理 SSE 格式的数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content' && data.content) {
                  aiResponse += data.content;
                  
                  // 实时更新最后一条 AI 消息
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    if (prev.length > 0 && prev[prev.length - 1].role === 'ai') {
                      newMessages[newMessages.length - 1] = { role: 'ai', content: aiResponse };
                    } else {
                      newMessages.push({ role: 'ai', content: aiResponse });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } else {
        console.error('Stream response error:', response.status);
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: '抱歉，无法连接到面试服务。请检查后端服务是否正常运行。' 
        }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: '抱歉，我遇到了一些问题。请稍后再试。\n\n错误信息: ' + error.message 
      }]);
    } finally {
      setIsChatLoading(false);
      calculateScores();
      updateLearningProgress();
    }
  };

  const generateEvaluation = async () => {
    console.log('[Interview] 点击生成评估报告按钮');
    if (chatMessages.length === 0) {
      console.warn('[Interview] 没有聊天消息,无法生成评估');
      alert('请先进行一些对话,然后再生成评估报告');
      return;
    }

    setIsChatLoading(true);
    try {
      console.log('[Interview] 开始生成评估报告...');
      // 构建评估请求
      const conversation = chatMessages.map(msg => `${msg.role === 'user' ? '候选人' : '面试官'}: ${msg.content}`).join('\n\n');
      
      const evaluationPrompt = `
请作为专业的面试官，对以下面试对话进行评估:

项目名称: ${selectedProject?.name || 'unknown'}
面试时长: ${Math.floor(timer / 60)}分${timer % 60}秒
技术栈: ${projectAnalysis?.tech_stack?.languages?.join(', ') || '未知'}

面试对话:
${conversation}

请从以下几个方面进行评估(每项满分10分):
1. 技术理解能力 - 对项目技术栈的理解程度
2. 问题分析能力 - 分析和解决问题的思路
3. 表达能力 - 回答的清晰度和逻辑性
4. 项目经验 - 对项目细节和贡献的描述
5. 学习能力 - 对新技术的理解和应用

请以JSON格式返回评估结果，格式如下:
{
  "overall_score": 总分(0-100),
  "categories": {
    "technical_understanding": { "score": 分数, "comment": "评语" },
    "problem_analysis": { "score": 分数, "comment": "评语" },
    "communication": { "score": 分数, "comment": "评语" },
    "project_experience": { "score": 分数, "comment": "评语" },
    "learning_ability": { "score": 分数, "comment": "评语" }
  },
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["待改进点1", "待改进点2"],
  "suggestions": ["建议1", "建议2", "建议3"],
  "summary": "总体评价"
}

请只返回JSON，不要有其他内容。
`;

      const streamUrl = `/stream?message=${encodeURIComponent(evaluationPrompt)}&cwd=${encodeURIComponent(selectedProject?.path || '')}&project=${encodeURIComponent(selectedProject?.name || '')}&persona=senior&model=${encodeURIComponent(selectedModel)}`;

      const response = await authenticatedFetch(streamUrl);

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content' && data.content) {
                  aiResponse += data.content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        // 尝试解析JSON
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const evaluationData = JSON.parse(jsonMatch[0]);
            setEvaluation(evaluationData);
            setShowEvaluation(true);
          } else {
            // 如果无法解析JSON，显示原始文本
            setEvaluation({
              overall_score: 0,
              categories: {},
              strengths: [],
              weaknesses: [],
              suggestions: [],
              summary: aiResponse
            });
            setShowEvaluation(true);
          }
        } catch (e) {
          console.error('Failed to parse evaluation JSON:', e);
          setEvaluation({
            overall_score: 0,
            categories: {},
            strengths: [],
            weaknesses: [],
            suggestions: [],
            summary: aiResponse
          });
          setShowEvaluation(true);
        }
      }
    } catch (error) {
      console.error('Failed to generate evaluation:', error);
      alert('生成评估报告失败: ' + error.message);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getHint = async () => {
    console.log('[Interview] 点击获取提示按钮');
    if (chatMessages.length === 0) {
      console.warn('[Interview] 没有聊天消息,无法获取提示');
      alert('请先进行一些对话,然后再获取提示');
      return;
    }

    setIsChatLoading(true);
    try {
      console.log('[Interview] 开始获取提示...');
      const lastAIMessage = [...chatMessages].reverse().find(msg => msg.role === 'ai');
      if (!lastAIMessage) return;

      const hintPrompt = `
请根据面试官的以下问题，提供3-5个关键知识点提示，帮助候选人更好地回答：

面试官问题: ${lastAIMessage.content}

项目技术栈: ${projectAnalysis?.tech_stack?.languages?.join(', ') || '未知'}
框架: ${projectAnalysis?.tech_stack?.frameworks?.join(', ') || '未知'}

请以JSON格式返回提示，格式如下:
{
  "hints": ["提示点1", "提示点2", "提示点3"],
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "reference": "相关技术参考"
}

请只返回JSON，不要有其他内容。
`;

      const streamUrl = `/stream?message=${encodeURIComponent(hintPrompt)}&cwd=${encodeURIComponent(selectedProject?.path || '')}&project=${encodeURIComponent(selectedProject?.name || '')}&persona=partner&model=${encodeURIComponent(selectedModel)}`;

      const response = await authenticatedFetch(streamUrl);

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content' && data.content) {
                  aiResponse += data.content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const hintData = JSON.parse(jsonMatch[0]);
            setCurrentHint(hintData);
            setShowHints(true);
          } else {
            setCurrentHint({
              hints: [aiResponse],
              keywords: [],
              reference: ''
            });
            setShowHints(true);
          }
        } catch (e) {
          console.error('Failed to parse hint JSON:', e);
          setCurrentHint({
            hints: [aiResponse],
            keywords: [],
            reference: ''
          });
          setShowHints(true);
        }
      }
    } catch (error) {
      console.error('Failed to get hint:', error);
      alert('获取提示失败: ' + error.message);
    } finally {
      setIsChatLoading(false);
    }
  };

  const startMultiRoundInterview = () => {
    setMultiRoundMode(true);
    setCurrentRound(0);
    setChatMessages([]);
    setTimer(0);
    setQuestionTimer(0);
    setRoundAnswers([]);
    setShowRoundSummary(false);
    setCurrentInterviewId(Date.now());
    
    // 准备第一轮问题
    prepareRoundQuestions(0);
  };

  const prepareRoundQuestions = (round) => {
    // 根据轮次选择不同类型的问题
    let selectedQuestions = [];
    
    switch(round) {
      case 0: // 第一轮：项目介绍
        selectedQuestions = questions.find(q => q.category === '项目介绍')?.questions || [];
        break;
      case 1: // 第二轮：技术实现
        selectedQuestions = questions.find(q => q.category === '技术实现')?.questions || [];
        break;
      case 2: // 第三轮：技术栈深度问题
        const techCategories = questions.filter(q => 
          ['JavaScript/TypeScript', 'React', 'Node.js', 'Python', '数据库'].includes(q.category)
        );
        if (techCategories.length > 0) {
          const randomTech = techCategories[Math.floor(Math.random() * techCategories.length)];
          selectedQuestions = randomTech.questions.slice(0, 2);
        }
        break;
      case 3: // 第四轮：问题解决
        selectedQuestions = questions.find(q => q.category === '问题解决')?.questions || [];
        break;
      case 4: // 第五轮：团队协作
        selectedQuestions = questions.find(q => q.category === '团队协作')?.questions || [];
        break;
      default:
        selectedQuestions = [];
    }
    
    setRoundQuestions(selectedQuestions);
    setCurrentRoundQuestionIndex(0);
    
    // 如果有题目，自动发送第一题
    if (selectedQuestions.length > 0) {
      setTimeout(() => {
        const firstQuestion = selectedQuestions[0].question;
        setChatMessages(prev => [...prev, { role: 'ai', content: `【第 ${round + 1} 轮面试】\n\n${firstQuestion}` }]);
      }, 500);
    }
  };

  const nextRound = () => {
    if (currentRound < totalRounds - 1) {
      setCurrentRound(prev => prev + 1);
      setQuestionTimer(0);
      prepareRoundQuestions(currentRound + 1);
    } else {
      // 完成所有轮次
      setShowRoundSummary(true);
      generateEvaluation();
    }
  };

  const nextQuestion = () => {
    if (currentRoundQuestionIndex < roundQuestions.length - 1) {
      setCurrentRoundQuestionIndex(prev => prev + 1);
      setQuestionTimer(0);
      
      // 发送下一题
      setTimeout(() => {
        const nextQ = roundQuestions[currentRoundQuestionIndex + 1];
        setChatMessages(prev => [...prev, { role: 'ai', content: nextQ.question }]);
      }, 500);
    } else {
      // 当前轮次完成，进入下一轮
      nextRound();
    }
  };

  const generateReview = async () => {
    console.log('[Interview] 点击面试复盘按钮');
    if (chatMessages.length === 0) {
      console.warn('[Interview] 没有聊天消息,无法生成复盘');
      alert('请先进行一些对话,然后再生成面试复盘');
      return;
    }

    setIsChatLoading(true);
    try {
      console.log('[Interview] 开始生成面试复盘...');
      const conversation = chatMessages.map(msg => `${msg.role === 'user' ? '候选人' : '面试官'}: ${msg.content}`).join('\n\n');
      
      const reviewPrompt = `
请对以下面试对话进行复盘分析，提取重点内容并生成学习计划:

项目名称: ${selectedProject?.name || 'unknown'}
技术栈: ${projectAnalysis?.tech_stack?.languages?.join(', ') || '未知'}

面试对话:
${conversation}

请以JSON格式返回复盘结果，格式如下:
{
  "highlighted_points": [
    {
      "type": "优势" | "劣势" | "关键点",
      "content": "具体内容",
      "context": "上下文信息"
    }
  ],
  "learning_plan": [
    {
      "priority": "高" | "中" | "低",
      "topic": "学习主题",
      "resources": ["资源1", "资源2"],
      "timeline": "建议时间",
      "goals": ["目标1", "目标2"]
    }
  ],
  "summary": "复盘总结"
}

请只返回JSON，不要有其他内容。
`;

      const streamUrl = `/stream?message=${encodeURIComponent(reviewPrompt)}&cwd=${encodeURIComponent(selectedProject?.path || '')}&project=${encodeURIComponent(selectedProject?.name || '')}&persona=senior&model=${encodeURIComponent(selectedModel)}`;

      const response = await authenticatedFetch(streamUrl);

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content' && data.content) {
                  aiResponse += data.content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const reviewData = JSON.parse(jsonMatch[0]);
            setReviewData(reviewData);
            setHighlightedPoints(reviewData.highlighted_points || []);
            setLearningPlan(reviewData.learning_plan || []);
            setShowReview(true);
          } else {
            setReviewData({
              highlighted_points: [],
              learning_plan: [],
              summary: aiResponse
            });
            setShowReview(true);
          }
        } catch (e) {
          console.error('Failed to parse review JSON:', e);
          setReviewData({
            highlighted_points: [],
            learning_plan: [],
            summary: aiResponse
          });
          setShowReview(true);
        }
      }
    } catch (error) {
      console.error('Failed to generate review:', error);
      alert('生成复盘失败: ' + error.message);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  面试准备
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  iFlow Agent 项目面试指南
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
                <PlayCircle className="w-4 h-4" />
                开始练习
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('overview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              项目概览
            </button>
            <button
              onClick={() => setActiveSection('questions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'questions' || activeSection.startsWith('question-')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              面试问题
            </button>
            <button
              onClick={() => setActiveSection('practice')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'practice'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              模拟面试
            </button>
            <button
              onClick={() => setActiveSection('faq')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'faq'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              常见问题
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              历史记录
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-6 pb-2">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'questions' && renderQuestions()}
        {activeSection === 'practice' && renderPractice()}
        {activeSection === 'faq' && renderFAQ()}
        {activeSection === 'history' && renderHistory()}
      </div>
    </div>
  );
};

export default InterviewPreparation;
