import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Copy,
  Download,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Edit3,
  Eye,
  Code,
  Type,
  Palette,
  Share2,
  Loader2,
  Wand2,
  Bot,
} from 'lucide-react';
import articleGenerator from '../../services/articleGenerator';
import githubService from '../../services/githubService';
import aiArticleService from '../../services/aiArticleService';

const EXPORT_FORMATS = [
  { id: 'markdown', label: 'Markdown', icon: Code },
  { id: 'wechat', label: '公众号HTML', icon: Palette },
  { id: 'text', label: '纯文本', icon: Type },
];

function GitHubArticleGenerator({ repo, onClose }) {
  const [article, setArticle] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [exportFormat, setExportFormat] = useState('markdown');
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [generationMode, setGenerationMode] = useState('template'); // 'template' | 'ai'
  const contentRef = useRef(null);

  // 加载项目详情并生成文章
  useEffect(() => {
    const loadRepoDetails = async () => {
      setIsLoading(true);
      setLoadingError(null);
      try {
        const [owner, repoName] = (repo.fullName || repo.full_name).split('/');
        const details = await githubService.getRepoDetails(owner, repoName);
        setRepoDetails(details);
        const generatedArticle = articleGenerator.generateArticle(repo, details);
        setArticle(generatedArticle);
      } catch (error) {
        console.error('加载项目详情失败:', error);
        setLoadingError(error.message);
        // 使用基础数据生成文章
        const generatedArticle = articleGenerator.generateArticle(repo);
        setArticle(generatedArticle);
      } finally {
        setIsLoading(false);
      }
    };

    loadRepoDetails();
  }, [repo]);

  // 重新生成文章（模板模式）
  const handleRegenerate = () => {
    setIsRegenerating(true);
    setGenerationMode('template');
    setTimeout(() => {
      const newArticle = articleGenerator.generateArticle(repo, repoDetails);
      setArticle(newArticle);
      setIsRegenerating(false);
    }, 500);
  };

  // AI 重新生成文章
  const handleAIGenerate = async () => {
    console.log('🚀 AI 重写按钮被点击');
    setIsAIGenerating(true);
    setAiError(null);
    setGenerationMode('ai');
    try {
      console.log('📡 调用 AI 服务...', { repo: repo.name, hasDetails: !!repoDetails });
      const aiResult = await aiArticleService.generateArticle(repo, repoDetails, 'viral', true);
      console.log('✅ AI 返回结果:', aiResult);
      
      // 检查 AI 返回的数据是否有效
      if (!aiResult || typeof aiResult !== 'object') {
        throw new Error('AI 返回数据格式错误');
      }
      
      // 转换 AI 结果为组件需要的格式
      // 注意：AI 可能返回 motion 或 emotion，都兼容
      const formattedArticle = {
        title: aiResult.title || articleGenerator.generateTitle(repo, repoDetails),
        hook: aiResult.hook || articleGenerator.generateHook(repo, repoDetails),
        emotion: aiResult.emotion || aiResult.motion || articleGenerator.generateEmotionSection(repo, repoDetails),
        overview: {
          name: repo.name,
          fullName: repo.fullName || repo.full_name,
          description: repo.description || repoDetails?.description || '',
          stars: formatNumber(repo.stars || repoDetails?.stars || 0),
          forks: formatNumber(repo.forks || repoDetails?.forks || 0),
          watchers: formatNumber(repoDetails?.watchers || 0),
          language: repo.language || repoDetails?.language || '多语言',
          url: repo.htmlUrl || repo.html_url || '',
          topics: repoDetails?.topics || repo.topics || [],
          license: repoDetails?.license || null,
        },
        highlights: aiResult.highlights || articleGenerator.generateHighlights(repo, repoDetails),
        cases: aiResult.cases || articleGenerator.generateCases(repo, repoDetails),
        quickStart: aiResult.quickStart || articleGenerator.generateQuickStart(repo, repoDetails),
        testimonials: aiResult.testimonials || articleGenerator.generateTestimonials(repo, repoDetails),
        tags: aiResult.tags || articleGenerator.generateTags(repo, repoDetails),
        cta: {
          text: `👆 点击阅读原文，给 ${repo.name} 点个 Star 支持一下！`,
          bonus: '关注本公众号，回复「项目名」获取完整使用教程和最佳实践',
          actions: [
            '🔥 太棒了，马上试试！',
            '💡 有点意思，先收藏',
            '🤔 一般般，观望中',
          ],
        },
      };
      console.log('📝 格式化后的文章:', formattedArticle);
      setArticle(formattedArticle);
    } catch (error) {
      console.error('❌ AI 生成失败:', error);
      // 检查是否是服务未配置的错误
      let errorMsg = 'AI 生成失败，已使用模板生成';
      if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
        errorMsg = 'AI 服务未配置，已使用模板生成文章。如需 AI 功能，请配置 IFLOW_API_KEY 环境变量。';
      } else if (error.message) {
        errorMsg = `AI 生成失败: ${error.message}`;
      }
      setAiError(errorMsg);
      
      // 使用模板作为后备
      const fallbackArticle = articleGenerator.generateArticle(repo, repoDetails);
      setArticle(fallbackArticle);
      // 切换回模板模式
      setGenerationMode('template');
    } finally {
      setIsAIGenerating(false);
      console.log('🏁 AI 生成流程结束');
    }
  };

  // 格式化数字
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // 获取导出内容
  const getExportContent = () => {
    switch (exportFormat) {
      case 'markdown':
        return articleGenerator.exportToMarkdown(article);
      case 'wechat':
        return articleGenerator.exportToWechat(article);
      case 'text':
        return articleGenerator.exportToMarkdown(article).replace(/[#*`_\[\]]/g, '');
      default:
        return articleGenerator.exportToMarkdown(article);
    }
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getExportContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 下载文件
  const handleDownload = () => {
    const content = getExportContent();
    const extensions = {
      markdown: 'md',
      wechat: 'html',
      text: 'txt',
    };
    const mimeTypes = {
      markdown: 'text/markdown',
      wechat: 'text/html',
      text: 'text/plain',
    };

    const blob = new Blob([content], { type: mimeTypes[exportFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.overview.name}_公众号文章.${extensions[exportFormat]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 渲染预览内容
  const renderPreview = () => {
    return (
      <div className="space-y-6">
        {/* 标题 */}
        <div className="border-b border-border pb-4">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle || article.title}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="flex-1 px-3 py-2 text-lg font-bold border border-input rounded-md bg-background"
                autoFocus
              />
              <button
                onClick={() => {
                  if (editedTitle) {
                    setArticle({ ...article, title: editedTitle });
                  }
                  setIsEditingTitle(false);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-md"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditedTitle('');
                  setIsEditingTitle(false);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-foreground">{article.title}</h1>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 钩子 */}
        <blockquote className="bg-muted border-l-4 border-primary p-4 italic text-foreground">
          {article.hook}
        </blockquote>

        {/* 项目速览 */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            项目速览
          </h2>
          <div className="space-y-2 text-sm">
            <p><strong>项目名称：</strong>{article.overview.name}</p>
            <p><strong>项目描述：</strong>{article.overview.description}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1">⭐ <strong>{article.overview.stars}</strong> Stars</span>
              <span className="flex items-center gap-1">🍴 <strong>{article.overview.forks}</strong> Forks</span>
              <span className="flex items-center gap-1">💻 <strong>{article.overview.language || '多语言'}</strong></span>
            </div>
            <p className="mt-2">
              <strong>项目地址：</strong>
              <a href={article.overview.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {article.overview.url}
              </a>
            </p>
          </div>
        </div>

        {/* 核心亮点 */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            核心亮点
          </h2>
          <div className="grid gap-3">
            {article.highlights.map((h, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4"
              >
                <h3 className="font-semibold text-primary mb-1">{h.title}</h3>
                <p className="text-sm text-muted-foreground">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 实战案例 */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            实战案例
          </h2>
          <div className="space-y-3">
            {article.cases.map((c, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">案例 {i + 1}</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">😫 <strong>以前：</strong>{c.before}</p>
                  <p className="text-muted-foreground">😊 <strong>现在：</strong>{c.after}</p>
                  <p className="text-green-600 font-semibold">🎉 {c.improvement}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 快速上手 */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            快速上手
          </h2>
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">安装</p>
              <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                <code>{article.quickStart.install}</code>
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">使用示例</p>
              <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                <code>{article.quickStart.usage}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* 用户评价 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">💬 用户评价</h2>
          <div className="space-y-3">
            {article.testimonials.map((t, i) => (
              <blockquote key={i} className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 italic">
                <p className="text-foreground">"{t.content}"</p>
                <p className="text-right text-sm text-muted-foreground mt-2">—— {t.role}</p>
              </blockquote>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold mb-2">🎁 福利时间</h3>
          <p className="mb-4">{article.cta.福利}</p>
          <p className="text-lg">{article.cta.text}</p>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // 渲染源码
  const renderSource = () => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {EXPORT_FORMATS.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    exportFormat === format.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {format.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
          </div>
        </div>
        <textarea
          ref={contentRef}
          value={getExportContent()}
          readOnly
          className="flex-1 w-full p-4 font-mono text-sm bg-muted rounded-lg resize-none focus:outline-none"
        />
      </div>
    );
  };

  // 渲染加载状态
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground">正在分析项目数据，生成文章...</p>
      <p className="text-xs text-muted-foreground">正在获取 README、贡献者等信息</p>
    </div>
  );

  // 渲染错误状态
  const renderError = () => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
        <span className="text-yellow-600 text-2xl">⚠️</span>
      </div>
      <div className="text-center">
        <p className="text-foreground font-medium">部分数据加载失败</p>
        <p className="text-sm text-muted-foreground mt-1">{loadingError}</p>
        <p className="text-xs text-muted-foreground mt-2">已使用基础数据生成文章</p>
      </div>
    </div>
  );

  // 渲染 AI 错误提示
  const renderAIError = () => {
    if (!aiError) return null;
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
        <span className="text-yellow-600">⚠️</span>
        {aiError}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-xl border border-border w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                公众号文章生成器
                {generationMode === 'ai' && (
                  <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    AI 生成
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                基于 {repo.name} 生成爆款文章
                {repoDetails && <span className="text-green-600 ml-2">✓ 已加载真实数据</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 模板重新生成 */}
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || isLoading || isAIGenerating}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50"
              title="使用模板重新生成"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              换一版
            </button>
            
            {/* AI 重新生成 */}
            <button
              onClick={handleAIGenerate}
              disabled={isAIGenerating || isLoading || isRegenerating}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 shadow-md"
              title="使用 AI 智能生成爆款文章"
            >
              {isAIGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  AI 重写
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('preview')}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 ${
                activeTab === 'preview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-4 h-4" />
              预览
            </button>
            <button
              onClick={() => setActiveTab('source')}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 ${
                activeTab === 'source'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="w-4 h-4" />
              源码
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderAIError()}
            {isLoading ? renderLoading() :
             loadingError && !article ? renderError() :
             activeTab === 'preview' ? renderPreview() : renderSource()}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            💡 提示：点击标题可编辑，支持 Markdown 和公众号 HTML 格式导出
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !article}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制内容'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !article}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              下载文章
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitHubArticleGenerator;
