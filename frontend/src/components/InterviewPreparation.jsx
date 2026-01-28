/**
 * Interview Preparation Component
 * 项目面试准备页面 - 针对选中的项目生成面试问题
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Code2, BrainCircuit, Target, TrendingUp,
  CheckCircle2, Clock, Award, Lightbulb, FileText, FileEdit,
  ChevronRight, PlayCircle, PauseCircle, RefreshCw,
  Sparkles, FolderTree, GitBranch, Database, Globe, MessageSquare, Send,
  Save, Download, History, Mic, MicOff, Timer, Star,
  BarChart3, Zap, AlertCircle, X, Plus, Trash2, Loader2, Briefcase
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { authenticatedFetch } from '../utils/api';
import OCRBlocksOverlay from './OCRBlocksOverlay';

const InterviewPreparation = ({ selectedProject }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // 状态定义
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [currentInterviewId, setCurrentInterviewId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [progressTab, setProgressTab] = useState('progress');

  // 简历面试状态
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeContent, setResumeContent] = useState('');
  const [isResumeMode, setIsResumeMode] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadStage, setUploadStage] = useState('');
  const [resumePreview, setResumePreview] = useState(null);
  const [resumePreviewPageIndex, setResumePreviewPageIndex] = useState(0);
  const [resumePreviewBlockIndex, setResumePreviewBlockIndex] = useState(null);
  const [showResumePanel, setShowResumePanel] = useState(true);

  // 招聘信息(JD)状态
  const [jobDescription, setJobDescription] = useState('');
  const [isJobMode, setIsJobMode] = useState(false);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [jobRequirements, setJobRequirements] = useState([]);

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
  const [recommendations, setRecommendations] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);

  // 智能提示功能状态
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState('');

  // 面试笔记状态
  const [interviewNotes, setInterviewNotes] = useState('');
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const notesPanelRef = useRef(null);

  // 语音录音状态
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordings, setRecordings] = useState([]);

  // 多轮面试状态
  const [multiRoundMode, setMultiRoundMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [currentRoundQuestionIndex, setCurrentRoundQuestionIndex] = useState(0);
  const [roundAnswers, setRoundAnswers] = useState([]);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [totalRounds] = useState(5);

  // AI面试官人格状态
  const [aiInterviewerMode, setAiInterviewerMode] = useState(false);
  const [aiInterviewerPersonality, setAiInterviewerPersonality] = useState('professional');

  // 问题收藏状态
  const [favoriteQuestions, setFavoriteQuestions] = useState([]);

  // 其他辅助功能状态
  const [questionTimer, setQuestionTimer] = useState(0);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [highlightedPoints, setHighlightedPoints] = useState([]);
  const [learningPlan, setLearningPlan] = useState([]);

  const [knowledgePoints, setKnowledgePoints] = useState([
    { id: 1, name: 'JavaScript/TypeScript', category: '前端', progress: 3, total: 10 },
    { id: 2, name: 'React', category: '前端', progress: 5, total: 10 },
    { id: 3, name: '算法与数据结构', category: '基础', progress: 2, total: 10 },
    { id: 4, name: '系统设计', category: '架构', progress: 4, total: 10 },
    { id: 5, name: '数据库', category: '后端', progress: 6, total: 10 },
    { id: 6, name: 'API 设计', category: '后端', progress: 3, total: 10 },
    { id: 7, name: '性能优化', category: '进阶', progress: 1, total: 10 },
    { id: 8, name: '安全', category: '进阶', progress: 2, total: 10 }
  ]);

  // 加载数据
  useEffect(() => {
    const savedHistory = localStorage.getItem('interview_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // 为历史记录中的消息重新生成唯一 id，避免重复
        const cleanedHistory = parsed.map(record => ({
          ...record,
          messages: record.messages?.map((msg, idx) => ({
            ...msg,
            id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
          })) || []
        }));
        setInterviewHistory(cleanedHistory);
        // 更新 localStorage 中的数据
        localStorage.setItem('interview_history', JSON.stringify(cleanedHistory));
      } catch (e) {
        console.error('Failed to parse interview history:', e);
      }
    }

    const savedKP = localStorage.getItem('interview-knowledge-points');
    if (savedKP) setKnowledgePoints(JSON.parse(savedKP));

    const savedScoreHistory = localStorage.getItem('score_history');
    if (savedScoreHistory) setScoreHistory(JSON.parse(savedScoreHistory));

    const savedNotes = localStorage.getItem('interview-notes');
    if (savedNotes) setInterviewNotes(savedNotes);

    const savedFavorites = localStorage.getItem('favorite-questions');
    if (savedFavorites) setFavoriteQuestions(JSON.parse(savedFavorites));
  }, []);

  // 数据恢复功能
  const restoreData = () => {
    if (confirm('确定要恢复默认数据吗？这将覆盖当前所有记录。')) {
      const defaultHistory = [];
      const defaultKP = [
        { id: 1, name: 'JavaScript/TypeScript', category: '前端', progress: 3, total: 10 },
        { id: 2, name: 'React', category: '前端', progress: 5, total: 10 },
        { id: 3, name: '算法与数据结构', category: '基础', progress: 2, total: 10 },
        { id: 4, name: '系统设计', category: '架构', progress: 4, total: 10 },
        { id: 5, name: '数据库', category: '后端', progress: 6, total: 10 },
        { id: 6, name: 'API 设计', category: '后端', progress: 3, total: 10 },
        { id: 7, name: '性能优化', category: '进阶', progress: 1, total: 10 },
        { id: 8, name: '安全', category: '进阶', progress: 2, total: 10 }
      ];
      setInterviewHistory(defaultHistory);
      setKnowledgePoints(defaultKP);
      localStorage.setItem('interview_history', JSON.stringify(defaultHistory));
      localStorage.setItem('interview-knowledge-points', JSON.stringify(defaultKP));
      alert('数据已恢复为默认状态');
    }
  };

  const exportData = () => {
    const data = {
      interviewHistory,
      knowledgePoints,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.interviewHistory && data.knowledgePoints) {
            setInterviewHistory(data.interviewHistory);
            setKnowledgePoints(data.knowledgePoints);
            localStorage.setItem('interview_history', JSON.stringify(data.interviewHistory));
            localStorage.setItem('interview-knowledge-points', JSON.stringify(data.knowledgePoints));
            alert('数据导入成功！');
          } else {
            alert('无效的数据格式');
          }
        } catch (e) {
          alert('导入失败：文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 简历上传处理函数
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

          // 提取文本
          const blockTexts = result.pages?.[0]?.blocks?.map(b => b.text).join('\n');
          if (blockTexts) content = blockTexts;
          console.log('[简历上传] 提取文本长度:', content?.length || 0);

          // 提取预览图片
          const pagesWithPreview = (result.pages || []).filter((p) => p && p.preview_url);
          if (pagesWithPreview.length > 0) {
            const p0 = pagesWithPreview[0];
            const objectUrl = p0.preview_url; // 使用后端返回的 URL
            const pages = [
              {
                page: p0.page,
                blocks: p0.blocks || [],
              },
            ].filter((p) => p.preview_image);
            setResumePreview(pages.length ? { kind: 'pdf', pages } : null);
          } else {
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

          // 提取文本
          const blockTexts = result.pages?.[0]?.blocks?.map(b => b.text).join('\n');
          if (blockTexts) content = blockTexts;
          console.log('[简历上传] 提取文本长度:', content?.length || 0);

          if (result.preview_url) {
            const objectUrl = result.preview_url;
            setResumePreview(
              objectUrl
                ? {
                    kind: 'image',
                    url: objectUrl,
                  }
                : null
            );
          } else {
            setResumePreview(null);
          }
          setResumePreviewPageIndex(0);
          setResumePreviewBlockIndex(null);
        } else {
          console.error('[简历上传] OCR 错误:', result);
          const message = result.detail || result.error || rawText || '图片 OCR 处理失败';
          throw new Error(message);
        }
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

  // 读取文本文件辅助函数
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  };

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理招聘信息(JD)输入
  const handleJobDescriptionSubmit = () => {
    if (!jobDescription.trim()) {
      alert('请输入招聘信息');
      return;
    }

    setIsJobMode(true);
    setShowJobPanel(false);

    // 添加系统消息
    setChatMessages([{
      role: 'ai',
      content: `✅ 招聘信息已加载!\n\n我将根据以下职位要求进行面试:\n\n${jobDescription}\n\n让我们开始面试吧!请先介绍一下你的相关经验。`,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }]);

    alert('招聘信息已加载，现在开始针对性面试!');
  };

  // 解析招聘信息中的要求
  const parseJobRequirements = (jd) => {
    const requirements = [];
    const keywords = ['要求', 'Requirements', '技能', 'Skills', '经验', 'Experience', '熟悉', '掌握'];

    const lines = jd.split('\n');
    let currentRequirement = null;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const hasKeyword = keywords.some(keyword => trimmedLine.includes(keyword));

      if (hasKeyword || trimmedLine.match(/^[\d\-\•\*]/)) {
        if (currentRequirement) {
          requirements.push(currentRequirement);
        }
        currentRequirement = {
          id: index,
          text: trimmedLine.replace(/^[\d\-\•\*]\s*/, ''),
          category: hasKeyword ? 'skill' : 'general'
        };
      } else if (currentRequirement) {
        currentRequirement.text += ' ' + trimmedLine;
      }
    });

    if (currentRequirement) {
      requirements.push(currentRequirement);
    }

    return requirements;
  };

  // 计算综合评分
  const calculateOverallScore = () => {
    const scores = Object.values(scoreBreakdown);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    setOverallScore(Math.round(average));
  };

  // 生成评分建议
  const generateRecommendations = () => {
    const recs = [];
    if (scoreBreakdown.technical < 70) {
      recs.push('建议加强技术基础知识学习');
    }
    if (scoreBreakdown.communication < 70) {
      recs.push('提升沟通表达能力');
    }
    if (scoreBreakdown.problemSolving < 70) {
      recs.push('多练习算法和问题解决');
    }
    if (scoreBreakdown.codeQuality < 70) {
      recs.push('注重代码规范和最佳实践');
    }
    if (scoreBreakdown.systemDesign < 70) {
      recs.push('深入学习系统架构设计');
    }
    setRecommendations(recs);
  };

  // 更新评分
  const updateScore = (dimension, value) => {
    const newScores = {
      ...scoreBreakdown,
      [dimension]: value
    };
    setScoreBreakdown(newScores);
    calculateOverallScore();
    generateRecommendations();
  };

  // 保存评分记录
  const saveScoreRecord = () => {
    const record = {
      id: Date.now(),
      date: new Date().toISOString(),
      overallScore,
      scores: { ...scoreBreakdown }
    };
    const newHistory = [record, ...scoreHistory].slice(0, 10);
    setScoreHistory(newHistory);
    localStorage.setItem('score_history', JSON.stringify(newHistory));
    alert('评分已保存');
  };

  // 生成智能提示
  const generateHint = () => {
    const hints = [
      '可以从STAR法则(情境、任务、行动、结果)来组织你的回答',
      '尝试提供具体的案例和数据支持你的观点',
      '如果不确定答案,可以诚实地说明你不知道,然后讨论你的解决思路',
      '关注问题的本质,而不仅仅是技术细节',
      '可以提到你从失败中学到的经验',
      '适当展示你的思考过程,而不仅仅是最终答案'
    ];
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    setCurrentHint(randomHint);
    setShowHints(true);

    // 5秒后自动隐藏
    setTimeout(() => {
      setShowHints(false);
    }, 5000);
  };

  // 语音录音功能
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordedChunks(chunks);

        // 添加到录音列表
        const newRecording = {
          id: Date.now(),
          url,
          blob,
          timestamp: new Date().toISOString()
        };
        setRecordings(prev => [...prev, newRecording]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks([]);
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风,请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const deleteRecording = (id) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  // 多轮面试功能
  const startMultiRoundInterview = () => {
    setMultiRoundMode(true);
    setCurrentRound(1);
    setCurrentRoundQuestionIndex(0);
    setRoundAnswers([]);
    const welcomeMsg = {
      role: 'ai',
      content: `🎯 **多轮面试模式已启动**\n\n我们将进行 ${totalRounds} 轮完整的面试流程,每轮会从不同维度考察你的能力。\n\n**当前轮次**: 第 1 轮\n**考察重点**: 基础知识与技术栈\n\n准备好后,请回答第一个问题:`,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setChatMessages([welcomeMsg]);
  };

  const nextRound = () => {
    if (currentRound < totalRounds) {
      setCurrentRound(prev => prev + 1);
      setCurrentRoundQuestionIndex(0);
      const roundTopics = ['基础知识', '技术深度', '系统设计', '问题解决', '软技能'];
      const roundMsg = {
        role: 'ai',
        content: `✅ **第 ${currentRound} 轮完成!**\n\n**下一轮**: 第 ${currentRound + 1} 轮\n**考察重点**: ${roundTopics[currentRound]}\n\n继续加油!`,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setChatMessages(prev => [...prev, roundMsg]);
    } else {
      setShowRoundSummary(true);
      const summaryMsg = {
        role: 'ai',
        content: `🎉 **多轮面试全部完成!**\n\n你已经完成了 ${totalRounds} 轮面试。\n\n点击"查看总结"查看详细评估。`,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setChatMessages(prev => [...prev, summaryMsg]);
    }
  };

  // AI面试官人格切换
  const switchAIPersonality = (personality) => {
    setAiInterviewerPersonality(personality);
    const personalityInfo = {
      professional: { style: '专业严谨', description: '会从专业角度深入提问,注重技术细节和最佳实践' },
      friendly: { style: '友好鼓励', description: '会以引导式提问为主,帮助你展现自己的优势' },
      challenging: { style: '挑战压力', description: '会提出高难度问题,考察你的应变能力和抗压能力' }
    };
    const info = personalityInfo[personality];
    const msg = {
      role: 'ai',
      content: `🤖 **AI面试官人格已切换**\n\n**当前风格**: ${info.style}\n**描述**: ${info.description}\n\n接下来的问题将采用这种风格。`,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setChatMessages(prev => [...prev, msg]);
  };

  // 问题收藏功能
  const toggleFavorite = (message) => {
    const exists = favoriteQuestions.find(f => f.id === message.id);
    if (exists) {
      setFavoriteQuestions(prev => prev.filter(f => f.id !== message.id));
    } else {
      setFavoriteQuestions(prev => [...prev, {
        id: message.id,
        content: message.content,
        timestamp: new Date().toISOString()
      }]);
    }
    localStorage.setItem('favorite-questions', JSON.stringify(favoriteQuestions));
  };

  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
      setQuestionTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 单题计时器重置
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg.role === 'ai') {
        setQuestionTimer(0);
      }
    }
  }, [chatMessages]);

  const saveInterviewRecord = () => {
    if (chatMessages.length === 0) return;
    const record = {
      id: currentInterviewId || Date.now(),
      projectName: selectedProject?.name || 'Unknown',
      date: new Date().toISOString(),
      duration: timer,
      messages: chatMessages
    };
    const updated = [record, ...interviewHistory.filter(h => h.id !== record.id)].slice(0, 50);
    setInterviewHistory(updated);
    localStorage.setItem('interview_history', JSON.stringify(updated));
    alert('记录已保存');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    // 根据不同模式生成不同的 AI 响应
    setTimeout(() => {
      let aiContent = '';

      if (isResumeMode && resumeContent) {
        // 简历模式
        aiContent = `根据你的简历，我看到你在 ${selectedProject?.name || '项目'} 中有相关经验。能否结合你提到的技能，详细说明一下你在这个项目中遇到的最大技术挑战是如何解决的？`;
      } else if (isJobMode && jobDescription) {
        // JD 模式
        aiContent = `根据职位要求，我注意到需要你具备扎实的技术基础。能否详细说明你在以下方面的经验：\n\n1. 核心技术栈的掌握程度\n2. 相关项目的实际应用\n3. 遇到技术问题时的解决思路\n\n请结合具体案例来说明。`;
      } else {
        // 默认模式
        aiContent = `针对你的回答，我建议从 ${selectedProject?.name || '项目'} 的实际应用场景出发。你能详细说说你是如何处理并发请求的吗？`;
      }

      const aiReply = {
        role: 'ai',
        content: aiContent,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setChatMessages(prev => [...prev, aiReply]);
      setIsChatLoading(false);
    }, 1000);
  };

  // 渲染子组件
  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-3">项目面试实战：{selectedProject?.name}</h2>
        <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
          我们将深度剖析您的代码，模拟大厂面试官的提问视角，助您在面试中脱颖而出。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: '技术深度', icon: Target, color: 'text-blue-500', desc: '分析项目中使用的复杂算法和高级框架特性。' },
          { title: '工程实践', icon: Code2, color: 'text-emerald-500', desc: '考察代码规范、模块化设计及构建流程。' },
          { title: '解决问题', icon: Lightbulb, color: 'text-amber-500', desc: '复盘开发过程中遇到的技术难点及解决方案。' }
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <item.icon className={`w-8 h-8 ${item.color} mb-4`} />
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPractice = () => (
    <div className={`flex h-[600px] bg-gray-50 dark:bg-gray-950 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl ${showResumePanel && resumePreview ? 'flex-row' : 'flex-col'}`}>
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="font-bold text-gray-700 dark:text-gray-200">模拟面试直播间</span>
          {multiRoundMode && (
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              第 {currentRound}/{totalRounds} 轮
            </span>
          )}
          {aiInterviewerMode && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
              {aiInterviewerPersonality === 'professional' ? '🎩 专业型' : aiInterviewerPersonality === 'friendly' ? '😊 友好型' : '🔥 挑战型'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">
            总时长: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">
            本题: {Math.floor(questionTimer / 60)}:{(questionTimer % 60).toString().padStart(2, '0')}
          </div>
          <button onClick={saveInterviewRecord} className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> 保存记录
          </button>
          <button onClick={() => setShowScorePanel(true)} className="text-purple-600 hover:text-purple-700 text-xs font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> 评分
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold">准备好迎接挑战了吗？</h4>
              <p className="text-gray-500 max-w-sm">点击下方按钮，AI 面试官将根据项目源码开始向你发起提问。</p>
            </div>
            <button 
              onClick={() => {
                const welcomeMsg = { role: 'ai', content: `你好！我是你的 AI 面试官。我已经浏览了项目 **${selectedProject?.name}**。让我们先聊聊你在这个项目中最有成就感的一个技术点吧？`, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
                setChatMessages([welcomeMsg]);
              }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
            >
              进入面试状态
            </button>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={`${msg.id || idx}-${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'}`}>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {/* AI消息的操作按钮 */}
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => toggleFavorite(msg)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        favoriteQuestions.find(f => f.id === msg.id)
                          ? 'text-yellow-500'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${favoriteQuestions.find(f => f.id === msg.id) ? 'fill-current' : ''}`} />
                      收藏
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isChatLoading && (
          <div className="flex justify-start items-center gap-3 text-gray-400 text-sm italic">
            <Loader2 className="w-4 h-4 animate-spin" />
            面试官正在记录笔记...
          </div>
        )}
      </div>

      {/* 简历预览面板 */}
      {showResumePanel && resumePreview && (
        <div className="w-1/3 min-w-[320px] max-w-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-l-xl border-l border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
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
                    {p.page}
                  </button>
                ))}
              </div>
            )}

            {(() => {
              const p = resumePreview.kind === 'pdf'
                ? resumePreview.pages[resumePreviewPageIndex] || resumePreview.pages[0]
                : resumePreview;
              const active = resumePreviewBlockIndex;

              return (
                <div className="space-y-4">
                  {/* 图片预览 */}
                  {resumePreview.kind === 'pdf' && p?.preview_image && (
                    <div className="relative">
                      <img
                        src={p.preview_image}
                        alt={`Page ${p.page}`}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <OCRBlocksOverlay
                        imageWidth={p?.width}
                        imageHeight={p?.height}
                        blocks={p?.blocks || []}
                        activeIndex={active}
                        onSelect={(i) => setResumePreviewBlockIndex(i)}
                      />
                    </div>
                  )}

                  {resumePreview.kind === 'image' && p?.url && (
                    <img
                      src={p.url}
                      alt="Resume preview"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  )}

                  {/* 文本内容 */}
                  {(p?.blocks || resumePreview.kind === 'image') && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
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
                      {(p?.blocks || []).map((b, idx) => (
                        <div
                          key={idx}
                          onClick={() => setResumePreviewBlockIndex(idx)}
                          className={`px-3 py-2 text-xs border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                            idx === active
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-2 border-l-blue-500'
                              : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {b.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* JD 输入面板 */}
      {showJobPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-black text-gray-900 dark:text-white">输入职位信息 (JD)</h3>
              </div>
              <button
                onClick={() => setShowJobPanel(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    职位描述
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="请粘贴职位描述，包括职位要求、技能需求、工作职责等..."
                    className="w-full h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-sm font-medium">提示</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                    输入完整的职位描述后，AI 将根据职位要求生成针对性的面试问题，帮助你更好地评估候选人与岗位的匹配度。
                  </p>
                </div>

                {jobDescription && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      识别到的关键要求:
                    </div>
                    {parseJobRequirements(jobDescription).length > 0 ? (
                      <div className="space-y-1">
                        {parseJobRequirements(jobDescription).slice(0, 5).map((req, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="text-gray-600 dark:text-gray-400">{req.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        未识别到明确的技能要求，AI 将基于整个职位描述进行面试
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowJobPanel(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleJobDescriptionSubmit}
                disabled={!jobDescription.trim()}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              >
                开始面试
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">技术能力</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scoreBreakdown.technical}
                    onChange={(e) => updateScore('technical', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-lg font-bold text-blue-600">{scoreBreakdown.technical}</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">沟通能力</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scoreBreakdown.communication}
                    onChange={(e) => updateScore('communication', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-lg font-bold text-green-600">{scoreBreakdown.communication}</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">问题解决</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scoreBreakdown.problemSolving}
                    onChange={(e) => updateScore('problemSolving', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-lg font-bold text-purple-600">{scoreBreakdown.problemSolving}</div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">代码质量</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scoreBreakdown.codeQuality}
                    onChange={(e) => updateScore('codeQuality', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-lg font-bold text-orange-600">{scoreBreakdown.codeQuality}</div>
                </div>
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/30 rounded-xl p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">系统设计</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scoreBreakdown.systemDesign}
                    onChange={(e) => updateScore('systemDesign', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-lg font-bold text-pink-600">{scoreBreakdown.systemDesign}</div>
                </div>
              </div>

              {/* 建议列表 */}
              {recommendations.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-3">
                    <Lightbulb className="w-5 h-5" />
                    <span className="font-bold">改进建议</span>
                  </div>
                  <ul className="space-y-2">
                    {recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={saveScoreRecord}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  保存评分
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-3">
          <div className="flex-1 flex gap-2">
            {/* 简历上传按钮 */}
            <label className={`p-3 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
              isUploadingResume
                ? 'text-blue-500 bg-blue-50 cursor-not-allowed'
                : isResumeMode
                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`} title={isResumeMode ? `已上传: ${resumeFile?.name}` : "上传简历"}>
              {isUploadingResume ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <FileText className="w-6 h-6" />
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

            {/* JD输入按钮 */}
            <button
              onClick={() => setShowJobPanel(true)}
              className={`p-3 rounded-xl transition-colors flex-shrink-0 ${
                isJobMode
                  ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={isJobMode ? "已加载职位信息" : "输入职位信息(JD)"}
            >
              <Briefcase className="w-6 h-6" />
            </button>

            {/* 智能提示 */}
            {showHints && (
              <div className="absolute -top-12 left-0 right-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 shadow-lg z-20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    <span className="font-bold text-blue-600 dark:text-blue-400">💡 提示:</span> {currentHint}
                  </p>
                  <button
                    onClick={() => setShowHints(false)}
                    className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* 智能提示按钮 */}
              <button
                onClick={generateHint}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                title="获取答题提示"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>

              {/* 笔记按钮 */}
              <button
                onClick={() => setShowNotesPanel(true)}
                className={`p-1.5 rounded-lg transition-colors ${
                  interviewNotes
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={interviewNotes ? "编辑笔记" : "添加笔记"}
              >
                <FileEdit className="w-3.5 h-3.5" />
              </button>

              {/* 录音按钮 */}
              <button
                onClick={toggleRecording}
                className={`p-1.5 rounded-lg transition-colors ${
                  isRecording
                    ? 'text-red-600 bg-red-50 animate-pulse'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={isRecording ? "停止录音" : "开始录音"}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
            <input
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              placeholder={isResumeMode ? "回答面试官的问题..." : "请详细描述您的回答..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            />
          </div>
          <button
            onClick={handleSendMessage}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-90"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        {/* 上传进度提示 */}
        {isUploadingResume && (
          <div className="flex justify-center my-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 flex items-center gap-3 shadow-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">{uploadProgress}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">面试历程</h3>
        <button 
          onClick={() => { if(confirm('确定清空？')) { localStorage.removeItem('interview_history'); setInterviewHistory([]); } }}
          className="text-sm text-red-500 font-medium hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> 清空全部记录
        </button>
      </div>
      {interviewHistory.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-gray-400 font-medium">还没有进行过面试，快去“模拟面试”试试吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {interviewHistory.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg group-hover:text-blue-600 transition-colors">{item.projectName}</h4>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {new Date(item.date).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                  {Math.floor(item.duration / 60)} 分钟
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="text-center flex-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">交互轮次</div>
                  <div className="font-bold">{item.messages?.length || 0}</div>
                </div>
                <div className="text-center flex-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">综合表现</div>
                  <div className="font-bold text-green-500">优</div>
                </div>
              </div>
              <button
                onClick={() => {
                  // 为历史消息重新生成唯一 id，避免与现有消息冲突
                  const messagesWithNewIds = item.messages?.map(msg => ({
                    ...msg,
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`
                  })) || [];
                  setChatMessages(messagesWithNewIds);
                  setActiveSection('practice');
                }}
                className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold transition-all"
              >
                回顾对话内容
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">面试官</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedProject?.name || 'iFlow Agent'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={exportData} title="导出数据" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={importData} title="导入数据" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500">
                <FileEdit className="w-5 h-5" />
              </button>
              <button onClick={restoreData} title="恢复默认数据" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-red-500">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <button onClick={() => setShowProgressPanel(true)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all relative">
              <BarChart3 className="w-6 h-6 text-purple-500" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>
            <button onClick={() => setShowScorePanel(true)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all relative">
              <Award className="w-6 h-6 text-yellow-500" />
            </button>
            <button onClick={() => {
              setChatMessages([]);
              setTimer(0);
              setActiveSection('practice');
              setIsResumeMode(false);
              setResumeFile(null);
              setResumeContent('');
              setResumePreview(null);
              setResumePreviewPageIndex(0);
              setResumePreviewBlockIndex(null);
              setIsJobMode(false);
              setJobDescription('');
              setJobRequirements([]);
              setShowJobPanel(false);
            }} className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95">
              <Plus className="w-5 h-5" /> 开启新面试
            </button>
          </div>
        </div>
        
        <div className="px-8 flex gap-8 overflow-x-auto no-scrollbar">
          {['overview', 'practice', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`py-4 text-sm font-bold transition-all border-b-4 ${
                activeSection === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'overview' && '项目分析'}
              {tab === 'practice' && '模拟面试'}
              {tab === 'history' && '历史复盘'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'practice' && renderPractice()}
        {activeSection === 'history' && renderHistoryList()}
      </div>

      {/* 学习进度抽屉 */}
      {showProgressPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <h3 className="text-xl font-black">技能图谱</h3>
              </div>
              <button onClick={() => setShowProgressPanel(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              {['progress', 'recommendations', 'analysis'].map(t => (
                <button
                  key={t}
                  onClick={() => setProgressTab(t)}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    progressTab === t ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400'
                  }`}
                >
                  {t === 'progress' ? '掌握度' : t === 'recommendations' ? '智能建议' : '趋势'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
              {progressTab === 'progress' && (
                <div className="space-y-6">
                  {knowledgePoints.map(kp => (
                    <div key={kp.id} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold group-hover:text-purple-500 transition-colors">{kp.name}</span>
                        <span className="text-xs font-mono text-gray-400">{kp.progress}/{kp.total}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${(kp.progress/kp.total)*100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {progressTab === 'recommendations' && (
                <div className="space-y-6">
                  <div className="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-3">
                      <Sparkles className="w-6 h-6" />
                      <span className="font-black text-sm uppercase">AI 进阶建议</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      基于近期的面试表现，你在**系统设计**维度的得分提升最快。下一步建议攻克**前端性能优化**，特别是关键渲染路径的优化。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {['阅读 React 并发机制源码', '完成 3 组算法中等题训练', '复习 WebSocket 协议细节'].map((rec, i) => (
                      <div key={`rec-${rec}`} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-sm font-medium">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {progressTab === 'analysis' && (
                <div className="h-64 space-y-6">
                   <div className="h-48">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...interviewHistory].reverse().slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                          <XAxis dataKey="date" hide />
                          <YAxis fontSize={10} stroke="#999" />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="duration" stroke="#8b5cf6" strokeWidth={4} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                     </ResponsiveContainer>
                   </div>
                   <p className="text-xs text-gray-400 text-center font-bold uppercase tracking-wider">最近 10 场面试时长趋势图</p>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowProgressPanel(false)} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all active:scale-95">
                继续努力
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 笔记面板 */}
      {showNotesPanel && (
        <div ref={notesPanelRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileEdit className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold">面试笔记</h3>
              </div>
              <button
                onClick={() => setShowNotesPanel(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="记录面试要点、候选人的表现、重要问题等..."
                className="w-full h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (confirm('确定清空笔记吗？')) {
                    setInterviewNotes('');
                  }
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                清空
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('interview-notes', interviewNotes);
                  alert('笔记已保存');
                  setShowNotesPanel(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存笔记
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 录音列表 */}
      {recordings.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 z-40 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Mic className="w-4 h-4 text-blue-600" />
              录音记录 ({recordings.length})
            </h4>
            <button
              onClick={() => {
                if (confirm('确定清空所有录音吗？')) {
                  recordings.forEach(r => URL.revokeObjectURL(r.url));
                  setRecordings([]);
                }
              }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              清空全部
            </button>
          </div>
          <div className="space-y-2">
            {recordings.map(recording => (
              <div key={recording.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                <audio controls src={recording.url} className="h-8 flex-1" />
                <button
                  onClick={() => deleteRecording(recording.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPreparation;
