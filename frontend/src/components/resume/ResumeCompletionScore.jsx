/**
 * ResumeCompletionScore - 简历完整性评分组件
 * 
 * 显示简历完成度百分比和待完善项提示
 */

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Target
} from 'lucide-react';

const ResumeCompletionScore = ({ resume, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 计算简历完整性
  const completionData = useMemo(() => {
    if (!resume) return { score: 0, total: 0, completed: 0, items: [] };

    const items = [
      {
        id: 'personal',
        label: '个人信息',
        required: true,
        check: () => {
          const info = resume.personalInfo || {};
          return info.fullName && info.email && info.phone;
        },
        fields: ['姓名', '邮箱', '电话']
      },
      {
        id: 'summary',
        label: '个人简介',
        required: false,
        check: () => {
          const info = resume.personalInfo || {};
          return info.summary && info.summary.length > 50;
        },
        fields: ['个人简介（建议50字以上）']
      },
      {
        id: 'experience',
        label: '工作经历',
        required: true,
        check: () => {
          const exp = resume.workExperiences || [];
          return exp.length > 0;
        },
        fields: ['至少1段工作经历']
      },
      {
        id: 'education',
        label: '教育经历',
        required: true,
        check: () => {
          const edu = resume.education || [];
          return edu.length > 0;
        },
        fields: ['至少1段教育经历']
      },
      {
        id: 'skills',
        label: '技能特长',
        required: true,
        check: () => {
          const skills = resume.skills || [];
          return skills.length >= 3;
        },
        fields: ['至少3项技能']
      },
      {
        id: 'projects',
        label: '项目经历',
        required: false,
        check: () => {
          const projects = resume.projects || [];
          return projects.length > 0;
        },
        fields: ['项目经历（可选但推荐）']
      },
      {
        id: 'target',
        label: '目标职位',
        required: false,
        check: () => {
          return resume.target_position && resume.target_position.length > 0;
        },
        fields: ['目标职位（用于AI优化）']
      }
    ];

    const completedItems = items.filter(item => item.check());
    const requiredItems = items.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => item.check());
    
    // 计算分数：必填项占70%，可选项占30%
    const requiredScore = requiredItems.length > 0 
      ? (completedRequired.length / requiredItems.length) * 70 
      : 0;
    const optionalItems = items.filter(item => !item.required);
    const completedOptional = optionalItems.filter(item => item.check());
    const optionalScore = optionalItems.length > 0
      ? (completedOptional.length / optionalItems.length) * 30
      : 0;
    
    const score = Math.round(requiredScore + optionalScore);

    return {
      score,
      total: items.length,
      completed: completedItems.length,
      items: items.map(item => ({
        ...item,
        isCompleted: item.check()
      }))
    };
  }, [resume]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleItemClick = (itemId) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
    setIsExpanded(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 头部 - 始终显示 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getScoreColor(completionData.score)}`}>
            {completionData.score}%
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              简历完整度
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completionData.completed}/{completionData.total} 项已完成
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completionData.score >= 80 ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : completionData.score >= 60 ? (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* 进度条 */}
      <div className="px-4 pb-3">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor(completionData.score)}`}
            style={{ width: `${completionData.score}%` }}
          />
        </div>
      </div>

      {/* 展开的详情 */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="space-y-2">
            {completionData.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                {item.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      item.isCompleted 
                        ? 'text-gray-700 dark:text-gray-300' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.label}
                    </span>
                    {item.required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </div>
                  {!item.isCompleted && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      需要: {item.fields.join('、')}
                    </p>
                  )}
                </div>
                {!item.isCompleted && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">
                    去完善
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 提示信息 */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {completionData.score >= 80 
                  ? '简历完整度很好！可以进一步优化内容质量。'
                  : completionData.score >= 60
                  ? '简历基本完整，建议补充缺失项以提升竞争力。'
                  : '简历还不够完整，建议先填写必填项。'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeCompletionScore;
