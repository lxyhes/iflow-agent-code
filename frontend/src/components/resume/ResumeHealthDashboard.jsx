/**
 * ResumeHealthDashboard - 简历健康度仪表盘
 *
 * 可视化展示简历各方面得分
 */

import React, { useState, useMemo } from 'react';
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
  Award
} from 'lucide-react';

const ResumeHealthDashboard = ({ resume, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // 计算健康度数据
  const healthData = useMemo(() => {
    if (!resume) return null;

    const scores = {
      completeness: calculateCompletenessScore(resume),
      quantification: calculateQuantificationScore(resume),
      keywords: calculateKeywordsScore(resume),
      formatting: calculateFormattingScore(resume),
      language: calculateLanguageScore(resume),
      length: calculateLengthScore(resume)
    };

    const totalScore = Math.round(
      Object.values(scores).reduce((sum, score) => sum + score, 0) / 6
    );

    // 行业平均水平（模拟数据）
    const industryAverage = {
      completeness: 75,
      quantification: 60,
      keywords: 70,
      formatting: 80,
      language: 75,
      length: 85
    };

    // 计算与行业平均的对比
    const comparisons = Object.keys(scores).reduce((acc, key) => {
      const diff = scores[key] - industryAverage[key];
      acc[key] = {
        diff,
        status: diff > 10 ? 'above' : diff < -10 ? 'below' : 'average'
      };
      return acc;
    }, {});

    // 改进建议
    const suggestions = generateSuggestions(scores, comparisons);

    return {
      totalScore,
      scores,
      industryAverage,
      comparisons,
      suggestions
    };
  }, [resume]);

  if (!healthData) return null;

  const scoreCategories = [
    { key: 'completeness', name: '内容完整性', icon: FileText, color: '#3B82F6' },
    { key: 'quantification', name: '量化成果', icon: BarChart3, color: '#10B981' },
    { key: 'keywords', name: '关键词匹配', icon: Target, color: '#F59E0B' },
    { key: 'formatting', name: '格式规范', icon: Type, color: '#8B5CF6' },
    { key: 'language', name: '语言表达', icon: Activity, color: '#EC4899' },
    { key: 'length', name: '篇幅控制', icon: Calendar, color: '#06B6D4' }
  ];

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
                简历健康度仪表盘
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全方位评估简历质量
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 总体评分卡片 */}
        <div className="px-6 py-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* 环形进度条 */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
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
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - healthData.totalScore / 100)}`}
                    className={`transition-all duration-1000 ${
                      healthData.totalScore >= 80 ? 'text-green-500' :
                      healthData.totalScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {healthData.totalScore}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">总分</span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {healthData.totalScore >= 80 ? '优秀' :
                   healthData.totalScore >= 60 ? '良好' : '需要改进'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                  {healthData.totalScore >= 80 
                    ? '您的简历质量很高，继续保持！可以进一步优化细节。'
                    : healthData.totalScore >= 60
                    ? '简历整体不错，但还有一些提升空间。查看下方建议。'
                    : '简历还有较大改进空间，建议按照诊断报告逐项优化。'}
                </p>
              </div>
            </div>

            {/* 快速统计 */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Object.values(healthData.comparisons).filter(c => c.status === 'above').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">高于平均</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {Object.values(healthData.comparisons).filter(c => c.status === 'average').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">持平</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Object.values(healthData.comparisons).filter(c => c.status === 'below').length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">低于平均</div>
              </div>
            </div>
          </div>
        </div>

        {/* 详细评分 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {scoreCategories.map((category) => {
              const score = healthData.scores[category.key];
              const comparison = healthData.comparisons[category.key];
              const Icon = category.icon;

              return (
                <div
                  key={category.key}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: category.color }} />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {comparison.status === 'above' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : comparison.status === 'below' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <Minus className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className={`font-bold ${
                        score >= 80 ? 'text-green-600' :
                        score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {score}分
                      </span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        backgroundColor: category.color
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>行业平均: {healthData.industryAverage[category.key]}分</span>
                    <span className={
                      comparison.diff > 0 ? 'text-green-600' :
                      comparison.diff < 0 ? 'text-red-600' : 'text-yellow-600'
                    }>
                      {comparison.diff > 0 ? '+' : ''}{comparison.diff}分
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 改进建议 */}
          {healthData.suggestions.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
                <Award className="w-4 h-4" />
                优先改进建议
              </h4>
              <ul className="space-y-2">
                {healthData.suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300"
                  >
                    <span className="font-bold">{index + 1}.</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 计算各维度得分
function calculateCompletenessScore(resume) {
  let score = 0;
  const info = resume.personal_info || {};
  
  if (info.full_name) score += 15;
  if (info.email) score += 15;
  if (info.phone) score += 15;
  if (info.summary && info.summary.length > 50) score += 20;
  else if (info.summary) score += 10;
  
  if ((resume.work_experience || []).length > 0) score += 20;
  if ((resume.education || []).length > 0) score += 15;
  
  return score;
}

function calculateQuantificationScore(resume) {
  const experiences = resume.work_experience || [];
  const projects = resume.projects || [];
  
  let hasQuantification = false;
  [...experiences, ...projects].forEach(item => {
    if (item.description && /\d+%?|\d+倍|\d+万/i.test(item.description)) {
      hasQuantification = true;
    }
  });
  
  return hasQuantification ? 80 : 40;
}

function calculateKeywordsScore(resume) {
  let score = 0;
  
  if (resume.target_position) score += 30;
  
  const skills = resume.skills || [];
  if (skills.length >= 5) score += 30;
  else score += skills.length * 5;
  
  const experiences = resume.work_experience || [];
  const targetPos = (resume.target_position || '').toLowerCase();
  const hasRelevant = experiences.some(exp => 
    targetPos && (exp.position || '').toLowerCase().includes(targetPos)
  );
  if (hasRelevant) score += 40;
  
  return score;
}

function calculateFormattingScore(resume) {
  // 简化计算，实际应该检查更多格式问题
  return 85;
}

function calculateLanguageScore(resume) {
  const experiences = resume.work_experience || [];
  let weakWordCount = 0;
  const weakWords = ['负责', '参与'];
  
  experiences.forEach(exp => {
    if (exp.description) {
      weakWords.forEach(word => {
        if (exp.description.includes(word)) weakWordCount++;
      });
    }
  });
  
  return weakWordCount > 3 ? 70 : 90;
}

function calculateLengthScore(resume) {
  const info = resume.personal_info || {};
  const experiences = resume.work_experience || [];
  const projects = resume.projects || [];
  
  const totalLength = (info.summary?.length || 0) +
    experiences.reduce((sum, e) => sum + (e.description?.length || 0), 0) +
    projects.reduce((sum, p) => sum + (p.description?.length || 0), 0);
  
  if (totalLength < 200) return 50;
  if (totalLength > 2000) return 70;
  return 90;
}

function generateSuggestions(scores, comparisons) {
  const suggestions = [];
  
  if (scores.quantification < 60) {
    suggestions.push('添加更多量化成果，如"提升50%"、"服务100万用户"等具体数据');
  }
  
  if (scores.keywords < 60) {
    suggestions.push('在简历中添加更多目标职位相关的关键词');
  }
  
  if (scores.completeness < 70) {
    suggestions.push('完善简历基本信息，确保所有必填项都已填写');
  }
  
  if (scores.language < 80) {
    suggestions.push('使用更有力的行动词开头，避免过多使用"负责"、"参与"等平淡词汇');
  }
  
  if (scores.length < 70) {
    suggestions.push('调整简历篇幅，建议控制在1-2页，突出核心成果');
  }
  
  return suggestions.slice(0, 5);
}

export default ResumeHealthDashboard;
