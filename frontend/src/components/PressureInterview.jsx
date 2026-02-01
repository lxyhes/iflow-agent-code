/**
 * 压力面试模式
 *
 * 模拟高压面试环境，包括打断、质疑、连续追问等压力场景
 * 训练心理素质和应变能力
 */

import React, { useState, useRef, useEffect } from 'react';
import { Flame, MessageSquare, Send, Bot, User, AlertTriangle, Shield, Heart, Zap, Crown, Loader2 } from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import InterviewMasterHelper from './InterviewMasterHelper';
import interviewAIService from '../services/interviewAIService';

const PressureInterview = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '你好，我是今天的面试官。我们时间有限，希望你能够简洁明了地回答我的问题。首先，请用一分钟介绍一下你自己。',
      type: 'normal'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stressLevel, setStressLevel] = useState(1); // 1-5 压力等级
  const [showStressIndicator, setShowStressIndicator] = useState(true);
  const [interrupted, setInterrupted] = useState(false);
  const [showMasterHelper, setShowMasterHelper] = useState(false);
  const messagesEndRef = useRef(null);

  const stressLevels = [
    { level: 1, name: '轻度压力', color: 'bg-yellow-500', description: '时间紧迫，要求简洁回答' },
    { level: 2, name: '质疑挑战', color: 'bg-orange-500', description: '对你的回答提出质疑' },
    { level: 3, name: '打断追问', color: 'bg-red-500', description: '频繁打断，连续追问' },
    { level: 4, name: '否定质疑', color: 'bg-purple-500', description: '否定你的能力，施加心理压力' },
    { level: 5, name: '极限压力', color: 'bg-red-700', description: '多重压力同时施加' }
  ];

  const pressureScenarios = {
    1: [
      '时间快到了，请快点说重点。',
      '这个我已经听过了，说点我没听过的。',
      '你能不能在30秒内说完？'
    ],
    2: [
      '你确定是这样吗？我觉得你可能理解错了。',
      '这个方案明显有问题，你没考虑到XX情况吗？',
      '如果我是你，我不会这样做。你觉得你的方案比我的好吗？',
      '你之前的项目好像也没有很成功，能解释一下吗？'
    ],
    3: [
      '等等，你刚才说的和之前矛盾了。',
      '不要绕圈子，直接回答我的问题。',
      '你还没回答我的问题，我问的是...',
      '这个你也不知道吗？那换一个，你知道...'
    ],
    4: [
      '说实话，你的经验看起来比较一般。',
      '你觉得自己真的适合这个职位吗？',
      '以你目前的水平，可能达不到我们的要求。',
      '你之前的薪资涨幅这么慢，是不是能力有问题？'
    ],
    5: [
      '【打断】好了好了，不用说了。下一个问题。',
      '【沉默】...（面试官沉默10秒，面无表情看着你）',
      '你好像很紧张？是不是准备不充分？',
      '如果我现在告诉你面试结束了，你会说什么？'
    ]
  };

  const normalQuestions = [
    '请介绍一下你最失败的项目经历。',
    '你和同事发生过冲突吗？怎么解决的？',
    '如果你的方案被领导否决了，你会怎么办？',
    '你觉得自己最大的缺点是什么？',
    '如果入职后发现工作和你想象的不一样，你会怎么办？'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generatePressureResponse = (userAnswer) => {
    const currentLevel = Math.min(stressLevel, 5);
    
    // 随机决定是否施加压力
    const applyPressure = Math.random() > 0.3;
    
    if (applyPressure && currentLevel >= 2) {
      const pressureMessages = pressureScenarios[currentLevel];
      return {
        content: pressureMessages[Math.floor(Math.random() * pressureMessages.length)],
        type: 'pressure'
      };
    } else {
      // 正常问题
      const question = normalQuestions[Math.floor(Math.random() * normalQuestions.length)];
      return {
        content: question,
        type: 'normal'
      };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // 增加压力等级
      const nextStressLevel = Math.min(stressLevel + 0.5, 5);
      setStressLevel(nextStressLevel);

      // 调用 AI 生成压力回应
      const pressureType = nextStressLevel >= 4 ? 'stress' : nextStressLevel >= 2 ? 'challenge' : 'logic';
      const result = await interviewAIService.generatePressureResponse(userMessage, pressureType);

      // 解析 AI 响应
      const aiResponse = parsePressureResponse(result.response);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.content,
        type: aiResponse.type
      }]);
    } catch (error) {
      console.error('压力面试 AI 失败:', error);
      // 使用本地模板作为后备
      const nextStressLevel = Math.min(stressLevel + 0.5, 5);
      setStressLevel(nextStressLevel);
      const response = generatePressureResponse(userMessage);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        type: response.type
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 解析 AI 压力回应
  const parsePressureResponse = (aiResponse) => {
    if (!aiResponse) return { content: '请继续。', type: 'normal' };

    // 检测是否是压力类型回应
    const pressureKeywords = ['质疑', '挑战', '打断', '否定', '怀疑', '不对', '错误', '问题'];
    const isPressure = pressureKeywords.some(keyword => aiResponse.includes(keyword));

    return {
      content: aiResponse.trim(),
      type: isPressure ? 'pressure' : 'normal'
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentStressInfo = stressLevels[Math.floor(stressLevel) - 1] || stressLevels[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">压力面试模式</h3>
              <p className="text-sm text-gray-500">模拟高压环境，训练心理素质</p>
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

        {/* 压力指示器 */}
        {showStressIndicator && (
          <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">压力等级</span>
              </div>
              <span className="text-sm font-bold text-red-600">{currentStressInfo.name}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${currentStressInfo.color}`}
                style={{ width: `${(stressLevel / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{currentStressInfo.description}</p>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* 聊天区域 */}
          <div className="flex-1 flex flex-col">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-red-500 to-orange-500'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.type === 'pressure'
                      ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}>
                    {msg.type === 'pressure' && (
                      <div className="flex items-center gap-1 mb-1">
                        <Flame className="w-3 h-3 text-red-500" />
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">压力施加</span>
                      </div>
                    )}
                    <MarkdownRenderer className="prose prose-sm max-w-none">
                      {msg.content}
                    </MarkdownRenderer>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
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
                  placeholder="保持冷静，自信回答..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 侧边提示 */}
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-red-500" />
              <h4 className="font-semibold text-gray-900 dark:text-white">应对策略</h4>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-sm">保持冷静</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  压力面试是测试你的心理素质，不是真的否定你。保持微笑，深呼吸。
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-sm">应对技巧</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    被质疑时：先承认对方观点，再解释你的考虑
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    被打断时：礼貌地表示"让我说完这一点"
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    被否定时：用事实和数据支撑你的观点
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    不知道时：坦诚承认，但表达学习意愿
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h5 className="font-medium text-sm mb-2 text-yellow-800 dark:text-yellow-200">常见压力场景</h5>
                <ul className="space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
                  <li>• 时间压力：要求快速回答</li>
                  <li>• 质疑压力：否定你的回答</li>
                  <li>• 打断压力：频繁打断你的话</li>
                  <li>• 否定压力：质疑你的能力</li>
                  <li>• 沉默压力：故意不说话看你反应</li>
                </ul>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h5 className="font-medium text-sm mb-2 text-green-800 dark:text-green-200">心态调整</h5>
                <p className="text-xs text-green-700 dark:text-green-300">
                  记住：压力面试是表演，面试官在扮演"坏人"。保持专业、自信、礼貌，你就赢了。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 面试高手助手 */}
        <InterviewMasterHelper
          isOpen={showMasterHelper}
          onClose={() => setShowMasterHelper(false)}
          question={messages.filter(m => m.role === 'assistant').pop()?.content || ''}
          questionType="behavioral"
        />
      </div>
    </div>
  );
};

export default PressureInterview;
