/**
 * 多智能体面试组件
 *
 * 提供完整的多智能体面试界面
 */

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useMultiAgentInterview, InterviewStatus } from '../hooks/useMultiAgentInterview';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

// 智能体头像配置
const AGENT_AVATARS = {
  technical: { icon: '💻', color: 'bg-blue-500', name: '技术面试官' },
  system_design: { icon: '🏗️', color: 'bg-orange-500', name: '系统设计面试官' },
  behavioral: { icon: '🤝', color: 'bg-green-500', name: '行为面试官' },
  hr: { icon: '👔', color: 'bg-purple-500', name: 'HR面试官' },
};

/**
 * 多智能体面试组件
 */
const MultiAgentInterview = ({ candidateProfile, config, onComplete, onCancel }) => {
  // 使用面试 Hook
  const interview = useMultiAgentInterview({
    onMessage: (data) => {
      console.log('收到消息:', data);
    },
    onEvaluation: (data) => {
      console.log('收到评估:', data);
    },
    onAgentSwitch: (data) => {
      console.log('智能体切换:', data);
    },
    onComplete: (result) => {
      if (onComplete) onComplete(result);
    },
    onError: (error) => {
      console.error('面试错误:', error);
    },
  });

  // 本地状态
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [interview.messages]);

  // 创建会话
  useEffect(() => {
    if (candidateProfile && interview.status === InterviewStatus.IDLE) {
      interview.createSession(candidateProfile, config);
    }
  }, [candidateProfile, config]);

  // 处理开始面试
  const handleStart = async () => {
    if (!interview.sessionId) {
      console.warn('会话尚未创建，请稍候...');
      return;
    }
    if (interview.status === InterviewStatus.READY) {
      await interview.startInterview();
    }
  };

  // 处理开始演示模式（自问自答）
  const handleStartDemo = async () => {
    if (!interview.sessionId) {
      console.warn('会话尚未创建，请稍候...');
      return;
    }
    if (interview.status === InterviewStatus.READY) {
      await interview.startInterview(true, 3); // 启用演示模式，3秒延迟
    }
  };

  // 处理提交回答
  const handleSubmitAnswer = () => {
    if (!answer.trim()) return;
    interview.submitAnswer(answer);
    setAnswer('');
  };

  // 处理暂停/恢复
  const handlePauseResume = () => {
    if (interview.status === InterviewStatus.IN_PROGRESS) {
      interview.pauseInterview();
    } else if (interview.status === InterviewStatus.PAUSED) {
      interview.resumeInterview();
    }
  };

  // 处理完成面试
  const handleComplete = async () => {
    await interview.completeInterview();
    setShowResult(true);
  };

  // 处理取消面试
  const handleCancel = () => {
    interview.cancelInterview();
    if (onCancel) onCancel();
  };

  // 处理重新开始
  const handleReset = () => {
    interview.reset();
    setShowResult(false);
    if (candidateProfile) {
      interview.createSession(candidateProfile, config);
    }
  };

  // 获取当前智能体信息
  const currentAgentInfo = interview.currentAgent
    ? AGENT_AVATARS[interview.currentAgent.type] || { icon: '🤖', color: 'bg-gray-500', name: '面试官' }
    : null;

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    const statusConfig = {
      [InterviewStatus.IDLE]: { text: '准备中', color: 'text-gray-500', icon: Clock },
      [InterviewStatus.CREATING]: { text: '创建会话', color: 'text-blue-500', icon: RotateCcw },
      [InterviewStatus.READY]: { text: '就绪', color: 'text-green-500', icon: CheckCircle2 },
      [InterviewStatus.IN_PROGRESS]: { text: '面试中', color: 'text-blue-500', icon: MessageSquare },
      [InterviewStatus.PAUSED]: { text: '已暂停', color: 'text-yellow-500', icon: Pause },
      [InterviewStatus.PROCESSING]: { text: '处理中', color: 'text-blue-500', icon: RotateCcw },
      [InterviewStatus.COMPLETED]: { text: '已完成', color: 'text-green-500', icon: CheckCircle2 },
      [InterviewStatus.CANCELLED]: { text: '已取消', color: 'text-red-500', icon: AlertCircle },
      [InterviewStatus.ERROR]: { text: '错误', color: 'text-red-500', icon: AlertCircle },
    };

    const config = statusConfig[interview.status] || statusConfig[InterviewStatus.IDLE];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    );
  };

  // 渲染消息列表
  const renderMessages = () => {
    return interview.messages.map((message, index) => {
      switch (message.type) {
        case 'question':
          return (
            <div key={index} className="flex gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${currentAgentInfo?.color || 'bg-gray-500'}`}>
                <span className="text-xl">{currentAgentInfo?.icon || '🤖'}</span>
              </div>
              <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl rounded-tl-sm p-5 shadow-sm border border-blue-100 dark:border-blue-800">
                <div className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  {message.agent?.name || '面试官'}
                  <span className="text-xs px-2 py-0.5 bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full">面试官</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">{message.content}</div>
              </div>
            </div>
          );

        case 'answer':
          return (
            <div key={index} className="flex gap-4 mb-6 flex-row-reverse">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${message.isDemo ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'}`}>
                <User className="w-6 h-6 text-white" />
              </div>
              <div className={`flex-1 rounded-2xl rounded-tr-sm p-5 shadow-sm ${message.isDemo ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800' : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700'}`}>
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  候选人
                  {message.isDemo && (
                    <span className="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded-full font-medium">
                      自动回答
                    </span>
                  )}
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">{message.content}</div>
              </div>
            </div>
          );

        case 'evaluation':
          return (
            <div key={index} className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="font-medium text-yellow-900 dark:text-yellow-300 mb-2 flex items-center gap-2">
                  评估结果
                  {message.smart_analysis && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full">
                      AI深度分析
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{message.score}分</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{message.agent_name}</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-sm mb-2">{message.feedback}</div>
                {message.strengths?.length > 0 && (
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <span className="font-medium">优点:</span> {message.strengths.join(', ')}
                  </div>
                )}
                {message.weaknesses?.length > 0 && (
                  <div className="text-sm text-red-700 dark:text-red-400">
                    <span className="font-medium">改进:</span> {message.weaknesses.join(', ')}
                  </div>
                )}

                {/* 智能分析详情 */}
                {message.smart_analysis && (
                  <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">🤖 AI深度分析</div>

                    {/* 回答深度 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">回答深度:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`w-4 h-4 rounded-full ${
                              level <= message.smart_analysis.depth_value
                                ? 'bg-blue-500'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {message.smart_analysis.depth_level}
                      </span>
                    </div>

                    {/* 关键点 */}
                    {message.smart_analysis.key_points?.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">提及要点:</span>{' '}
                        {message.smart_analysis.key_points.join(', ')}
                      </div>
                    )}

                    {/* 缺失方面 */}
                    {message.smart_analysis.missing_aspects?.length > 0 && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                        <span className="font-medium">未涉及:</span>{' '}
                        {message.smart_analysis.missing_aspects.join(', ')}
                      </div>
                    )}

                    {/* 模糊区域 */}
                    {message.smart_analysis.vague_areas?.length > 0 && (
                      <div className="text-xs text-red-600 dark:text-red-400 mb-1">
                        <span className="font-medium">表述模糊:</span>{' '}
                        {message.smart_analysis.vague_areas.join('; ')}
                      </div>
                    )}

                    {/* 追问建议 */}
                    {message.smart_analysis.follow_up_suggestions?.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-medium">💡 追问建议:</span>
                        <ul className="mt-1 space-y-1">
                          {message.smart_analysis.follow_up_suggestions.map((suggestion, i) => (
                            <li key={i}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );

        case 'deep_follow_up':
          return (
            <div key={index} className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="font-medium text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-2">
                  <span>🤖 智能追问</span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full">
                    {message.agent}
                  </span>
                </div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400">{message.reason}</div>
              </div>
            </div>
          );

        case 'stream':
          return (
            <div key={index} className="flex gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${currentAgentInfo?.color || 'bg-gray-500'}`}>
                <span className="text-lg">{currentAgentInfo?.icon || '🤖'}</span>
              </div>
              <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.content}</div>
                {interview.isProcessing && index === interview.messages.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
                )}
              </div>
            </div>
          );

        default:
          return null;
      }
    });
  };

  // 渲染结果面板
  const renderResultPanel = () => {
    if (!interview.result) return null;

    const { overall_score, grade, dimension_scores, strengths, weaknesses, recommendations } = interview.result;

    // 准备雷达图数据
    const radarData = Object.entries(dimension_scores || {}).map(([key, value]) => ({
      dimension: key,
      score: value,
      fullMark: 100,
    }));

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          面试评估报告
        </h2>

        {/* 总体评分 */}
        <div className="flex items-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{overall_score}</div>
            <div className="text-gray-500 dark:text-gray-400">总体分数</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600 dark:text-green-400">{grade}</div>
            <div className="text-gray-500 dark:text-gray-400">等级</div>
          </div>
        </div>

        {/* 雷达图 */}
        {radarData.length > 0 && (
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="候选人"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 优势和劣势 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">优势</h3>
            <ul className="list-disc list-inside text-green-800 dark:text-green-400">
              {strengths?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">待提升</h3>
            <ul className="list-disc list-inside text-red-800 dark:text-red-400">
              {weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>

        {/* 建议 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">建议</h3>
          <ul className="list-disc list-inside text-blue-800 dark:text-blue-400">
            {recommendations?.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            导出报告
          </button>
        </div>
      </div>
    );
  };

  // 渲染进度面板
  const renderProgressPanel = () => {
    const progress = interview.progress || { current: 0, total: 5, percentage: 0 };
    const currentRound = progress.current || 0;
    const totalRounds = progress.total || 5;
    const percentage = progress.percentage || 0;

    // 智能体顺序
    const agentOrder = ['technical', 'system_design', 'behavioral', 'hr'];
    const currentAgentIndex = agentOrder.indexOf(interview.currentAgent?.type);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 shadow-sm border border-gray-200 dark:border-gray-700">
        {/* 进度条和状态信息 - 同一行 */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                面试进度 {currentRound}/{totalRounds} 轮
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {interview.duration || '00:00'} · 剩余{totalRounds - currentRound}轮
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 智能体进度 - 更紧凑 */}
        <div className="flex items-center justify-between px-2">
          {agentOrder.map((agentType, index) => {
            const agentInfo = AGENT_AVATARS[agentType];
            const isCompleted = index < currentAgentIndex;
            const isCurrent = index === currentAgentIndex;

            return (
              <div key={agentType} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : isCurrent
                      ? `${agentInfo.color} text-white ring-2 ring-blue-200 dark:ring-blue-900/50`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    agentInfo.icon
                  )}
                </div>
                <span
                  className={`text-[10px] mt-0.5 ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {isCurrent ? '进行中' : agentInfo.name.replace('面试官', '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 如果显示结果
  if (showResult) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {renderResultPanel()}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 头部 - 更紧凑 */}
      <div className="flex items-center justify-between py-3 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">多智能体面试</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {candidateProfile?.name || '未命名'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {renderStatusIndicator()}
          {currentAgentInfo && interview.status === InterviewStatus.IN_PROGRESS && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white ${currentAgentInfo.color}`}>
              <span className="text-sm">{currentAgentInfo.icon}</span>
              <span className="text-xs font-medium">
                {currentAgentInfo.name.replace('面试官', '')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 进度面板 - 只在面试进行中显示 */}
      {interview.status === InterviewStatus.IN_PROGRESS && (
        <div className="px-4">
          {renderProgressPanel()}
        </div>
      )}

      {/* 错误提示 */}
      {interview.error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 flex-shrink-0 mx-4">
          <AlertCircle className="w-5 h-5" />
          {interview.error.message}
        </div>
      )}

      {/* 创建会话中 */}
      {(interview.status === InterviewStatus.IDLE || interview.status === InterviewStatus.CREATING) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <RotateCcw className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">正在准备面试...</h2>
            <p className="text-gray-500 dark:text-gray-400">
              正在创建面试会话，请稍候
            </p>
          </div>
        </div>
      )}

      {/* 准备界面 */}
      {interview.status === InterviewStatus.READY && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">面试准备就绪</h2>
            <p className="text-gray-500 dark:text-gray-400">
              本次面试将由技术面试官、行为面试官和HR面试官轮流进行
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={handleStart}
                disabled={!interview.sessionId}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                开始面试
              </button>
              <button
                onClick={handleStartDemo}
                disabled={!interview.sessionId}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                title="演示模式：系统自动回答所有问题"
              >
                <Sparkles className="w-5 h-5" />
                演示模式（自问自答）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 面试界面 */}
      {(interview.status === InterviewStatus.IN_PROGRESS ||
        interview.status === InterviewStatus.PAUSED ||
        interview.status === InterviewStatus.PROCESSING) && (
        <div className="flex flex-col flex-1 min-h-0 px-4 py-3 gap-3">
          {/* 消息列表 - 自适应高度，独立滚动 */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-y-auto border border-gray-200 dark:border-gray-700 min-h-0">
            {interview.messages.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 py-12">
                等待第一个问题...
              </div>
            ) : (
              renderMessages()
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 - 固定在底部 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-3">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-inner'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isRecording ? '停止录音' : '开始录音'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                placeholder="输入你的回答..."
                disabled={interview.isProcessing || interview.status === InterviewStatus.PAUSED}
                className="flex-1 px-5 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-900 dark:text-white text-base transition-all duration-200"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!answer.trim() || interview.isProcessing || interview.status === InterviewStatus.PAUSED}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-400 flex items-center gap-2 font-medium shadow-lg shadow-blue-500/30 transition-all duration-200"
              >
                <Send className="w-5 h-5" />
                发送
              </button>
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all duration-200"
                >
                  {interview.status === InterviewStatus.PAUSED ? (
                    <><Play className="w-4 h-4" /> 继续</>
                  ) : (
                    <><Pause className="w-4 h-4" /> 暂停</>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-all duration-200"
                >
                  取消
                </button>
              </div>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-sm font-medium transition-all duration-200"
              >
                <StopCircle className="w-4 h-4" />
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {interview.isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
            <RotateCcw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-gray-900 dark:text-white">处理中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAgentInterview;
