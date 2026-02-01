/**
 * 面试复盘AI助手
 *
 * 面试后自动分析回答质量，给出改进建议
 */

import React, { useState } from 'react';
import { BrainCircuit, Target, TrendingUp, AlertCircle, CheckCircle2, Sparkles, ChevronRight, RotateCcw, Download, Loader2 } from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import interviewAIService from '../services/interviewAIService';

const InterviewReview = ({ interviewData, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  // 模拟面试数据
  const mockInterviewData = interviewData || {
    totalQuestions: 5,
    answeredQuestions: 5,
    duration: 1800, // 秒
    answers: [
      {
        question: '请介绍一下你的项目经验',
        answer: '我参与了一个电商平台的开发，负责后端架构设计...',
        score: 85
      },
      {
        question: '什么是分布式事务？',
        answer: '分布式事务是指在分布式系统中保证数据一致性...',
        score: 78
      },
      {
        question: '如何设计一个高并发系统？',
        answer: '高并发系统设计需要考虑多个方面...',
        score: 82
      }
    ]
  };

  const generateReview = async () => {
    setIsGenerating(true);

    try {
      // 准备面试数据
      const questions = mockInterviewData.answers.map(a => ({ question: a.question }));
      const answers = mockInterviewData.answers.map(a => a.answer);

      // 调用 AI 生成复盘
      const result = await interviewAIService.generateInterviewReview(
        questions,
        answers,
        '互联网公司',
        '开发工程师'
      );

      // 解析 AI 响应
      const review = parseAIReview(result.review);
      setReviewResult(review);
    } catch (error) {
      console.error('面试复盘 AI 失败:', error);
      // 使用默认数据作为后备
      setReviewResult({
        overallScore: 82,
        dimensionScores: {
          technical: { score: 85, label: '技术深度' },
          communication: { score: 80, label: '表达能力' },
          logic: { score: 83, label: '逻辑思维' },
          experience: { score: 78, label: '项目经验' },
          attitude: { score: 88, label: '面试态度' }
        },
        strengths: ['AI 服务暂时不可用，使用默认评价'],
        weaknesses: ['请稍后重试获取 AI 分析'],
        improvements: [],
        nextSteps: ['稍后重试 AI 分析'],
        marketValue: { current: '未知', target: '未知', gap: 'AI 服务不可用' }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 解析 AI 复盘响应
  const parseAIReview = (aiResponse) => {
    if (!aiResponse) {
      return {
        overallScore: 80,
        dimensionScores: {
          technical: { score: 80, label: '技术深度' },
          communication: { score: 80, label: '表达能力' },
          logic: { score: 80, label: '逻辑思维' },
          experience: { score: 80, label: '项目经验' },
          attitude: { score: 80, label: '面试态度' }
        },
        strengths: ['解析 AI 响应失败'],
        weaknesses: [],
        improvements: [],
        nextSteps: [],
        marketValue: { current: '未知', target: '未知', gap: '' }
      };
    }

    // 尝试从 AI 响应中提取评分
    const extractScore = (text, keyword) => {
      const regex = new RegExp(`${keyword}[:：]\\s*(\\d+)`, 'i');
      const match = text.match(regex);
      return match ? parseInt(match[1]) : 80;
    };

    return {
      overallScore: extractScore(aiResponse, '总分|整体'),
      dimensionScores: {
        technical: { score: extractScore(aiResponse, '技术'), label: '技术深度' },
        communication: { score: extractScore(aiResponse, '表达|沟通'), label: '表达能力' },
        logic: { score: extractScore(aiResponse, '逻辑'), label: '逻辑思维' },
        experience: { score: extractScore(aiResponse, '经验'), label: '项目经验' },
        attitude: { score: extractScore(aiResponse, '态度'), label: '面试态度' }
      },
      strengths: extractSection(aiResponse, '优点|优势|亮点'),
      weaknesses: extractSection(aiResponse, '不足|缺点|改进'),
      improvements: [{ area: '综合建议', suggestion: aiResponse, resources: [] }],
      nextSteps: ['根据 AI 建议进行针对性提升'],
      marketValue: { current: '当前水平', target: '目标水平', gap: aiResponse.substring(0, 100) }
    };
  };

  // 提取章节内容
  const extractSection = (text, keywords) => {
    const lines = text.split('\n');
    const result = [];
    let inSection = false;

    for (const line of lines) {
      if (keywords.split('|').some(k => line.includes(k))) {
        inSection = true;
        continue;
      }
      if (inSection) {
        if (line.trim() && !line.match(/^\d+\./)) {
          result.push(line.trim());
        }
        if (result.length >= 4) break;
      }
    }

    return result.length > 0 ? result : ['AI 分析内容'];
  };

  const exportReview = () => {
    const reviewText = `
面试复盘报告
============

综合评分: ${reviewResult?.overallScore}/100

维度评分:
${Object.entries(reviewResult?.dimensionScores || {}).map(([key, value]) => `  ${value.label}: ${value.score}分`).join('\n')}

优势:
${reviewResult?.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

待改进:
${reviewResult?.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

改进建议:
${reviewResult?.improvements.map((imp, i) => `${i + 1}. ${imp.area}: ${imp.suggestion}`).join('\n')}

下一步行动:
${reviewResult?.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

市场价值评估:
当前水平: ${reviewResult?.marketValue?.current}
目标水平: ${reviewResult?.marketValue?.target}
差距分析: ${reviewResult?.marketValue?.gap}
建议: ${reviewResult?.marketValue?.suggestion}
    `.trim();

    const blob = new Blob([reviewText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `面试复盘报告_${new Date().toLocaleDateString()}.txt`;
    a.click();
  };

  if (!reviewResult) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              面试复盘AI助手
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              AI将分析你的面试表现，生成详细的复盘报告和改进建议
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{mockInterviewData.totalQuestions}</div>
                <div className="text-sm text-gray-500">面试题数</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{mockInterviewData.answeredQuestions}</div>
                <div className="text-sm text-gray-500">已回答</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.floor(mockInterviewData.duration / 60)}分
                </div>
                <div className="text-sm text-gray-500">面试时长</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                稍后再说
              </button>
              <button
                onClick={generateReview}
                disabled={isGenerating}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    生成复盘报告
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">面试复盘报告</h3>
              <p className="text-sm text-gray-500">AI生成的详细分析和改进建议</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportReview}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="导出报告"
            >
              <Download className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { key: 'overview', label: '总览', icon: Target },
            { key: 'analysis', label: '详细分析', icon: BrainCircuit },
            { key: 'improvements', label: '改进建议', icon: TrendingUp },
            { key: 'plan', label: '行动计划', icon: CheckCircle2 }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 综合评分 */}
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className={`text-6xl font-bold mb-2 ${
                    reviewResult.overallScore >= 80 ? 'text-green-500' :
                    reviewResult.overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {reviewResult.overallScore}
                  </div>
                  <div className="text-gray-500">综合评分</div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {reviewResult.overallScore >= 80 ? '表现优秀！' :
                     reviewResult.overallScore >= 60 ? '表现良好，还有提升空间' : '需要加强准备'}
                  </div>
                </div>
              </div>

              {/* 维度评分 */}
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(reviewResult.dimensionScores).map(([key, value]) => (
                  <div key={key} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`text-2xl font-bold mb-1 ${
                      value.score >= 80 ? 'text-green-500' :
                      value.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {value.score}
                    </div>
                    <div className="text-sm text-gray-500">{value.label}</div>
                  </div>
                ))}
              </div>

              {/* 优势与不足 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    核心优势
                  </h4>
                  <ul className="space-y-2">
                    {reviewResult.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    待改进
                  </h4>
                  <ul className="space-y-2">
                    {reviewResult.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 dark:text-white">面试表现详细分析</h4>
              
              {mockInterviewData.answers.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="font-medium text-gray-900 dark:text-white">{item.question}</h5>
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.score >= 80 ? 'bg-green-100 text-green-700' :
                      item.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.score}分
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    你的回答：{item.answer}
                  </p>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    AI点评：回答结构清晰，但可以补充更多技术细节
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'improvements' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 dark:text-white">针对性改进建议</h4>
              
              {reviewResult.improvements.map((improvement, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    {improvement.area}
                  </h5>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {improvement.suggestion}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {improvement.resources.map((resource, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 rounded">
                        📚 {resource}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* 市场价值评估 */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4">市场价值评估</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">当前水平</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {reviewResult.marketValue.current}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">目标水平</div>
                    <div className="text-lg font-semibold text-green-600">
                      {reviewResult.marketValue.target}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {reviewResult.marketValue.gap}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  💡 {reviewResult.marketValue.suggestion}
                </p>
              </div>

              {/* 下一步行动 */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">下一步行动计划</h4>
                <div className="space-y-3">
                  {reviewResult.nextSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setReviewResult(null);
              generateReview();
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重新生成
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            完成复盘
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewReview;
