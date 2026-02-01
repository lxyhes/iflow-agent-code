import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  TrendingUp,
  Star,
  GitFork,
  ExternalLink,
  Loader2,
  AlertCircle,
  Flame,
  Calendar,
  Code,
  ChevronRight,
  FileText,
} from 'lucide-react';
import githubService from '../../services/githubService';

const GitHubArticleGenerator = lazy(() => import('./GitHubArticleGenerator'));

const TIME_RANGES = [
  { value: 'daily', label: '今日', icon: Flame },
  { value: 'weekly', label: '本周', icon: Calendar },
  { value: 'monthly', label: '本月', icon: Calendar },
  { value: 'yearly', label: '今年', icon: Calendar },
  { value: 'all', label: '全部时间', icon: Star },
];

const SORT_OPTIONS = [
  { value: 'stars', label: '最多 Star', icon: Star },
  { value: 'forks', label: '最多 Fork', icon: GitFork },
  { value: 'updated', label: '最近更新', icon: Calendar },
  { value: 'created', label: '最新创建', icon: Flame },
];

function GitHubTrending({ onSelectRepo, isMobile }) {
  const [repositories, setRepositories] = useState([]);
  const [languages, setLanguages] = useState([{ value: 'all', label: '所有语言' }]);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('daily');
  const [selectedSort, setSelectedSort] = useState('stars');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRepoForArticle, setSelectedRepoForArticle] = useState(null);

  useEffect(() => {
    loadLanguages();
    loadTrending();
  }, []);

  useEffect(() => {
    loadTrending();
  }, [selectedLanguage, selectedTimeRange, selectedSort]);

  const loadLanguages = async () => {
    try {
      const data = await githubService.getPopularLanguages();
      setLanguages(data.languages || []);
    } catch (err) {
      console.error('Failed to load languages:', err);
    }
  };

  const loadTrending = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await githubService.getTrending(selectedLanguage, selectedTimeRange, selectedSort);
      setRepositories(data.repositories || []);
    } catch (err) {
      setError(err.message || '获取热门项目失败');
      setRepositories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Language colors
  const languageColors = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#239120',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
  };

  if (isLoading && repositories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && repositories.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive mb-2">{error}</p>
        <button
          onClick={loadTrending}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              热门项目
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              发现 GitHub 上最受欢迎的开源项目
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Time Range */}
          <div className="flex flex-wrap bg-muted rounded-lg p-1">
            {TIME_RANGES.map((range) => {
              const Icon = range.icon;
              return (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedTimeRange === range.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {range.label}
                </button>
              );
            })}
          </div>

          {/* Second Row: Sort and Language */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Sort Options */}
            <div className="flex bg-muted rounded-lg p-1">
              {SORT_OPTIONS.map((sort) => {
                const Icon = sort.icon;
                return (
                  <button
                    key={sort.value}
                    onClick={() => setSelectedSort(sort.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      selectedSort === sort.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {sort.label}
                  </button>
                );
              })}
            </div>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Repositories List */}
        {!isLoading && (
          <div className="space-y-3">
            {repositories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无热门项目数据</p>
              </div>
            ) : (
              repositories.map((repo, index) => (
                <div
                  key={repo.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {index < 3 ? (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : index === 1
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <img
                              src={repo.owner.avatarUrl}
                              alt={repo.owner.username}
                              className="w-5 h-5 rounded-full"
                            />
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary hover:underline truncate"
                            >
                              {repo.fullName}
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {repo.description || '暂无描述'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() =>
                              onSelectRepo({
                                fullName: repo.fullName,
                                name: repo.name,
                                owner: repo.owner,
                              })
                            }
                            className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="查看详情"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setSelectedRepoForArticle(repo)}
                            className="flex-shrink-0 p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="生成公众号文章"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
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
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  languageColors[repo.language] || '#8b949e',
                              }}
                            />
                            {repo.language}
                          </span>
                        )}
                        <span className="text-xs">
                          创建于 {formatDate(repo.createdAt)}
                        </span>
                      </div>

                      {/* Topics */}
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {repo.topics.slice(0, 5).map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                          {repo.topics.length > 5 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                              +{repo.topics.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        {repositories.length > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            显示 {repositories.length} 个热门项目
          </div>
        )}
      </div>

      {/* Article Generator Modal */}
      {selectedRepoForArticle && (
        <Suspense fallback={null}>
          <GitHubArticleGenerator
            repo={selectedRepoForArticle}
            onClose={() => setSelectedRepoForArticle(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default GitHubTrending;
