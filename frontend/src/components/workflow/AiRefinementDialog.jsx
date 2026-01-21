/**
 * AI Refinement Dialog
 * AI 迭代优化对话框 - 类似 cc-wf-studio 的 Edit with AI 功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, CheckCircle } from 'lucide-react';

const AiRefinementDialog = ({ isOpen, onClose, currentWorkflow, onApply, loading }) => {
  const [message, setMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewChanges, setPreviewChanges] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && conversationHistory.length === 0) {
      // 添加初始欢迎消息
      setConversationHistory([
        {
          role: 'ai',
          content: '你好！我可以帮你优化工作流。请告诉我你想做什么修改？\n\n示例：\n• "添加一个错误处理节点"\n• "在条件判断后添加一个询问用户的节点"\n• "连接节点 2 到节点 4"'
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);

    // 添加用户消息
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];
    setConversationHistory(newHistory);
    setMessage('');

    try {
      // 调用 AI API 进行优化
      const response = await fetch('/api/workflows/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_workflow: currentWorkflow,
          conversation_history: newHistory,
          user_request: message
        })
      });

      const data = await response.json();

      if (data.success) {
        setConversationHistory([
          ...newHistory,
          {
            role: 'ai',
            content: data.message || '我已经根据你的要求优化了工作流，请查看预览。',
            changes: data.changes
          }
        ]);
        setPreviewChanges(data.updated_workflow);
      } else {
        setConversationHistory([
          ...newHistory,
          {
            role: 'ai',
            content: `抱歉，优化失败：${data.error || '未知错误'}`,
            error: true
          }
        ]);
      }
    } catch (error) {
      setConversationHistory([
        ...newHistory,
        {
          role: 'ai',
          content: `抱歉，发生错误：${error.message}`,
          error: true
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApplyChanges = () => {
    if (previewChanges) {
      onApply(previewChanges);
      handleClose();
    }
  };

  const handleClose = () => {
    setConversationHistory([]);
    setPreviewChanges(null);
    setMessage('');
    onClose();
  };

  const handleDiscardChanges = () => {
    setPreviewChanges(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI 优化工作流</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">通过对话式交互迭代优化你的工作流</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 对话区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversationHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : msg.error
                    ? 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {msg.role === 'ai' && !msg.error && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">AI 助手</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                {msg.changes && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">变更摘要：</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {msg.changes.summary?.map((change, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center space-x-3 border border-gray-200 dark:border-gray-700">
                <Loader2 className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin" />
                <span className="text-sm text-gray-700 dark:text-gray-300">AI 正在思考...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 预览变更区域 */}
        {previewChanges && (
          <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">AI 已生成优化方案</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDiscardChanges}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm transition-colors border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
                >
                  放弃变更
                </button>
                <button
                  onClick={handleApplyChanges}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>应用变更</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="描述你想要的修改... (Ctrl+Enter 发送)"
                disabled={isProcessing}
                className="w-full h-24 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {message.length}/2000 字符
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  提示：一次只做一个修改，逐步优化效果更好
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || isProcessing}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>{isProcessing ? '处理中...' : '发送'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiRefinementDialog;
