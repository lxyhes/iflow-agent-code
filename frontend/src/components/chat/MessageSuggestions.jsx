/**
 * MessageSuggestions Component
 * 嵌入在AI消息底部的智能提示词建议组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Sparkles, ChevronRight, X, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../utils/api';

const MessageSuggestions = ({
  messages,
  selectedProject,
  onApplySuggestion,
  isLastMessage = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 生成智能建议
  const generateSuggestions = useCallback(async () => {
    if (!messages || messages.length === 0 || hasGenerated) {
      return;
    }

    setIsGenerating(true);

    try {
      // 获取最近的对话上下文（最近5条消息）
      const recentMessages = messages.slice(-5);
      const validMessages = recentMessages.filter(msg => {
        if (!msg || !msg.role || !msg.content) return false;
        const contentStr = String(msg.content).trim();
        return contentStr && contentStr !== 'undefined' && !contentStr.includes('Error:');
      });

      if (validMessages.length === 0) {
        setSuggestions(getDefaultSuggestions());
        return;
      }

      // 如果有selectedProject，尝试调用后端API
      if (selectedProject?.name) {
        try {
          const context = validMessages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n\n');

          const response = await api.chat.generateSuggestions(selectedProject.name, {
            context: context,
            messageCount: validMessages.length
          });

          if (response.ok) {
            const data = await response.json();
            const backendSuggestions = (data.suggestions || [])
              .map(s => typeof s === 'string' ? s : (s.prompt || s.title || ''))
              .filter(Boolean);
            setSuggestions(backendSuggestions.length > 0 ? backendSuggestions : getDefaultSuggestions());
            setIsGenerating(false);
            setHasGenerated(true);
            return;
          }
        } catch (apiError) {
          console.log('API call failed, using local suggestions:', apiError);
        }
      }

      // 使用本地生成的建议
      setSuggestions(generateLocalSuggestions(validMessages));
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions(generateLocalSuggestions(messages.slice(-5)));
    } finally {
      setIsGenerating(false);
      setHasGenerated(true);
    }
  }, [messages, selectedProject, hasGenerated]);

  // 只在最后一条消息且首次渲染时生成建议
  useEffect(() => {
    if (isLastMessage && !hasGenerated) {
      generateSuggestions();
    }
  }, [isLastMessage, hasGenerated, generateSuggestions]);

  const getDefaultSuggestions = () => [
    "帮我分析这个项目的代码结构",
    "生成项目文档",
    "检查代码中的潜在问题"
  ];

  const generateLocalSuggestions = (recentMessages) => {
    if (!recentMessages || recentMessages.length === 0) {
      return getDefaultSuggestions();
    }

    const lastUserMessage = recentMessages.filter(m => m.role === 'user').pop();
    const lastAIMessage = recentMessages.filter(m => m.role === 'assistant').pop();

    if (!lastUserMessage) return getDefaultSuggestions();

    const keywords = {
      'bug': ["帮我找到这个bug的根本原因", "如何修复这个问题？", "还有其他类似的问题吗？"],
      'error': ["分析这个错误的原因", "提供修复方案", "如何防止这个错误再次发生？"],
      'test': ["帮我编写单元测试", "生成测试用例", "如何提高测试覆盖率？"],
      'optimize': ["如何优化这段代码的性能？", "识别性能瓶颈", "提供优化建议"],
      'refactor': ["重构这段代码", "改进代码结构", "应用设计模式"],
      'document': ["生成代码文档", "编写API文档", "创建README文件"],
      'api': ["设计API接口", "生成API文档", "测试API端点"],
    };

    const messageText = (lastUserMessage.content + ' ' + (lastAIMessage?.content || '')).toLowerCase();
    
    for (const [keyword, suggestions] of Object.entries(keywords)) {
      if (messageText.includes(keyword)) return suggestions.slice(0, 3);
    }

    if (lastAIMessage?.content?.includes('```')) {
      return ["解释这段代码的工作原理", "优化这段代码", "为这段代码添加注释"];
    }

    return ["继续深入分析", "提供更多示例", "总结关键要点"];
  };

  const handleApplySuggestion = (suggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
      setIsExpanded(false);
    }
  };

  const handleRefresh = () => {
    setHasGenerated(false);
    generateSuggestions();
  };

  // 只在最后一条消息且有建议时显示
  if (!isLastMessage || suggestions.length === 0 || !isExpanded) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
      <div className="bg-gradient-to-r from-purple-50/60 via-blue-50/60 to-indigo-50/60 dark:from-purple-950/10 dark:via-blue-950/10 dark:to-indigo-950/10 rounded-lg p-2">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
              <Lightbulb className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
              接下来可以尝试
            </span>
            {isGenerating && (
              <RefreshCw className="w-2.5 h-2.5 text-gray-400 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleRefresh}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
              title="刷新建议"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
              title="隐藏"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 建议列表 - 水平排列 */}
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleApplySuggestion(suggestion)}
              className="flex items-center gap-1 px-2 py-1 bg-white/70 dark:bg-gray-800/70 hover:bg-white/90 dark:hover:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-md transition-all duration-200 group text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-purple-300/50 dark:hover:border-purple-700/50"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[150px]">{suggestion}</span>
              <ChevronRight className="w-2.5 h-2.5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageSuggestions;
