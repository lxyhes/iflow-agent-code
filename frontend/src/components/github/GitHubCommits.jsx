import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GitCommit,
  GitBranch,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Hash,
} from 'lucide-react';
import githubService from '../../services/githubService';

function GitHubCommits({ owner, repo, defaultBranch, isMobile }) {
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedCommits, setExpandedCommits] = useState(new Set());
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const dropdownRef = useRef(null);
  const observerRef = useRef(null);
  const lastCommitRef = useRef(null);

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, [owner, repo]);

  // Fetch commits when branch changes
  useEffect(() => {
    if (selectedBranch) {
      setPage(1);
      setCommits([]);
      setHasMore(true);
      fetchCommits(1, true);
    }
  }, [selectedBranch, owner, repo]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowBranchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (lastCommitRef.current) {
      observer.observe(lastCommitRef.current);
    }

    return () => observer.disconnect();
  }, [commits, isLoading, isLoadingMore, hasMore]);

  const fetchBranches = async () => {
    try {
      const data = await githubService.getBranches(owner, repo);
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchCommits = async (pageNum, reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const data = await githubService.getCommits(
        owner,
        repo,
        selectedBranch,
        pageNum,
        30
      );

      const newCommits = data.commits || [];

      if (reset) {
        setCommits(newCommits);
      } else {
        setCommits((prev) => [...prev, ...newCommits]);
      }

      setHasMore(newCommits.length === 30);
    } catch (err) {
      setError(err.message || '获取提交历史失败');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCommits(nextPage, false);
    }
  };

  const toggleCommitExpanded = (sha) => {
    setExpandedCommits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sha)) {
        newSet.delete(sha);
      } else {
        newSet.add(sha);
      }
      return newSet;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCommitMessage = (message) => {
    const lines = message.split('\n');
    const title = lines[0];
    const body = lines.slice(1).filter((line) => line.trim()).join('\n');
    return { title, body };
  };

  if (isLoading && commits.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && commits.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive mb-2">{error}</p>
        <button
          onClick={() => fetchCommits(1, true)}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Branch Selector */}
      <div className="border-b border-border px-4 py-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            <span className="font-medium">{selectedBranch}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showBranchDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showBranchDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-background border border-border rounded-md shadow-lg z-10">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => {
                    setSelectedBranch(branch.name);
                    setShowBranchDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    branch.name === selectedBranch ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3 h-3" />
                    <span className="truncate">{branch.name}</span>
                    {branch.protected && (
                      <span className="text-xs text-muted-foreground">受保护</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commits List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {commits.map((commit, index) => {
            const { title, body } = formatCommitMessage(commit.message);
            const isExpanded = expandedCommits.has(commit.sha);
            const isLast = index === commits.length - 1;

            return (
              <div
                key={commit.sha}
                ref={isLast ? lastCommitRef : null}
                className="p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {commit.author?.avatar ? (
                      <img
                        src={commit.author.avatar}
                        alt={commit.author.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Commit Title */}
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => toggleCommitExpanded(commit.sha)}
                        className="flex-shrink-0 mt-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {commit.author?.name || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(commit.author?.date)}
                          </span>
                          {commit.author?.username && (
                            <span className="text-primary">
                              @{commit.author.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 pl-6 space-y-3">
                        {body && (
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {body}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 font-mono text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            {commit.sha.substring(0, 7)}
                          </span>
                          <a
                            href={commit.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            在 GitHub 上查看
                          </a>
                        </div>
                        {commit.committer && commit.committer.name !== commit.author?.name && (
                          <p className="text-xs text-muted-foreground">
                            提交者: {commit.committer.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading More */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* End of List */}
        {!hasMore && commits.length > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            已加载所有提交
          </div>
        )}

        {/* Empty State */}
        {!isLoading && commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitCommit className="w-12 h-12 mb-4 opacity-50" />
            <p>暂无提交记录</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GitHubCommits;
