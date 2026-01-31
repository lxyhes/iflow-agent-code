import React, { useState } from 'react';
import { Github, Key, ExternalLink, Eye, EyeOff, AlertCircle } from 'lucide-react';

function GitHubAuth({ onAuth }) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Validate token by making a test request
      const response = await fetch('/api/github/user?token=' + encodeURIComponent(token));
      if (response.ok) {
        onAuth(token);
      } else {
        const data = await response.json();
        setError(data.error || '无效的 GitHub 令牌');
      }
    } catch (err) {
      setError('验证令牌时出错: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Github className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">连接到 GitHub</h2>
          <p className="text-muted-foreground">
            输入您的 GitHub 个人访问令牌以访问仓库信息
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              GitHub 个人访问令牌
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 pr-10 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !token.trim()}
            className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                验证中...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                连接
              </>
            )}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">如何获取 GitHub 令牌?</p>
          <a
            href="https://github.com/settings/tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            创建个人访问令牌
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-xs text-muted-foreground">
            需要至少 repo 权限以访问仓库信息
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">所需权限:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>repo - 访问仓库代码和提交历史</li>
            <li>read:user - 读取用户信息</li>
            <li>read:org - 读取组织信息（可选）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GitHubAuth;
