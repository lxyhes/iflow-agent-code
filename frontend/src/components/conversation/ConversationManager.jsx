import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Star, 
  Pin, 
  Trash2, 
  Download,
  Tag,
  Clock,
  MoreVertical,
  X,
  CheckCircle,
  Loader
} from 'lucide-react';

/**
 * 会话管理器组件
 * 管理对话会话、标签、收藏、置顶等功能
 */
const ConversationManager = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, pinned, favorites
  const [selectedTags, setSelectedTags] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    fetchConversations();
    fetchTags();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('获取会话失败');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('获取会话失败:', error);
      setConversations(getMockConversations());
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/conversations/tags');
      if (!response.ok) throw new Error('获取标签失败');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  const getMockConversations = () => [
    {
      id: 1,
      title: 'React 性能优化讨论',
      lastMessageSummary: '我们可以使用 useMemo 来优化...',
      lastActiveAt: '2026-02-23T10:30:00',
      messageCount: 25,
      isPinned: true,
      isFavorite: true,
      tags: ['react', 'performance'],
    },
    {
      id: 2,
      title: 'API 设计审查',
      lastMessageSummary: 'RESTful API 应该遵循以下原则...',
      lastActiveAt: '2026-02-23T09:15:00',
      messageCount: 18,
      isPinned: false,
      isFavorite: true,
      tags: ['api', 'review'],
    },
    {
      id: 3,
      title: '数据库迁移方案',
      lastMessageSummary: '建议使用 Flyway 进行迁移管理...',
      lastActiveAt: '2026-02-22T16:45:00',
      messageCount: 32,
      isPinned: false,
      isFavorite: false,
      tags: ['database'],
    },
  ];

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.lastMessageSummary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'pinned' && conv.isPinned) ||
                         (filter === 'favorites' && conv.isFavorite);
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(tag => conv.tags?.includes(tag));
    return matchesSearch && matchesFilter && matchesTags;
  });

  const togglePin = async (id) => {
    try {
      await fetch(`/api/conversations/${id}/pin`, { method: 'POST' });
      setConversations(conversations.map(c => 
        c.id === id ? { ...c, isPinned: !c.isPinned } : c
      ));
    } catch (error) {
      console.error('置顶失败:', error);
    }
  };

  const toggleFavorite = async (id) => {
    try {
      await fetch(`/api/conversations/${id}/favorite`, { method: 'POST' });
      setConversations(conversations.map(c => 
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      ));
    } catch (error) {
      console.error('收藏失败:', error);
    }
  };

  const deleteConversation = async (id) => {
    if (!confirm('确定要删除此会话吗？')) return;
    
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const exportConversation = async (id, format = 'markdown') => {
    try {
      const response = await fetch(`/api/conversations/${id}/export?format=${format}`);
      if (!response.ok) throw new Error('导出失败');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${id}.${format === 'markdown' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败：' + error.message);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            会话管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理您的所有对话会话
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建会话
        </button>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('pinned')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              filter === 'pinned'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Pin className="w-4 h-4" />
            置顶
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              filter === 'favorites'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Star className="w-4 h-4" />
            收藏
          </button>
        </div>
      </div>

      {/* 标签过滤 */}
      {tags.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              style={{ borderColor: tag.color }}
            >
              <Tag className="w-3 h-3" />
              {tag.name}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              清除标签
            </button>
          )}
        </div>
      )}

      {/* 会话列表 */}
      <div className="space-y-3">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无会话</p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {conv.title}
                    </h3>
                    {conv.isPinned && (
                      <Pin className="w-4 h-4 text-blue-500" />
                    )}
                    {conv.isFavorite && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                    {conv.lastMessageSummary}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conv.messageCount} 条消息
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(conv.lastActiveAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {conv.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePin(conv.id)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title={conv.isPinned ? '取消置顶' : '置顶'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(conv.id)}
                    className="p-2 text-gray-400 hover:text-yellow-600"
                    title={conv.isFavorite ? '取消收藏' : '收藏'}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportConversation(conv.id)}
                    className="p-2 text-gray-400 hover:text-green-600"
                    title="导出"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteConversation(conv.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新建会话模态框 */}
      {showCreateModal && (
        <CreateConversationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
};

/**
 * 新建会话模态框
 */
const CreateConversationModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    template: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('创建失败');
      onCreated();
    } catch (error) {
      alert('创建失败：' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            新建会话
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                会话标题
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="例如：React 性能优化讨论"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                使用模板 (可选)
              </label>
              <select
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">不使用模板</option>
                <option value="coding">代码编写</option>
                <option value="debugging">调试问题</option>
                <option value="review">代码审查</option>
                <option value="learning">学习讨论</option>
                <option value="brainstorming">头脑风暴</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConversationManager;
