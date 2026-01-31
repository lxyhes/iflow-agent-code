import React, { useState, useEffect, useCallback } from 'react';
import {
  Github,
  Search,
  Star,
  GitFork,
  Eye,
  AlertCircle,
  GitBranch,
  GitCommit,
  Users,
  Tag,
  Book,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  Calendar,
  Lock,
  Globe,
  Loader2,
  X,
  Check,
  Settings,
  TrendingUp,
} from 'lucide-react';
import githubService from '../services/githubService';
import GitHubRepoInfo from './github/GitHubRepoInfo';
import GitHubCommits from './github/GitHubCommits';
import GitHubContributors from './github/GitHubContributors';
import GitHubCharts from './github/GitHubCharts';
import GitHubAuth from './github/GitHubAuth';
import GitHubSearch from './github/GitHubSearch';
import GitHubTrending from './github/GitHubTrending';

const TABS = [
  { id: 'overview', label: '概览', icon: Book },
  { id: 'commits', label: '提交历史', icon: GitCommit },
  { id: 'contributors', label: '贡献者', icon: Users },
  { id: 'charts', label: '统计图表', icon: Code },
  { id: 'trending', label: '热门项目', icon: TrendingUp },
];

function GitHubPanel({ isMobile }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [repoUrl, setRepoUrl] = useState('');
  const [parsedRepo, setParsedRepo] = useState(null);
  const [repository, setRepository] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsCheckingAuth(true);
    const token = githubService.getToken();
    if (token) {
      const valid = await githubService.validateToken();
      setIsAuthenticated(valid);
      if (!valid) {
        githubService.clearToken();
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsCheckingAuth(false);
  };

  const handleAuth = (token) => {
    githubService.setToken(token);
    setIsAuthenticated(true);
    setError(null);
  };

  const handleLogout = () => {
    githubService.clearToken();
    setIsAuthenticated(false);
    setRepository(null);
    setParsedRepo(null);
    setRepoUrl('');
  };

  // Parse GitHub URL
  const parseRepoUrl = (url) => {
    if (!url) return null;

    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    }

    return null;
  };

  const handleRepoUrlSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseRepoUrl(repoUrl);
    if (parsed) {
      setParsedRepo(parsed);
      await fetchRepository(parsed.owner, parsed.repo);
    } else {
      setError('无效的 GitHub 仓库地址，请使用格式: owner/repo 或 https://github.com/owner/repo');
    }
  };

  const fetchRepository = async (owner, repo) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await githubService.getRepository(owner, repo);
      setRepository(data);
    } catch (err) {
      setError(err.message || '获取仓库信息失败');
      setRepository(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (parsedRepo) {
      fetchRepository(parsedRepo.owner, parsedRepo.repo);
    }
  };

  const handleSelectRepo = (selectedRepo) => {
    const parsed = {
      owner: selectedRepo.fullName.split('/')[0],
      repo: selectedRepo.fullName.split('/')[1],
    };
    setRepoUrl(`https://github.com/${selectedRepo.fullName}`);
    setParsedRepo(parsed);
    setShowSearch(false);
    fetchRepository(parsed.owner, parsed.repo);
  };

  if (isCheckingAuth) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GitHubAuth onAuth={handleAuth} />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold">GitHub</h2>
          {repository && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              / {repository.fullName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {repository && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="搜索仓库"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Repository Input */}
      <div className="border-b border-border px-4 py-3">
        <form onSubmit={handleRepoUrlSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="输入 GitHub 仓库地址 (例如: owner/repo 或 https://github.com/owner/repo)"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !repoUrl.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '加载'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            // trending tab is always available, others require repository
            const isDisabled = !repository && tab.id !== 'trending';
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'trending' ? (
          <div className="h-full overflow-y-auto">
            <GitHubTrending
              onSelectRepo={handleSelectRepo}
              isMobile={isMobile}
            />
          </div>
        ) : !repository ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
            <Github className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">输入 GitHub 仓库地址开始</p>
            <p className="text-sm text-center max-w-md">
              支持格式: owner/repo 或 https://github.com/owner/repo
            </p>
            <button
              onClick={() => setShowSearch(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              <Search className="w-4 h-4" />
              搜索仓库
            </button>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {activeTab === 'overview' && (
              <GitHubRepoInfo repository={repository} isMobile={isMobile} />
            )}
            {activeTab === 'commits' && (
              <GitHubCommits
                owner={parsedRepo.owner}
                repo={parsedRepo.repo}
                defaultBranch={repository.defaultBranch}
                isMobile={isMobile}
              />
            )}
            {activeTab === 'contributors' && (
              <GitHubContributors
                owner={parsedRepo.owner}
                repo={parsedRepo.repo}
                isMobile={isMobile}
              />
            )}
            {activeTab === 'charts' && (
              <GitHubCharts
                owner={parsedRepo.owner}
                repo={parsedRepo.repo}
                isMobile={isMobile}
              />
            )}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <GitHubSearch
          onClose={() => setShowSearch(false)}
          onSelectRepo={handleSelectRepo}
          isMobile={isMobile}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-background rounded-lg shadow-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">GitHub 设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-accent rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">已认证</p>
                    <p className="text-sm text-muted-foreground">GitHub 令牌有效</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GitHubPanel;
