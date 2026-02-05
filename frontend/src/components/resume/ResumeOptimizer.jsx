/**
 * ResumeOptimizer - 简历AI优化组件
 * 
 * 提供AI驱动的简历优化建议
 */

import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Loader2, CheckCircle, AlertCircle, Lightbulb, Target } from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';

const ResumeOptimizer = ({ resume, onBack }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    setOptimizing(true);
    setError(null);
    try {
      const response = await resumeApi.optimizeResume(resume.id, jobDescription || null);
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || '优化失败');
      }
    } catch (err) {
      setError('请求失败，请稍后重试');
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              AI简历优化
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {resume.name}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {!result ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  AI简历优化助手
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  输入目标职位描述，AI将为您提供个性化的简历优化建议
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    目标职位描述（可选）
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={8}
                    placeholder="粘贴您目标职位的职位描述，AI将根据职位要求提供针对性的优化建议..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      开始优化
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  如果不输入职位描述，AI将提供通用的简历优化建议
                </p>
              </div>
            </div>
          ) : (
            <OptimizationResult result={result} onBack={() => setResult(null)} />
          )}
        </div>
      </div>
    </div>
  );
};

// 优化结果展示组件
const OptimizationResult = ({ result, onBack }) => {
  if (result.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">分析失败</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{result.error}</p>
          
          {/* 显示原始响应用于调试 */}
          {result.raw_response && (
            <div className="mt-4 text-left">
              <p className="text-sm text-gray-500 mb-2">AI原始响应：</p>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-40 overflow-auto">
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {result.raw_response}
                </pre>
              </div>
            </div>
          )}
          
          <button
            onClick={onBack}
            className="mt-6 px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            返回重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(result.overall_score / 100) * 251.2} 251.2`}
                className={`${
                  result.overall_score >= 80 ? 'text-green-500' :
                  result.overall_score >= 60 ? 'text-yellow-500' : 'text-red-500'
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{result.overall_score}</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">简历评分</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {result.overall_score >= 80 ? '优秀的简历！继续保持' :
               result.overall_score >= 60 ? '良好的简历，还有提升空间' : '简历需要改进'}
            </p>
          </div>
        </div>
      </div>

      {/* 优化建议 */}
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            总体建议
          </h3>
          <ul className="space-y-3">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 个人简介改进 */}
      {result.summary_improvements && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            个人简介优化
          </h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{result.summary_improvements}</p>
          </div>
        </div>
      )}

      {/* 工作经历改进 */}
      {result.experience_improvements && result.experience_improvements.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">工作经历优化</h3>
          <div className="space-y-4">
            {result.experience_improvements.map((exp, index) => (
              <div key={index} className="border-l-4 border-purple-400 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">{exp.company}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{exp.suggestions}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能建议 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {result.skills_to_add && result.skills_to_add.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">建议添加的技能</h3>
            <div className="flex flex-wrap gap-2">
              {result.skills_to_add.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.skills_to_emphasize && result.skills_to_emphasize.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">需要重点突出</h3>
            <div className="flex flex-wrap gap-2">
              {result.skills_to_emphasize.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 关键词建议 */}
      {result.keywords_to_include && result.keywords_to_include.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">推荐关键词</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            在简历中包含这些关键词可以提高通过ATS系统的概率
          </p>
          <div className="flex flex-wrap gap-2">
            {result.keywords_to_include.map((keyword, index) => (
              <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 原始响应 */}
      {result.raw_response && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">AI原始响应</h3>
          <pre className="text-xs text-gray-500 dark:text-gray-500 whitespace-pre-wrap overflow-auto">
            {result.raw_response}
          </pre>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          返回重新分析
        </button>
      </div>
    </div>
  );
};

export default ResumeOptimizer;
