/**
 * ResumeScorePanel - 简历智能评分面板
 *
 * 使用 AI 对简历进行深度分析和评分，支持一键重写
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Brain,
  Briefcase,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Wand2,
  Save,
  X,
  ArrowRight
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import FunLoadingScreen from './FunLoadingScreen';

const ResumeScorePanel = ({ resume, onResumeUpdate }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriting, setRewriting] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);

  useEffect(() => {
    performAIAnalysis();
  }, [resume.id]);

  const performAIAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await resumeApi.aiAnalyzeResume(resume.id);
      if (response.success) {
        setAiAnalysis(response.data);
      } else {
        setError(response.error || 'AI 分析失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('AI 分析错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    setRewriting(true);
    setError(null);

    try {
      const response = await resumeApi.rewriteResume(resume.id);
      if (response.success) {
        setRewriteResult(response.data);
        setShowRewriteModal(true);
      } else {
        setError(response.error || 'AI 重写失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('AI 重写错误:', err);
    } finally {
      setRewriting(false);
    }
  };

  const applyRewrite = async () => {
    if (!rewriteResult) return;

    // 构建更新后的简历数据
    const updatedResume = {
      ...resume,
      personal_info: {
        ...resume.personal_info,
        summary: rewriteResult.personal_info?.summary || resume.personal_info?.summary
      },
      work_experience: resume.work_experience?.map((exp, idx) => {
        const rewritten = rewriteResult.work_experience?.find(r => r.id === exp.id);
        if (rewritten) {
          return {
            ...exp,
            description: rewritten.description || exp.description,
            achievements: rewritten.achievements || exp.achievements
          };
        }
        return exp;
      }),
      skills: rewriteResult.skills || resume.skills
    };

    // 调用父组件的更新方法
    if (onResumeUpdate) {
      onResumeUpdate(updatedResume);
    }

    setShowRewriteModal(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLevelColor = (level) => {
    if (level?.includes('优秀')) return 'text-green-600 bg-green-100';
    if (level?.includes('良好')) return 'text-blue-600 bg-blue-100';
    if (level?.includes('一般')) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <FunLoadingScreen
        title="AI 正在深度分析简历..."
        subtitle="利用这段时间学习一些简历技巧"
        progress={30}
      />
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={performAIAnalysis}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新分析
          </button>
        </div>
      </div>
    );
  }

  if (!aiAnalysis) {
    return null;
  }

  // 重写时的 loading 状态
  if (rewriting) {
    return (
      <FunLoadingScreen
        title="AI 正在优化您的简历..."
        subtitle="根据诊断报告重写专业表达"
        progress={60}
      />
    );
  }

  const assessment = aiAnalysis.overall_assessment || {};
  const score = assessment.score || 0;

  return (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI 深度分析
            </h3>
          </div>
          <button
            onClick={performAIAnalysis}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
            title="重新分析"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-8">
          {/* 总分圆环 */}
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(score / 100) * 351.86} 351.86`}
                className={getScoreColor(score)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>

          {/* 评分解读 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(assessment.level)}`}>
                {assessment.level || '待评估'}
              </span>
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-4">
              {assessment.summary || '暂无评价'}
            </p>
            {/* 一键重写按钮 */}
            <button
              onClick={handleRewrite}
              disabled={rewriting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className={`w-4 h-4 ${rewriting ? 'animate-spin' : ''}`} />
              {rewriting ? 'AI 正在重写...' : '一键优化简历'}
            </button>
          </div>
        </div>
      </div>

      {/* 优势与不足 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 优势 */}
        {aiAnalysis.strengths?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              简历亮点
            </h4>
            <ul className="space-y-3">
              {aiAnalysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 不足 */}
        {aiAnalysis.weaknesses?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              待改进
            </h4>
            <ul className="space-y-3">
              {aiAnalysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 内容分析 */}
      {aiAnalysis.content_analysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            内容质量分析
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(aiAnalysis.content_analysis).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {key === 'completeness' ? '完整性' :
                   key === 'clarity' ? '清晰度' :
                   key === 'professionalism' ? '专业度' :
                   key === 'impact' ? '影响力' : key}
                </p>
                <p className="text-sm text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {aiAnalysis.optimization_suggestions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI 优化建议
          </h4>
          <div className="space-y-4">
            {aiAnalysis.optimization_suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  suggestion.priority === '高'
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10' :
                  suggestion.priority === '中'
                    ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10' :
                    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    suggestion.priority === '高' ? 'bg-red-100 text-red-700' :
                    suggestion.priority === '中' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {suggestion.priority}优先级
                  </span>
                  <span className="text-xs text-gray-500">{suggestion.category}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {suggestion.issue}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  建议：{suggestion.suggestion}
                </p>
                {suggestion.example && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 p-2 rounded">
                    示例：{suggestion.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ATS 分析 */}
      {aiAnalysis.ats_analysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ATS 兼容性分析
          </h4>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold text-blue-600">
              {aiAnalysis.ats_analysis.score}分
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreBg(aiAnalysis.ats_analysis.score)}`}
                  style={{ width: `${aiAnalysis.ats_analysis.score}%` }}
                />
              </div>
            </div>
          </div>
          {aiAnalysis.ats_analysis.keywords_present?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">已包含关键词：</p>
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.ats_analysis.keywords_present.map((kw, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          {aiAnalysis.ats_analysis.keywords_missing?.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">建议添加关键词：</p>
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.ats_analysis.keywords_missing.map((kw, idx) => (
                  <span key={idx} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 行业对比 */}
      {aiAnalysis.industry_comparison && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            行业对比
          </h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {aiAnalysis.industry_comparison.comparison}
          </p>
          {aiAnalysis.industry_comparison.competitive_advantages?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">竞争优势：</p>
              <ul className="space-y-1">
                {aiAnalysis.industry_comparison.competitive_advantages.map((adv, idx) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {adv}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 求职建议 */}
      {aiAnalysis.job_target_analysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            求职建议
          </h4>
          <div className="space-y-4">
            {aiAnalysis.job_target_analysis.suitable_positions?.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">适合的职位：</p>
                <div className="flex flex-wrap gap-2">
                  {aiAnalysis.job_target_analysis.suitable_positions.map((pos, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {aiAnalysis.job_target_analysis.career_direction && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">职业发展方向：</p>
                <p className="text-sm text-gray-900 dark:text-white">{aiAnalysis.job_target_analysis.career_direction}</p>
              </div>
            )}
            {aiAnalysis.job_target_analysis.salary_expectation && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  薪资建议：{aiAnalysis.job_target_analysis.salary_expectation}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 行动计划 */}
      {aiAnalysis.action_plan?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            改进行动计划
          </h4>
          <div className="space-y-3">
            {aiAnalysis.action_plan.map((action, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 重写结果模态框 */}
      {showRewriteModal && rewriteResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI 简历优化结果
                </h3>
              </div>
              <button
                onClick={() => setShowRewriteModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 重写说明 */}
              {rewriteResult.rewrite_summary && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                    优化说明
                  </h4>
                  <p className="text-purple-800 dark:text-purple-200">
                    {rewriteResult.rewrite_summary}
                  </p>
                </div>
              )}

              {/* 改进点 */}
              {rewriteResult.improvements?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    主要改进
                  </h4>
                  <ul className="space-y-2">
                    {rewriteResult.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 前后对比 */}
              {rewriteResult.before_after_comparison && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    优化对比
                  </h4>

                  {/* 个人简介对比 */}
                  {rewriteResult.before_after_comparison.summary_before && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">原个人简介</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {rewriteResult.before_after_comparison.summary_before}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-green-600 mb-2">优化后</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {rewriteResult.before_after_comparison.summary_after}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 工作经历对比 */}
                  {rewriteResult.before_after_comparison.experience_example_before && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">原工作描述</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {rewriteResult.before_after_comparison.experience_example_before}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-green-600 mb-2">优化后</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {rewriteResult.before_after_comparison.experience_example_after}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 已解决的问题 */}
              {rewriteResult.issues_resolved?.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    已解决的诊断问题 ({rewriteResult.issues_resolved.length}个)
                  </h4>
                  <ul className="space-y-2">
                    {rewriteResult.issues_resolved.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                        <span className="w-5 h-5 rounded-full bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 flex items-center justify-center text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 优化后的完整内容预览 */}
              {rewriteResult.personal_info?.summary && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    新的个人简介
                  </h4>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {rewriteResult.personal_info.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* 工作经历优化预览 */}
              {rewriteResult.work_experience?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    工作经历优化预览
                  </h4>
                  <div className="space-y-4">
                    {rewriteResult.work_experience.slice(0, 2).map((exp, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">{exp.company}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-600 dark:text-gray-400">{exp.position}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{exp.description}</p>
                        {exp.achievements?.length > 0 && (
                          <ul className="space-y-1">
                            {exp.achievements.map((achievement, aidx) => (
                              <li key={aidx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-blue-500" />
                                {achievement}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                    {rewriteResult.work_experience.length > 2 && (
                      <p className="text-sm text-gray-500 text-center">
                        还有 {rewriteResult.work_experience.length - 2} 段工作经历已优化...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={applyRewrite}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  应用优化
                </button>
                <button
                  onClick={() => setShowRewriteModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeScorePanel;
