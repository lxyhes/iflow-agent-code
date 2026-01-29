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
} from 'lucide-react';
import { useMultiAgentInterview, InterviewStatus } from '../hooks/useMultiAgentInterview';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

// 智能体头像配置
const AGENT_AVATARS = {
  technical: { icon: '💻', color: 'bg-blue-500', name: '技术面试官' },
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
            <div key={index} className="flex gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${currentAgentInfo?.color || 'bg-gray-500'}`}>
                <span className="text-lg">{currentAgentInfo?.icon || '🤖'}</span>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg p-4">
                <div className="font-medium text-blue-900 mb-1">
                  {message.agent?.name || '面试官'}
                </div>
                <div className="text-gray-700">{message.content}</div>
              </div>
            </div>
          );

        case 'answer':
          return (
            <div key={index} className="flex gap-3 mb-4 flex-row-reverse">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${message.isDemo ? 'bg-purple-200' : 'bg-gray-200'}`}>
                <User className={`w-5 h-5 ${message.isDemo ? 'text-purple-600' : 'text-gray-600'}`} />
              </div>
              <div className={`flex-1 rounded-lg p-4 ${message.isDemo ? 'bg-purple-50 border border-purple-200' : 'bg-gray-100'}`}>
                <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                  候选人
                  {message.isDemo && (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      自动回答
                    </span>
                  )}
                </div>
                <div className="text-gray-700">{message.content}</div>
              </div>
            </div>
          );

        case 'evaluation':
          return (
            <div key={index} className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                  评估结果
                  {message.smart_analysis && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      AI深度分析
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-2xl font-bold text-yellow-700">{message.score}分</span>
                  <span className="text-sm text-gray-600">{message.agent_name}</span>
                </div>
                <div className="text-gray-700 text-sm mb-2">{message.feedback}</div>
                {message.strengths?.length > 0 && (
                  <div className="text-sm text-green-700">
                    <span className="font-medium">优点:</span> {message.strengths.join(', ')}
                  </div>
                )}
                {message.weaknesses?.length > 0 && (
                  <div className="text-sm text-red-700">
                    <span className="font-medium">改进:</span> {message.weaknesses.join(', ')}
                  </div>
                )}

                {/* 智能分析详情 */}
                {message.smart_analysis && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <div className="text-sm font-medium text-yellow-800 mb-2">🤖 AI深度分析</div>

                    {/* 回答深度 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-600">回答深度:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`w-4 h-4 rounded-full ${
                              level <= message.smart_analysis.depth_value
                                ? 'bg-blue-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-blue-600 font-medium">
                        {message.smart_analysis.depth_level}
                      </span>
                    </div>

                    {/* 关键点 */}
                    {message.smart_analysis.key_points?.length > 0 && (
                      <div className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">提及要点:</span>{' '}
                        {message.smart_analysis.key_points.join(', ')}
                      </div>
                    )}

                    {/* 缺失方面 */}
                    {message.smart_analysis.missing_aspects?.length > 0 && (
                      <div className="text-xs text-orange-600 mb-1">
                        <span className="font-medium">未涉及:</span>{' '}
                        {message.smart_analysis.missing_aspects.join(', ')}
                      </div>
                    )}

                    {/* 模糊区域 */}
                    {message.smart_analysis.vague_areas?.length > 0 && (
                      <div className="text-xs text-red-600 mb-1">
                        <span className="font-medium">表述模糊:</span>{' '}
                        {message.smart_analysis.vague_areas.join('; ')}
                      </div>
                    )}

                    {/* 追问建议 */}
                    {message.smart_analysis.follow_up_suggestions?.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
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
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="font-medium text-indigo-900 mb-1 flex items-center gap-2">
                  <span>🤖 智能追问</span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                    {message.agent}
                  </span>
                </div>
                <div className="text-xs text-indigo-600">{message.reason}</div>
              </div>
            </div>
          );

        case 'stream':
          return (
            <div key={index} className="flex gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${currentAgentInfo?.color || 'bg-gray-500'}`}>
                <span className="text-lg">{currentAgentInfo?.icon || '🤖'}</span>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg p-4">
                <div className="text-gray-700 whitespace-pre-wrap">{message.content}</div>
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          面试评估报告
        </h2>

        {/* 总体评分 */}
        <div className="flex items-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600">{overall_score}</div>
            <div className="text-gray-500">总体分数</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600">{grade}</div>
            <div className="text-gray-500">等级</div>
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
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">优势</h3>
            <ul className="list-disc list-inside text-green-800">
              {strengths?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">待提升</h3>
            <ul className="list-disc list-inside text-red-800">
              {weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>

        {/* 建议 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">建议</h3>
          <ul className="list-disc list-inside text-blue-800">
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
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            导出报告
          </button>
        </div>
      </div>
    );
  };

  // 如果显示结果
  if (showResult) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {renderResultPanel()}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">多智能体面试</h1>
          <p className="text-gray-500">
            候选人: {candidateProfile?.name || '未命名'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {renderStatusIndicator()}
          {currentAgentInfo && interview.status === InterviewStatus.IN_PROGRESS && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
              <span className="text-lg">{currentAgentInfo.icon}</span>
              <span className="text-sm font-medium text-blue-800">
                {currentAgentInfo.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {interview.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {interview.error.message}
        </div>
      )}

      {/* 创建会话中 */}
      {(interview.status === InterviewStatus.IDLE || interview.status === InterviewStatus.CREATING) && (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <RotateCcw className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2">正在准备面试...</h2>
            <p className="text-gray-500">
              正在创建面试会话，请稍候
            </p>
          </div>
        </div>
      )}

      {/* 准备界面 */}
      {interview.status === InterviewStatus.READY && (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">面试准备就绪</h2>
            <p className="text-gray-500">
              本次面试将由技术面试官、行为面试官和HR面试官轮流进行
            </p>
          </div>
          <div className="flex gap-4 justify-center">
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
      )}

      {/* 面试界面 */}
      {(interview.status === InterviewStatus.IN_PROGRESS ||
        interview.status === InterviewStatus.PAUSED ||
        interview.status === InterviewStatus.PROCESSING) && (
        <>
          {/* 消息列表 */}
          <div className="bg-white rounded-lg shadow mb-4 p-4 h-96 overflow-y-auto">
            {interview.messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                等待第一个问题...
              </div>
            ) : (
              renderMessages()
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`p-2 rounded-lg ${
                  isRecording ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
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
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!answer.trim() || interview.isProcessing || interview.status === InterviewStatus.PAUSED}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                发送
              </button>
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-between mt-4 pt-4 border-t">
              <div className="flex gap-2">
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  {interview.status === InterviewStatus.PAUSED ? (
                    <><Play className="w-4 h-4" /> 继续</>
                  ) : (
                    <><Pause className="w-4 h-4" /> 暂停</>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  取消
                </button>
              </div>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                完成面试
              </button>
            </div>
          </div>
        </>
      )}

      {/* 加载状态 */}
      {interview.isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <RotateCcw className="w-6 h-6 animate-spin text-blue-600" />
            <span>处理中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAgentInterview;
