/**
 * ResumeDiagnosticReport - AI简历诊断报告组件
 *
 * 使用AI实时分析简历问题并给出具体改进建议
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Hash,
  RefreshCw,
  Sparkles,
  Wand2,
  ArrowUp
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import FunLoadingScreen from './FunLoadingScreen';

const ResumeDiagnosticReport = ({ resume, onClose, onOptimize }) => {
  const [expandedSections, setExpandedSections] = useState(['overview']);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    performDiagnosis();
  }, [resume.id, resume.updatedAt]); // 添加updatedAt以确保内容更新时重新诊断

  // 数据加载完成后滚动到顶部显示总体评分
  useEffect(() => {
    if (diagnosticResults && !loading) {
      console.log('[ResumeDiagnosticReport] Data received:', {
        overall_score: diagnosticResults.overall_score,
        sections: diagnosticResults.sections,
        competitiveness: diagnosticResults.competitiveness
      });
      // 延迟滚动确保DOM已渲染
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [diagnosticResults, loading]);

  // 监听滚动显示/隐藏回到顶部按钮
  const handleScroll = () => {
    if (contentRef.current) {
      setShowScrollTop(contentRef.current.scrollTop > 200);
    }
  };

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const performDiagnosis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await resumeApi.diagnoseResume(resume.id);
      if (response.success) {
        // 检查后端返回的数据是否包含错误标记
        if (response.data && response.data.error) {
          // 即使返回了错误，也显示诊断结果（可能是不完整的）
          setDiagnosticResults(response.data);
        } else {
          setDiagnosticResults(response.data);
        }
      } else {
        setError(response.error || '诊断失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('诊断错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!diagnosticResults) return;
    
    setOptimizing(true);
    try {
      const response = await resumeApi.rewriteResume(resume.id, diagnosticResults);
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

  const toggleSection = (section) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
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

  const getCheckStatus = (score) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '需改进';
  };

  const extractIssues = (analysis) => {
    if (!analysis) return [];
    // 尝试从分析文本中提取问题
    const issues = [];
    if (typeof analysis === 'string') {
      // 简单的关键词匹配
      if (analysis.includes('缺少') || analysis.includes('不足')) {
        issues.push(analysis);
      }
    }
    return issues;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '优秀':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case '良好':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case '一般':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case '需改进':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full">
          <FunLoadingScreen
            title="AI 正在诊断简历..."
            subtitle="全面分析内容完整性、量化成果、关键词匹配等"
            progress={45}
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
              onClick={performDiagnosis}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新诊断
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!diagnosticResults) return null;

  // 适配新的数据结构
  const sections = diagnosticResults.sections || {};
  const competitiveness = diagnosticResults.competitiveness || {};
  const suggestions = diagnosticResults.suggestions || [];
  const actionItems = diagnosticResults.action_items || [];
  
  // 处理 overall_score，确保是有效的正整数
  let overallScore = diagnosticResults.overall_score;
  if (typeof overallScore !== 'number' || overallScore < 0 || overallScore > 100) {
    overallScore = 70; // 默认值
  }
  
  // 从 sections 中提取各维度分数
  const contentQuality = sections.content_quality || {};
  const structure = sections.structure || {};
  const keywords = sections.keywords || {};
  const achievements = sections.achievements || {};
  
  // 辅助函数：获取有效分数
  const getValidScore = (score) => {
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return 75;
    }
    return score;
  };
  
  // 构建检查项列表
  const checks = [
    { name: '内容质量', score: getValidScore(contentQuality.score), status: getCheckStatus(getValidScore(contentQuality.score)), issues: extractIssues(contentQuality.analysis), suggestions: [] },
    { name: '结构布局', score: getValidScore(structure.score), status: getCheckStatus(getValidScore(structure.score)), issues: extractIssues(structure.analysis), suggestions: [] },
    { name: '关键词匹配', score: getValidScore(keywords.score), status: getCheckStatus(getValidScore(keywords.score)), issues: extractIssues(keywords.analysis), suggestions: [] },
    { name: '成果展示', score: getValidScore(achievements.score), status: getCheckStatus(getValidScore(achievements.score)), issues: extractIssues(achievements.analysis), suggestions: [] },
  ];
  
  const criticalIssues = competitiveness.weaknesses?.map((weakness, index) => ({
    severity: '中',
    category: '竞争力',
    issue: weakness,
    impact: '影响整体竞争力',
    solution: suggestions[index] || '需要改进'
  })) || [];
  
  const quickFixes = actionItems || [];
  const improvementPlan = [
    {
      phase: '立即行动',
      actions: actionItems
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                简历诊断报告
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {competitiveness.industry_ranking || '基于AI实时诊断分析'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
              {optimizing ? 'AI优化中...' : '根据诊断优化'}
            </button>
            <button
              onClick={performDiagnosis}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              title="重新诊断"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="diagnostic-content flex-1 overflow-auto p-6 relative"
        >
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
                    strokeDasharray={`${(overallScore / 100) * 439.82} 439.82`}
                    className={overallScore >= 80 ? 'text-green-500' : overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                    {overallScore}
                  </span>
                  <span className="text-sm text-gray-500">诊断分</span>
                </div>
              </div>
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  overallScore >= 80 ? 'bg-green-100 text-green-700' :
                  overallScore >= 60 ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {competitiveness.industry_ranking || '待评估'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                {competitiveness.ranking_explanation || '基于AI分析的简历诊断报告'}
              </p>
            </div>
          </div>

          {/* 优劣势分析 */}
          {(competitiveness.strengths?.length > 0 || competitiveness.weaknesses?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  简历亮点
                </h4>
                <ul className="space-y-2">
                  {competitiveness.strengths?.map((strength, index) => (
                    <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4" />
                  待改进
                </h4>
                <ul className="space-y-2">
                  {competitiveness.weaknesses?.map((weakness, index) => (
                    <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <span className="text-red-500">!</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 各维度检查 */}
          <div className="space-y-4 mb-6">
            {checks.map((check, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(check.name)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <span className="font-medium text-gray-900 dark:text-white">{check.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBg(check.score)}`}
                          style={{ width: `${check.score}%` }}
                        />
                      </div>
                      <span className={`font-bold ${getScoreColor(check.score)}`}>{check.score}分</span>
                    </div>
                    {expandedSections.includes(check.name) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedSections.includes(check.name) && (
                  <div className="p-4 bg-white dark:bg-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {check.issues?.length > 0 ? check.issues.join('、') : '表现良好'}
                    </p>
                    {check.suggestions?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          改进建议
                        </h5>
                        <ul className="space-y-1">
                          {check.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-blue-600 dark:text-blue-400 flex items-start gap-2">
                              <span className="text-blue-400">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 关键问题 */}
          {criticalIssues.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" />
                关键问题 ({criticalIssues.length}个)
              </h4>
              <div className="space-y-3">
                {criticalIssues.map((issue, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        issue.severity === '高' ? 'bg-red-100 text-red-700' :
                        issue.severity === '中' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-gray-500">{issue.category}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">{issue.issue}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">影响：{issue.impact}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">解决方案：{issue.solution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快速修复 */}
          {quickFixes.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                快速修复
              </h4>
              <ul className="space-y-2">
                {quickFixes.map((fix, index) => (
                  <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                    <span className="font-bold">{index + 1}.</span>
                    {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI优化建议 */}
          {suggestions.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4" />
                AI优化建议
              </h4>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改进计划 */}
          {improvementPlan.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" />
                改进计划
              </h4>
              <div className="space-y-4">
                {improvementPlan.map((plan, index) => (
                  <div key={index}>
                    <h5 className="font-medium text-blue-700 dark:text-blue-300 text-sm mb-2">{plan.phase}</h5>
                    <ul className="space-y-1">
                      {plan.actions.map((action, idx) => (
                        <li key={idx} className="text-sm text-blue-600 dark:text-blue-400 flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 回到顶部按钮 */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
              title="回到顶部查看总体评分"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeDiagnosticReport;
