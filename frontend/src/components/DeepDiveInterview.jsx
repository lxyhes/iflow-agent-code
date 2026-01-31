/**
 * 技术深度追问模式
 *
 * 针对每个回答自动追问更深层次的技术问题
 * 考察技术深度和广度
 */

import React, { useState, useRef, useEffect } from 'react';
import { Brain, MessageSquare, Send, Bot, User, Sparkles, ChevronRight, Target, Zap, Crown } from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import InterviewMasterHelper from './InterviewMasterHelper';

const DeepDiveInterview = ({ initialQuestion, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: initialQuestion || '请描述一下你最有挑战性的项目，以及你在其中解决的核心技术问题。',
      depth: 1
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentDepth, setCurrentDepth] = useState(1);
  const [showDepthIndicator, setShowDepthIndicator] = useState(true);
  const [showMasterHelper, setShowMasterHelper] = useState(false);
  const messagesEndRef = useRef(null);

  const depthLevels = [
    { level: 1, name: '基础了解', color: 'bg-green-500', description: '了解项目背景和你的角色' },
    { level: 2, name: '技术细节', color: 'bg-blue-500', description: '深入技术实现细节' },
    { level: 3, name: '架构设计', color: 'bg-purple-500', description: '考察架构设计能力' },
    { level: 4, name: '深度原理', color: 'bg-orange-500', description: '深挖底层原理' },
    { level: 5, name: '扩展思考', color: 'bg-red-500', description: '考察知识广度和创新思维' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateFollowUpQuestion = (userAnswer, depth) => {
    const followUpQuestions = {
      1: [
        '你提到使用了微服务架构，能详细说说服务是如何划分的吗？',
        '这个项目的QPS大概是多少？你们是如何做性能优化的？',
        '你们用了什么数据库？为什么选择这个数据库？'
      ],
      2: [
        '你提到的缓存策略，能详细说说缓存穿透、击穿、雪崩是如何解决的吗？',
        '分布式事务你们是怎么处理的？具体用了什么方案？',
        '你们的服务是如何做服务发现和负载均衡的？'
      ],
      3: [
        '如果让你重新设计这个系统，你会有哪些改进？',
        '这个架构的瓶颈在哪里？你们是如何发现的？',
        '你们是如何保证系统的高可用性的？'
      ],
      4: [
        '你提到的Redis集群，底层是如何实现数据分片的？',
        'Kafka的消费者组是如何实现负载均衡的？',
        '你们用的RPC框架底层通信原理是什么？'
      ],
      5: [
        '如果数据量再增加10倍，你的架构需要做哪些调整？',
        '业界有没有更好的解决方案？你为什么没有采用？',
        '这个项目最大的技术难点是什么？你是如何突破的？'
      ]
    };

    const questions = followUpQuestions[depth] || followUpQuestions[1];
    return questions[Math.floor(Math.random() * questions.length)];
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage, depth: currentDepth }]);
    setInput('');
    setIsLoading(true);

    // 模拟AI思考
    await new Promise(resolve => setTimeout(resolve, 1500));

    const nextDepth = Math.min(currentDepth + 1, 5);
    const followUpQuestion = generateFollowUpQuestion(userMessage, nextDepth);

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: followUpQuestion,
      depth: nextDepth
    }]);

    setCurrentDepth(nextDepth);
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentDepthInfo = depthLevels[currentDepth - 1];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">技术深度追问模式</h3>
              <p className="text-sm text-gray-500">连环追问，考察技术深度</p>
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

        {/* 深度指示器 */}
        {showDepthIndicator && (
          <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">追问深度</span>
              <span className="text-sm text-gray-500">{currentDepthInfo.name}</span>
            </div>
            <div className="flex gap-2">
              {depthLevels.map((level) => (
                <div key={level.level} className="flex-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      level.level <= currentDepth ? level.color : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-center">{level.level}级</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{currentDepthInfo.description}</p>
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
                    msg.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-600 to-indigo-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}>
                    {msg.role === 'assistant' && msg.depth > 1 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded text-white ${depthLevels[msg.depth - 1]?.color || 'bg-gray-500'}`}>
                          追问 {msg.depth - 1}
                        </span>
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
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
                  placeholder="输入你的回答..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 侧边提示 */}
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-500" />
              <h4 className="font-semibold text-gray-900 dark:text-white">追问策略</h4>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-sm">当前阶段</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentDepthInfo.description}
                </p>
              </div>

              <div>
                <h5 className="font-medium text-sm mb-2">回答技巧</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    从技术原理层面回答，不要只讲表面
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    结合实际案例，体现真实经验
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    展现对技术选型的思考过程
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    承认不知道的问题，不要瞎编
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h5 className="font-medium text-sm mb-2 text-yellow-800 dark:text-yellow-200">注意事项</h5>
                <ul className="space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
                  <li>• 深度追问会逐步加大难度</li>
                  <li>• 回答要有深度，不要泛泛而谈</li>
                  <li>• 可以适当停顿思考，不要急于回答</li>
                  <li>• 展现你的技术热情和求知欲</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 面试高手助手 */}
        <InterviewMasterHelper
          isOpen={showMasterHelper}
          onClose={() => setShowMasterHelper(false)}
          question={messages.filter(m => m.role === 'assistant').pop()?.content || ''}
          questionType="technical"
        />
      </div>
    </div>
  );
};

export default DeepDiveInterview;
