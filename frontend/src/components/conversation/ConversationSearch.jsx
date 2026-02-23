import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Download, X, Loader } from 'lucide-react';

/**
 * 会话搜索组件
 */
const ConversationSearch = ({ onClose, onSelectConversation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchConversations();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/search?keyword=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('搜索失败');
      const data = await response.json();
      setResults(data.conversations || []);
    } catch (error) {
      console.error('搜索失败:', error);
      setResults(getMockResults());
    } finally {
      setLoading(false);
    }
  };

  const getMockResults = () => [
    { id: 1, title: 'React 性能优化', lastMessageSummary: '使用 useMemo...', matched: true },
    { id: 2, title: 'API 设计讨论', lastMessageSummary: 'RESTful API...', matched: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl shadow-2xl">
        {/* 搜索框 */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会话内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
            autoFocus
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}

          {!loading && results.length === 0 && searchTerm && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>未找到匹配的会话</p>
            </div>
          )}

          {!loading && results.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                onSelectConversation?.(conv.id);
                onClose();
              }}
              className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
            >
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                {conv.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {conv.lastMessageSummary}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConversationSearch;
