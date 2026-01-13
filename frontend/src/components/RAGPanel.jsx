import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Database, FileText, RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2, Zap, Settings, Upload, X, FileUp, FolderOpen, Send, MessageSquare, LayoutGrid, List, Sparkles, Command, ChevronRight, FileCode, SearchCode, Tag, Folder, Mic } from 'lucide-react';
import { getRAGStats, indexProjectRAG, retrieveRAG, resetRAG, uploadDocumentToRAG, uploadDocumentsBatchToRAG, addFilesToRAG, askRAG } from '../utils/rag';
import { retrieveRAGAdvanced, getDocumentVersions, getDocumentVersion, recordDocumentVersion } from '../utils/ragEnhanced';
import ChatComponent from './ChatComponent';
import VoicePairProgramming from './VoicePairProgramming';

/**
 * RAG 面板组件
 * 提供项目文档索引、检索和结果显示功能
 */
export default function RAGPanel({ projectName, projectPath, visible }) {
  const [stats, setStats] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexMessage, setIndexMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadMode, setUploadMode] = useState('upload'); // 'upload' 或 'select'
  const [selectedFilePaths, setSelectedFilePaths] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatting, setIsChatting] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' 或 'manage'
  const fileInputRef = useRef(null);
  const [autoIndexEnabled, setAutoIndexEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [hasAutoIndexed, setHasAutoIndexed] = useState(false);
  const autoIndexTriggered = useRef(false);
  
  // 高级检索选项
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    similarityThreshold: 0.0,
    fileTypes: [],
    languages: [],
    minChunkSize: 0,
    maxChunkSize: Infinity,
    sortBy: 'similarity'
  });
  
  // 文档版本管理
  const [selectedFileForVersions, setSelectedFileForVersions] = useState(null);
  const [fileVersions, setFileVersions] = useState([]);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  
  // 语音结对编程
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  
  // 处理语音输入
  const handleVoiceInput = useCallback((text) => {
    if (text.trim()) {
      handleChat(text);
    }
  }, []);
  
  // 切换语音输出
  const handleToggleVoiceOutput = useCallback((enabled) => {
    setVoiceOutputEnabled(enabled);
  }, []);

  // 使用项目路径生成唯一的存储键
  const getStorageKey = () => {
    // 使用项目路径的哈希作为键，确保不同路径的项目不会冲突
    const key = projectPath || projectName;
    // 简单的哈希函数，将路径转换为唯一标识符
    const hash = key.split('').reduce((acc, char) => {
      acc = ((acc << 5) - acc) + char.charCodeAt(0);
      return acc & acc;
    }, 0);
    const storageKey = `rag_chat_${Math.abs(hash)}`;
    console.log('RAG Storage Key:', {
      projectName,
      projectPath,
      key,
      hash: Math.abs(hash),
      storageKey
    });
    return storageKey;
  };

  // 加载聊天历史
  useEffect(() => {
    if (projectName || projectPath) {
      const storageKey = getStorageKey();
      try {
        const savedMessages = localStorage.getItem(storageKey);
        if (savedMessages) {
          setChatMessages(JSON.parse(savedMessages));
        }
      } catch (e) {
        console.error('加载聊天历史失败:', e);
      }
    }
  }, [projectName, projectPath]);

  // 保存聊天历史
  useEffect(() => {
    if ((projectName || projectPath) && chatMessages.length > 0) {
      const storageKey = getStorageKey();
      try {
        localStorage.setItem(storageKey, JSON.stringify(chatMessages));
      } catch (e) {
        console.error('保存聊天历史失败:', e);
      }
    }
  }, [chatMessages, projectName, projectPath]);

  // 加载 RAG 统计信息
  useEffect(() => {
    if (visible && projectName) {
      loadStats();
      
      // 自动索引：首次打开且未索引过
      if (autoIndexEnabled && !autoIndexTriggered.current) {
        checkAndAutoIndex();
      }
    }
  }, [visible, projectName]);

  // 从 localStorage 加载自动索引设置
  useEffect(() => {
    const saved = localStorage.getItem('rag-auto-index');
    if (saved !== null) {
      setAutoIndexEnabled(saved === 'true');
    }
  }, []);

  // 保存自动索引设置
  useEffect(() => {
    localStorage.setItem('rag-auto-index', autoIndexEnabled.toString());
  }, [autoIndexEnabled]);

  const checkAndAutoIndex = async () => {
    if (!projectPath || isIndexing) return;

    try {
      // 检查是否已有索引
      const data = await getRAGStats(projectPath);
      const hasIndex = data?.stats?.document_count > 0;

      if (!hasIndex && autoIndexEnabled) {
        autoIndexTriggered.current = true;
        console.log('RAG: 首次打开项目，开始自动索引...');
        handleIndexProject(false, true); // true = 自动索引模式
      }
    } catch (err) {
      // 如果获取统计失败，可能是首次使用，尝试自动索引
      if (autoIndexEnabled) {
        autoIndexTriggered.current = true;
        console.log('RAG: 检测到新项目，开始自动索引...');
        handleIndexProject(false, true);
      }
    }
  };

  const loadStats = async () => {
    try {
      setError(null);
      const data = await getRAGStats(projectPath);
      console.log('RAG stats loaded:', data);
      // 提取 stats 字段
      const statsData = data.stats || data;
      setStats(statsData);
      console.log('Stats state after setStats:', statsData);
    } catch (err) {
      console.error('加载 RAG 统计失败:', err);
      setError(err.message);
    }
  };

  const handleIndexProject = async (forceReindex = false, isAutoIndex = false) => {
    if (!projectPath) return;

    setIsIndexing(true);
    setError(null);
    setSuccess(null);
    setIndexProgress(0);

    if (isAutoIndex) {
      setIndexMessage('自动索引中...');
      setHasAutoIndexed(true);
    } else {
      setIndexMessage(forceReindex ? '开始重新索引...' : '开始索引...');
    }

    try {
      await indexProjectRAG(projectPath, (progressData) => {
        if (progressData.type === 'status') {
          setIndexMessage(progressData.message);
          setIndexProgress(progressData.progress || 0);
        } else if (progressData.type === 'complete') {
          setIndexMessage(progressData.message);
          setIndexProgress(100);
          const changedFiles = progressData.result?.changed_files || 0;
          const deletedFiles = progressData.result?.deleted_files || 0;
          const message = `索引完成: ${progressData.result?.stats?.document_count || 0} 个文档块`;
          const detail = forceReindex 
            ? ' (强制重新索引)' 
            : (changedFiles > 0 || deletedFiles > 0 
              ? ` (变更: ${changedFiles} 文件, 删除: ${deletedFiles} 文件)` 
              : ' (无变更)');
          
          if (isAutoIndex) {
            console.log('RAG: 自动索引完成', message + detail);
            // 自动索引完成后不显示成功消息，避免打扰用户
            loadStats();
          } else {
            setSuccess(message + detail);
            loadStats();
          }
        } else if (progressData.type === 'error') {
          if (isAutoIndex) {
            console.error('RAG: 自动索引失败', progressData.message);
          } else {
            setError(progressData.message);
          }
        }
      }, forceReindex);
    } catch (err) {
      console.error('索引失败:', err);
      if (!isAutoIndex) {
        setError(err.message);
      }
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearch = async () => {
      if (!searchQuery.trim() || !projectPath) return;
  
      setIsRetrieving(true);
      setError(null);
      setSearchResults([]);
  
      try {
        let results;
        if (showAdvancedSearch) {
          // 使用高级检索
          const data = await retrieveRAGAdvanced(projectPath, searchQuery, {
            nResults: 5,
            similarityThreshold: searchOptions.similarityThreshold,
            fileTypes: searchOptions.fileTypes,
            languages: searchOptions.languages,
            minChunkSize: searchOptions.minChunkSize,
            maxChunkSize: searchOptions.maxChunkSize,
            sortBy: searchOptions.sortBy
          });
          results = data.results;
          
          // 显示过滤信息
          if (data.filters_applied) {
            console.log('应用了过滤条件:', data.filters_applied);
          }
        } else {
          // 使用基本检索
          results = await retrieveRAG(projectPath, searchQuery, 5);
        }
        
        setSearchResults(results);
      } catch (err) {
        console.error('检索失败:', err);
        setError(err.message);
      } finally {
        setIsRetrieving(false);
      }
    };  
    const handleReset = async () => {
      if (!projectPath) return;
      if (!confirm('确定要清空知识库吗？\n\n这将删除所有已索引的文档，包括之前可能读取的二进制数据。\n清空后，请重新上传您的文档，系统将使用新的读取功能正确提取内容。')) return;
  
      try {
        setError(null);
        setSuccess(null);
        await resetRAG(projectPath);
        setStats(null);
        setSearchResults([]);
        setChatMessages([]);
  
        // 清空聊天历史
        const storageKey = getStorageKey();
        try {
          localStorage.removeItem(storageKey);
        } catch (e) {
          console.error('清空聊天历史失败:', e);
        }
  
        setSuccess('知识库已清空！请重新上传您的文档，系统将使用新的读取功能正确提取内容。');
        // 不自动加载统计，让用户重新上传
      } catch (err) {
        console.error('重置失败:', err);
        setError(err.message);
      }
    };
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleChat = async (message) => {
    if (!message.trim() || !projectPath || isChatting) return;

    setIsChatting(true);
    setError(null);

    // 添加用户消息
    const userMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMessage]);

    try {
      // 调用 RAG 问答 API
      const result = await askRAG(projectPath, message);
      
      // 添加详细调试日志
      console.log('='.repeat(80));
      console.log('RAG 问答结果:');
      console.log('='.repeat(80));
      console.log('回答预览:', result.answer?.substring(0, 100));
      console.log('来源数量:', result.sources?.length || 0);
      console.log('置信度:', result.confidence);
      console.log('相关文档数量:', result.related_documents?.length || 0);
      
      if (result.sources && result.sources.length > 0) {
        console.log('='.repeat(80));
        console.log('来源详细信息:');
        console.log('='.repeat(80));
        result.sources.forEach((source, index) => {
          console.log(`\n来源 #${index + 1}:`);
          console.log('  文件路径:', source.file_path);
          console.log('  相似度:', source.similarity);
          console.log('  块索引:', `${source.chunk_index}/${source.total_chunks}`);
          console.log('  行号:', `${source.start_line}-${source.end_line}`);
          console.log('  语言:', source.language);
          console.log('  内容长度:', source.content?.length || 0);
          console.log('  内容预览:', source.content?.substring(0, 150));
          console.log('  摘要:', source.summary?.substring(0, 100) || 'N/A');
          console.log('  来源描述:', source.source_desc);
        });
        console.log('='.repeat(80));
      }
      
      // 添加 AI 回复
      const aiMessage = {
        role: 'assistant',
        content: result.answer || '抱歉，无法回答您的问题。',
        sources: result.sources || [],
        confidence: result.confidence || null,
        related_documents: result.related_documents || []
      };
      
      console.log('添加到聊天记录的消息:', {
        role: aiMessage.role,
        contentLength: aiMessage.content.length,
        sourcesCount: aiMessage.sources.length,
        confidence: aiMessage.confidence,
        relatedDocsCount: aiMessage.related_documents.length
      });
      console.log('='.repeat(80));
      
      setChatMessages(prev => [...prev, aiMessage]);
      
      // 如果启用了语音输出，朗读 AI 回复
      if (voiceOutputEnabled && window.speakAIResponse) {
        setTimeout(() => {
          window.speakAIResponse(aiMessage.content);
        }, 500);
      }

    } catch (err) {
      console.error('AI 问答失败:', err);
      setError(err.message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '抱歉，处理您的问题时出现错误：' + err.message }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(files);
  };

  const handleUpload = async () => {
    if (!projectPath || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress({ current: 0, total: uploadedFiles.length });

    try {
      if (uploadedFiles.length === 1) {
        // 单个文件上传
        const result = await uploadDocumentToRAG(projectPath, uploadedFiles[0]);
        if (result.success) {
          setSuccess(`成功上传: ${uploadedFiles[0].name} (${result.chunks} 个文档块)`);
          loadStats();
        } else {
          throw new Error(result.error || '上传失败');
        }
      } else {
        // 批量上传
        await uploadDocumentsBatchToRAG(projectPath, uploadedFiles, (progressData) => {
          if (progressData.type === 'progress') {
            setUploadProgress({
              current: progressData.processed,
              total: progressData.total
            });
          } else if (progressData.type === 'complete') {
            setSuccess(`成功上传 ${progressData.total} 个文件`);
            loadStats();
          } else if (progressData.type === 'error') {
            setError(`上传失败: ${progressData.file_name} - ${progressData.error}`);
          }
        });
      }
    } catch (err) {
      console.error('上传失败:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
      setShowUpload(false);
      setUploadedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleFilePathInput = (e) => {
    const paths = e.target.value.split('\n').filter(p => p.trim());
    setSelectedFilePaths(paths);
  };

  const handleAddFiles = async () => {
    if (!projectPath || selectedFilePaths.length === 0) return;

    console.log('准备添加文件到 RAG:', {
      projectPath,
      filePaths: selectedFilePaths,
      filePathsDetail: selectedFilePaths.map((p, i) => `[${i}]: "${p}" (length: ${p.length})`)
    });

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress({ current: 0, total: selectedFilePaths.length });

    try {
      await addFilesToRAG(projectPath, selectedFilePaths, (progressData) => {
        console.log('RAG 添加进度:', progressData);
        if (progressData.type === 'progress') {
          setUploadProgress({
            current: progressData.processed,
            total: progressData.total
          });
        } else if (progressData.type === 'complete') {
          setSuccess(`成功添加 ${progressData.total} 个文件到知识库`);
          loadStats();
        } else if (progressData.type === 'error') {
          setError(`添加失败: ${progressData.file_name} - ${progressData.error}`);
        }
      });
    } catch (err) {
      console.error('添加文件失败:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
      setShowUpload(false);
      setSelectedFilePaths([]);
    }
  };

  const handleRemoveFilePath = (index) => {
    setSelectedFilePaths(selectedFilePaths.filter((_, i) => i !== index));
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleAutoIndexToggle = () => {
    setAutoIndexEnabled(!autoIndexEnabled);
  };
  
  // 查看文档版本
  const handleViewVersions = async (filePath) => {
    try {
      const data = await getDocumentVersions(projectPath, filePath);
      setFileVersions(data.versions || []);
      setSelectedFileForVersions(filePath);
      setShowVersionPanel(true);
    } catch (err) {
      console.error('获取文档版本失败:', err);
      setError(err.message);
    }
  };
  
  // 查看特定版本
  const handleViewVersion = async (versionId) => {
    try {
      const data = await getDocumentVersion(projectPath, selectedFileForVersions, versionId);
      setSelectedVersion(data.version);
    } catch (err) {
      console.error('获取版本内容失败:', err);
      setError(err.message);
    }
  };
  
  // 记录新版本
  const handleRecordVersion = async () => {
    if (!selectedFileForVersions) return;
    
    try {
      const data = await recordDocumentVersion(projectPath, selectedFileForVersions, {
        recorded_by: 'user',
        timestamp: new Date().toISOString()
      });
      if (data.success) {
        setSuccess('版本记录成功');
        // 重新加载版本列表
        await handleViewVersions(selectedFileForVersions);
      }
    } catch (err) {
      console.error('记录版本失败:', err);
      setError(err.message);
    }
  };

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* 顶部标题栏 - 玻璃拟态效果 */}
      <header className="flex-shrink-0 px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-xl ring-1 ring-indigo-500/30">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              RAG 知识库
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">Pro</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">智能文档检索与增强生成系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">
                {stats.document_count || 0} 篇文档已就绪
              </span>
            </div>
          )}
          <button
            onClick={toggleSettings}
            className={`p-2 rounded-xl transition-all duration-200 ${
              showSettings ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
            title="知识库设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 设置面板 - 下拉动画 */}
      {showSettings && (
        <div className="flex-shrink-0 px-6 py-4 bg-slate-800/40 border-b border-white/5 animate-slideDown">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">自动索引模式</p>
                  <p className="text-xs text-slate-400">打开项目时自动扫描并更新知识库</p>
                </div>
              </div>
              <button
                onClick={handleAutoIndexToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-offset-slate-900 ${
                  autoIndexEnabled ? 'bg-indigo-600 ring-indigo-500/20' : 'bg-slate-700 ring-slate-600/20'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoIndexEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主体内容区 - 选项卡与布局 */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* 选项卡导航 */}
        <div className="flex-shrink-0 px-6 py-2 bg-slate-900/30 flex items-center justify-between border-b border-white/5">
          <nav className="flex gap-1">
            {[
              { id: 'chat', label: 'AI 问答', icon: MessageSquare, color: 'emerald' },
              { id: 'manage', label: '文档管理', icon: LayoutGrid, color: 'indigo' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? (tab.color === 'emerald' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20')
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
             <span className="flex items-center gap-1.5"><Command className="w-3 h-3" /> 检索增强</span>
             <span className="w-1 h-1 rounded-full bg-slate-700" />
             <span>{projectName}</span>
          </div>
        </div>

                {/* 动态内容面板 */}
                <main className="flex-1 overflow-hidden relative">
                  {/* AI 问答选项卡 */}
                  {activeTab === 'chat' && (
                    <div className="h-full flex flex-col md:flex-row min-h-0 animate-fadeIn">
                      {/* 对话主区域 */}
                      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/20">
                        {!stats || stats.document_count === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-indigo-600/20 blur-3xl rounded-full" />
                              <div className="relative w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl ring-1 ring-white/5">
                                <MessageSquare className="w-10 h-10 text-slate-500" />
                              </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">知识库尚未就绪</h3>
                            <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
                              我们需要先扫描并索引您的项目文档，才能提供基于代码上下文的智能回答。
                            </p>
                            <button
                              onClick={() => setActiveTab('manage')}
                              className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-all shadow-xl shadow-indigo-600/25 active:scale-95"
                            >
                              立即索引文档
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                               <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  已连接智能检索后端 (基于 {stats.document_count} 个分片)
                               </span>
                               <div className="flex items-center gap-2">
                                 <button
                                    onClick={() => setShowVoicePanel(!showVoicePanel)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      showVoicePanel
                                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                                    title="语音交互模式"
                                  >
                                    <Mic className="w-4 h-4" />
                                  </button>
                                  {chatMessages.length > 0 && (
                                    <button 
                                        onClick={() => {
                                          if (window.confirm('确定要清空所有对话记录吗？')) {
                                            setChatMessages([]);
                                            const storageKey = `rag_chat_${projectName}`;
                                            localStorage.removeItem(storageKey);
                                          }
                                        }}
                                        className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors uppercase font-bold tracking-wider px-2"
                                    >
                                        清空上下文
                                    </button>
                                  )}
                               </div>
                            </div>
                            
                            {/* 语音面板集成 */}
                            {showVoicePanel && (
                              <div className="px-6 py-4 bg-indigo-600/5 border-b border-indigo-500/10 animate-slideDown">
                                <VoicePairProgramming
                                  onVoiceInput={handleVoiceInput}
                                  onToggleVoiceOutput={handleToggleVoiceOutput}
                                />
                              </div>
                            )}
                            
                            <div className="flex-1 min-h-0">
                              <ChatComponent
                                messages={chatMessages}
                                onSendMessage={handleChat}
                                isLoading={isChatting}
                                placeholder="关于您的项目有什么想问的？"
                                maxHeight="100%"
                                className="h-full"
                                showSources={true}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
        
                  {/* 文档管理选项卡 */}
                  {activeTab === 'manage' && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden animate-fadeIn">
                      {/* 左侧控制栏 */}
                      <div className="lg:col-span-4 border-r border-white/5 bg-slate-900/40 p-6 overflow-y-auto custom-scrollbar space-y-6">
                        {/* 核心操作卡片 */}
                        <div className="space-y-4">
                           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">数据同步</h4>
                           <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-5 space-y-4 shadow-inner">
                              {stats ? (
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
                                      <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">文档块</p>
                                      <p className="text-2xl font-bold text-white">{stats.document_count || 0}</p>
                                   </div>
                                   <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/10">
                                      <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">索引大小</p>
                                      <p className="text-sm font-bold text-white mt-1">
                                        {stats.total_size ? `${(stats.total_size / 1024).toFixed(1)} KB` : 'N/A'}
                                      </p>
                                   </div>
                                </div>
                              ) : (
                                <div className="py-8 text-center">
                                   <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                   <p className="text-sm text-slate-500 font-medium">知识库未初始化</p>
                                </div>
                              )}
        
                              <div className="space-y-2 pt-2">
                                <button
                                  onClick={() => handleIndexProject(false)}
                                  disabled={isIndexing}
                                  className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${
                                    isIndexing
                                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                                  }`}
                                >
                                  {isIndexing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                  <span>{isIndexing ? '正在同步数据...' : '同步项目文档'}</span>
                                </button>
                                
                                <div className="grid grid-cols-2 gap-2">
                                   <button
                                     onClick={() => setShowUpload(!showUpload)}
                                     className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                       showUpload ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                     }`}
                                   >
                                     <FileUp className="w-4 h-4" /> 上传文件
                                   </button>
                                   <button
                                     onClick={() => handleIndexProject(true)}
                                     disabled={isIndexing}
                                     className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 text-orange-400 border border-orange-500/10 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                   >
                                     <RefreshCw className="w-4 h-4" /> 强制重建
                                   </button>
                                </div>
                              </div>
                           </div>
                        </div>
        
                        {/* 索引进度条 */}
                        {isIndexing && (
                          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 animate-pulse">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-indigo-400 uppercase truncate mr-2">{indexMessage || '正在处理文档...'}</span>
                              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">{indexProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-500 ease-out"
                                style={{ width: `${indexProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
        
                        {/* 上传区域 */}
                        {showUpload && (
                          <div className="bg-slate-800/50 rounded-2xl border-2 border-dashed border-white/10 p-5 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-bold text-white">添加外部文档</h5>
                              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="flex bg-slate-900/50 p-1 rounded-xl">
                               <button 
                                  onClick={() => setUploadMode('upload')}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${uploadMode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                               >上传文件</button>
                               <button 
                                  onClick={() => setUploadMode('select')}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${uploadMode === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                               >路径导入</button>
                            </div>
        
                            {uploadMode === 'upload' ? (
                              <div className="space-y-4">
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileSelect}
                                  multiple
                                  className="hidden"
                                  id="rag-file-upload-new"
                                />
                                <label 
                                   htmlFor="rag-file-upload-new"
                                   className="py-10 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                                >
                                   <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                      <Upload className="w-6 h-6 text-slate-400" />
                                   </div>
                                   <p className="text-xs font-bold text-slate-300">点击选择文件</p>
                                   <p className="text-[10px] text-slate-500 mt-1 text-center px-4">支持代码、Markdown、PDF 等</p>
                                </label>
                                
                                {uploadedFiles.length > 0 && (
                                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {uploadedFiles.map((file, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-white/5">
                                         <div className="flex items-center gap-2 min-w-0">
                                            <FileCode className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                            <span className="text-[11px] text-slate-300 truncate font-mono">{file.name}</span>
                                         </div>
                                         <button onClick={() => handleRemoveFile(idx)} className="text-slate-500 hover:text-rose-400 p-1"><X className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <button
                                  onClick={handleUpload}
                                  disabled={uploadedFiles.length === 0 || isUploading}
                                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                                >
                                  {isUploading ? '正在处理...' : `同步 ${uploadedFiles.length} 个文件`}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                 <textarea
                                    value={selectedFilePaths.join('\n')}
                                    onChange={handleFilePathInput}
                                    placeholder="输入绝对路径，每行一个..."
                                    className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none resize-none font-mono"
                                 />
                                 <button
                                    onClick={handleAddFiles}
                                    disabled={selectedFilePaths.length === 0 || isUploading}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                                 >
                                    {isUploading ? '正在添加...' : '执行路径导入'}
                                 </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 危险区域 */}
                        <div className="pt-4 border-t border-white/5 space-y-3">
                           <h4 className="text-[10px] font-bold text-rose-500/50 uppercase tracking-widest px-1">危险操作</h4>
                           <button
                            onClick={handleReset}
                            className="w-full py-2 px-4 rounded-xl border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            重置知识库索引
                          </button>
                        </div>
                      </div>
        
                      {/* 右侧搜索预览栏 */}
                      <div className="lg:col-span-8 flex flex-col min-h-0 bg-slate-900/10">
                         {/* 搜索与高级检索 */}
                         <div className="px-8 py-6 border-b border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                  <SearchCode className="w-4 h-4" /> 文档检索系统
                               </h3>
                               <button
                                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                                    showAdvancedSearch ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-500 border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  {showAdvancedSearch ? '隐藏高级检索' : '显示高级检索'}
                                </button>
                            </div>
        
                            <div className="relative group max-w-3xl">
                               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <SearchCode className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                               </div>
                               <input
                                 type="text"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 onKeyPress={handleKeyPress}
                                 placeholder="输入关键词进行语义检索..."
                                 className="block w-full bg-slate-800/50 border border-white/10 rounded-2xl pl-12 pr-24 py-4 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 focus:outline-none transition-all shadow-inner"
                               />
                               <div className="absolute inset-y-2 right-2 flex items-center">
                                  <button
                                    onClick={handleSearch}
                                    disabled={isRetrieving || !searchQuery.trim()}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                                  >
                                    {isRetrieving ? <Loader2 className="w-4 h-4 animate-spin" /> : '立即检索'}
                                  </button>
                               </div>
                            </div>
        
                            {showAdvancedSearch && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 animate-slideDown">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">相似度阈值: {searchOptions.similarityThreshold}</label>
                                  <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={searchOptions.similarityThreshold}
                                    onChange={(e) => setSearchOptions({...searchOptions, similarityThreshold: parseFloat(e.target.value)})}
                                    className="w-full accent-indigo-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">排序准则</label>
                                  <select
                                    value={searchOptions.sortBy}
                                    onChange={(e) => setSearchOptions({...searchOptions, sortBy: e.target.value})}
                                    className="w-full bg-slate-800 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none"
                                  >
                                    <option value="similarity">语义相关度</option>
                                    <option value="date">最后更新日期</option>
                                    <option value="size">分片大小</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">限定文件类型</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {['.py', '.js', '.ts', '.md', '.json'].map(ext => (
                                      <button
                                        key={ext}
                                        onClick={() => {
                                          const types = searchOptions.fileTypes.includes(ext)
                                            ? searchOptions.fileTypes.filter(t => t !== ext)
                                            : [...searchOptions.fileTypes, ext];
                                          setSearchOptions({...searchOptions, fileTypes: types});
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                          searchOptions.fileTypes.includes(ext) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-white/5 text-slate-500'
                                        }`}
                                      >
                                        {ext}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                         </div>
        
                         {/* 搜索结果显示 */}
                         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {searchResults.length > 0 ? (
                              <div className="space-y-6 max-w-5xl mx-auto">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                   <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                                      <List className="w-4 h-4 text-indigo-400" />
                                      匹配结果集 ({searchResults.length})
                                   </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                  {searchResults.map((result, idx) => (
                                    <article
                                      key={result.id || idx}
                                      className="group bg-slate-800/30 hover:bg-slate-800/60 rounded-2xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 shadow-sm"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                              <FileCode className="w-5 h-5 text-indigo-400" />
                                           </div>
                                           <div>
                                             <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">
                                                {result.metadata?.file_path || 'unknown_file'}
                                             </span>
                                             <div className="flex items-center gap-2 mt-1">
                                                {result.metadata?.language && (
                                                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                                                    {result.metadata.language}
                                                  </span>
                                                )}
                                                {result.metadata?.total_lines && (
                                                  <span className="text-[9px] text-slate-600 font-bold">{result.metadata.total_lines} LINES</span>
                                                )}
                                             </div>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          {result.distance !== undefined && (
                                            <div className="text-right">
                                               <div className="text-[10px] font-bold text-emerald-500">{( (1 - result.distance) * 100 ).toFixed(0)}% 相似</div>
                                               <div className="w-20 bg-slate-900 h-1 rounded-full overflow-hidden mt-1">
                                                  <div className="bg-emerald-500 h-full" style={{ width: `${(1 - result.distance) * 100}%` }} />
                                               </div>
                                            </div>
                                          )}
                                          <button
                                            onClick={() => handleViewVersions(result.metadata?.file_path)}
                                            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-indigo-400 transition-colors"
                                            title="查看版本历史"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                         {result.metadata?.summary && (
                                           <div className="flex items-start gap-2 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                              <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                              <p className="text-xs text-slate-400 italic leading-relaxed">
                                                {result.metadata.summary}
                                              </p>
                                           </div>
                                         )}
                                         <div className="relative group/code">
                                           <pre className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap font-mono bg-slate-950/40 p-5 rounded-2xl border border-white/5 group-hover/code:border-white/10 transition-colors max-h-96 overflow-y-auto custom-scrollbar">
                                             {result.content}
                                           </pre>
                                         </div>
                                      </div>
                                      
                                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex gap-4">
                                          {result.metadata?.categories?.map((cat, i) => (
                                            <span key={i} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase">
                                              <Tag className="w-3 h-3 text-indigo-500/50" /> {cat}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                          CHUNK {result.metadata?.chunk_index + 1 || 1} OF {result.metadata?.total_chunks || 1}
                                        </span>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-fadeIn">
                                 <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/5 shadow-xl">
                                    <Search className="w-10 h-10 text-slate-600" />
                                 </div>
                                 <h4 className="text-lg font-bold text-slate-400">等待检索指令</h4>
                                 <p className="text-sm text-slate-600 max-w-xs mt-2 leading-relaxed">输入关键词，我们将基于语义向量引擎，在毫秒内为您定位最相关的文档片段。</p>
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  )}
                </main>
      </div>

      {/* 悬浮全局反馈系统 */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {error && (
          <div className="pointer-events-auto flex items-center gap-3 bg-rose-950/90 backdrop-blur-md border border-rose-500/30 text-rose-100 px-5 py-3 rounded-2xl shadow-2xl animate-slideInRight">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
               <p className="text-sm font-bold">操作失败</p>
               <p className="text-xs text-rose-200/70 truncate">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg text-rose-400"><X className="w-4 h-4" /></button>
          </div>
        )}

        {success && (
          <div className="pointer-events-auto flex items-center gap-3 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/30 text-emerald-100 px-5 py-3 rounded-2xl shadow-2xl animate-slideInRight">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
               <p className="text-sm font-bold">执行成功</p>
               <p className="text-xs text-emerald-200/70 truncate">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="p-1 hover:bg-white/10 rounded-lg text-emerald-400"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      
      {/* 文档版本管理面板 - 重构为侧滑/现代 Modal */}
      {showVersionPanel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowVersionPanel(false)} />
          <div className="relative bg-slate-900 border border-white/10 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal 头部 */}
            <div className="px-6 py-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                   <RefreshCw className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white leading-none">版本演进历史</h3>
                   <p className="text-xs text-slate-500 mt-1.5 font-mono">{selectedFileForVersions}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVersionPanel(false);
                  setSelectedFileForVersions(null);
                  setFileVersions([]);
                  setSelectedVersion(null);
                }}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* 版本列表侧边栏 */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 flex flex-col min-h-0 bg-slate-900/50">
                <div className="p-4 flex items-center justify-between bg-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">已记录版本 ({fileVersions.length})</span>
                  <button
                    onClick={handleRecordVersion}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <RefreshCw className="w-3 h-3" /> 抓取当前
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {fileVersions.length > 0 ? (
                    fileVersions.map((version) => (
                      <div
                        key={version.version_id}
                        onClick={() => handleViewVersion(version.version_id)}
                        className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                          selectedVersion?.version_id === version.version_id
                            ? 'bg-indigo-600/10 border-indigo-500/50 shadow-inner'
                            : 'bg-transparent border-transparent hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            selectedVersion?.version_id === version.version_id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>V{version.version_number}</span>
                          <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                            {new Date(version.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-xs text-slate-300 font-medium">{new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           <span className="text-[10px] text-slate-600 uppercase font-bold">{(version.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-10">
                       <Database className="w-10 h-10 mb-2" />
                       <p className="text-xs">暂无版本记录</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 内容预览主区域 */}
              <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/20">
                {selectedVersion ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                             <span className="text-[10px] text-slate-500 uppercase font-bold">版本摘要:</span>
                             <span className="text-[10px] font-mono text-indigo-400">{selectedVersion.version_id.substring(0, 12)}...</span>
                          </div>
                          <div className="w-px h-3 bg-slate-700" />
                          <div className="flex items-center gap-1.5">
                             <span className="text-[10px] text-slate-500 uppercase font-bold">哈希值:</span>
                             <span className="text-[10px] font-mono text-emerald-500">{selectedVersion.hash.substring(0, 8)}</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-hidden">
                       <div className="h-full rounded-2xl bg-slate-950 border border-white/5 flex flex-col shadow-2xl">
                          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2">
                             <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                             </div>
                             <span className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">SOURCE PREVIEW</span>
                          </div>
                          <pre className="flex-1 overflow-auto p-5 text-[13px] leading-relaxed text-slate-300 font-mono custom-scrollbar">
                             {selectedVersion.content}
                          </pre>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                    <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mb-4 text-slate-600 ring-1 ring-white/5">
                       <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="text-white font-bold">查看版本详情</h4>
                    <p className="text-sm text-slate-500 max-w-xs mt-2">从左侧选择一个特定的历史快照，即可在这里查看当时的文档完整内容。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}} />
    </div>
  );
}