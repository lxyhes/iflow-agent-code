/**
 * FormattingChecker - AI智能排版检查组件
 *
 * 使用AI实时分析简历排版和格式
 */

import React, { useState, useEffect } from 'react';
import {
  Layout,
  X,
  Check,
  AlertCircle,
  Type,
  Palette,
  AlignLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wand2,
  CheckCircle,
  Info
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import FunLoadingScreen from './FunLoadingScreen';

const FormattingChecker = ({ resume, onApplyFixes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [checkResults, setCheckResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);

  useEffect(() => {
    if (isOpen && !checkResults) {
      performLayoutCheck();
    }
  }, [isOpen]);

  const performLayoutCheck = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await resumeApi.layoutCheck(resume.id);
      if (response.success) {
        setCheckResults(response.data);
      } else {
        setError(response.error || '排版检查失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('排版检查错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (index) => {
    setExpandedCategories(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
      >
        <Layout className="w-4 h-4" />
        <span>排版检查</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI 排版检查
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                基于AI实时分析格式和排版
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={performLayoutCheck}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
              title="重新分析"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <FunLoadingScreen
              title="AI 正在分析排版..."
              subtitle="评估视觉层次、格式一致性和可读性"
              progress={50}
            />
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={performLayoutCheck}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新分析
              </button>
            </div>
          ) : checkResults ? (
            <div className="p-6">
              {/* 总体评分 */}
              <div className="flex items-center justify-center mb-8">
                <div className="text-center">
                  <div className="relative inline-block">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(checkResults.overall_score / 100) * 439.82} 439.82`}
                        className={checkResults.overall_score >= 80 ? 'text-green-500' : checkResults.overall_score >= 60 ? 'text-yellow-500' : 'text-red-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold ${getScoreColor(checkResults.overall_score)}`}>
                        {checkResults.overall_score}
                      </span>
                      <span className="text-sm text-gray-500">排版分</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      checkResults.layout_level === '专业' ? 'bg-green-100 text-green-700' :
                      checkResults.layout_level === '良好' ? 'bg-blue-100 text-blue-700' :
                      checkResults.layout_level === '一般' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {checkResults.layout_level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    {checkResults.summary}
                  </p>
                </div>
              </div>

              {/* 各维度评分 */}
              {checkResults.categories?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {checkResults.categories.map((category, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            category.status === '优秀' ? 'bg-green-100 text-green-700' :
                            category.status === '良好' ? 'bg-blue-100 text-blue-700' :
                            category.status === '一般' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {category.status}
                          </span>
                          <span className={`font-bold ${getScoreColor(category.score)}`}>
                            {category.score}分
                          </span>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getScoreBg(category.score)}`}
                          style={{ width: `${category.score}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {category.comments}
                      </p>

                      {/* 问题和建议 */}
                      {category.issues?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {category.issues.map((issue, idx) => (
                            <p key={idx} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {issue}
                            </p>
                          ))}
                        </div>
                      )}

                      {category.suggestions?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {category.suggestions.slice(0, 2).map((suggestion, idx) => (
                            <p key={idx} className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              {suggestion}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 格式问题 */}
              {checkResults.format_issues?.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4" />
                    格式问题 ({checkResults.format_issues.length}个)
                  </h4>
                  <div className="space-y-3">
                    {checkResults.format_issues.map((issue, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            issue.severity === '高' ? 'bg-red-100 text-red-700' :
                            issue.severity === '中' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="text-xs text-gray-500">{issue.type}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{issue.location}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          {issue.description}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          建议：{issue.fix_suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 设计建议 */}
              {checkResults.design_suggestions?.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4" />
                    设计优化建议
                  </h4>
                  <div className="space-y-3">
                    {checkResults.design_suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {suggestion.area}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">当前：</span>
                            <span className="text-gray-700 dark:text-gray-300">{suggestion.current}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">建议：</span>
                            <span className="text-green-600 dark:text-green-400">{suggestion.recommended}</span>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          好处：{suggestion.benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ATS兼容性 */}
              {checkResults.ats_compatibility && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-medium text-purple-800 dark:text-purple-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    ATS 兼容性
                  </h4>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-2xl font-bold text-purple-600">
                      {checkResults.ats_compatibility.score}分
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBg(checkResults.ats_compatibility.score)}`}
                          style={{ width: `${checkResults.ats_compatibility.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {checkResults.ats_compatibility.issues?.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {checkResults.ats_compatibility.issues.map((issue, idx) => (
                        <p key={idx} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {issue}
                        </p>
                      ))}
                    </div>
                  )}
                  {checkResults.ats_compatibility.recommendations?.length > 0 && (
                    <div className="space-y-1">
                      {checkResults.ats_compatibility.recommendations.map((rec, idx) => (
                        <p key={idx} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {rec}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FormattingChecker;
