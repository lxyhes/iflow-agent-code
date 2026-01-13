import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';

/**
 * 聊天搜索组件
 * 支持搜索聊天消息内容、跨会话搜索、收藏消息搜索、日期筛选、消息类型筛选
 */

const ChatSearch = ({
  messages = [],
  allSessions = [],
  favoritedMessages = new Set(),
  onResultClick,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchScope, setSearchScope] = useState('current'); // 'current', 'all', 'favorites'
  const [messageType, setMessageType] = useState('all'); // 'all', 'user', 'assistant'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // 创建 Fuse 实例用于模糊搜索
  const fuse = useMemo(() => {
    const searchMessages = messages.map((msg, index) => ({
      ...msg,
      originalIndex: index
    }));

    return new Fuse(searchMessages, {
      keys: [
        { name: 'content', weight: 1 },
        { name: 'toolName', weight: 0.5 },
        { name: 'toolInput', weight: 0.3 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 1
    });
  }, [messages]);

  // 执行搜索
  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      let results = [];

      // 根据搜索范围筛选消息
      let messagesToSearch = messages;

      if (searchScope === 'favorites') {
        // 只搜索收藏的消息
        messagesToSearch = messages.filter(msg => favoritedMessages.has(msg.id));
      } else if (searchScope === 'all') {
        // 跨会话搜索（这里简化为当前所有消息，实际应该从后端获取所有会话的消息）
        messagesToSearch = messages;
      }

      // 根据消息类型筛选
      if (messageType === 'user') {
        messagesToSearch = messagesToSearch.filter(msg => msg.type === 'user');
      } else if (messageType === 'assistant') {
        messagesToSearch = messagesToSearch.filter(msg => msg.type === 'assistant');
      }

      // 根据日期筛选
      const now = new Date();
      messagesToSearch = messagesToSearch.filter(msg => {
        const msgDate = new Date(msg.timestamp || Date.now());

        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return msgDate >= today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return msgDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return msgDate >= monthAgo;
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return msgDate >= start && msgDate <= end;
        }

        return true;
      });

      // 执行模糊搜索
      const fuseInstance = new Fuse(messagesToSearch, {
        keys: [
          { name: 'content', weight: 1 },
          { name: 'toolName', weight: 0.5 },
          { name: 'toolInput', weight: 0.3 }
        ],
        threshold: 0.3,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 1
      });

      results = fuseInstance.search(searchQuery);

      setSearchResults(results);
      setHighlightIndex(0);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchScope, messageType, dateFilter, customStartDate, customEndDate, messages, favoritedMessages]);

  // 自动搜索（防抖）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  // 高亮匹配的文本
  const highlightText = (text, matches) => {
    if (!text || !matches || matches.length === 0) {
      return text;
    }

    // 合并所有匹配的位置
    const allMatches = matches.flatMap(m => m.indices || []);
    
    // 按起始位置排序
    allMatches.sort((a, b) => a[0] - b[0]);

    // 构建高亮文本
    let highlightedText = '';
    let lastIndex = 0;

    allMatches.forEach(([start, end]) => {
      highlightedText += text.slice(lastIndex, start);
      highlightedText += `<mark class="bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-1 rounded">${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    });

    highlightedText += text.slice(lastIndex);

    return highlightedText;
  };

  // 处理结果点击
  const handleResultClick = (result) => {
    if (onResultClick) {
      onResultClick(result.item, result.item.originalIndex);
    }
  };

  // 处理键盘导航
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleResultClick(searchResults[highlightIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* 搜索头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索消息内容..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="关闭 (Esc)"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 筛选选项 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {/* 搜索范围 */}
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">当前会话</option>
              <option value="all">所有会话</option>
              <option value="favorites">收藏消息</option>
            </select>

            {/* 消息类型 */}
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有消息</option>
              <option value="user">用户消息</option>
              <option value="assistant">AI 回复</option>
            </select>

            {/* 日期筛选 */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有时间</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="custom">自定义</option>
            </select>

            {/* 自定义日期 */}
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500 dark:text-gray-400 text-xs self-center">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[500px] overflow-y-auto">
          {isSearching ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="animate-spin w-8 h-8 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>搜索中...</p>
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">未找到结果</p>
              <p className="text-sm">尝试使用不同的关键词或调整筛选条件</p>
            </div>
          ) : !searchQuery ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">搜索消息</p>
              <p className="text-sm">输入关键词搜索聊天消息内容</p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">快捷键</p>
                  <p className="text-gray-500 dark:text-gray-400">Ctrl/Cmd + K</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">导航</p>
                  <p className="text-gray-500 dark:text-gray-400">↑ ↓ 选择</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">确认</p>
                  <p className="text-gray-500 dark:text-gray-400">Enter 打开</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((result, index) => {
                const message = result.item;
                const matches = result.matches?.find(m => m.key === 'content');
                const isHighlighted = index === highlightIndex;

                return (
                  <div
                    key={message.id}
                    onClick={() => handleResultClick(result)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 消息类型图标 */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      }`}>
                        {message.type === 'user' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      {/* 消息内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {message.type === 'user' ? '用户' : 'AI'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                          {favoritedMessages.has(message.id) && (
                            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          )}
                          {message.score !== undefined && (
                            <span className="text-xs text-gray-400">
                              匹配度: {(1 - message.score).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div 
                          className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightText(
                              message.content?.substring(0, 200) || '',
                              matches?.indices || []
                            )
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 结果统计 */}
          {searchResults.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              找到 {searchResults.length} 条结果
              {highlightIndex > 0 && ` · 第 ${highlightIndex + 1} / ${searchResults.length} 条`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSearch;