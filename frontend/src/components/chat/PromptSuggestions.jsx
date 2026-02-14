/**
 * PromptSuggestions Component
 * 智能提示词建议组件
 * 
 * 功能：
 * - 根据最近的聊天上下文智能推荐下一个提示词
 * - 基于AI分析生成相关的问题建议
 * - 支持点击快速应用建议
 * - 优雅的动画效果
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Sparkles, ChevronRight, X, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../utils/api';

const PromptSuggestions = ({
  messages,
  selectedProject,
  onApplySuggestion,
  isLoading,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [wasLoading, setWasLoading] = useState(false);

  // 生成智能建议
  const generateSuggestions = useCallback(async () => {
    if (!messages || messages.length === 0 || !selectedProject) {
      return;
    }

    // 只在有新消息时重新生成
    if (messages.length === lastMessageCount) {
      return;
    }

    setIsGenerating(true);
    setLastMessageCount(messages.length);

    try {
      // 获取最近的对话上下文（最近5条消息）
      const recentMessages = messages.slice(-5);
      // 过滤掉 content 为 undefined、null、或包含错误消息的消息
      const validMessages = recentMessages.filter(msg => {
        // 检查消息对象本身
        if (!msg) return false;
        // 检查 role 字段
        if (!msg.role || typeof msg.role !== 'string') return false;
        // 检查 content 字段
        if (msg.content == null) return false;
        // content 必须是字符串
        if (typeof msg.content !== 'string') return false;
        const contentStr = msg.content.trim();
        // 排除空内容
        if (!contentStr) return false;
        // 排除内容为 "undefined" 字符串
        if (contentStr === 'undefined') return false;
        // 排除包含错误消息的内容
        if (contentStr.includes('Error:') || contentStr.includes('HTTP')) return false;
        // 排除包含 "undefined" 的内容
        if (contentStr.includes('undefined')) return false;
        return true;
      });

      // 如果没有有效消息，直接返回默认建议
      if (validMessages.length === 0) {
        const defaultSuggestions = [
          "帮我分析这个项目的代码结构",
          "生成项目文档",
          "检查代码中的潜在问题"
        ];
        setSuggestions(defaultSuggestions);
        return;
      }

      const context = validMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // 调用后端API生成建议
      const response = await api.chat.generateSuggestions(selectedProject.name, {
        context: context,
        messageCount: validMessages.length
      });

      if (response.ok) {
        const data = await response.json();
        // 后端返回的对象格式: {title, prompt}，提取 prompt 作为建议文本
        const backendSuggestions = (data.suggestions || []).map(s =>
          typeof s === 'string' ? s : (s.prompt || s.title || '')
        );
        setSuggestions(backendSuggestions);
      } else {
        // 如果API不可用，使用本地规则生成建议
        const localSuggestions = generateLocalSuggestions(validMessages);
        setSuggestions(localSuggestions);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // 降级到本地规则
      const localSuggestions = generateLocalSuggestions(messages.slice(-5).filter(msg => {
        if (!msg || !msg.role || !msg.content) return false;
        const contentStr = String(msg.content).trim();
        return contentStr && contentStr !== 'undefined' && !contentStr.includes('undefined');
      }));
      setSuggestions(localSuggestions);
    } finally {
      setIsGenerating(false);
    }
  }, [messages, selectedProject, lastMessageCount]);

  // 监听 isLoading 变化，当从 loading 变为 not loading 时，自动显示建议
  useEffect(() => {
    if (wasLoading && !isLoading) {
      // AI 回答完成，显示建议
      setIsExpanded(true);
      generateSuggestions();
    }
    setWasLoading(isLoading);
  }, [isLoading, wasLoading, generateSuggestions]);

  // 本地规则生成建议（降级方案）
  const generateLocalSuggestions = (recentMessages) => {
    if (!recentMessages || recentMessages.length === 0) {
      return [
        "帮我分析这个项目的代码结构",
        "生成项目文档",
        "检查代码中的潜在问题"
      ];
    }

    const lastUserMessage = recentMessages
      .filter(m => m.role === 'user')
      .pop();

    const lastAIMessage = recentMessages
      .filter(m => m.role === 'assistant')
      .pop();

    if (!lastUserMessage) {
      return [
        "帮我分析这个项目的代码结构",
        "生成项目文档",
        "检查代码中的潜在问题"
      ];
    }

    // 基于关键词生成建议
    const keywords = {
      'bug': [
        "帮我找到这个bug的根本原因",
        "如何修复这个问题？",
        "还有其他类似的问题吗？"
      ],
      'error': [
        "分析这个错误的原因",
        "提供修复方案",
        "如何防止这个错误再次发生？"
      ],
      'test': [
        "帮我编写单元测试",
        "生成测试用例",
        "如何提高测试覆盖率？"
      ],
      'optimize': [
        "如何优化这段代码的性能？",
        "识别性能瓶颈",
        "提供优化建议"
      ],
      'refactor': [
        "重构这段代码",
        "改进代码结构",
        "应用设计模式"
      ],
      'document': [
        "生成代码文档",
        "编写API文档",
        "创建README文件"
      ],
      'api': [
        "设计API接口",
        "生成API文档",
        "测试API端点"
      ],
      'feature': [
        "设计新功能",
        "实现功能需求",
        "编写功能测试"
      ],
      'review': [
        "进行代码审查",
        "检查代码质量",
        "提供改进建议"
      ]
    };

    // 检查消息中的关键词
    const messageText = (lastUserMessage.content + ' ' + (lastAIMessage?.content || '')).toLowerCase();
    
    for (const [keyword, suggestions] of Object.entries(keywords)) {
      if (messageText.includes(keyword)) {
        return suggestions.slice(0, 3);
      }
    }

    // 默认建议
    const defaultSuggestions = [
      "继续深入分析",
      "提供更多示例",
      "总结关键要点"
    ];

    // 如果AI回复了代码，提供代码相关的建议
    if (lastAIMessage && lastAIMessage.content.includes('```')) {
      return [
        "解释这段代码的工作原理",
        "优化这段代码",
        "为这段代码添加注释"
      ];
    }

    return defaultSuggestions;
  };

  // 当用户开始输入时，自动收起建议
  useEffect(() => {
    const handleUserInput = () => {
      setIsExpanded(false);
    };

    // 监听输入框焦点事件
    const inputElement = document.querySelector('textarea');
    if (inputElement) {
      inputElement.addEventListener('focus', handleUserInput);
      return () => inputElement.removeEventListener('focus', handleUserInput);
    }
  }, []);

  // 应用建议
  const handleApplySuggestion = (suggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
      // 应用建议后自动收起
      setIsExpanded(false);
    }
  };

  // 刷新建议
  const handleRefresh = () => {
    setLastMessageCount(0); // 强制重新生成
    generateSuggestions();
  };

  // 只有在有消息且不在加载状态时才显示
  const shouldShow = messages && messages.length > 0 && !isLoading && suggestions.length > 0;

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full transition-all duration-300 flex-shrink-0 relative',
        isExpanded ? 'opacity-100 translate-y-0 max-h-[200px]' : 'opacity-0 -translate-y-2 h-0 overflow-hidden'
      )}
      style={{ zIndex: 1 }}
    >
      <div className="bg-gradient-to-r from-purple-50/80 via-blue-50/80 to-indigo-50/80 dark:from-purple-950/15 dark:via-blue-950/15 dark:to-indigo-950/15 border border-purple-200/40 dark:border-purple-800/40 rounded-lg p-2 mb-2 shadow-sm overflow-y-auto max-h-[200px] backdrop-blur-sm">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-md flex items-center justify-center shadow-sm">
              <Lightbulb className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              接下来可以尝试
            </span>
            {isGenerating && (
              <RefreshCw className="w-2.5 h-2.5 text-gray-400 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleRefresh}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
              title="刷新建议"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
              title="隐藏建议"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 建议列表 */}
        <div className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleApplySuggestion(suggestion)}
              className="w-full text-left px-2.5 py-1.5 bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-md transition-all duration-200 group flex items-center gap-2 hover:border-purple-300/50 dark:hover:border-purple-700/50"
            >
              <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors flex-1 truncate">
                {suggestion}
              </span>
              <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptSuggestions;