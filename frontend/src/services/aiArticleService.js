// AI 文章生成服务
// 调用后端 AI 接口生成爆款文章

import { authenticatedFetch } from '../utils/api';

const API_BASE = '/api';

class AIArticleService {
  constructor() {
    this.cache = new Map();
  }

  // 使用 AI 生成公众号文章
  async generateArticle(repo, details = null, style = 'viral') {
    const cacheKey = `${repo.fullName || repo.full_name}-${style}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 准备项目数据
      const repoData = {
        name: repo.name,
        fullName: repo.fullName || repo.full_name,
        description: repo.description || details?.description || '',
        stars: repo.stars || details?.stars || 0,
        forks: repo.forks || details?.forks || 0,
        language: repo.language || details?.language || '开源',
        htmlUrl: repo.htmlUrl || repo.html_url,
        topics: details?.topics || repo.topics || [],
        license: details?.license,
        createdAt: details?.createdAt,
        pushedAt: details?.pushedAt,
        topContributors: details?.topContributors || [],
        readmePreview: details?.readmePreview || '',
        readmeContent: details?.readmeContent?.substring(0, 3000) || '', // 限制长度
      };

      // 调用 AI 生成接口
      const response = await authenticatedFetch(`${API_BASE}/ai/generate-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: repoData,
          style,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('AI 生成失败');
      }

      const result = await response.json();
      
      // 缓存结果
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('AI 文章生成失败:', error);
      throw error;
    }
  }

  // 优化现有文章
  async optimizeArticle(article, optimizationType = 'viral') {
    try {
      const response = await authenticatedFetch(`${API_BASE}/ai/optimize-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article,
          optimizationType,
        }),
      });

      if (!response.ok) {
        throw new Error('文章优化失败');
      }

      return await response.json();
    } catch (error) {
      console.error('文章优化失败:', error);
      throw error;
    }
  }

  // 生成文章标题变体
  async generateTitleVariants(repo, count = 5) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/ai/generate-titles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: {
            name: repo.name,
            description: repo.description,
            stars: repo.stars,
            language: repo.language,
          },
          count,
        }),
      });

      if (!response.ok) {
        throw new Error('标题生成失败');
      }

      return await response.json();
    } catch (error) {
      console.error('标题生成失败:', error);
      throw error;
    }
  }

  // 清空缓存
  clearCache() {
    this.cache.clear();
  }
}

// 创建单例
const aiArticleService = new AIArticleService();

export default aiArticleService;
export { AIArticleService };
