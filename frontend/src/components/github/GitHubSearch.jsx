import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Github,
  Star,
  GitFork,
  Loader2,
  AlertCircle,
  Filter,
  ChevronDown,
} from 'lucide-react';
import githubService from '../../services/githubService';

const SORT_OPTIONS = [
  { value: 'stars', label: '星标数' },
  { value: 'forks', label: '分支数' },
  { value: 'updated', label: '最近更新' },
  { value: 'name', label: '名称' },
];

const ORDER_OPTIONS = [
  { value: 'desc', label: '降序' },
  { value: 'asc', label: '升序' },
];

function GitHubSearch({ onClose, onSelectRepo, isMobile }) {
  const [query, setQuery] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [userRepos, setUserRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUserRepos, setIsLoadingUserRepos] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('stars');
  const [order, setOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'search'

  // Load user's repositories on mount
  useEffect(() => {
    loadUserRepositories();
  }, []);

  const loadUserRepositories = async () => {
    setIsLoadingUserRepos(true);
    try {
      const data = await githubService.getUserRepositories('owner', 'updated', 1, 50);
      setUserRepos(data.repositories || []);
    } catch (err) {
      console.error('Failed to load user repos:', err);
    } finally {
      setIsLoadingUserRepos(false);
    }
  };

  const handleSearch = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!query.trim()) return;

      setIsLoading(true);
      setError(null);
      setActiveTab('search');

      try {
        const data = await githubService.searchRepositories(query, sort, order, 1, 30);
        setRepositories(data.repositories || []);
      } catch (err) {
        setError(err.message || '搜索失败');
        setRepositories([]);
      } finally {
        setIsLoading(false);
      }
    },
    [query, sort, order]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() && activeTab === 'search') {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, sort, order, activeTab, handleSearch]);

  const handleSelect = (repo) => {
    onSelectRepo(repo);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderRepoList = (repos, emptyMessage) => {
    if (repos.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Github className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => handleSelect(repo)}
            className="w-full text-left p-4 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              <img
                src={repo.owner?.avatarUrl || `https://github.com/${repo.fullName.split('/')[0]}.png`}
                alt={repo.owner?.username}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{repo.fullName}</h4>
                  {repo.private && (
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">私有</span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {formatNumber(repo.stars)}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-4 h-4" />
                    {formatNumber(repo.forks)}
                  </span>
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-primary" />
                      {repo.language}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Github className="w-5 h-5" />
            选择仓库
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索 GitHub 仓库..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              <Filter className="w-4 h-4" />
              筛选
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {showFilters && (
              <>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-input rounded-md bg-background"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-input rounded-md bg-background"
                >
                  {ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'user'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            我的仓库
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            搜索结果
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'user' ? (
            isLoadingUserRepos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderRepoList(userRepos, '暂无仓库')
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            renderRepoList(repositories, '未找到匹配的仓库')
          )}
        </div>
      </div>
    </div>
  );
}

export default GitHubSearch;
