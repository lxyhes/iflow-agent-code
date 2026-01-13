import React, { useState, useEffect, useCallback } from 'react';

/**
 * 代码片段管理器组件
 * 用于保存、管理和快速插入常用代码片段
 */

const SnippetManager = ({ onInsertSnippet, onClose }) => {
  const [snippets, setSnippets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, popular, recent
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 编辑表单状态
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    language: 'javascript',
    category: '通用',
    description: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  // 加载片段列表
  const loadSnippets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('[SnippetManager] 正在加载片段列表...');
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterCategory) params.append('category', filterCategory);
      if (filterLanguage) params.append('language', filterLanguage);

      const response = await fetch(`/api/snippets?${params.toString()}`);
      console.log('[SnippetManager] API 响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SnippetManager] 加载成功，片段数量:', data.snippets?.length || 0);
        setSnippets(data.snippets || []);
      } else {
        const errorData = await response.json();
        console.error('[SnippetManager] API 错误:', errorData);
        setError(errorData.error || '加载片段失败');
      }
    } catch (error) {
      console.error('[SnippetManager] 加载片段失败:', error);
      setError('网络错误：无法连接到服务器');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterCategory, filterLanguage]);

  // 加载分类和标签
  const loadMetadata = useCallback(async () => {
    try {
      console.log('[SnippetManager] 正在加载元数据...');
      
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/snippets/categories'),
        fetch('/api/snippets/tags')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
        console.log('[SnippetManager] 分类加载成功:', catData.categories?.length || 0);
      } else {
        console.error('[SnippetManager] 分类加载失败');
      }

      if (tagRes.ok) {
        const tagData = await tagRes.json();
        setTags(tagData.tags || []);
        console.log('[SnippetManager] 标签加载成功:', tagData.tags?.length || 0);
      } else {
        console.error('[SnippetManager] 标签加载失败');
      }
    } catch (error) {
      console.error('[SnippetManager] 加载元数据失败:', error);
    }
  }, []);

  // 加载热门/最近片段
  const loadSpecialSnippets = useCallback(async (type) => {
    try {
      setIsLoading(true);
      setError('');
      console.log(`[SnippetManager] 正在加载${type}片段...`);
      
      const response = await fetch(`/api/snippets/${type}?limit=10`);
      console.log(`[SnippetManager] ${type} API 响应状态:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[SnippetManager] ${type}加载成功，片段数量:`, data.snippets?.length || 0);
        setSnippets(data.snippets || []);
      } else {
        const errorData = await response.json();
        console.error(`[SnippetManager] ${type}加载失败:`, errorData);
        setError(errorData.error || `加载${type}片段失败`);
      }
    } catch (error) {
      console.error(`[SnippetManager] 加载${type}片段失败:`, error);
      setError('网络错误：无法连接到服务器');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      loadSnippets();
    } else if (activeTab === 'popular') {
      loadSpecialSnippets('popular');
    } else if (activeTab === 'recent') {
      loadSpecialSnippets('recent');
    }
    loadMetadata();
  }, [activeTab, loadSnippets, loadMetadata, loadSpecialSnippets]);

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = isEditing
        ? `/api/snippets/${selectedSnippet.id}`
        : '/api/snippets';

      const method = isEditing ? 'PUT' : 'POST';

      console.log('[SnippetManager] 正在提交表单...', { url, method, formData });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log('[SnippetManager] API 响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[SnippetManager] 保存成功:', data);
        await loadSnippets();
        await loadMetadata();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedSnippet(null);
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('[SnippetManager] 保存失败:', errorData);
        setError(errorData.error || `保存失败 (${response.status})`);
      }
    } catch (error) {
      console.error('[SnippetManager] 保存片段失败:', error);
      setError('网络错误：无法连接到服务器');
    }
  };

  // 删除片段
  const handleDelete = async (snippetId) => {
    if (!confirm('确定要删除这个片段吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/snippets/${snippetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadSnippets();
        await loadMetadata();
        if (selectedSnippet?.id === snippetId) {
          setSelectedSnippet(null);
        }
      }
    } catch (error) {
      console.error('删除片段失败:', error);
    }
  };

  // 复制代码
  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('代码已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 插入代码到编辑器
  const handleInsert = async (snippet) => {
    try {
      // 增加使用次数
      await fetch(`/api/snippets/${snippet.id}/usage`, {
        method: 'POST'
      });

      // 调用父组件的插入回调
      if (onInsertSnippet) {
        onInsertSnippet(snippet.code);
      }
    } catch (error) {
      console.error('插入片段失败:', error);
    }
  };

  // 添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      language: 'javascript',
      category: '通用',
      description: '',
      tags: []
    });
    setNewTag('');
  };

  // 开始编辑
  const startEdit = (snippet) => {
    setSelectedSnippet(snippet);
    setFormData({
      title: snippet.title,
      code: snippet.code,
      language: snippet.language,
      category: snippet.category,
      description: snippet.description || '',
      tags: snippet.tags || []
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  // 开始创建
  const startCreate = () => {
    setSelectedSnippet(null);
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedSnippet(null);
    resetForm();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            代码片段管理器
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startCreate}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建片段
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">请检查后端服务是否正常运行（端口 8000）</p>
            </div>
            <button
              onClick={() => { setError(''); loadSnippets(); }}
              className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-200 rounded transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'popular'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            热门
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'recent'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            最近使用
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="搜索片段..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有分类</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有语言</option>
            {['javascript', 'python', 'typescript', 'java', 'go', 'rust', 'sql', 'css', 'html'].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 片段列表 */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          ) : snippets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>暂无片段</p>
              <button
                onClick={startCreate}
                className="mt-4 text-blue-500 hover:text-blue-600"
              >
                创建第一个片段
              </button>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {snippets.map(snippet => (
                <div
                  key={snippet.id}
                  onClick={() => setSelectedSnippet(snippet)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSnippet?.id === snippet.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {snippet.title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {snippet.language}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {snippet.category}
                  </p>
                  {snippet.tags && snippet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {snippet.tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 片段详情/编辑 */}
        <div className="flex-1 overflow-y-auto">
          {isCreating || isEditing ? (
            /* 编辑表单 */
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isEditing ? '编辑片段' : '新建片段'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    标题
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      语言
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                      <option value="sql">SQL</option>
                      <option value="css">CSS</option>
                      <option value="html">HTML</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      分类
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    标签
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="输入标签后按回车"
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      添加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    代码
                  </label>
                  <textarea
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isEditing ? '更新' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          ) : selectedSnippet ? (
            /* 片段详情 */
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedSnippet.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {selectedSnippet.language}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {selectedSnippet.category}
                    </span>
                    {selectedSnippet.usage_count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        使用 {selectedSnippet.usage_count} 次
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selectedSnippet)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSnippet.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {selectedSnippet.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {selectedSnippet.description}
                </p>
              )}

              {selectedSnippet.tags && selectedSnippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedSnippet.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleCopy(selectedSnippet.code)}
                    className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="复制"
                  >
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {onInsertSnippet && (
                    <button
                      onClick={() => handleInsert(selectedSnippet)}
                      className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      插入
                    </button>
                  )}
                </div>
                <pre className="mt-12 p-4 bg-gray-900 dark:bg-gray-950 rounded-lg overflow-x-auto">
                  <code className="text-sm text-gray-100 dark:text-gray-100 font-mono whitespace-pre-wrap">
                    {selectedSnippet.code}
                  </code>
                </pre>
              </div>
            </div>
          ) : (
            /* 空状态 */
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>选择一个片段查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnippetManager;