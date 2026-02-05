/**
 * ResumeHealthDashboard - AI简历健康度仪表盘
 *
 * 使用AI实时分析简历健康度
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  FileText,
  BarChart3,
  Type,
  Calendar,
  Award,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import FunLoadingScreen from './FunLoadingScreen';

const ResumeHealthDashboard = ({ resume, onClose, onOptimize }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    performHealthCheck();
  }, [resume.id]);

  const performHealthCheck = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await resumeApi.healthCheck(resume.id);
      if (response.success) {
        setHealthData(response.data);
      } else {
        setError(response.error || '健康度检查失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('健康度检查错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!healthData) return;
    
    setOptimizing(true);
    try {
      // 调用重写API，传入健康分析数据
      const response = await resumeApi.rewriteResume(resume.id, healthData);
      if (response.success) {
        if (onOptimize) {
          onOptimize(response.data);
        }
        onClose();
      } else {
        alert('优化失败：' + (response.error || '未知错误'));
      }
    } catch (err) {
      console.error('优化错误:', err);
      alert('优化失败，请重试');
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full">
          <FunLoadingScreen
            title="AI 正在分析简历健康度..."
            subtitle="评估内容完整性、专业度和竞争力"
            progress={40}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={performHealthCheck}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新分析
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const scoreCategories = healthData.dimensions || [];
  const totalScore = healthData.overall_health || 0;

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '优秀':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case '良好':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case '一般':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      case '需改进':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI 简历健康度分析
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                基于AI实时评估
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
              {optimizing ? 'AI优化中...' : '根据分析优化'}
            </button>
            <button
              onClick={performHealthCheck}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              title="重新分析"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
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
                    strokeDasharray={`${(totalScore / 100) * 439.82} 439.82`}
                    className={totalScore >= 80 ? 'text-green-500' : totalScore >= 60 ? 'text-yellow-500' : 'text-red-500'}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${
                    totalScore >= 80 ? 'text-green-600' :
                    totalScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {totalScore}
                  </span>
                  <span className="text-sm text-gray-500">健康度</span>
                </div>
              </div>
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  healthData.health_level === '优秀' ? 'bg-green-100 text-green-700' :
                  healthData.health_level === '良好' ? 'bg-blue-100 text-blue-700' :
                  healthData.health_level === '一般' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {healthData.health_level}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                {healthData.summary}
              </p>
            </div>
          </div>

          {/* 各维度评分 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {scoreCategories.map((category, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(category.status)}
                    <span className={`font-bold ${
                      category.score >= 80 ? 'text-green-600' :
                      category.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {category.score}分
                    </span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${category.score}%`,
                      backgroundColor: getScoreColor(category.score)
                    }}
                  />
                </div>

                {/* 问题和建议 */}
                {category.issues?.length > 0 && (
                  <div className="mt-3 space-y-1">
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
                        <Lightbulb className="w-3 h-3" />
                        {suggestion}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 关键问题 */}
          {healthData.critical_issues?.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" />
                关键问题
              </h4>
              <div className="space-y-3">
                {healthData.critical_issues.map((issue, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        issue.severity === '高' ? 'bg-red-100 text-red-700' :
                        issue.severity === '中' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {issue.severity}优先级
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {issue.issue}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      影响：{issue.impact}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      解决方案：{issue.solution}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快速改进 */}
          {healthData.quick_wins?.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4" />
                快速改进项目
              </h4>
              <ul className="space-y-2">
                {healthData.quick_wins.map((win, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300"
                  >
                    <span className="font-bold">{index + 1}.</span>
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 行业对比 */}
          {healthData.industry_benchmark && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4" />
                行业对比
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                您的简历超过了 {healthData.industry_benchmark.percentile}% 的同行
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {healthData.industry_benchmark.comparison}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeHealthDashboard;
