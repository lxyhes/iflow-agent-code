/**
 * useTokenUsage Hook
 * Token 用量追踪 Hook
 * 
 * 功能：
 * - 估算当前对话的 Token 使用量
 * - 提供上下文使用率提示
 * - 警告用户接近限制
 */

import { useState, useCallback, useMemo } from 'react';

// 不同模型的上下文限制
const CONTEXT_LIMITS = {
  'GLM-4.7': 128000,
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'default': 128000
};

// 简单估算：中文字符约 1.5 tokens，英文单词约 1.3 tokens
const estimateTokens = (text) => {
  if (!text) return 0;
  
  // 中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  // 其他字符
  const otherChars = text.length - chineseChars - englishWords;
  
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5);
};

export function useTokenUsage(model = 'GLM-4.7', messages = []) {
  const [manualLimit, setManualLimit] = useState(null);
  
  // 获取上下文限制
  const contextLimit = useMemo(() => {
    return manualLimit || CONTEXT_LIMITS[model] || CONTEXT_LIMITS.default;
  }, [model, manualLimit]);
  
  // 计算所有消息的 Token 数
  const { inputTokens, outputTokens, totalTokens } = useMemo(() => {
    let input = 0;
    let output = 0;
    
    messages.forEach(msg => {
      const tokens = estimateTokens(msg.content);
      if (msg.type === 'user') {
        input += tokens;
      } else if (msg.type === 'assistant') {
        output += tokens;
      }
    });
    
    return {
      inputTokens: input,
      outputTokens: output,
      totalTokens: input + output
    };
  }, [messages]);
  
  // 计算使用率
  const usagePercent = useMemo(() => {
    return Math.min(100, Math.round((totalTokens / contextLimit) * 100));
  }, [totalTokens, contextLimit]);
  
  // 获取状态颜色
  const statusColor = useMemo(() => {
    if (usagePercent >= 90) return 'text-red-500 bg-red-500';
    if (usagePercent >= 70) return 'text-yellow-500 bg-yellow-500';
    return 'text-green-500 bg-green-500';
  }, [usagePercent]);
  
  // 获取状态文本
  const statusText = useMemo(() => {
    if (usagePercent >= 90) return '接近限制';
    if (usagePercent >= 70) return '使用量较高';
    return '正常使用';
  }, [usagePercent]);
  
  // 估算剩余可用 Token
  const remainingTokens = useMemo(() => {
    return Math.max(0, contextLimit - totalTokens);
  }, [contextLimit, totalTokens]);
  
  // 添加新消息后的预估
  const estimateNewMessage = useCallback((content) => {
    const newTokens = estimateTokens(content);
    const newTotal = totalTokens + newTokens;
    return {
      willFit: newTotal <= contextLimit,
      newTotal,
      newPercent: Math.min(100, Math.round((newTotal / contextLimit) * 100)),
      estimatedTokens: newTokens
    };
  }, [totalTokens, contextLimit]);
  
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    contextLimit,
    usagePercent,
    remainingTokens,
    statusColor,
    statusText,
    estimateNewMessage,
    setManualLimit
  };
}

export default useTokenUsage;
