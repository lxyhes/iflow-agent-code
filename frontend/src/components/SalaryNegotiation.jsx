/**
 * 薪资谈判模拟器
 *
 * 模拟薪资谈判场景，训练谈判技巧和话术
 */

import React, { useState, useRef, useEffect } from 'react';
import { DollarSign, MessageSquare, Send, Bot, User, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Crown, Loader2 } from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import InterviewMasterHelper from './InterviewMasterHelper';
import interviewAIService from '../services/interviewAIService';

const SalaryNegotiation = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '你好，我是HR面试官。我们已经完成了技术面试，现在想和你聊聊薪资期望。请问你目前的薪资情况是怎样的？'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [negotiationStage, setNegotiationStage] = useState('opening'); // opening, current, expectation, negotiation, closing
  const [showMasterHelper, setShowMasterHelper] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const negotiationTips = {
    opening: [
      '保持自信但不过于强硬',
      '先了解公司薪资结构',
      '不要首先提出具体数字',
      '准备好你的价值主张'
    ],
    current: [
      '如实说明当前薪资（包括年终奖、股票等）',
      '强调你的成长和贡献',
      '提及你正在考虑的其他机会（如果有）',
      '不要虚报，背调可能核实'
    ],
    expectation: [
      '给出一个范围而不是具体数字',
      '范围的下限是你能接受的最低值',
      '上限要比期望高20-30%',
      '说明这个期望的依据（市场调研、技能匹配度）'
    ],
    negotiation: [
      '强调你能为公司带来的价值',
      '提及你的独特技能和经验',
      '询问除了薪资外的其他福利（股票、假期、远程等）',
      '如果达不到期望，可以要求试用期后重新评估'
    ],
    closing: [
      '确认所有细节（基本工资、奖金、股票、福利等）',
      '询问书面offer的时间',
      '表达加入公司的意愿',
      '给自己时间考虑（通常1-3天）'
    ]
  };

const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // 调用 AI 生成谈判回应
      const result = await interviewAIService.generateSalaryStrategy(
        '互联网公司', // 可以从用户输入中提取
        '开发工程师', // 可以从用户输入中提取
        '面议', // 期望薪资
        3, // 工作年限
        null // 当前薪资
      );

      // 直接使用 AI 生成的策略作为 HR 回复
      const hrResponse = result.strategy?.opening || result.strategy?.justification || '请继续';

      setMessages(prev => [...prev, { role: 'assistant', content: hrResponse }]);
    } catch (error) {
      console.error('薪资谈判 AI 失败:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，AI 服务暂时不可用。请继续练习，或者稍后重试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">薪资谈判模拟器</h3>
              <p className="text-sm text-gray-500">训练谈判技巧，争取理想薪资</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 面试高手助手按钮 */}
            <button
              onClick={() => setShowMasterHelper(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-yellow-600 transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Crown className="w-4 h-4" />
              面试高手
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 聊天区域 */}
          <div className="flex-1 flex flex-col">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-br from-green-500 to-emerald-500'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <MarkdownRenderer className="prose prose-sm max-w-none">
                      {msg.content}
                    </MarkdownRenderer>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入你的回复..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none h-20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 侧边提示 */}
          {showTips && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">谈判技巧</h4>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">当前阶段</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {negotiationStage === 'opening' && '开场阶段 - 建立良好氛围'}
                    {negotiationStage === 'current' && '了解现状 - 询问当前薪资'}
                    {negotiationStage === 'expectation' && '期望沟通 - 提出薪资期望'}
                    {negotiationStage === 'negotiation' && '谈判阶段 - 争取更好条件'}
                    {negotiationStage === 'closing' && '收尾阶段 - 确认细节'}
                  </p>
                </div>

                <div>
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    当前建议
                  </h5>
                  <ul className="space-y-2">
                    {negotiationTips[negotiationStage].map((tip, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-sm text-yellow-800 dark:text-yellow-200">注意事项</span>
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                    <li>• 不要首先提出具体数字</li>
                    <li>• 给出一个范围而不是固定值</li>
                    <li>• 强调你的价值和贡献</li>
                    <li>• 考虑整体package，不只是基本工资</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h5 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-200">常用话术</h5>
                  <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    <li>"根据我的市场调研，这个职位的薪资范围是XX-XX"</li>
                    <li>"考虑到我的技能和经验，我希望薪资能有XX%的提升"</li>
                    <li>"除了薪资，我也很看重成长机会和团队氛围"</li>
                    <li>"能否帮我申请到更高的级别或更多的股票？"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 面试高手助手 */}
        <InterviewMasterHelper
          isOpen={showMasterHelper}
          onClose={() => setShowMasterHelper(false)}
          question={messages.filter(m => m.role === 'assistant').pop()?.content || '薪资谈判'}
          questionType="salary"
        />
      </div>
    </div>
  );
};

export default SalaryNegotiation;
