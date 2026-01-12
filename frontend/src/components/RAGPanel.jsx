import React, { useState, useEffect, useRef } from 'react';
import { Search, Database, FileText, RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2, Zap, Settings, Upload, X, FileUp, FolderOpen, Send, MessageSquare, LayoutGrid, List, Sparkles, Command, ChevronRight, FileCode, SearchCode, Tag, Folder } from 'lucide-react';
import { getRAGStats, indexProjectRAG, retrieveRAG, resetRAG, uploadDocumentToRAG, uploadDocumentsBatchToRAG, addFilesToRAG, askRAG } from '../utils/rag';
import { retrieveRAGAdvanced, getDocumentVersions, getDocumentVersion, recordDocumentVersion } from '../utils/ragEnhanced';
import ChatComponent from './ChatComponent';

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
    <div className="h-full flex flex-col bg-gray-900/50 backdrop-blur-sm">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-100">RAG 知识库</h2>
          {stats && (
            <span className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded">
              {stats.document_count || 0} 文档
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSettings}
            className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-200">自动索引</span>
            </div>
            <button
              onClick={handleAutoIndexToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoIndexEnabled ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoIndexEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {autoIndexEnabled 
              ? '首次打开项目时自动建立索引' 
              : '需要手动点击索引按钮'}
          </p>
        </div>
      )}

      {/* 选项卡切换 */}
      <div className="px-4 py-2 border-b border-gray-700/50 bg-gray-800/20">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            AI 问答
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'manage'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            文档管理
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {/* AI 问答选项卡 */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col p-4">
            {!stats || stats.document_count === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-200 mb-2">知识库为空</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    请先在"文档管理"选项卡中添加文档，然后就可以开始 AI 问答了
                  </p>
                  <button
                    onClick={() => setActiveTab('manage')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    前往文档管理
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-gray-200">AI 问答</span>
                    <span className="text-xs text-gray-500">基于 {stats.document_count} 个文档</span>
                  </div>
                  {chatMessages.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('确定要清空聊天记录吗？')) {
                          setChatMessages([]);
                          const storageKey = getStorageKey();
                          try {
                            localStorage.removeItem(storageKey);
                          } catch (e) {
                            console.error('清空聊天历史失败:', e);
                          }
                        }
                      }}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                      title="清空聊天记录"
                    >
                      清空记录
                    </button>
                  )}
                </div>
                
                {/* ChatComponent - 占据主要空间 */}
                <div className="flex-1 bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
                  <ChatComponent
                    messages={chatMessages}
                    onSendMessage={handleChat}
                    isLoading={isChatting}
                    placeholder="向知识库提问...（Enter 发送，Shift+Enter 换行）"
                    maxHeight="calc(100vh - 250px)"
                    className="h-full"
                    showSources={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 文档管理选项卡 */}
        {activeTab === 'manage' && (
          <div className="h-full overflow-y-auto p-4 space-y-4 pb-20">
            {/* 状态卡片 */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-200">索引状态</span>
                <div className="flex gap-2">
                  <button
                    onClick={loadStats}
                    className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
                    title="刷新"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                  {stats && (
                    <button
                      onClick={handleReset}
                      className="p-1.5 hover:bg-red-900/30 rounded transition-colors"
                      title="重置索引"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {stats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">文档数量:</span>
                    <span className="text-gray-200">{stats.document_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">集合名称:</span>
                    <span className="text-gray-200 font-mono text-xs">{stats.collection_name}</span>
                  </div>
                  {stats.total_chunks && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">文档块总数:</span>
                      <span className="text-gray-200">{stats.total_chunks}</span>
                    </div>
                  )}
                  {stats.total_size && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">索引大小:</span>
                      <span className="text-gray-200">{(stats.total_size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">尚未建立索引</p>
              )}
            </div>

            {/* 索引按钮 */}
            <div className="space-y-2">
          {/* 自动索引提示 */}
          {autoIndexEnabled && !stats && !isIndexing && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <p className="text-xs text-yellow-200">
                  首次打开项目，将自动建立索引
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => handleIndexProject(false)}
            disabled={isIndexing}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              isIndexing
                ? 'bg-purple-900/30 text-purple-300 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
            }`}
          >
            {isIndexing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{hasAutoIndexed ? '自动索引中...' : '索引中...'}</span>
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                <span>索引项目文档（增量）</span>
              </>
            )}
          </button>

          {/* 上传文档按钮 */}
          <button
            onClick={() => setShowUpload(!showUpload)}
            disabled={isIndexing || isUploading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
              showUpload
                ? 'bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>上传文档</span>
          </button>

          {/* 上传区域 */}
          {showUpload && (
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">添加文档</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowUpload(false);
                      setUploadedFiles([]);
                      setSelectedFilePaths([]);
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 批量操作按钮 */}
              <div className="flex gap-2 pb-3 border-b border-gray-700/30">
                <button
                  onClick={() => {
                    if (confirm('确定要清空知识库吗？这将删除所有已索引的文档。')) {
                      handleReset();
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  清空知识库
                </button>
                <button
                  onClick={() => handleIndexProject(true)}
                  disabled={isIndexing}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-600/30 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  强制重新索引
                </button>
              </div>

              {/* 模式切换 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadMode('upload')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    uploadMode === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-1" />
                  上传文件
                </button>
                <button
                  onClick={() => setUploadMode('select')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    uploadMode === 'select'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 inline mr-1" />
                  选择路径
                </button>
              </div>

              {uploadMode === 'upload' ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.py,.js,.ts,.jsx,.tsx,.java,.go,.rs,.json,.yaml,.yml,.html,.css,.rst"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="rag-file-upload"
                  />

                  <label
                    htmlFor="rag-file-upload"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      uploadedFiles.length > 0
                        ? 'border-blue-500/50 bg-blue-900/10'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-900/30'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-400 text-center">
                      {uploadedFiles.length > 0
                        ? `已选择 ${uploadedFiles.length} 个文件`
                        : '点击或拖拽文件到此处'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      支持: .txt, .md, .py, .js, .ts, .json, .yaml 等
                    </p>
                  </label>

                  {/* 已选文件列表 */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-900/50 rounded px-3 py-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-300 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="text-gray-400 hover:text-red-400 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 上传按钮 */}
                  <button
                    onClick={handleUpload}
                    disabled={uploadedFiles.length === 0 || isUploading}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                      uploadedFiles.length === 0 || isUploading
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>上传中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>开始上传</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* 文件路径输入 */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">输入文件路径（每行一个）</label>
                    <textarea
                      value={selectedFilePaths.join('\n')}
                      onChange={handleFilePathInput}
                      placeholder="例如：&#10;E:\path\to\file1.py&#10;E:\path\to\file2.md&#10;E:\path\to\file3.txt"
                      className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      disabled={isUploading}
                    />
                  </div>

                  {/* 已选路径列表 */}
                  {selectedFilePaths.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedFilePaths.map((path, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-900/50 rounded px-3 py-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-300 truncate font-mono">{path}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveFilePath(index)}
                            className="text-gray-400 hover:text-red-400 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 添加按钮 */}
                  <button
                    onClick={handleAddFiles}
                    disabled={selectedFilePaths.length === 0 || isUploading}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                      selectedFilePaths.length === 0 || isUploading
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>添加中...</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4" />
                        <span>添加到知识库</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* 进度显示 */}
              {isUploading && (
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">处理中...</span>
                    <span className="text-xs text-blue-400">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={() => handleIndexProject(true)}
            disabled={isIndexing}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
              isIndexing
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>强制重新索引</span>
          </button>
        </div>

        {/* 索引进度 */}
        {isIndexing && (
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{indexMessage}</span>
              <span className="text-xs text-purple-400">{indexProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${indexProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 搜索框 */}
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-200">检索文档</label>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showAdvancedSearch
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showAdvancedSearch ? '高级选项 ▲' : '高级选项 ▼'}
            </button>
          </div>
          
          {/* 高级检索选项 */}
          {showAdvancedSearch && (
            <div className="mb-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">相似度阈值: {searchOptions.similarityThreshold}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={searchOptions.similarityThreshold}
                  onChange={(e) => setSearchOptions({...searchOptions, similarityThreshold: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-400 mb-1 block">排序方式</label>
                <select
                  value={searchOptions.sortBy}
                  onChange={(e) => setSearchOptions({...searchOptions, sortBy: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200"
                >
                  <option value="similarity">相似度</option>
                  <option value="date">日期</option>
                  <option value="size">大小</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 mb-1 block">文件类型</label>
                <div className="flex flex-wrap gap-2">
                  {['.py', '.js', '.ts', '.tsx', '.jsx', '.md', '.json', '.yaml'].map(ext => (
                    <label key={ext} className="flex items-center gap-1 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={searchOptions.fileTypes.includes(ext)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSearchOptions({...searchOptions, fileTypes: [...searchOptions.fileTypes, ext]});
                          } else {
                            setSearchOptions({...searchOptions, fileTypes: searchOptions.fileTypes.filter(t => t !== ext)});
                          }
                        }}
                        className="rounded"
                      />
                      {ext}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="搜索项目中的代码和文档..."
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isRetrieving}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <button
              onClick={handleSearch}
              disabled={isRetrieving || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrieving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '搜索'
              )}
            </button>
          </div>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              搜索结果 ({searchResults.length})
            </h3>
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div
                  key={result.id || index}
                  className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded block mb-1">
                        {result.metadata?.file_path || '未知文件'}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {result.metadata?.language && (
                          <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">
                            {result.metadata.language}
                          </span>
                        )}
                        {result.metadata?.categories && result.metadata.categories.length > 0 && (
                          result.metadata.categories.map((cat, idx) => (
                            <span key={idx} className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {cat}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {result.distance !== undefined && (
                        <span className="text-xs text-gray-500">
                          相似度: {(1 - result.distance).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {result.metadata?.summary && (
                    <p className="text-xs text-gray-400 mb-2 italic">
                      {result.metadata.summary}
                    </p>
                  )}
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {result.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      块 {result.metadata?.chunk_index !== undefined 
                        ? `${result.metadata.chunk_index + 1} / ${result.metadata.total_chunks}`
                        : '完整文档'}
                    </span>
                    <div className="flex items-center gap-2">
                      {result.metadata?.total_lines && (
                        <span>{result.metadata.total_lines} 行</span>
                      )}
                      <button
                        onClick={() => handleViewVersions(result.metadata?.file_path)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="查看版本历史"
                      >
                        查看版本
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 提示信息 */}
        {stats && stats.document_count === 0 && (
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-200 font-medium">尚未建立索引</p>
                <p className="text-xs text-blue-300 mt-1">
                  点击"索引项目文档"按钮开始构建知识库。这将扫描项目中的所有代码和文档文件。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {/* 错误提示和成功提示 */}
      <>
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-900/20 border border-red-700/30 rounded-lg p-3 z-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="fixed bottom-4 right-4 bg-green-900/20 border border-green-700/30 rounded-lg p-3 z-50">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-200">{success}</p>
            </div>
          </div>
        )}
      </>
      
      {/* 文档版本管理面板 */}
      {showVersionPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700/50 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">文档版本历史</h3>
                <p className="text-sm text-gray-400 mt-1 truncate">{selectedFileForVersions}</p>
              </div>
              <button
                onClick={() => {
                  setShowVersionPanel(false);
                  setSelectedFileForVersions(null);
                  setFileVersions([]);
                  setSelectedVersion(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden flex">
              {/* 版本列表 */}
              <div className="w-1/3 border-r border-gray-700/50 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-200">版本列表 ({fileVersions.length})</span>
                  <button
                    onClick={handleRecordVersion}
                    className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                  >
                    记录新版本
                  </button>
                </div>
                
                <div className="space-y-2">
                  {fileVersions.map((version, index) => (
                    <div
                      key={version.version_id}
                      onClick={() => handleViewVersion(version.version_id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedVersion?.version_id === version.version_id
                          ? 'bg-purple-600/20 border border-purple-500/50'
                          : 'bg-gray-800/50 border border-gray-700/30 hover:border-gray-600/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-mono text-purple-300">v{version.version_number}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(version.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        大小: {(version.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 版本详情 */}
              <div className="w-2/3 overflow-y-auto p-4">
                {selectedVersion ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-200 mb-2">版本信息</h4>
                      <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">版本号:</span>
                          <span className="text-gray-200">v{selectedVersion.version_number}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">版本 ID:</span>
                          <span className="text-gray-200 font-mono text-xs">{selectedVersion.version_id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">时间戳:</span>
                          <span className="text-gray-200">{new Date(selectedVersion.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">文件大小:</span>
                          <span className="text-gray-200">{(selectedVersion.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">文件哈希:</span>
                          <span className="text-gray-200 font-mono text-xs">{selectedVersion.hash.substring(0, 16)}...</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-200 mb-2">文件内容</h4>
                      <div className="bg-gray-900/50 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                          {selectedVersion.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">选择一个版本查看详情</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}