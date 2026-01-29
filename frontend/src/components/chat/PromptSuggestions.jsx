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
      const context = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // 调用后端API生成建议
      const response = await api.chat.generateSuggestions(selectedProject.name, {
        context: context,
        messageCount: recentMessages.length
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        // 如果API不可用，使用本地规则生成建议
        const localSuggestions = generateLocalSuggestions(recentMessages);
        setSuggestions(localSuggestions);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // 降级到本地规则
      const localSuggestions = generateLocalSuggestions(messages.slice(-5));
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
    <div className={cn(
      'w-full transition-all duration-300',
      isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 h-0 overflow-hidden',
      className
    )}>
      <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-indigo-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4 mb-4 shadow-lg shadow-purple-500/5">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              接下来可以尝试
            </span>
            {isGenerating && (
              <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              title="刷新建议"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              title="隐藏建议"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 建议列表 */}
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleApplySuggestion(suggestion)}
              className="w-full text-left px-4 py-3 bg-white/70 dark:bg-gray-800/70 hover:bg-white/90 dark:hover:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-lg transition-all duration-200 group flex items-start gap-3 hover:shadow-md hover:border-purple-300/50 dark:hover:border-purple-700/50"
            >
              <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors flex-1">
                {suggestion}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 flex-shrink-0 mt-0.5 ml-auto transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptSuggestions;