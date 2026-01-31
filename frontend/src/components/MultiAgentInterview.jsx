/**
 * 多智能体面试组件 - 重新设计版
 *
 * 采用现代化聊天界面设计，优化用户体验
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMultiAgentInterview, InterviewStatus } from '../hooks/useMultiAgentInterview';
import {
  Mic,
  MicOff,
  Send,
  Pause,
  Play,
  StopCircle,
  RotateCcw,
  User,
  Bot,
  MessageSquare,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  Award,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// 智能体头像配置
const AGENT_AVATARS = {
  technical: { icon: '💻', color: 'bg-blue-500', name: '技术面试官' },
  system_design: { icon: '🏗️', color: 'bg-orange-500', name: '系统设计面试官' },
  behavioral: { icon: '🤝', color: 'bg-green-500', name: '行为面试官' },
  hr: { icon: '👔', color: 'bg-purple-500', name: 'HR面试官' },
};

const MultiAgentInterview = ({ candidateProfile, onComplete, onCancel }) => {
  const messagesEndRef = useRef(null);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [expandedEvaluations, setExpandedEvaluations] = useState({});

  const {
    sessionId,
    status,
    error,
    candidateProfile: interviewCandidateProfile,
    currentAgent,
    currentQuestion,
    messages,
    evaluation,
    result,
    isLoading,
    isProcessing,
    progress,
    duration,
    createSession,
    startInterview,
    submitAnswer,
    pauseInterview,
    resumeInterview,
    completeInterview,
    cancelInterview,
    reset,
    InterviewStatus: StatusEnum,
  } = useMultiAgentInterview({
    onComplete: (result) => {
      setShowResult(true);
      if (onComplete) onComplete(result);
    },
    onError: (error) => {
      console.error('面试错误:', error);
    },
  });

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 创建会话
  useEffect(() => {
    if (candidateProfile && status === StatusEnum.IDLE) {
      createSession(candidateProfile);
    }
  }, [candidateProfile, status]);

  // 处理开始面试
  const handleStart = async () => {
    await startInterview();
  };

  // 处理提交回答
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    const currentAnswer = answer;
    setAnswer('');
    await submitAnswer(currentAnswer);
  };

  // 处理暂停/继续
  const handlePauseResume = async () => {
    if (interview.status === InterviewStatus.PAUSED) {
      await resumeInterview();
    } else {
      await pauseInterview();
    }
  };

  // 处理完成
  const handleComplete = async () => {
    await completeInterview();
  };

  // 处理取消
  const handleCancel = async () => {
    await cancelInterview();
    if (onCancel) onCancel();
  };

  // 处理重置
  const handleReset = () => {
    reset();
    setShowResult(false);
  };

  // 切换评估详情展开/收起
  const toggleEvaluation = (index) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 获取当前智能体信息
  const currentAgentInfo = currentAgent
    ? AGENT_AVATARS[currentAgent.type]
    : null;

  // 渲染头部
  const renderHeader = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h1 className="font-semibold text-gray-900 dark:text-white">多智能体面试</h1>
        </div>
        {interviewCandidateProfile && (
          <span className="text-sm text-gray-500">
            {interviewCandidateProfile.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {renderStatusBadge()}
        {currentAgentInfo && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs ${currentAgentInfo.color}`}>
            <span>{currentAgentInfo.icon}</span>
            <span>{currentAgentInfo.name.replace('面试官', '')}</span>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染状态标签
  const renderStatusBadge = () => {
    const statusConfig = {
      [StatusEnum.IDLE]: { text: '准备中', color: 'bg-gray-100 text-gray-600' },
      [StatusEnum.CREATING]: { text: '创建中', color: 'bg-blue-100 text-blue-600' },
      [StatusEnum.READY]: { text: '就绪', color: 'bg-green-100 text-green-600' },
      [StatusEnum.IN_PROGRESS]: { text: '面试中', color: 'bg-blue-100 text-blue-600' },
      [StatusEnum.PAUSED]: { text: '已暂停', color: 'bg-yellow-100 text-yellow-600' },
      [StatusEnum.PROCESSING]: { text: '处理中', color: 'bg-purple-100 text-purple-600' },
      [StatusEnum.COMPLETED]: { text: '已完成', color: 'bg-green-100 text-green-600' },
      [StatusEnum.ERROR]: { text: '错误', color: 'bg-red-100 text-red-600' },
    };
    const config = statusConfig[status] || statusConfig[StatusEnum.IDLE];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // 渲染进度条
  const renderProgress = () => {
    if (status !== StatusEnum.IN_PROGRESS && status !== StatusEnum.PAUSED) {
      return null;
    }

    const progressData = progress || { current: 0, total: 5, percentage: 0 };
    const agentOrder = ['technical', 'system_design', 'behavioral', 'hr'];
    const currentIndex = agentOrder.indexOf(currentAgent?.type);

    return (
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {/* 进度条 */}
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>进度 {progressData.current}/{progressData.total}</span>
              <span>{duration || '00:00'}</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressData.percentage}%` }}
              />
            </div>
          </div>
          
          {/* 智能体指示器 */}
          <div className="flex items-center gap-1">
            {agentOrder.map((type, idx) => {
              const info = AGENT_AVATARS[type];
              const isActive = idx === currentIndex;
              const isDone = idx < currentIndex;
              
              return (
                <div
                  key={type}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${isActive ? `${info.color} text-white ring-2 ring-offset-1 ring-blue-300` : 
                      isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  title={info.name}
                >
                  {isDone ? '✓' : info.icon}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 渲染消息气泡
  const renderMessage = (message, index) => {
    switch (message.type) {
      case 'question':
        return (
          <div key={index} className="flex gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${currentAgentInfo?.color || 'bg-gray-500'}`}>
              {currentAgentInfo?.icon || '🤖'}
            </div>
            <div className="flex-1 max-w-[85%]">
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-400 mb-1">{message.agent?.name}</div>
                <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          </div>
        );

      case 'answer':
        return (
          <div key={index} className="flex gap-3 mb-4 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 max-w-[85%]">
              <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                <div className="text-xs text-blue-100 mb-1">你</div>
                <div className="text-sm leading-relaxed">{message.content}</div>
              </div>
            </div>
          </div>
        );

      case 'evaluation':
        const isExpanded = expandedEvaluations[index];
        return (
          <div key={index} className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="flex-1 max-w-[90%]">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 overflow-hidden">
                {/* 评估头部 - 可点击展开 */}
                <button
                  onClick={() => toggleEvaluation(index)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-100/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-yellow-600">{message.score}分</span>
                    <span className="text-sm text-gray-600">{message.agent_name}</span>
                    {message.smart_analysis && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        AI分析
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {/* 展开的详情 */}
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-yellow-200">
                    <p className="text-sm text-gray-700 mt-2">{message.feedback}</p>
                    
                    {message.strengths?.length > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="text-green-600 font-medium">优点:</span>
                        <span className="text-gray-600 ml-1">{message.strengths.join(', ')}</span>
                      </div>
                    )}
                    
                    {message.weaknesses?.length > 0 && (
                      <div className="mt-1 text-sm">
                        <span className="text-red-600 font-medium">改进:</span>
                        <span className="text-gray-600 ml-1">{message.weaknesses.join(', ')}</span>
                      </div>
                    )}

                    {message.smart_analysis && (
                      <div className="mt-3 pt-3 border-t border-yellow-200">
                        <div className="text-xs text-gray-500 mb-2">回答深度</div>
                        <div className="flex gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-3 h-3 rounded-full ${
                                level <= message.smart_analysis.depth_value ? 'bg-blue-500' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        {message.smart_analysis.follow_up_suggestions?.length > 0 && (
                          <div className="text-xs text-blue-600 mt-2">
                            💡 {message.smart_analysis.follow_up_suggestions[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 渲染消息列表
  const renderMessages = () => (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {messages.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>等待第一个问题...</p>
        </div>
      ) : (
        messages.map((msg, idx) => renderMessage(msg, idx))
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // 渲染输入区域
  const renderInput = () => {
    if (status !== StatusEnum.IN_PROGRESS && status !== StatusEnum.PAUSED) {
      return null;
    }

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-2.5 rounded-xl transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            placeholder="输入你的回答..."
            disabled={isProcessing || status === StatusEnum.PAUSED}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || isProcessing}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>

        {/* 控制按钮 */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handlePauseResume}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
            >
              {status === StatusEnum.PAUSED ? (
                <><Play className="w-4 h-4" /> 继续</>
              ) : (
                <><Pause className="w-4 h-4" /> 暂停</>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              结束
            </button>
          </div>
          <button
            onClick={handleComplete}
            className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            完成面试
          </button>
        </div>
      </div>
    );
  };

  // 渲染准备界面
  const renderReady = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">面试准备就绪</h2>
        <p className="text-gray-500 mb-6">
          本次面试将由4位AI面试官进行，涵盖技术、系统设计、行为和HR四个维度
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleStart}
            disabled={!sessionId}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            开始面试
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染结果界面
  const renderResult = () => {
    if (!result) return null;

    const { overall_score, dimension_scores, strengths, weaknesses, recommendations } = result;
    
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* 总分 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold mb-4">
              {overall_score}
            </div>
            <h2 className="text-2xl font-bold mb-1">面试完成</h2>
            <p className="text-gray-500">综合评分</p>
          </div>

          {/* 维度分数 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(dimension_scores || {}).map(([dim, score]) => (
              <div key={dim} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">{dim}</div>
                <div className="text-xl font-bold text-gray-800">{score}分</div>
              </div>
            ))}
          </div>

          {/* 优势和改进 */}
          <div className="space-y-4 mb-6">
            {strengths?.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-2">优势</h3>
                <ul className="list-disc list-inside text-green-700 text-sm">
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {weaknesses?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-2">待提升</h3>
                <ul className="list-disc list-inside text-red-700 text-sm">
                  {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
            >
              重新开始
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              导出报告
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 主渲染
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {renderHeader()}
      {renderProgress()}

      {status === StatusEnum.READY && renderReady()}

      {(status === StatusEnum.IN_PROGRESS ||
        status === StatusEnum.PAUSED ||
        status === StatusEnum.PROCESSING) && (
        <>
          {renderMessages()}
          {renderInput()}
        </>
      )}

      {status === StatusEnum.COMPLETED && renderResult()}

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3">
            <RotateCcw className="w-6 h-6 animate-spin text-blue-500" />
            <span>处理中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAgentInterview;
