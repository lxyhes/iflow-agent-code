import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Database, FileText, RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2, Zap, Settings, Upload, X, FileUp, FolderOpen, Send, MessageSquare, LayoutGrid, List, Sparkles, Command, ChevronRight, FileCode, SearchCode, Tag, Folder, Mic } from 'lucide-react';
import { getRAGStats, indexProjectRAG, retrieveRAG, resetRAG, uploadDocumentToRAG, uploadDocumentsBatchToRAG, addFilesToRAG, askRAG } from '../utils/rag';
import { retrieveRAGAdvanced, getDocumentVersions, getDocumentVersion, recordDocumentVersion } from '../utils/ragEnhanced';
import ChatComponent from './ChatComponent';
import VoicePairProgramming from './VoicePairProgramming';
import { scopedKey } from '../utils/projectScope';

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
    const saved = localStorage.getItem(scopedKey({ path: projectPath, name: projectName }, 'rag-auto-index'));
    if (saved !== null) {
      setAutoIndexEnabled(saved === 'true');
    }
  }, [projectName, projectPath]);

  // 保存自动索引设置
  useEffect(() => {
    localStorage.setItem(scopedKey({ path: projectPath, name: projectName }, 'rag-auto-index'), autoIndexEnabled.toString());
  }, [autoIndexEnabled, projectName, projectPath]);

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
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* 顶部标题栏 - 玻璃拟态效果 */}
      <header className="flex-shrink-0 px-6 py-4 bg-gray-50/80 dark:bg-slate-900/50 backdrop-blur-md border-b border-gray-200 dark:border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-xl ring-1 ring-indigo-500/20 dark:ring-indigo-500/30">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        RAG 知识库
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black">Pro</span>
                      </h2>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 font-medium">智能文档检索与增强生成系统</p>          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {stats.document_count || 0} CHUNKS READY
              </span>
            </div>
          )}
          <button
            onClick={toggleSettings}
            className={`p-2 rounded-xl transition-all duration-200 ${
              showSettings 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white border border-gray-200 dark:border-white/5'
            }`}
            title="知识库设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 设置面板 - 下拉动画 */}
      {showSettings && (
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-slate-800/40 border-b border-gray-200 dark:border-white/5 animate-slideDown">
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">自动索引模式</p>
                                  <p className="text-xs text-gray-500 dark:text-slate-400">打开项目时自动扫描并更新知识库</p>                </div>
              </div>
              <button
                onClick={handleAutoIndexToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 dark:ring-offset-slate-900 ${
                  autoIndexEnabled ? 'bg-indigo-600 ring-indigo-500/20' : 'bg-gray-300 dark:bg-slate-700 ring-slate-200 dark:ring-slate-600/20'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoIndexEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主体内容区 - 选项卡与布局 */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-white dark:bg-slate-900">
        {/* 选项卡导航 */}
        <div className="flex-shrink-0 px-6 py-2 bg-gray-50/50 dark:bg-slate-900/30 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
          <nav className="flex gap-1.5">
            {[
              { id: 'chat', label: 'AI 问答', icon: MessageSquare, color: 'emerald' },
              { id: 'manage', label: '文档管理', icon: LayoutGrid, color: 'indigo' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? (tab.color === 'emerald' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20')
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="hidden md:flex items-center gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">
             <span className="flex items-center gap-1.5"><Command className="w-3 h-3" /> Vector Search</span>
             <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
             <span className="text-indigo-600 dark:text-indigo-400">{projectName}</span>
          </div>
        </div>

                {/* 动态内容面板 */}
                <main className="flex-1 overflow-hidden relative">
                  {/* AI 问答选项卡 */}
                  {activeTab === 'chat' && (
                    <div className="h-full flex flex-col md:flex-row min-h-0 animate-fadeIn bg-white dark:bg-slate-900">
                      {/* 对话主区域 */}
                      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30 dark:bg-slate-900/20">
                        {!stats || stats.document_count === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900">
                            <div className="relative mb-8">
                              <div className="absolute inset-0 bg-indigo-600/10 blur-3xl rounded-full" />
                              <div className="relative w-28 h-28 bg-gray-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-2xl ring-1 ring-gray-200 dark:ring-white/5">
                                <MessageSquare className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">知识库尚未就绪</h3>
                            <p className="text-gray-500 dark:text-slate-400 max-w-sm mb-10 leading-relaxed font-medium">
                              我们需要先扫描并索引您的项目文档，才能提供基于代码上下文的智能回答。
                            </p>
                            <button
                              onClick={() => setActiveTab('manage')}
                              className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-bold transition-all shadow-xl shadow-indigo-600/25 active:scale-95"
                            >
                              立即同步文档
                              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 py-3 bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                               <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Ready: {stats.document_count} Vector Chunks
                               </span>
                               <div className="flex items-center gap-3">
                                 <button
                                    onClick={() => setShowVoicePanel(!showVoicePanel)}
                                    className={`p-2 rounded-xl transition-all ${
                                      showVoicePanel
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-white'
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
                                            const storageKey = getStorageKey();
                                            localStorage.removeItem(storageKey);
                                          }
                                        }}
                                        className="text-[10px] text-gray-400 dark:text-slate-500 hover:text-rose-500 transition-colors uppercase font-black tracking-widest px-2"
                                    >
                                        RESET CONTEXT
                                    </button>
                                  )}
                               </div>
                            </div>
                            
                            {/* 语音面板集成 */}
                            {showVoicePanel && (
                              <div className="px-6 py-4 bg-indigo-50/50 dark:bg-indigo-600/5 border-b border-indigo-100 dark:border-indigo-500/10 animate-slideDown">
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
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden animate-fadeIn bg-white dark:bg-slate-900">
                      {/* 左侧控制栏 */}
                      <div className="lg:col-span-4 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-slate-900/40 p-6 overflow-y-auto custom-scrollbar space-y-8">
                        {/* 核心操作卡片 */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">DATA SYNC</h4>
                           <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-gray-200 dark:border-white/5 p-6 space-y-6 shadow-sm">
                              {stats ? (
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-black mb-1">分片总数</p>
                                      <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.document_count || 0}</p>
                                   </div>
                                   <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black mb-1">索引大小</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-2">
                                        {stats.total_size ? `${(stats.total_size / 1024).toFixed(1)} KB` : 'N/A'}
                                      </p>
                                   </div>
                                </div>
                              ) : (
                                <div className="py-10 text-center bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                                   <Database className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                                                     <p className="text-sm text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">Database Offline</p>                                </div>
                              )}
        
                              <div className="space-y-3 pt-2">
                                <button
                                  onClick={() => handleIndexProject(false)}
                                  disabled={isIndexing}
                                  className={`w-full py-4 px-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl ${
                                    isIndexing
                                      ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                                  }`}
                                >
                                  {isIndexing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                  <span className="uppercase text-sm tracking-tight">{isIndexing ? 'Synchronizing...' : '同步项目文档'}</span>
                                </button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                   <button
                                     onClick={() => setShowUpload(!showUpload)}
                                     className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                                       showUpload 
                                         ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20' 
                                         : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm'
                                     }`}
                                   >
                                     <FileUp className="w-4 h-4" /> 上传文件
                                   </button>
                                   <button
                                     onClick={() => handleIndexProject(true)}
                                     disabled={isIndexing}
                                     className="py-3 px-4 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/10 hover:bg-orange-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                                   >
                                     <RefreshCw className="w-4 h-4" /> 强制重建
                                   </button>
                                </div>
                              </div>
                           </div>
                        </div>
        
                        {/* 索引进度条 */}
                        {isIndexing && (
                          <div className="bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-100 dark:border-indigo-500/20 rounded-[1.5rem] p-5 animate-pulse shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase truncate mr-2 tracking-[0.15em]">{indexMessage || 'Indexing Documents...'}</span>
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">{indexProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                style={{ width: `${indexProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
        
                        {/* 上传区域 */}
                        {showUpload && (
                          <div className="bg-white dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-white/10 p-6 space-y-5 animate-fadeIn shadow-sm">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">ADD SOURCE</h5>
                              <button onClick={() => setShowUpload(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1.5 rounded-[1.25rem] border border-gray-200 dark:border-white/5">
                               <button 
                                  onClick={() => setUploadMode('upload')}
                                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadMode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                               >FILES</button>
                               <button 
                                  onClick={() => setUploadMode('select')}
                                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadMode === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                               >PATHS</button>
                            </div>
        
                            {uploadMode === 'upload' ? (
                              <div className="space-y-5">
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
                                   className="py-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all group shadow-inner"
                                >
                                   <div className="w-14 h-14 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm border border-gray-100 dark:border-white/5">
                                      <Upload className="w-7 h-7 text-gray-400 group-hover:text-indigo-500" />
                                   </div>
                                   <p className="text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest">Select Source</p>
                                                     <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 text-center px-6 font-medium">Supporting Code, Markdown, PDF and Images</p>                                </label>
                                
                                {uploadedFiles.length > 0 && (
                                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {uploadedFiles.map((file, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-200 dark:border-white/5">
                                         <div className="flex items-center gap-3 min-w-0">
                                            <FileCode className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                            <span className="text-[11px] text-gray-700 dark:text-slate-300 truncate font-mono font-bold">{file.name}</span>
                                         </div>
                                         <button onClick={() => handleRemoveFile(idx)} className="text-slate-400 hover:text-rose-500 p-1 transition-colors"><X className="w-4 h-4" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <button
                                  onClick={handleUpload}
                                  disabled={uploadedFiles.length === 0 || isUploading}
                                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 dark:disabled:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                >
                                  {isUploading ? 'Processing...' : `Upload ${uploadedFiles.length} Source(s)`}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                 <textarea
                                    value={selectedFilePaths.join('\n')}
                                    onChange={handleFilePathInput}
                                    placeholder="Enter absolute paths, one per line..."
                                    className="w-full h-40 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-xs text-gray-900 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 focus:outline-none resize-none font-mono shadow-inner"
                                 />
                                 <button
                                    onClick={handleAddFiles}
                                    disabled={selectedFilePaths.length === 0 || isUploading}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 dark:disabled:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-95"
                                 >
                                    {isUploading ? 'Importing...' : 'Execute Path Import'}
                                 </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 危险区域 */}
                        <div className="pt-6 border-t border-gray-200 dark:border-white/5 space-y-4">
                           <h4 className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.2em] px-1">Danger Zone</h4>
                           <button
                            onClick={handleReset}
                            className="w-full py-3 px-4 rounded-2xl border border-rose-500/20 text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                            Purge Vector Index
                          </button>
                        </div>
                      </div>
        
                      {/* 右侧搜索预览栏 */}
                      <div className="lg:col-span-8 flex flex-col min-h-0 bg-white dark:bg-slate-900/10">
                         {/* 搜索与高级检索 */}
                         <div className="px-8 py-8 border-b border-gray-200 dark:border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                               <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                  <SearchCode className="w-4 h-4" /> Semantic Document Discovery
                               </h3>
                               <button
                                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${
                                    showAdvancedSearch 
                                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                                      : 'bg-white dark:bg-transparent text-slate-500 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-indigo-600'
                                  }`}
                                >
                                  {showAdvancedSearch ? 'Hide Filters' : 'Advanced Filters'}
                                </button>
                            </div>
        
                            <div className="relative group max-w-4xl mx-auto w-full">
                               <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                  <SearchCode className="h-6 w-6 text-gray-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                               </div>
                               <input
                                 type="text"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 onKeyPress={handleKeyPress}
                                 placeholder="输入关键词或描述进行多模态语义检索..."
                                 className="block w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-[2.5rem] pl-14 pr-32 py-5 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:outline-none transition-all shadow-xl shadow-indigo-500/5"
                               />
                               <div className="absolute inset-y-2.5 right-2.5 flex items-center">
                                  <button
                                    onClick={handleSearch}
                                    disabled={isRetrieving || !searchQuery.trim()}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-[2rem] transition-all shadow-xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isRetrieving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                                  </button>
                               </div>
                            </div>
        
                            {showAdvancedSearch && (
                              <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-gray-200 dark:border-white/5 animate-slideDown shadow-inner">
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Similarity: {searchOptions.similarityThreshold}</label>
                                  <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={searchOptions.similarityThreshold}
                                    onChange={(e) => setSearchOptions({...searchOptions, similarityThreshold: parseFloat(e.target.value)})}
                                    className="w-full accent-indigo-500 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort Criterion</label>
                                  <select
                                    value={searchOptions.sortBy}
                                    onChange={(e) => setSearchOptions({...searchOptions, sortBy: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                                  >
                                    <option value="similarity">语义相关度</option>
                                    <option value="date">最后更新日期</option>
                                    <option value="size">分片大小</option>
                                  </select>
                                </div>
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type Filter</label>
                                  <div className="flex flex-wrap gap-2">
                                    {['.py', '.js', '.ts', '.md', '.json'].map(ext => (
                                      <button
                                        key={ext}
                                        onClick={() => {
                                          const types = searchOptions.fileTypes.includes(ext)
                                            ? searchOptions.fileTypes.filter(t => t !== ext)
                                            : [...searchOptions.fileTypes, ext];
                                          setSearchOptions({...searchOptions, fileTypes: types});
                                        }}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                          searchOptions.fileTypes.includes(ext) 
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/5 text-gray-400 dark:text-slate-500 hover:text-indigo-600'
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
                         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-transparent">
                            {searchResults.length > 0 ? (
                              <div className="space-y-8 max-w-5xl mx-auto">
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                                   <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-widest">
                                      <List className="w-5 h-5 text-indigo-500" />
                                      Retrieved Results ({searchResults.length})
                                   </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                  {searchResults.map((result, idx) => (
                                    <article
                                      key={result.id || idx}
                                      className="group bg-white dark:bg-slate-800/30 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-[2rem] p-8 border border-gray-100 dark:border-white/5 hover:border-indigo-500/20 dark:hover:border-indigo-500/30 transition-all duration-500 shadow-xl shadow-indigo-500/[0.02]"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                           <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors border border-indigo-100 dark:border-indigo-500/10 shadow-sm">
                                              <FileCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                           </div>
                                           <div>
                                             <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
                                                {result.metadata?.file_path || 'unknown_file'}
                                             </span>
                                             <div className="flex items-center gap-3 mt-2">
                                                {result.metadata?.language && (
                                                  <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                                    {result.metadata.language}
                                                  </span>
                                                )}
                                                {result.metadata?.total_lines && (
                                                  <span className="text-[9px] text-slate-400 font-black tracking-widest">{result.metadata.total_lines} LINES</span>
                                                )}
                                             </div>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                          {result.distance !== undefined && (
                                            <div className="text-right">
                                               <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5">{( (1 - result.distance) * 100 ).toFixed(0)}% Match</div>
                                               <div className="w-24 bg-gray-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden shadow-inner border border-gray-200 dark:border-white/5">
                                                  <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ width: `${(1 - result.distance) * 100}%` }} />
                                               </div>
                                            </div>
                                          )}
                                          <button
                                            onClick={() => handleViewVersions(result.metadata?.file_path)}
                                            className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-gray-200 dark:border-white/5 hover:shadow-lg active:scale-90"
                                            title="查看版本历史"
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                         {result.metadata?.summary && (
                                           <div className="flex items-start gap-3 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                                              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                              <p className="text-xs text-gray-600 dark:text-slate-400 italic font-medium leading-relaxed">
                                                {result.metadata.summary}
                                              </p>
                                           </div>
                                         )}
                                         <div className="relative group/code">
                                           <pre className="text-[13px] text-gray-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-mono bg-gray-100 dark:bg-slate-950/40 p-6 rounded-[1.5rem] border border-gray-200 dark:border-white/5 group-hover/code:border-indigo-500/20 transition-all max-h-96 overflow-y-auto custom-scrollbar shadow-inner">
                                             {result.content}
                                           </pre>
                                         </div>
                                      </div>
                                      
                                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                        <div className="flex gap-3">
                                          {result.metadata?.categories?.map((cat, i) => (
                                            <span key={i} className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg">
                                              <Tag className="w-3 h-3 text-indigo-500/40" /> {cat}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
                                          CHUNK {result.metadata?.chunk_index + 1 || 1} / {result.metadata?.total_chunks || 1}
                                        </span>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-fadeIn bg-white dark:bg-transparent">
                                 <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-8 ring-1 ring-gray-200 dark:ring-white/5 shadow-2xl">
                                               <Search className="w-12 h-12 text-gray-300 dark:text-slate-600" />
                                             </div>
                                             <h4 className="text-xl font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Waiting for Input</h4>
                                             <p className="text-sm text-gray-400 dark:text-slate-600 max-w-xs mt-4 leading-relaxed font-medium">输入关键词，我们将基于语义向量引擎，在毫秒内为您定位最相关的文档片段。</p>                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  )}
                </main>
      </div>

      {/* 悬浮全局反馈系统 */}
      <div className="fixed bottom-10 right-10 z-[100] flex flex-col gap-4 pointer-events-none">
        {error && (
          <div className="pointer-events-auto flex items-center gap-4 bg-rose-50/90 dark:bg-rose-950/90 backdrop-blur-xl border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-100 px-6 py-4 rounded-[1.5rem] shadow-2xl animate-slideInRight ring-1 ring-rose-500/10">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
               <p className="text-sm font-black uppercase tracking-tight">System Fault</p>
               <p className="text-xs text-rose-700/70 dark:text-rose-200/70 truncate font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1.5 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        )}

        {success && (
          <div className="pointer-events-auto flex items-center gap-4 bg-emerald-50/90 dark:bg-emerald-950/90 backdrop-blur-xl border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100 px-6 py-4 rounded-[1.5rem] shadow-2xl animate-slideInRight ring-1 ring-emerald-500/10">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
               <p className="text-sm font-black uppercase tracking-tight">Operation Successful</p>
               <p className="text-xs text-emerald-700/70 dark:text-emerald-200/70 truncate font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="p-1.5 hover:bg-emerald-500/10 rounded-xl text-emerald-500 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        )}
      </div>
      
      {/* 文档版本管理面板 - 重构为侧滑/现代 Modal */}
      {showVersionPanel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-10 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setShowVersionPanel(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 w-full max-w-6xl h-[85vh] rounded-[3rem] shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden scale-in-center">
            {/* Modal 头部 */}
            <div className="px-8 py-6 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                   <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight">版本演进历史</h3>
                                 <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 font-mono font-bold tracking-tighter truncate max-w-md">{selectedFileForVersions}</p>                </div>
              </div>
              <button
                onClick={() => {
                  setShowVersionPanel(false);
                  setSelectedFileForVersions(null);
                  setFileVersions([]);
                  setSelectedVersion(null);
                }}
                className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-[1.25rem] transition-all text-slate-400 shadow-inner"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* 版本列表侧边栏 */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/5 flex flex-col min-h-0 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="p-5 flex items-center justify-between bg-gray-100 dark:bg-white/5">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">SNAPSHOTS ({fileVersions.length})</span>
                  <button
                    onClick={handleRecordVersion}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <FileUp className="w-3.5 h-3.5" /> Grab
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {fileVersions.length > 0 ? (
                    fileVersions.map((version) => (
                      <div
                        key={version.version_id}
                        onClick={() => handleViewVersion(version.version_id)}
                        className={`group p-4 rounded-2xl cursor-pointer transition-all border shadow-sm ${
                          selectedVersion?.version_id === version.version_id
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20'
                            : 'bg-white dark:bg-slate-800/50 border-gray-100 dark:border-white/5 hover:border-indigo-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                            selectedVersion?.version_id === version.version_id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-950 text-slate-500'
                          }`}>V{version.version_number}</span>
                          <span className={`text-[10px] font-mono font-bold ${selectedVersion?.version_id === version.version_id ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {new Date(version.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className={`text-xs font-bold ${selectedVersion?.version_id === version.version_id ? 'text-white' : 'text-gray-700 dark:text-slate-300'}`}>{new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                         <span className={`text-[10px] font-black ${selectedVersion?.version_id === version.version_id ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-600'} uppercase`}>{(version.size / 1024).toFixed(1)} KB</span>                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-10">
                       <Database className="w-12 h-12 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No Snapshots</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 内容预览主区域 */}
              <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-950/20">
                {selectedVersion ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-8 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Snapshot ID:</span>
                             <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-gray-200 dark:border-white/5 shadow-inner">{selectedVersion.version_id.substring(0, 16)}...</span>
                          </div>
                          <div className="w-px h-4 bg-gray-200 dark:bg-slate-700" />
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Hash:</span>
                             <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-gray-200 dark:border-white/5 shadow-inner">{selectedVersion.hash.substring(0, 12)}</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex-1 p-8 overflow-hidden bg-gray-50/30 dark:bg-slate-950/10">
                       <div className="h-full rounded-[2rem] bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/5 flex flex-col shadow-2xl overflow-hidden">
                          <div className="px-6 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex items-center gap-3">
                             <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                             </div>
                             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-4 tracking-[0.3em]">Code Inspector</span>
                          </div>
                          <pre className="flex-1 overflow-auto p-8 text-[13px] leading-[1.8] text-gray-800 dark:text-slate-300 font-mono custom-scrollbar selection:bg-indigo-500/30">
                             {selectedVersion.content}
                          </pre>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-16 bg-white dark:bg-transparent animate-fadeIn">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 text-gray-300 dark:text-slate-600 ring-1 ring-gray-200 dark:ring-white/5 shadow-2xl">
                                  <FileText className="w-12 h-12" />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Snapshot Preview</h4>
                                <p className="text-sm text-gray-400 dark:text-slate-500 max-w-xs mt-4 leading-relaxed font-medium">从左侧选择一个特定的历史快照，即可在这里查看当时的文档完整内容。</p>                  </div>
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
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scale-in-center { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.1); border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
      `}} />
    </div>
  );
}
