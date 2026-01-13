import React, { useState, useEffect, useCallback } from 'react';

/**
 * 命令快捷方式组件
 * 用于保存、管理和快速执行常用终端命令
 */

const CommandShortcut = ({ onClose }) => {
  const [shortcuts, setShortcuts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedShortcut, setSelectedShortcut] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, popular, recent, history

  // 执行状态
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  // 编辑表单状态
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    category: '通用',
    description: '',
    tags: [],
    working_dir: '',
    timeout: 60
  });
  const [newTag, setNewTag] = useState('');

  // 参数输入状态
  const [params, setParams] = useState({});
  const [showParams, setShowParams] = useState(false);

  // 加载快捷方式列表
  const loadShortcuts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterCategory) params.append('category', filterCategory);

      const response = await fetch(`/api/command-shortcuts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setShortcuts(data.shortcuts || []);
      }
    } catch (error) {
      console.error('加载快捷方式失败:', error);
    }
  }, [searchQuery, filterCategory]);

  // 加载分类和标签
  const loadMetadata = useCallback(async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/command-shortcuts/categories'),
        fetch('/api/command-shortcuts/tags')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      if (tagRes.ok) {
        const tagData = await tagRes.json();
        setTags(tagData.tags || []);
      }
    } catch (error) {
      console.error('加载元数据失败:', error);
    }
  }, []);

  // 加载热门/最近快捷方式
  const loadSpecialShortcuts = useCallback(async (type) => {
    try {
      const response = await fetch(`/api/command-shortcuts/${type}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setShortcuts(data.shortcuts || []);
      }
    } catch (error) {
      console.error(`加载${type}快捷方式失败:`, error);
    }
  }, []);

  // 加载执行历史
  const loadExecutionHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/command-shortcuts/history?limit=50');
      if (response.ok) {
        const data = await response.json();
        setExecutionHistory(data.history || []);
      }
    } catch (error) {
      console.error('加载执行历史失败:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      loadShortcuts();
    } else if (activeTab === 'popular') {
      loadSpecialShortcuts('popular');
    } else if (activeTab === 'recent') {
      loadSpecialShortcuts('recent');
    } else if (activeTab === 'history') {
      loadExecutionHistory();
    }
    loadMetadata();
  }, [activeTab, loadShortcuts, loadMetadata, loadSpecialShortcuts, loadExecutionHistory]);

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = isEditing
        ? `/api/command-shortcuts/${selectedShortcut.id}`
        : '/api/command-shortcuts';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadShortcuts();
        await loadMetadata();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedShortcut(null);
        resetForm();
      }
    } catch (error) {
      console.error('保存快捷方式失败:', error);
    }
  };

  // 删除快捷方式
  const handleDelete = async (shortcutId) => {
    if (!confirm('确定要删除这个快捷方式吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/command-shortcuts/${shortcutId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadShortcuts();
        await loadMetadata();
        if (selectedShortcut?.id === shortcutId) {
          setSelectedShortcut(null);
        }
      }
    } catch (error) {
      console.error('删除快捷方式失败:', error);
    }
  };

  // 执行命令
  const handleExecute = async (shortcut) => {
    if (!shortcut) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setShowParams(false);

    try {
      const response = await fetch(`/api/command-shortcuts/${shortcut.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ params })
      });

      if (response.ok) {
        const result = await response.json();
        setExecutionResult(result);
        
        // 刷新列表以更新使用次数
        if (activeTab !== 'history') {
          loadShortcuts();
        }
      }
    } catch (error) {
      console.error('执行命令失败:', error);
      setExecutionResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsExecuting(false);
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
      name: '',
      command: '',
      category: '通用',
      description: '',
      tags: [],
      working_dir: '',
      timeout: 60
    });
    setNewTag('');
    setParams({});
  };

  // 开始编辑
  const startEdit = (shortcut) => {
    setSelectedShortcut(shortcut);
    setFormData({
      name: shortcut.name,
      command: shortcut.command,
      category: shortcut.category,
      description: shortcut.description || '',
      tags: shortcut.tags || [],
      working_dir: shortcut.working_dir || '',
      timeout: shortcut.timeout || 60
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  // 开始创建
  const startCreate = () => {
    setSelectedShortcut(null);
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedShortcut(null);
    resetForm();
  };

  // 检测命令中的参数占位符
  const detectParams = (command) => {
    const paramRegex = /\$\{([^}]+)\}/g;
    const matches = command.match(paramRegex);
    if (matches) {
      return [...new Set(matches.map(m => m.replace('${', '').replace('}', '')))];
    }
    return [];
  };

  // 当选择快捷方式时，检测参数
  useEffect(() => {
    if (selectedShortcut && !isEditing && !isCreating) {
      const detectedParams = detectParams(selectedShortcut.command || '');
      if (detectedParams.length > 0) {
        setShowParams(true);
        const newParams = {};
        detectedParams.forEach(param => {
          newParams[param] = params[param] || '';
        });
        setParams(newParams);
      } else {
        setShowParams(false);
      }
    }
  }, [selectedShortcut, isEditing, isCreating]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            命令快捷方式
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startCreate}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建快捷方式
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
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            执行历史
          </button>
        </div>

        {/* 搜索和筛选 */}
        {activeTab !== 'history' && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="搜索快捷方式..."
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
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 快捷方式列表 */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {activeTab === 'history' ? (
            /* 执行历史 */
            <div className="p-2 space-y-2">
              {executionHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p>暂无执行历史</p>
                </div>
              ) : (
                executionHistory.map((history) => (
                  <div
                    key={history.id}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        history.returncode === 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {history.returncode === 0 ? '成功' : '失败'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(history.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white mb-2 font-mono truncate">
                      {history.command}
                    </p>
                    {history.stderr && (
                      <p className="text-xs text-red-600 dark:text-red-400 truncate">
                        {history.stderr}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : shortcuts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>暂无快捷方式</p>
              <button
                onClick={startCreate}
                className="mt-4 text-blue-500 hover:text-blue-600"
              >
                创建第一个快捷方式
              </button>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {shortcuts.map(shortcut => (
                <div
                  key={shortcut.id}
                  onClick={() => setSelectedShortcut(shortcut)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedShortcut?.id === shortcut.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {shortcut.name}
                    </h3>
                    {shortcut.usage_count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {shortcut.usage_count} 次
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {shortcut.category}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                    {shortcut.command}
                  </p>
                  {shortcut.tags && shortcut.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shortcut.tags.map(tag => (
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

        {/* 快捷方式详情/编辑 */}
        <div className="flex-1 overflow-y-auto">
          {isCreating || isEditing ? (
            /* 编辑表单 */
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isEditing ? '编辑快捷方式' : '新建快捷方式'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    名称
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    命令
                  </label>
                  <textarea
                    required
                    value={formData.command}
                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    rows={4}
                    placeholder="例如: npm run dev 或 pytest ${fileName}"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    使用 ${paramName} 作为参数占位符
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      超时（秒）
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={formData.timeout}
                      onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    工作目录
                  </label>
                  <input
                    type="text"
                    value={formData.working_dir}
                    onChange={(e) => setFormData({ ...formData, working_dir: e.target.value })}
                    placeholder="例如: ./agent_project 或留空使用当前目录"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
          ) : selectedShortcut ? (
            /* 快捷方式详情 */
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedShortcut.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {selectedShortcut.category}
                    </span>
                    {selectedShortcut.usage_count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        使用 {selectedShortcut.usage_count} 次
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selectedShortcut)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedShortcut.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {selectedShortcut.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {selectedShortcut.description}
                </p>
              )}

              {selectedShortcut.tags && selectedShortcut.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedShortcut.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  命令
                </label>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                  {selectedShortcut.command}
                </div>
              </div>

              {selectedShortcut.working_dir && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    工作目录
                  </label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white">
                    {selectedShortcut.working_dir}
                  </div>
                </div>
              )}

              {/* 参数输入 */}
              {showParams && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    参数
                  </label>
                  <div className="space-y-2">
                    {detectParams(selectedShortcut.command).map(param => (
                      <div key={param}>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {param}
                        </label>
                        <input
                          type="text"
                          value={params[param] || ''}
                          onChange={(e) => setParams({ ...params, [param]: e.target.value })}
                          placeholder={`输入 ${param} 的值`}
                          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleExecute(selectedShortcut)}
                disabled={isExecuting}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    执行中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    执行命令
                  </>
                )}
              </button>

              {/* 执行结果 */}
              {executionResult && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    执行结果
                  </label>
                  <div className={`p-3 rounded-lg ${
                    executionResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        executionResult.success
                          ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                          : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {executionResult.success ? '成功' : '失败'}
                      </span>
                      {executionResult.returncode !== undefined && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          返回码: {executionResult.returncode}
                        </span>
                      )}
                    </div>
                    {executionResult.stdout && (
                      <div className="mb-2">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">标准输出:</label>
                        <pre className="text-xs text-gray-900 dark:text-white font-mono whitespace-pre-wrap bg-white dark:bg-gray-800 p-2 rounded">
                          {executionResult.stdout}
                        </pre>
                      </div>
                    )}
                    {executionResult.stderr && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">错误输出:</label>
                        <pre className="text-xs text-red-900 dark:text-red-200 font-mono whitespace-pre-wrap bg-white dark:bg-gray-800 p-2 rounded">
                          {executionResult.stderr}
                        </pre>
                      </div>
                    )}
                    {executionResult.error && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {executionResult.error}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 空状态 */
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>选择一个快捷方式查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandShortcut;