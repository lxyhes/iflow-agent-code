/**
 * STAR法则回答训练器
 * 
 * 帮助用户用STAR法则（情境-任务-行动-结果）回答行为面试题
 * 这是大厂面试的核心考察点
 */

import React, { useState } from 'react';
import { Target, Lightbulb, CheckCircle2, AlertCircle, Sparkles, ChevronRight, RotateCcw, Crown, Loader2 } from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import InterviewMasterHelper from './InterviewMasterHelper';
import interviewAIService from '../services/interviewAIService';

const STARTrainer = ({ question, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    situation: '',
    task: '',
    action: '',
    result: ''
  });
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMasterHelper, setShowMasterHelper] = useState(false);

  const steps = [
    {
      key: 'situation',
      title: 'S - Situation（情境）',
      description: '描述当时的情境或背景',
      placeholder: '例如：在2023年Q2，我们团队负责开发一个新的电商支付系统，项目周期很紧，只有2个月时间...',
      tips: [
        '简明扼要地描述背景',
        '突出困难或挑战',
        '为后续的行动做铺垫',
        '控制在2-3句话'
      ]
    },
    {
      key: 'task',
      title: 'T - Task（任务）',
      description: '说明你的具体任务或目标',
      placeholder: '例如：作为后端负责人，我的任务是设计支付核心架构，确保系统能支持每秒10000笔交易...',
      tips: [
        '明确你的职责范围',
        '说明具体目标',
        '体现任务的重要性',
        '突出个人贡献点'
      ]
    },
    {
      key: 'action',
      title: 'A - Action（行动）',
      description: '详细描述你采取的行动',
      placeholder: '例如：我首先分析了现有系统的瓶颈，然后设计了分库分表方案。具体实施了以下措施：1）引入Redis缓存...',
      tips: [
        '使用"我"而不是"我们"',
        '具体描述你的行动',
        '体现技术深度',
        '展示解决问题的能力'
      ]
    },
    {
      key: 'result',
      title: 'R - Result（结果）',
      description: '说明最终的结果和收获',
      placeholder: '例如：最终系统按时上线，性能提升了300%，获得了团队优秀项目奖。我也从中学到了高并发系统设计的经验...',
      tips: [
        '用数据量化结果',
        '说明对公司的价值',
        '提及获得的认可',
        '总结个人成长'
      ]
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      analyzeAnswer();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (value) => {
    setAnswers({
      ...answers,
      [steps[currentStep].key]: value
    });
  };

  const analyzeAnswer = async () => {
    setIsAnalyzing(true);
    
    try {
      const fullAnswer = `${answers.situation}\n\n${answers.task}\n\n${answers.action}\n\n${answers.result}`;
      
      // 调用真实 AI 分析
      const result = await interviewAIService.analyzeSTARStory(fullAnswer, question);
      
      // 解析 AI 返回的分析结果
      const analysis = parseAIAnalysis(result.analysis, fullAnswer);
      
      setAnalysis(analysis);
      setShowAnalysis(true);
    } catch (error) {
      console.error('STAR 分析失败:', error);
      // 使用本地评分作为后备
      const fullAnswer = `${answers.situation}\n\n${answers.task}\n\n${answers.action}\n\n${answers.result}`;
      const scores = {
        situation: Math.min(100, answers.situation.length * 2),
        task: Math.min(100, answers.task.length * 2),
        action: Math.min(100, answers.action.length * 2),
        result: Math.min(100, answers.result.length * 2)
      };
      const totalScore = Math.round((scores.situation + scores.task + scores.action + scores.result) / 4);
      
      setAnalysis({
        scores,
        totalScore,
        fullAnswer,
        feedback: generateFeedback(scores),
        improvements: generateImprovements(scores, answers),
        aiAnalysis: 'AI 服务暂时不可用，使用本地评分。'
      });
      setShowAnalysis(true);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 解析 AI 返回的分析结果
  const parseAIAnalysis = (aiResponse, fullAnswer) => {
    // 尝试从 AI 响应中提取评分
    const scores = {
      situation: extractScore(aiResponse, 'Situation', '情境') || Math.min(100, answers.situation.length * 2),
      task: extractScore(aiResponse, 'Task', '任务') || Math.min(100, answers.task.length * 2),
      action: extractScore(aiResponse, 'Action', '行动') || Math.min(100, answers.action.length * 2),
      result: extractScore(aiResponse, 'Result', '结果') || Math.min(100, answers.result.length * 2)
    };
    
    const totalScore = Math.round((scores.situation + scores.task + scores.action + scores.result) / 4);
    
    return {
      scores,
      totalScore,
      fullAnswer,
      feedback: aiResponse,
      improvements: [],
      aiAnalysis: aiResponse
    };
  };
  
  // 从 AI 响应中提取分数
  const extractScore = (text, ...keywords) => {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:：]\\s*(\\d+)`, 'i');
      const match = text.match(regex);
      if (match) {
        return parseInt(match[1]) * 10; // 假设 AI 返回的是 1-10 分
      }
    }
    return null;
  };

  const generateFeedback = (scores) => {
    const feedbacks = [];
    if (scores.situation < 60) feedbacks.push('情境描述可以更具体一些，突出当时的挑战');
    if (scores.task < 60) feedbacks.push('任务描述需要更明确，体现你的职责');
    if (scores.action < 60) feedbacks.push('行动部分可以更详细，展示技术深度');
    if (scores.result < 60) feedbacks.push('结果需要用数据量化，体现价值');
    
    if (feedbacks.length === 0) {
      return '回答结构完整，符合STAR法则要求！';
    }
    return feedbacks.join('；');
  };

  const generateImprovements = (scores, answers) => {
    const improvements = [];
    
    if (!answers.situation.includes('时间') && !answers.situation.includes('当时')) {
      improvements.push('情境部分建议增加时间背景');
    }
    if (!answers.result.match(/\d+/)) {
      improvements.push('结果部分建议用数据量化，如提升了XX%、节省了XX时间');
    }
    if (answers.action.length < 50) {
      improvements.push('行动部分可以更详细，描述具体的技术方案');
    }
    
    return improvements.length > 0 ? improvements : ['回答很棒！继续保持！'];
  };

  const resetTrainer = () => {
    setCurrentStep(0);
    setAnswers({ situation: '', task: '', action: '', result: '' });
    setShowAnalysis(false);
    setAnalysis(null);
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">STAR法则训练器</h3>
              <p className="text-sm text-gray-500">行为面试题专项训练</p>
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

        {!showAnalysis ? (
          <div className="p-6">
            {/* 问题显示 */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-gray-800 dark:text-gray-200 font-medium">{question}</p>
            </div>

            {/* 进度指示器 */}
            <div className="flex items-center gap-2 mb-6">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      index === currentStep
                        ? 'bg-blue-600 text-white'
                        : index < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-1 mx-1 ${
                        index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* 当前步骤 */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {currentStepData.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {currentStepData.description}
              </p>

              {/* 输入框 */}
              <textarea
                value={answers[currentStepData.key]}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={currentStepData.placeholder}
                className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              {/* 提示 */}
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">写作提示</span>
                </div>
                <ul className="space-y-1">
                  {currentStepData.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                上一步
              </button>
              <button
                onClick={handleNext}
                disabled={!answers[currentStepData.key].trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {currentStep === steps.length - 1 ? '完成并分析' : '下一步'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* 分析结果 */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI 分析报告
              </h4>

              {/* 总分 */}
              <div className="flex items-center justify-center mb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${
                    analysis.totalScore >= 80 ? 'text-green-500' :
                    analysis.totalScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {analysis.totalScore}
                  </div>
                  <div className="text-gray-500">综合评分</div>
                </div>
              </div>

              {/* 各项得分 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.entries(analysis.scores).map(([key, score]) => (
                  <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {key === 'situation' ? '情境' :
                         key === 'task' ? '任务' :
                         key === 'action' ? '行动' : '结果'}
                      </span>
                      <span className={`font-semibold ${
                        score >= 80 ? 'text-green-500' :
                        score >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {score}分
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          score >= 80 ? 'bg-green-500' :
                          score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 反馈 */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">评价</span>
                </div>
                <p className="text-blue-700 dark:text-blue-300">{analysis.feedback}</p>
              </div>

              {/* 改进建议 */}
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">改进建议</span>
                </div>
                <ul className="space-y-1">
                  {analysis.improvements.map((improvement, index) => (
                    <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 完整答案 */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">你的完整回答</h5>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  <MarkdownRenderer>{analysis.fullAnswer}</MarkdownRenderer>
                </div>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={resetTrainer}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新练习
              </button>
              <button
                onClick={() => onComplete?.(analysis)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                完成训练
              </button>
            </div>
          </div>
        )}

        {/* 面试高手助手 */}
        <InterviewMasterHelper
          isOpen={showMasterHelper}
          onClose={() => setShowMasterHelper(false)}
          question={question}
          questionType="behavioral"
        />
      </div>
    </div>
  );
};

export default STARTrainer;
