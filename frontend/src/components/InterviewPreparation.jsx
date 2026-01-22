/**
 * Interview Preparation Component
 * 项目面试准备页面 - 针对选中的项目生成面试问题
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen, Code2, BrainCircuit, Target, TrendingUp,
  CheckCircle2, Clock, Award, Lightbulb, FileText,
  ChevronRight, PlayCircle, PauseCircle, RefreshCw,
  Sparkles, FolderTree, GitBranch, Database, Globe, MessageSquare, Send,
  Save, Download, History, Mic, MicOff, Timer, Star, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { authenticatedFetch } from '../utils/api';
import IFlowModelSelector from './IFlowModelSelector';
import ReactMarkdown from 'react-markdown';

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
  const [isResumeMode, setIsResumeMode] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadStage, setUploadStage] = useState('');
  
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
      setInterviewHistory(history);
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
      const updatedHistory = [record, ...history].slice(0, 50); // 保留最近50条
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
        
        // PDF 文件 - 使用 OCR API
        const base64 = await readFileAsBase64(file);
        console.log('[简历上传] Base64 编码完成，长度:', base64.length);
        
        const requestData = {
          pdf_data: base64,
          technology: 'rapidocr',  // 切换到 rapidocr，简单可靠
          max_tokens: 16384
        };
        
        setUploadProgress('正在进行 OCR 文字识别...');
        setUploadStage('ocr');
        console.log('[简历上传] 发送 OCR 请求...');
        
        const response = await authenticatedFetch('/api/ocr/process-pdf', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('[简历上传] OCR 响应状态:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('[简历上传] OCR 结果:', result);
          content = result.text || result.content || '';
          console.log('[简历上传] 提取文本长度:', content?.length || 0);
        } else {
          const error = await response.json();
          console.error('[简历上传] OCR 错误:', error);
          throw new Error(error.error || 'PDF 处理失败');
        }
      } else if (file.type === 'text/plain') {
        setUploadProgress('正在读取文本文件...');
        setUploadStage('reading');
        console.log('[简历上传] 开始处理 TXT 文件...');
        // TXT 文件 - 直接读取
        content = await readFileAsText(file);
        console.log('[简历上传] TXT 内容长度:', content?.length || 0);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.type === 'application/msword') {
        // DOC/DOCX 文件 - 提示用户转换为 PDF 或 TXT
        throw new Error('请将 Word 文档转换为 PDF 或 TXT 格式后再上传');
      } else {
        throw new Error('不支持的文件格式,请上传 PDF 或 TXT 文件');
      }

      console.log('[简历上传] 提取的内容长度:', content?.length || 0);

      if (!content || content.trim().length === 0) {
        throw new Error('无法提取简历内容,请确保文件包含可读文本');
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
        content: `✅ 简历已上传成功!\n\n**文件名**: ${file.name}\n**文件大小**: ${(file.size / 1024).toFixed(2)} KB\n**提取文本长度**: ${content.length} 字符\n\n简历内容:\n${content}\n\n现在我将根据这份简历开始面试。`
      }]);
      
      alert(`✅ 简历上传成功!\n\n文件名: ${file.name}\n提取文本: ${content.length} 字符\n\n现在将根据简历进行面试。`);
    } catch (error) {
      console.error('[简历上传] 失败:', error);
      alert('❌ 简历上传失败: ' + error.message);
    } finally {
      setIsUploadingResume(false);
      setUploadProgress('');
      setUploadStage('');
    }
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 移除 data URL 前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      {/* 项目信息 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          {selectedProject?.name || '未选择项目'}
        </h2>
        <p className="text-blue-100 mb-4">
          {selectedProject?.path || '请先选择一个项目'}
        </p>
        {projectAnalysis && (
          <div className="flex flex-wrap gap-2">
            {projectAnalysis.tech_stack?.languages?.map(lang => (
              <span key={lang} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {lang}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>正在分析项目...</span>
          </div>
        </div>
      ) : projectAnalysis ? (
        <>
          {/* 技术栈 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-green-500" />
              技术栈
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">编程语言</h4>
                <div className="flex flex-wrap gap-2">
                  {projectAnalysis.tech_stack?.languages?.map(lang => (
                    <span key={lang} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">框架/库</h4>
                <div className="flex flex-wrap gap-2">
                  {projectAnalysis.tech_stack?.frameworks?.map(fw => (
                    <span key={fw} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">数据库</h4>
                <div className="flex flex-wrap gap-2">
                  {projectAnalysis.tech_stack?.databases?.map(db => (
                    <span key={db} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                      {db}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">工具/其他</h4>
                <div className="flex flex-wrap gap-2">
                  {projectAnalysis.tech_stack?.tools?.map(tool => (
                    <span key={tool} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 项目架构 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              项目架构
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300">
                {projectAnalysis.architecture || '前后端分离架构'}
              </p>
            </div>
          </div>

          {/* 面试准备建议 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              面试准备建议
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">熟悉项目整体</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    了解项目的背景、目标和你的具体贡献
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">梳理技术难点</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    准备 2-3 个项目中遇到的技术挑战和解决方案
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">准备数据支撑</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    用具体的数据和成果来证明你的贡献
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <FolderTree className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            请先选择一个项目来开始面试准备
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

  const renderPractice = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* 聊天头部 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
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
                  // 退出多轮模式
                  setMultiRoundMode(false);
                  setCurrentRound(0);
                  setRoundQuestions([]);
                  setCurrentRoundQuestionIndex(0);
                  setRoundAnswers([]);
                  setShowRoundSummary(false);
                } else {
                  // 开始多轮面试
                  startMultiRoundInterview();
                }
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                multiRoundMode
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {multiRoundMode ? '退出多轮' : '多轮面试'}
            </button>
            
            {/* 计时器显示 */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
              <Timer className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {formatTime(timer)}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                本题: {formatTime(questionTimer)}
              </span>
            </div>
            <button
              onClick={() => {
                setTimer(0);
                setQuestionTimer(0);
              }}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="重置计时器"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          AI 将扮演面试官角色，只进行对话，不会修改任何文件
        </p>
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                点击下方输入框开始模拟面试
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
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
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {msg.role === 'user' ? '你' : '面试官'}
                  </div>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
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
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">面试官正在思考...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 上传进度提示 */}
          {isUploadingResume && (
            <div className="flex justify-start">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-[70%]">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      正在处理简历...
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      {uploadProgress}
                    </div>
                    {uploadStage === 'ocr' && (
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        💡 PDF 文字识别需要一些时间，请耐心等待...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 提示面板 */}
          {showHints && currentHint && (
            <div className="mt-2 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">关键知识点提示</h4>
                </div>
                <button
                  onClick={() => setShowHints(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-gray-500">×</span>
                </button>
              </div>

              {/* 提示点 */}
              {currentHint.hints && currentHint.hints.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">💡 回答要点</div>
                  <ul className="space-y-2">
                    {currentHint.hints.map((hint, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-500 font-bold">{index + 1}.</span>
                        {hint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 关键词 */}
              {currentHint.keywords && currentHint.keywords.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🔑 关键词</div>
                  <div className="flex flex-wrap gap-2">
                    {currentHint.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 相关参考 */}
              {currentHint.reference && (
                <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">📚 相关参考：</span>
                    {currentHint.reference}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 复盘面板 */}
          {showReview && reviewData && (
            <div className="mt-2 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">面试复盘</h4>
                </div>
                <button
                  onClick={() => setShowReview(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-gray-500">×</span>
                </button>
              </div>

              {/* 重点高亮 */}
              {highlightedPoints && highlightedPoints.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">🎯 重点内容</div>
                  <div className="space-y-2">
                    {highlightedPoints.map((point, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          point.type === '优势'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                            : point.type === '劣势'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            point.type === '优势'
                              ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                              : point.type === '劣势'
                              ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                              : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          }`}>
                            {point.type}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                              {point.content}
                            </div>
                            {point.context && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {point.context}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 学习计划 */}
              {learningPlan && learningPlan.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📚 学习计划</div>
                  <div className="space-y-3">
                    {learningPlan.map((plan, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              plan.priority === '高'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : plan.priority === '中'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {plan.priority}优先级
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {plan.topic}
                            </span>
                          </div>
                          {plan.timeline && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {plan.timeline}
                            </span>
                          )}
                        </div>
                        
                        {plan.resources && plan.resources.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">学习资源:</div>
                            <div className="flex flex-wrap gap-1">
                              {plan.resources.map((resource, rIndex) => (
                                <span
                                  key={rIndex}
                                  className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                                >
                                  {resource}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {plan.goals && plan.goals.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">学习目标:</div>
                            <ul className="space-y-0.5">
                              {plan.goals.map((goal, gIndex) => (
                                <li key={gIndex} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1">
                                  <span className="text-purple-500">•</span>
                                  {goal}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 复盘总结 */}
              {reviewData.summary && (
                <div className="mt-4 pt-4 border-t border-pink-200 dark:border-pink-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">📝 复盘总结：</span>
                    {reviewData.summary}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 评估报告 */}
          {showEvaluation && evaluation && (
            <div className="mt-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">面试评估报告</h4>
                </div>
                <button
                  onClick={() => setShowEvaluation(false)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-gray-500">×</span>
                </button>
              </div>
              
              {/* 总分 */}
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {evaluation.overall_score || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>总分</div>
                    <div className="text-xs opacity-75">满分 100</div>
                  </div>
                </div>
              </div>

              {/* 分类评分 */}
              {evaluation.categories && Object.keys(evaluation.categories).length > 0 && (
                <div className="space-y-3 mb-4">
                  {Object.entries(evaluation.categories).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {key === 'technical_understanding' ? '技术理解能力' :
                           key === 'problem_analysis' ? '问题分析能力' :
                           key === 'communication' ? '表达能力' :
                           key === 'project_experience' ? '项目经验' :
                           key === 'learning_ability' ? '学习能力' : key}
                        </span>
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                          {value.score}/10
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all"
                          style={{ width: `${(value.score / 10) * 100}%` }}
                        />
                      </div>
                      {value.comment && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {value.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 优势 */}
              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">优势</span>
                  </div>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 待改进 */}
              {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUpIcon className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">待改进</span>
                  </div>
                  <ul className="space-y-1">
                    {evaluation.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 建议 */}
              {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">建议</span>
                  </div>
                  <ul className="space-y-1">
                    {evaluation.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 总体评价 */}
              {evaluation.summary && (
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">总体评价：</span>
                    {evaluation.summary}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 聊天输入区域 */}
      <div className="mt-2 space-y-2 flex-shrink-0 pb-2">
        <div className="flex gap-2">
          <IFlowModelSelector />
          <div className="flex-1">
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
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
          </div>
          <label className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            isUploadingResume
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-not-allowed'
              : isResumeMode 
              ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
          }`}>
            {isUploadingResume ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">处理中...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span className="text-sm">{isResumeMode ? '简历模式' : '上传简历'}</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleResumeUpload}
              disabled={isUploadingResume}
              className="hidden"
              key={isUploadingResume ? 'uploading' : 'ready'}
              onClick={(e) => {
                // 重置文件输入框，允许重复选择同一个文件
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            {isResumeMode && (
              <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {resumeFile?.name}
              </div>
            )}
            {multiRoundMode && (
              <>
                <button
                  onClick={nextQuestion}
                  disabled={isChatLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                  {currentRoundQuestionIndex < roundQuestions.length - 1 ? '下一题' : '下一轮'}
                </button>
              </>
            )}
            <button
              onClick={generateEvaluation}
              disabled={chatMessages.length === 0 || isChatLoading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
            >
              <TrendingUpIcon className="w-4 h-4" />
              生成评估报告
            </button>
            <button
              onClick={generateReview}
              disabled={chatMessages.length === 0 || isChatLoading}
              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
            >
              <History className="w-4 h-4" />
              面试复盘
            </button>
            <button
              onClick={() => saveInterviewRecord()}
              disabled={chatMessages.length === 0}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              保存记录
            </button>
            <button
              onClick={getHint}
              disabled={chatMessages.length === 0 || isChatLoading}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
            >
              <Lightbulb className="w-4 h-4" />
              获取提示
            </button>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatLoading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
    </div>
  );

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
      <div className="flex-1 overflow-hidden min-h-0 p-6 pb-2">
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