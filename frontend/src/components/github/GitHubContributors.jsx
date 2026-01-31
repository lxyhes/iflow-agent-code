import React, { useState, useEffect } from 'react';
import {
  Users,
  Loader2,
  AlertCircle,
  ExternalLink,
  GitCommit,
  TrendingUp,
  Award,
} from 'lucide-react';
import githubService from '../../services/githubService';

function GitHubContributors({ owner, repo, isMobile }) {
  const [contributors, setContributors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContributors();
  }, [owner, repo]);

  const fetchContributors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await githubService.getContributors(owner, repo);
      setContributors(data.contributors || []);
    } catch (err) {
      setError(err.message || '获取贡献者信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const totalContributions = contributors.reduce(
    (sum, c) => sum + c.contributions,
    0
  );
  const topContributor = contributors[0];
  const averageContributions =
    contributors.length > 0
      ? Math.round(totalContributions / contributors.length)
      : 0;

  // Get rank color
  const getRankColor = (index) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  // Get rank badge
  const getRankBadge = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive mb-2">{error}</p>
        <button
          onClick={fetchContributors}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重试
        </button>
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Users className="w-12 h-12 mb-4 opacity-50" />
        <p>暂无贡献者信息</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">贡献者总数</span>
            </div>
            <p className="text-2xl font-bold">{contributors.length}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <GitCommit className="w-4 h-4" />
              <span className="text-sm">总提交数</span>
            </div>
            <p className="text-2xl font-bold">{totalContributions.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">平均贡献</span>
            </div>
            <p className="text-2xl font-bold">{averageContributions}</p>
          </div>
        </div>

        {/* Top Contributor Highlight */}
        {topContributor && (
          <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={topContributor.avatarUrl}
                  alt={topContributor.username}
                  className="w-16 h-16 rounded-full border-2 border-yellow-400"
                />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
                  🥇
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">顶级贡献者</p>
                <a
                  href={topContributor.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-bold text-primary hover:underline flex items-center gap-2"
                >
                  {topContributor.username}
                  <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  {topContributor.contributions.toLocaleString()} 次贡献
                  {' · '}
                  {((topContributor.contributions / totalContributions) * 100).toFixed(1)}%
                </p>
              </div>
              <Award className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
        )}

        {/* Contributors List */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              贡献者列表
            </h3>
          </div>
          <div className="divide-y divide-border">
            {contributors.map((contributor, index) => (
              <div
                key={contributor.username}
                className="p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={`w-10 text-center font-bold ${getRankColor(index)}`}
                  >
                    {getRankBadge(index)}
                  </div>

                  {/* Avatar */}
                  <a
                    href={contributor.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <img
                      src={contributor.avatarUrl}
                      alt={contributor.username}
                      className="w-10 h-10 rounded-full hover:ring-2 hover:ring-primary transition-all"
                    />
                  </a>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <a
                      href={contributor.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary hover:underline flex items-center gap-1"
                    >
                      {contributor.username}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {contributor.contributions.toLocaleString()} 次贡献
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({((contributor.contributions / totalContributions) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="hidden sm:block w-32">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(contributor.contributions / topContributor.contributions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contribution Distribution */}
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold mb-4">贡献分布</h3>
          <div className="space-y-3">
            {contributors.slice(0, 10).map((contributor, index) => (
              <div key={contributor.username} className="flex items-center gap-3">
                <span className="w-6 text-sm text-muted-foreground text-right">
                  {index + 1}
                </span>
                <img
                  src={contributor.avatarUrl}
                  alt={contributor.username}
                  className="w-6 h-6 rounded-full"
                />
                <div className="flex-1">
                  <div
                    className="h-6 bg-primary/80 rounded flex items-center px-2 text-xs text-white"
                    style={{
                      width: `${Math.max((contributor.contributions / topContributor.contributions) * 100, 5)}%`,
                    }}
                  >
                    {contributor.contributions.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitHubContributors;
