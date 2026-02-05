/**
 * FormattingChecker - 智能排版检查组件
 *
 * 确保格式统一、专业
 */

import React, { useState, useMemo } from 'react';
import {
  Layout,
  X,
  Check,
  AlertCircle,
  Type,
  Calendar,
  AlignLeft,
  Globe,
  Wand2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const FormattingChecker = ({ resume, onApplyFixes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState([]);
  const [selectedFixes, setSelectedFixes] = useState([]);

  // 执行排版检查
  const checkResults = useMemo(() => {
    if (!resume) return null;

    const issues = [];

    // 1. 检查时间格式
    const datePattern = /^\d{4}-\d{2}$/;
    (resume.work_experience || []).forEach((exp, index) => {
      if (exp.start_date && !datePattern.test(exp.start_date)) {
        issues.push({
          type: 'date_format',
          category: '时间格式',
          location: `工作经历 #${index + 1}`,
          issue: `开始时间格式不标准: "${exp.start_date}"`,
          suggestion: '建议格式: YYYY-MM (如: 2023-06)',
          fixable: false
        });
      }
      if (exp.end_date && !exp.is_current && !datePattern.test(exp.end_date)) {
        issues.push({
          type: 'date_format',
          category: '时间格式',
          location: `工作经历 #${index + 1}`,
          issue: `结束时间格式不标准: "${exp.end_date}"`,
          suggestion: '建议格式: YYYY-MM (如: 2024-01)',
          fixable: false
        });
      }
    });

    // 2. 检查标点符号
    const personalInfo = resume.personal_info || {};
    if (personalInfo.summary) {
      const hasEnglishPunctuation = /[,.!?]/.test(personalInfo.summary);
      const hasChinesePunctuation = /[，。！？]/.test(personalInfo.summary);
      if (hasEnglishPunctuation && hasChinesePunctuation) {
        issues.push({
          type: 'punctuation',
          category: '标点符号',
          location: '个人简介',
          issue: '中英文标点符号混用',
          suggestion: '统一使用中文标点符号',
          fixable: true,
          original: personalInfo.summary,
          fixed: personalInfo.summary
            .replace(/,/g, '，')
            .replace(/\./g, '。')
            .replace(/!/g, '！')
            .replace(/\?/g, '？')
        });
      }
    }

    // 3. 检查空格问题
    (resume.work_experience || []).forEach((exp, index) => {
      if (exp.description) {
        // 检查中英文之间是否有空格
        const mixedPattern = /[\u4e00-\u9fa5][a-zA-Z]|[a-zA-Z][\u4e00-\u9fa5]/;
        if (mixedPattern.test(exp.description)) {
          issues.push({
            type: 'spacing',
            category: '中英文混排',
            location: `工作经历 #${index + 1}`,
            issue: '中英文之间缺少空格',
            suggestion: '在中英文之间添加空格，提高可读性',
            fixable: true,
            original: exp.description,
            fixed: exp.description.replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2')
                                   .replace(/([a-zA-Z])([\u4e00-\u9fa5])/g, '$1 $2')
          });
        }
      }
    });

    // 4. 检查换行和段落
    (resume.work_experience || []).forEach((exp, index) => {
      if (exp.description) {
        // 检查是否有过多换行
        const lineBreaks = (exp.description.match(/\n/g) || []).length;
        if (lineBreaks > 5) {
          issues.push({
            type: 'line_breaks',
            category: '段落格式',
            location: `工作经历 #${index + 1}`,
            issue: `描述中包含 ${lineBreaks} 个换行符，可能影响阅读`,
            suggestion: '建议控制在3-5个段落，每段不宜过长',
            fixable: false
          });
        }
      }
    });

    // 5. 检查数字格式
    (resume.work_experience || []).forEach((exp, index) => {
      if (exp.description) {
        // 检查数字和百分号之间是否有空格（不应该有）
        if (/\d+\s+%/.test(exp.description)) {
          issues.push({
            type: 'number_format',
            category: '数字格式',
            location: `工作经历 #${index + 1}`,
            issue: '数字和百分号之间存在空格',
            suggestion: '删除数字和百分号之间的空格，如: 50%',
            fixable: true,
            original: exp.description,
            fixed: exp.description.replace(/(\d+)\s+%/g, '$1%')
          });
        }
      }
    });

    // 6. 检查重复标点
    (resume.work_experience || []).forEach((exp, index) => {
      if (exp.description) {
        if (/[，。！？]{2,}/.test(exp.description)) {
          issues.push({
            type: 'duplicate_punctuation',
            category: '标点符号',
            location: `工作经历 #${index + 1}`,
            issue: '存在重复标点符号',
            suggestion: '删除重复的标点符号',
            fixable: true,
            original: exp.description,
            fixed: exp.description.replace(/([，。！？])\1+/g, '$1')
          });
        }
      }
    });

    // 7. 检查技能描述格式
    (resume.skills || []).forEach((skill, index) => {
      if (skill.name) {
        // 检查技能名称是否包含空格（可能导致格式问题）
        if (/^\s+|\s+$/.test(skill.name)) {
          issues.push({
            type: 'skill_format',
            category: '技能格式',
            location: `技能 #${index + 1}`,
            issue: `技能名称包含首尾空格: "${skill.name}"`,
            suggestion: '删除首尾空格',
            fixable: true,
            original: skill.name,
            fixed: skill.name.trim()
          });
        }
      }
    });

    // 分类统计
    const categories = {};
    issues.forEach(issue => {
      categories[issue.category] = (categories[issue.category] || 0) + 1;
    });

    return {
      issues,
      categories,
      fixableCount: issues.filter(i => i.fixable).length,
      totalCount: issues.length
    };
  }, [resume]);

  const toggleIssue = (index) => {
    setExpandedIssues(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleFix = (index) => {
    setSelectedFixes(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const applyFixes = () => {
    const fixes = checkResults.issues.filter((_, index) =>
      selectedFixes.includes(index)
    );

    if (onApplyFixes) {
      onApplyFixes(fixes);
    }

    setIsOpen(false);
    setSelectedFixes([]);
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                智能排版检查
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                检查并修复格式问题
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                checkResults.totalCount === 0
                  ? 'bg-green-100 text-green-600'
                  : checkResults.fixableCount > 0
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-red-100 text-red-600'
              }`}>
                {checkResults.totalCount === 0 ? (
                  <Check className="w-8 h-8" />
                ) : (
                  checkResults.totalCount
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {checkResults.totalCount === 0
                    ? '格式检查通过'
                    : `发现 ${checkResults.totalCount} 处格式问题`}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {checkResults.totalCount === 0
                    ? '您的简历格式规范，无需调整'
                    : `其中 ${checkResults.fixableCount} 处可自动修复`}
                </p>
              </div>
            </div>

            {Object.entries(checkResults.categories).length > 0 && (
              <div className="flex gap-3">
                {Object.entries(checkResults.categories).map(([category, count]) => (
                  <div key={category} className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-auto p-6">
          {checkResults.issues.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                恭喜！格式检查通过
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                您的简历格式规范，没有发现任何问题
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  问题列表
                </h4>
                {checkResults.fixableCount > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFixes(
                        checkResults.issues
                          .map((issue, idx) => issue.fixable ? idx : -1)
                          .filter(idx => idx !== -1)
                      )}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      全选可修复项
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedFixes([])}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      取消全选
                    </button>
                  </div>
                )}
              </div>

              {checkResults.issues.map((issue, index) => {
                const isExpanded = expandedIssues.includes(index);
                const isSelected = selectedFixes.includes(index);

                return (
                  <div
                    key={index}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? 'border-cyan-300 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {issue.fixable && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFix(index)}
                            className="mt-1 w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                issue.fixable
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {issue.fixable ? '可自动修复' : '需手动调整'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {issue.category}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleIssue(index)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                            {issue.issue}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            位置: {issue.location}
                          </p>

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                  <AlertCircle className="w-3 h-3 inline mr-1" />
                                  建议
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {issue.suggestion}
                                </p>
                              </div>

                              {issue.fixable && (
                                <>
                                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">原文：</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                                      {issue.original}
                                    </p>
                                  </div>

                                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
                                    <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-1">
                                      <Wand2 className="w-3 h-3 inline mr-1" />
                                      修复后：
                                    </p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                                      {issue.fixed}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {checkResults.issues.length > 0 && checkResults.fixableCount > 0 && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              稍后处理
            </button>
            <button
              onClick={applyFixes}
              disabled={selectedFixes.length === 0}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              应用修复 ({selectedFixes.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormattingChecker;
