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
  ArrowRight,
  History,
  Clock
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import FunLoadingScreen from './FunLoadingScreen';

const ResumeScorePanel = ({ resume, onResumeUpdate, onPreviewResume }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriting, setRewriting] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [aiHistory, setAiHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyType, setHistoryType] = useState('all'); // 'all', 'analyze', 'rewrite'

  useEffect(() => {
    performAIAnalysis();
  }, [resume.id]);

const loadAiHistory = async (type = null) => {
    setHistoryLoading(true);
    if (type) {
      setHistoryType(type);
    }
    try {
      const response = await resumeApi.getAiHistory(resume.id, type);
      if (response.success) {
        setAiHistory(response.data);
      } else {
        console.error('加载历史记录失败:', response.message);
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApplyHistoryRewrite = (historyItem) => {
    // 从历史记录中恢复优化结果
    if (historyItem.type === 'rewrite' && historyItem.parsed_data) {
      setRewriteResult(historyItem.parsed_data);
      setShowRewriteModal(true);
      setShowHistoryModal(false);
    }
  };

  const handleShowHistory = (type = 'all') => {
    setHistoryType(type);
    setShowHistoryModal(true);
    loadAiHistory(type);
  };

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

    try {
      console.log('应用优化，原始简历:', resume);
      console.log('AI 优化结果:', rewriteResult);

      // 1. 更新个人简介
      if (rewriteResult.personal_info?.summary) {
        console.log('更新个人简介:', rewriteResult.personal_info.summary);
        console.log('当前 personal_info:', resume.personal_info);
        // 只传递 summary 字段，避免覆盖其他已填写的字段
        await resumeApi.updatePersonalInfo(resume.id, {
          summary: rewriteResult.personal_info.summary
        });
      }

      // 2. 更新工作经历
      if (rewriteResult.workExperiences && rewriteResult.workExperiences.length > 0) {
        const existingWorkExps = resume.workExperiences || [];
        console.log('现有工作经历数量:', existingWorkExps.length);

        // 遍历优化后的工作经历
        for (const rewritten of rewriteResult.workExperiences) {
          console.log('处理工作经历:', rewritten);

          // 如果公司名和职位都是"待补充"，生成一个默认的工作经历
          const isPlaceholder = (rewritten.company?.includes('待补充') || !rewritten.company) &&
                                (rewritten.position?.includes('待补充') || !rewritten.position);

          if (isPlaceholder) {
            console.log('检测到占位符工作经历，生成默认工作经历');
            // 添加一个新的工作经历，使用默认名称但保存 AI 生成的描述和成果
            await resumeApi.addWorkExperience(resume.id, {
              company: '工作经历',
              position: '职位',
              description: rewritten.description || '',
              achievements: rewritten.achievements || [],
              isCurrent: false,
              sortOrder: existingWorkExps.length
            });
            continue;
          }

          // 尝试找到匹配的工作经历（通过公司名或职位匹配）
          const existingExp = existingWorkExps.find(
            exp => exp.company === rewritten.company || exp.position === rewritten.position
          );
          
          if (existingExp) {
            // 更新现有工作经历
            console.log('更新现有工作经历:', existingExp.id);
            await resumeApi.updateWorkExperience(resume.id, existingExp.id, {
              ...existingExp,
              description: rewritten.description || existingExp.description,
              achievements: rewritten.achievements || existingExp.achievements
            });
          } else {
            // 添加新的工作经历
            console.log('添加新工作经历');
            await resumeApi.addWorkExperience(resume.id, {
              company: rewritten.company,
              position: rewritten.position,
              description: rewritten.description,
              achievements: rewritten.achievements,
              isCurrent: false,
              sortOrder: existingWorkExps.length
            });
          }
        }
      } else {
        console.log('没有工作经历需要更新');
      }

      // 3. 更新技能列表
      if (rewriteResult.skills && rewriteResult.skills.length > 0) {
        console.log('更新技能列表，技能数量:', rewriteResult.skills.length);
        
        // 先删除所有现有技能
        const existingSkills = resume.skills || [];
        console.log('删除现有技能数量:', existingSkills.length);
        for (const skill of existingSkills) {
          await resumeApi.deleteSkill(resume.id, skill.id);
        }
        
        // 去重技能名称
        const uniqueSkills = [...new Set(rewriteResult.skills)];
        console.log('去重后技能数量:', uniqueSkills.length);
        
        // 添加新的技能
        let addedSkills = 0;
        for (const skillName of uniqueSkills) {
          // 跳过"待补充"类型的占位符
          if (!skillName.includes('待补充') && !skillName.includes('请列出')) {
            console.log('添加技能:', skillName);
            await resumeApi.addSkill(resume.id, {
              name: skillName,
              level: 3,
              category: '技术'
            });
            addedSkills++;
          } else {
            console.log('跳过占位符技能:', skillName);
          }
        }
        console.log('实际添加技能数量:', addedSkills);
      } else {
        console.log('没有技能需要更新');
      }

      // 4. 刷新简历数据
      if (onResumeUpdate) {
        console.log('刷新简历数据');
        const response = await resumeApi.getResume(resume.id);
        if (response.success) {
          console.log('刷新后的简历:', response.data);
          onResumeUpdate(response.data);
        }
      }

      // 显示成功提示
      alert('简历已优化并保存！');
      
      // 关闭优化弹窗
      setShowRewriteModal(false);
      
      // 跳转到简历预览
      if (onPreviewResume) {
        onPreviewResume();
      }
    } catch (err) {
      console.error('应用优化失败:', err);
      alert('应用优化失败: ' + err.message);
    }
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

  const getScoreLevel = (score) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '待评估';
  };

  const getSectionLabel = (key) => {
    const labels = {
      'content_quality': '内容质量',
      'structure': '结构布局',
      'keywords': '关键词',
      'achievements': '成果展示'
    };
    return labels[key] || key;
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

  const assessment = aiAnalysis;
  const score = assessment.overall_score || 0;
  const competitiveness = assessment.competitiveness || {};
  const sections = assessment.sections || {};

  // 从 sections 中提取各维度分数
  const getSectionScore = (sectionName) => {
    return sections[sectionName]?.score || 0;
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShowHistory('analyze')}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              title="查看分析历史"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={performAIAnalysis}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
              title="重新分析"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(getScoreLevel(score))}`}>
                {getScoreLevel(score)}
              </span>
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-4">
              {competitiveness.industry_ranking || '暂无评价'}
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
        {competitiveness.strengths?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              简历亮点
            </h4>
            <ul className="space-y-3">
              {competitiveness.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 不足 */}
        {competitiveness.weaknesses?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              待改进
            </h4>
            <ul className="space-y-3">
              {competitiveness.weaknesses.map((weakness, idx) => (
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
      {Object.keys(sections).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            内容质量分析
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(sections).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {getSectionLabel(key)}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {value.score}分
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {value.analysis}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {assessment.suggestions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI 优化建议
          </h4>
          <div className="space-y-4">
            {assessment.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 行动计划 */}
      {assessment.action_items?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            改进行动计划
          </h4>
          <div className="space-y-3">
            {assessment.action_items.map((action, idx) => (
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
              {rewriteResult.workExperiences?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    工作经历优化预览
                  </h4>
                  <div className="space-y-4">
                    {rewriteResult.workExperiences.slice(0, 2).map((exp, idx) => (
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
{rewriteResult.workExperiences.length > 2 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      还有 {rewriteResult.workExperiences.length - 2} 段工作经历已优化...
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

      {/* AI 历史记录模态框 */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI 生成历史
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* 历史类型筛选 */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => loadAiHistory(null)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historyType === 'all' || historyType === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => loadAiHistory('analyze')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historyType === 'analyze'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  分析记录
                </button>
                <button
                  onClick={() => loadAiHistory('rewrite')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historyType === 'rewrite'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  优化记录
                </button>
              </div>

              {/* 历史记录列表 */}
              {historyLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-purple-600 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
              ) : aiHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">暂无历史记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.type === 'analyze'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {item.type === 'analyze' ? '分析' : '优化'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            模型: {item.model}
                          </span>
                          {item.type === 'rewrite' && (
                            <button
                              onClick={() => handleApplyHistoryRewrite(item)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              应用
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {item.type === 'analyze' ? (
                          <div>
                            <p className="font-medium mb-1">评分: {item.parsed_data.overall_score}/100</p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {item.parsed_data.competitiveness?.industry_ranking}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium mb-1">改进点:</p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                              {item.parsed_data.improvements?.slice(0, 3).map((imp, idx) => (
                                <li key={idx}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeScorePanel;
