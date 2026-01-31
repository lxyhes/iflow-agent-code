/**
 * 招聘网页分析面板
 *
 * 支持两种方式：
 * 1. 输入招聘网页URL自动爬取分析
 * 2. 粘贴职位描述文本直接分析（适用于需要登录的网站）
 */

import React, { useState, useRef } from 'react';
import {
  ExternalLink,
  Scan,
  Loader2,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Code2,
  GraduationCap,
  Sparkles,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  FileText,
  Link as LinkIcon,
  ClipboardPaste,
} from 'lucide-react';

const JobAnalysisPanel = ({ onAnalysisComplete, onClose }) => {
  const [activeTab, setActiveTab] = useState('url'); // 'url' | 'text'
  const [url, setUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 支持的招聘网站
  const supportedSites = [
    { name: 'BOSS直聘', domain: 'zhipin.com', icon: '💼' },
    { name: '拉勾网', domain: 'lagou.com', icon: '🎯' },
    { name: '猎聘网', domain: 'liepin.com', icon: '🎣' },
    { name: '智联招聘', domain: 'zhaopin.com', icon: '📋' },
    { name: '前程无忧', domain: '51job.com', icon: '📄' },
    { name: '脉脉', domain: 'maimai.cn', icon: '💬' },
  ];

  // 分析招聘网页（URL模式）
  const analyzeJobPage = async () => {
    if (!url.trim()) {
      setError('请输入招聘网页链接');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/job-analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '分析失败，请检查链接是否正确');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message || '分析过程中出现错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 分析职位文本（文本模式）
  const analyzeJobText = async () => {
    if (!jobText.trim() || jobText.trim().length < 50) {
      setError('请输入至少50字的职位描述');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/job-analysis/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: jobText.trim(), source: 'manual' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '分析失败');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message || '分析过程中出现错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 使用分析结果开始面试
  const startInterviewWithAnalysis = () => {
    if (analysisResult) {
      onAnalysisComplete?.(analysisResult);
    }
  };

  // 打开网页预览
  const openPreview = () => {
    if (url.trim()) {
      setShowPreview(true);
    }
  };

  // 渲染分析结果
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const {
      job_title,
      company,
      location,
      salary,
      requirements,
      responsibilities,
      skills,
      experience,
      education,
    } = analysisResult;

    return (
      <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* 职位基本信息卡片 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                {job_title || '未识别职位'}
              </h3>
              {company && (
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="w-4 h-4" />
                  {company}
                </div>
              )}
            </div>
            {salary && (
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <DollarSign className="w-4 h-4" />
                {salary}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {location && (
              <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                <MapPin className="w-3 h-3" />
                {location}
              </span>
            )}
            {experience && (
              <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                <GraduationCap className="w-3 h-3" />
                {experience}
              </span>
            )}
            {education && (
              <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                <Code2 className="w-3 h-3" />
                {education}
              </span>
            )}
          </div>
        </div>

        {/* 技能要求 */}
        {skills && skills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-600" />
              技能要求 ({skills.length}项)
            </h4>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 职位描述 */}
        {responsibilities && responsibilities.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">岗位职责</h4>
            <ul className="space-y-2">
              {responsibilities.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 任职要求 */}
        {requirements && requirements.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">任职要求</h4>
            <ul className="space-y-2">
              {requirements.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 面试问题预览 */}
        {analysisResult.interview_questions && analysisResult.interview_questions.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              预计面试问题 ({analysisResult.interview_questions.length}个)
            </h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {analysisResult.interview_questions.map((q, index) => (
                <div key={index} className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      q.type === 'technical' ? 'bg-blue-100 text-blue-600' :
                      q.type === 'behavioral' ? 'bg-green-100 text-green-600' :
                      q.type === 'system_design' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {q.type === 'technical' ? '技术' : q.type === 'behavioral' ? '行为' : q.type === 'system_design' ? '系统设计' : '经验'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 开始面试按钮 */}
        <button
          onClick={startInterviewWithAnalysis}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
        >
          <Sparkles className="w-5 h-5" />
          基于此职位开始面试
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 z-50 ${
        isExpanded ? 'w-[600px]' : 'w-[450px]'
      }`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">招聘分析</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setActiveTab('url'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            链接分析
          </button>
          <button
            onClick={() => { setActiveTab('text'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            文本粘贴
          </button>
        </div>

        {/* URL输入模式 */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              招聘网页链接
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.zhipin.com/job_detail/..."
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={openPreview}
                disabled={!url.trim()}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                title="预览网页"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {/* 支持的网站 */}
            <div className="flex flex-wrap gap-2">
              {supportedSites.map((site) => (
                <button
                  key={site.domain}
                  onClick={() => setUrl(`https://www.${site.domain}`)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <span>{site.icon}</span>
                  {site.name}
                </button>
              ))}
            </div>

            {/* 分析按钮 */}
            <button
              onClick={analyzeJobPage}
              disabled={isAnalyzing || !url.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  分析招聘信息
                </>
              )}
            </button>
          </div>
        )}

        {/* 文本粘贴模式 */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                职位描述文本
              </label>
              <span className="text-xs text-gray-500">
                {jobText.length} 字
              </span>
            </div>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="请粘贴职位描述内容，包括：&#10;- 职位名称&#10;- 岗位职责&#10;- 任职要求&#10;- 技能要求&#10;&#10;支持从BOSS直聘、拉勾网等网站复制..."
              className="w-full h-48 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />

            {/* 快速提示 */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">粘贴示例：</span>
              <button
                onClick={() => setJobText(`【Java开发工程师】

岗位职责：
1. 负责公司核心产品的后端开发
2. 参与系统架构设计和技术选型
3. 编写高质量代码，进行Code Review

任职要求：
1. 3年以上Java开发经验
2. 熟悉Spring Boot、MySQL、Redis
3. 有微服务架构经验优先`)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Java开发示例
              </button>
              <button
                onClick={() => setJobText(`【前端开发工程师】

岗位职责：
1. 负责Web前端开发和维护
2. 优化前端性能和用户体验
3. 与后端协作完成接口对接

技能要求：
1. 精通React/Vue框架
2. 熟悉TypeScript、Webpack
3. 了解Node.js后端开发`)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                前端开发示例
              </button>
            </div>

            {/* 分析按钮 */}
            <button
              onClick={analyzeJobText}
              disabled={isAnalyzing || jobText.trim().length < 50}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <ClipboardPaste className="w-4 h-4" />
                  分析职位文本
                </>
              )}
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 分析结果 */}
        {renderAnalysisResult()}

        {/* 使用说明 */}
        {!analysisResult && !isAnalyzing && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              如何使用
            </h4>
            {activeTab === 'url' ? (
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                  复制招聘网页链接（支持BOSS直聘、拉勾网等）
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                  粘贴到上方输入框并点击"分析招聘信息"
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                  系统将自动提取职位要求并生成针对性面试问题
                </li>
              </ol>
            ) : (
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                  从招聘网站复制职位描述文本（BOSS直聘等需要登录的网站）
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                  粘贴到文本框中，确保包含职位要求和技能要求
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                  点击"分析职位文本"生成面试问题
                </li>
              </ol>
            )}
          </div>
        )}
      </div>

      {/* 网页预览弹窗 */}
      {showPreview && activeTab === 'url' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">网页预览</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <iframe
                src={url}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="招聘网页预览"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobAnalysisPanel;
