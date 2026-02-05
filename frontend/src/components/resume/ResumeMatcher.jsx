/**
 * ResumeMatcher - 简历职位匹配分析组件
 * 
 * 分析简历与目标职位的匹配度
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, Target, Loader2, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Zap, Briefcase, Award
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';

const ResumeMatcher = ({ resume, onBack }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('请输入职位描述');
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const response = await resumeApi.matchJob(resume.id, jobDescription);
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || '分析失败');
      }
    } catch (err) {
      setError('请求失败，请稍后重试');
      console.error(err);
    } finally {
      setAnalyzing(false);
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
              <Target className="w-6 h-6 text-green-600" />
              职位匹配分析
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
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  简历职位匹配分析
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  AI将分析您的简历与目标职位的匹配程度，并提供改进建议
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    目标职位描述 *
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={10}
                    placeholder="粘贴完整的职位描述，包括岗位职责、任职要求、技能要求等..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI分析中...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" />
                      开始匹配分析
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <MatchResult result={result} onBack={() => setResult(null)} />
          )}
        </div>
      </div>
    </div>
  );
};

// 匹配结果展示组件
const MatchResult = ({ result, onBack }) => {
  if (result.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">分析失败</h2>
          <p className="text-gray-600 dark:text-gray-400">{result.error}</p>
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

  const matchScore = result.match_score || 0;

  return (
    <div className="space-y-6">
      {/* 匹配分数 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(matchScore / 100) * 351.86} 351.86`}
                className={`${
                  matchScore >= 80 ? 'text-green-500' :
                  matchScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">{matchScore}%</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">匹配度</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {matchScore >= 80 ? '高度匹配！' :
             matchScore >= 60 ? '匹配度良好' : '匹配度较低'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            {result.overall_assessment || '基于简历和职位描述的分析结果'}
          </p>
        </div>
      </div>

      {/* 技能匹配 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 匹配的技能 */}
        {result.matching_skills && result.matching_skills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              匹配的技能
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.matching_skills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 缺失的技能 */}
        {result.missing_skills && result.missing_skills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              缺失的关键技能
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.missing_skills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 技能差距分析 */}
      {result.skill_gaps && result.skill_gaps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            技能差距分析
          </h3>
          <div className="space-y-4">
            {result.skill_gaps.map((gap, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  gap.importance === 'high' ? 'bg-red-500' :
                  gap.importance === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">{gap.skill}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      gap.importance === 'high' ? 'bg-red-100 text-red-700' :
                      gap.importance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {gap.importance === 'high' ? '重要' :
                       gap.importance === 'medium' ? '一般' : '可选'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{gap.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 工作经历匹配 */}
      {result.experience_match && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-500" />
            工作经历匹配
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">匹配度</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{result.experience_match.score}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    result.experience_match.score >= 80 ? 'bg-green-500' :
                    result.experience_match.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.experience_match.score}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{result.experience_match.analysis}</p>
          {result.experience_match.suggestions && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300">{result.experience_match.suggestions}</p>
            </div>
          )}
        </div>
      )}

      {/* 面试准备度 */}
      {result.interview_readiness !== undefined && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            面试准备度
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(result.interview_readiness / 100) * 201.06} 201.06`}
                  className="text-orange-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{result.interview_readiness}%</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 flex-1">
              基于您的简历和职位要求，您目前的面试准备程度。建议加强缺失技能的准备。
            </p>
          </div>
        </div>
      )}

      {/* 优先行动建议 */}
      {result.priority_actions && result.priority_actions.length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            优先行动建议
          </h3>
          <ul className="space-y-3">
            {result.priority_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
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
          分析其他职位
        </button>
      </div>
    </div>
  );
};

export default ResumeMatcher;
