import React, { useState, useEffect } from 'react';
import {
  Star,
  GitFork,
  Eye,
  AlertCircle,
  GitBranch,
  FileText,
  Calendar,
  Lock,
  Globe,
  ExternalLink,
  Tag,
  Loader2,
} from 'lucide-react';
import githubService from '../../services/githubService';

function GitHubRepoInfo({ repository, isMobile }) {
  const [languages, setLanguages] = useState([]);
  const [branches, setBranches] = useState([]);
  const [releases, setReleases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const owner = repository.fullName.split('/')[0];
  const repo = repository.name;

  useEffect(() => {
    fetchAdditionalData();
  }, [repository]);

  const fetchAdditionalData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [languagesData, branchesData, releasesData] = await Promise.all([
        githubService.getLanguages(owner, repo).catch(() => ({ languages: [] })),
        githubService.getBranches(owner, repo).catch(() => ({ branches: [] })),
        githubService.getReleases(owner, repo).catch(() => ({ releases: [] })),
      ]);

      setLanguages(languagesData.languages || []);
      setBranches(branchesData.branches || []);
      setReleases(releasesData.releases || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSize = (size) => {
    if (size < 1024) return `${size} KB`;
    return `${(size / 1024).toFixed(2)} MB`;
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
    React: '#61dafb',
  };

  return (
    <div className="p-4 space-y-6">
      {/* Repository Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{repository.name}</h1>
            <p className="text-sm text-muted-foreground">{repository.fullName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {repository.isPrivate ? (
              <span className="flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-full">
                <Lock className="w-3 h-3" />
                私有
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-full">
                <Globe className="w-3 h-3" />
                公开
              </span>
            )}
          </div>
        </div>

        {repository.description && (
          <p className="text-muted-foreground">{repository.description}</p>
        )}

        {/* Topics */}
        {repository.topics && repository.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {repository.topics.map((topic) => (
              <span
                key={topic}
                className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="w-4 h-4" />
              <span className="text-xs">星标</span>
            </div>
            <p className="text-lg font-semibold">{repository.stars.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <GitFork className="w-4 h-4" />
              <span className="text-xs">分支</span>
            </div>
            <p className="text-lg font-semibold">{repository.forks.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs">关注</span>
            </div>
            <p className="text-lg font-semibold">{repository.watchers.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">问题</span>
            </div>
            <p className="text-lg font-semibold">{repository.openIssues.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Repository Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="p-4 border border-border rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              基本信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">默认分支</span>
                <span className="font-medium flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {repository.defaultBranch}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">仓库大小</span>
                <span className="font-medium">{formatSize(repository.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span className="font-medium">{formatDate(repository.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最后更新</span>
                <span className="font-medium">{formatDate(repository.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最后推送</span>
                <span className="font-medium">{formatDate(repository.pushedAt)}</span>
              </div>
              {repository.license && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">许可证</span>
                  <span className="font-medium">{repository.license}</span>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="p-4 border border-border rounded-lg space-y-3">
            <h3 className="font-semibold">链接</h3>
            <div className="space-y-2">
              <a
                href={repository.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                在 GitHub 上查看
              </a>
              {repository.homepage && (
                <a
                  href={repository.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  项目主页
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Languages */}
          {languages.length > 0 && (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <h3 className="font-semibold">编程语言</h3>
              <div className="space-y-2">
                {/* Language Bar */}
                <div className="h-2 flex rounded-full overflow-hidden">
                  {languages.map((lang) => (
                    <div
                      key={lang.name}
                      style={{
                        width: `${lang.percentage}%`,
                        backgroundColor: languageColors[lang.name] || '#8b949e',
                      }}
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>
                {/* Language List */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {languages.slice(0, 6).map((lang) => (
                    <div key={lang.name} className="flex items-center gap-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: languageColors[lang.name] || '#8b949e' }}
                      />
                      <span>{lang.name}</span>
                      <span className="text-muted-foreground">{lang.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Branches */}
          {branches.length > 0 && (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                分支 ({branches.length})
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {branches.slice(0, 10).map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="font-mono truncate">{branch.name}</span>
                    {branch.protected && (
                      <span className="text-xs text-muted-foreground">受保护</span>
                    )}
                  </div>
                ))}
                {branches.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    还有 {branches.length - 10} 个分支...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recent Releases */}
          {releases.length > 0 && (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" />
                最近发布
              </h3>
              <div className="space-y-2">
                {releases.slice(0, 5).map((release) => (
                  <div
                    key={release.id}
                    className="flex items-start justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <a
                        href={release.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline truncate block"
                      >
                        {release.name || release.tagName}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(release.publishedAt)}
                      </p>
                    </div>
                    {release.prerelease && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                        预发布
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default GitHubRepoInfo;
