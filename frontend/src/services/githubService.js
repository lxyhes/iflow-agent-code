import { authenticatedFetch } from '../utils/api';

const API_BASE = '/api/github';

class GitHubService {
  constructor() {
    this.token = localStorage.getItem('github-token') || '';
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('github-token', token);
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = '';
    localStorage.removeItem('github-token');
  }

  // Helper to build URL with token
  buildUrl(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    if (this.token) {
      url.searchParams.append('token', this.token);
    }
    return url.toString();
  }

  // Repository Information
  async getRepository(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/repo', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch repository');
    }
    return response.json();
  }

  // Commits
  async getCommits(owner, repo, branch, page = 1, perPage = 30) {
    const response = await authenticatedFetch(
      this.buildUrl('/commits', { owner, repo, branch, page, perPage })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch commits');
    }
    return response.json();
  }

  // Contributors
  async getContributors(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/contributors', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch contributors');
    }
    return response.json();
  }

  // Commit Activity (for charts)
  async getCommitActivity(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/commit-activity', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch commit activity');
    }
    return response.json();
  }

  // Code Frequency (additions/deletions)
  async getCodeFrequency(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/code-frequency', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch code frequency');
    }
    return response.json();
  }

  // Branches
  async getBranches(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/branches', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch branches');
    }
    return response.json();
  }

  // Pull Requests
  async getPullRequests(owner, repo, state = 'open') {
    const response = await authenticatedFetch(
      this.buildUrl('/pull-requests', { owner, repo, state })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch pull requests');
    }
    return response.json();
  }

  // Issues
  async getIssues(owner, repo, state = 'open') {
    const response = await authenticatedFetch(
      this.buildUrl('/issues', { owner, repo, state })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch issues');
    }
    return response.json();
  }

  // Repository Contents
  async getContents(owner, repo, path = '', ref) {
    const params = { owner, repo, path };
    if (ref) params.ref = ref;
    const response = await authenticatedFetch(this.buildUrl('/contents', params));
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch contents');
    }
    return response.json();
  }

  // Languages
  async getLanguages(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/languages', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch languages');
    }
    return response.json();
  }

  // Releases
  async getReleases(owner, repo) {
    const response = await authenticatedFetch(
      this.buildUrl('/releases', { owner, repo })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch releases');
    }
    return response.json();
  }

  // Search Repositories
  async searchRepositories(query, sort, order, page = 1, perPage = 30) {
    const response = await authenticatedFetch(
      this.buildUrl('/search', { q: query, sort, order, page, perPage })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search repositories');
    }
    return response.json();
  }

  // User's Repositories
  async getUserRepositories(type = 'owner', sort = 'updated', page = 1, perPage = 30) {
    const response = await authenticatedFetch(
      this.buildUrl('/user/repos', { type, sort, page, perPage })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user repositories');
    }
    return response.json();
  }

  // Authenticated User Info
  async getAuthenticatedUser() {
    const response = await authenticatedFetch(this.buildUrl('/user'));
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user info');
    }
    return response.json();
  }

  // Get trending repositories
  async getTrending(language = 'all', since = 'daily') {
    const response = await authenticatedFetch(
      this.buildUrl('/trending', { language, since })
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch trending repositories');
    }
    return response.json();
  }

  // Get popular languages
  async getPopularLanguages() {
    const response = await authenticatedFetch(this.buildUrl('/languages/popular'));
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch popular languages');
    }
    return response.json();
  }

  // Validate token
  async validateToken() {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const githubService = new GitHubService();

export default githubService;
export { GitHubService };
