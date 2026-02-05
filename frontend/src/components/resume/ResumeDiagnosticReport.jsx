/**
 * ResumeDiagnosticReport - 简历诊断报告组件
 *
 * 全面分析简历问题并给出具体改进建议
 */

import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Target,
  FileText,
  BarChart3,
  Type,
  Calendar,
  Hash
} from 'lucide-react';

const ResumeDiagnosticReport = ({ resume, onClose }) => {
  const [expandedSections, setExpandedSections] = useState(['overview']);

  const toggleSection = (section) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // 执行诊断检查
  const diagnosticResults = useMemo(() => {
    if (!resume) return null;

    const checks = {
      // 1. 内容完整性检查
      completeness: {
        name: '内容完整性',
        icon: FileText,
        score: 0,
        maxScore: 100,
        issues: [],
        suggestions: []
      },

      // 2. 量化程度检查
      quantification: {
        name: '量化成果',
        icon: BarChart3,
        score: 0,
        maxScore: 100,
        issues: [],
        suggestions: []
      },

      // 3. 关键词匹配检查
      keywords: {
        name: '关键词匹配',
        icon: Target,
        score: 0,
        maxScore: 100,
        issues: [],
        suggestions: []
      },

      // 4. 格式规范检查
      formatting: {
        name: '格式规范',
        icon: Type,
        score: 0,
        maxScore: 100,
        issues: [],
        suggestions: []
      },

      // 5. 语言表达检查
      language: {
        name: '语言表达',
        icon: Type,
        score: 0,
        maxScore: 100,
        issues: [],
        suggestions: []
      },

      // 6. 篇幅控制检查
      length: {
        name: '篇幅控制',
        icon: Calendar,
        score: 0,
        maxScore: 100,
        issues: [],
        suggestions: []
      }
    };

    // 1. 内容完整性检查
    const personalInfo = resume.personal_info || {};
    let completenessScore = 0;

    if (personalInfo.full_name) completenessScore += 15;
    else checks.completeness.issues.push('缺少姓名');

    if (personalInfo.email) completenessScore += 15;
    else checks.completeness.issues.push('缺少邮箱');

    if (personalInfo.phone) completenessScore += 15;
    else checks.completeness.issues.push('缺少电话');

    if (personalInfo.summary && personalInfo.summary.length > 50) completenessScore += 20;
    else if (personalInfo.summary) {
      checks.completeness.issues.push('个人简介过短（建议50字以上）');
      completenessScore += 10;
    } else {
      checks.completeness.issues.push('缺少个人简介');
    }

    const experiences = resume.work_experience || [];
    if (experiences.length > 0) completenessScore += 20;
    else checks.completeness.issues.push('缺少工作经历');

    const education = resume.education || [];
    if (education.length > 0) completenessScore += 15;
    else checks.completeness.issues.push('缺少教育经历');

    checks.completeness.score = completenessScore;
    if (completenessScore < 60) {
      checks.completeness.suggestions.push('补充缺失的基本信息，确保简历完整');
    }

    // 2. 量化程度检查
    let quantificationScore = 0;
    let hasQuantification = false;

    // 检查工作经历中的量化描述
    experiences.forEach(exp => {
      if (exp.description) {
        // 检查是否包含数字、百分比、倍数等
        const hasNumbers = /\d+%?|\d+倍|\d+万|\d+亿|QPS|DAU|PV|UV/i.test(exp.description);
        if (hasNumbers) hasQuantification = true;
      }
    });

    // 检查项目经历中的量化描述
    const projects = resume.projects || [];
    projects.forEach(project => {
      if (project.description) {
        const hasNumbers = /\d+%?|\d+倍|\d+万|\d+亿/i.test(project.description);
        if (hasNumbers) hasQuantification = true;
      }
    });

    if (hasQuantification) quantificationScore = 80;
    else {
      quantificationScore = 40;
      checks.quantification.issues.push('缺少量化成果描述');
      checks.quantification.suggestions.push('在工作描述中添加具体数据，如"提升50%"、"服务100万用户"等');
    }

    if (experiences.length === 0 && projects.length === 0) {
      quantificationScore = 0;
      checks.quantification.issues.push('没有工作经历或项目经历可供分析');
    }

    checks.quantification.score = quantificationScore;

    // 3. 关键词匹配检查
    let keywordScore = 0;
    const targetPosition = resume.target_position || '';

    if (targetPosition) {
      keywordScore += 30;

      // 检查是否包含技能关键词
      const skills = resume.skills || [];
      if (skills.length >= 5) keywordScore += 30;
      else if (skills.length > 0) {
        keywordScore += skills.length * 5;
        checks.keywords.issues.push('技能数量较少，建议添加更多相关技能');
      } else {
        checks.keywords.issues.push('缺少技能描述');
      }

      // 检查工作经历中是否包含目标职位相关词汇
      const positionKeywords = targetPosition.toLowerCase().split(/[\/\s]+/);
      let hasRelevantExp = false;
      experiences.forEach(exp => {
        const expText = `${exp.position || ''} ${exp.description || ''}`.toLowerCase();
        if (positionKeywords.some(kw => expText.includes(kw))) {
          hasRelevantExp = true;
        }
      });

      if (hasRelevantExp) keywordScore += 40;
      else {
        checks.keywords.issues.push('工作经历与目标职位关联度不高');
        checks.keywords.suggestions.push('在工作描述中突出与目标职位相关的经验和技能');
      }
    } else {
      keywordScore = 30;
      checks.keywords.issues.push('未设置目标职位，无法评估关键词匹配度');
      checks.keywords.suggestions.push('在简历设置中添加目标职位，获取更精准的关键词建议');
    }

    checks.keywords.score = keywordScore;

    // 4. 格式规范检查
    let formatScore = 100;
    const formatIssues = [];

    // 检查时间格式一致性
    const datePattern = /^\d{4}-\d{2}$/;
    experiences.forEach(exp => {
      if (exp.start_date && !datePattern.test(exp.start_date)) {
        formatIssues.push('工作经历时间格式不统一');
      }
    });

    // 检查标点符号
    if (personalInfo.summary) {
      const hasEnglishPunctuation = /[,.!?]/.test(personalInfo.summary);
      const hasChinesePunctuation = /[，。！？]/.test(personalInfo.summary);
      if (hasEnglishPunctuation && hasChinesePunctuation) {
        formatIssues.push('中英文标点符号混用');
      }
    }

    if (formatIssues.length > 0) {
      formatScore = Math.max(60, 100 - formatIssues.length * 10);
      checks.formatting.issues = [...new Set(formatIssues)];
      checks.formatting.suggestions.push('统一使用中文标点符号');
      checks.formatting.suggestions.push('统一时间格式为：YYYY-MM');
    }

    checks.formatting.score = formatScore;

    // 5. 语言表达检查
    let languageScore = 100;
    const weakWords = ['负责', '参与', '协助', '做一些'];
    let weakWordCount = 0;

    experiences.forEach(exp => {
      if (exp.description) {
        weakWords.forEach(word => {
          if (exp.description.includes(word)) weakWordCount++;
        });
      }
    });

    if (weakWordCount > 3) {
      languageScore = 70;
      checks.language.issues.push('过多使用平淡词汇（负责、参与等）');
      checks.language.suggestions.push('使用更有力的动词开头，如"主导"、"设计"、"实现"、"优化"等');
    }

    // 检查是否有拼写错误（简单检查）
    const commonTypos = ['的得地', '在再', '做作'];
    let hasTypo = false;
    const allText = `${personalInfo.summary || ''} ${experiences.map(e => e.description).join(' ')}`;
    // 这里可以集成更复杂的拼写检查

    checks.language.score = languageScore;

    // 6. 篇幅控制检查
    let lengthScore = 100;
    const totalLength = (personalInfo.summary?.length || 0) +
      experiences.reduce((sum, e) => sum + (e.description?.length || 0), 0) +
      projects.reduce((sum, p) => sum + (p.description?.length || 0), 0);

    if (totalLength < 200) {
      lengthScore = 50;
      checks.length.issues.push('简历内容过少，建议补充更多细节');
    } else if (totalLength > 2000) {
      lengthScore = 70;
      checks.length.issues.push('简历内容较多，建议精简到1-2页');
      checks.length.suggestions.push('突出核心成果，删除冗余描述');
    }

    checks.length.score = lengthScore;

    // 计算总分
    const totalScore = Math.round(
      (checks.completeness.score +
       checks.quantification.score +
       checks.keywords.score +
       checks.formatting.score +
       checks.language.score +
       checks.length.score) / 6
    );

    return {
      totalScore,
      checks,
      summary: {
        critical: Object.values(checks).filter(c => c.score < 50).length,
        warning: Object.values(checks).filter(c => c.score >= 50 && c.score < 80).length,
        good: Object.values(checks).filter(c => c.score >= 80).length
      }
    };
  }, [resume]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  if (!diagnosticResults) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                简历诊断报告
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全面分析简历质量，提供改进建议
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* 总体评分 */}
          <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">综合评分</h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {diagnosticResults.totalScore}
                  <span className="text-lg text-gray-500">/100</span>
                </p>
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${getScoreColor(diagnosticResults.totalScore)}`}>
                {diagnosticResults.totalScore >= 80 ? '优' : diagnosticResults.totalScore >= 60 ? '良' : '待改进'}
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  需改进: {diagnosticResults.summary.critical}项
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  警告: {diagnosticResults.summary.warning}项
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  良好: {diagnosticResults.summary.good}项
                </span>
              </div>
            </div>
          </div>

          {/* 详细检查项 */}
          <div className="space-y-3">
            {Object.entries(diagnosticResults.checks).map(([key, check]) => {
              const Icon = check.icon;
              const isExpanded = expandedSections.includes(key);

              return (
                <div
                  key={key}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">{check.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {getScoreIcon(check.score)}
                      <span className={`font-bold ${
                        check.score >= 80 ? 'text-green-600' :
                        check.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {check.score}分
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                      {/* 问题列表 */}
                      {check.issues.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            检测到的问题
                          </h5>
                          <ul className="space-y-1">
                            {check.issues.map((issue, idx) => (
                              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 建议列表 */}
                      {check.suggestions.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4" />
                            改进建议
                          </h5>
                          <ul className="space-y-1">
                            {check.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">→</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 没有问题 */}
                      {check.issues.length === 0 && check.suggestions.length === 0 && (
                        <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">该项表现良好，继续保持！</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 总体建议 */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4" />
              总体建议
            </h4>
            <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              {diagnosticResults.totalScore < 60 && (
                <li>• 简历还有较大提升空间，建议按照诊断报告逐项改进</li>
              )}
              {diagnosticResults.checks.quantification.score < 60 && (
                <li>• 优先补充量化成果，用数据说话更有说服力</li>
              )}
              {diagnosticResults.checks.keywords.score < 60 && (
                <li>• 添加目标职位相关的关键词，提高简历匹配度</li>
              )}
              {diagnosticResults.checks.language.score < 80 && (
                <li>• 使用更有力的行动词开头，让描述更专业</li>
              )}
              <li>• 完成后可以使用"一键AI优化"功能自动改进措辞</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeDiagnosticReport;
