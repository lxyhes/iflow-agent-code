import express from 'express';
import { Octokit } from '@octokit/rest';

const router = express.Router();

// Helper function to get Octokit instance
function getOctokit(token) {
  return new Octokit({
    auth: token,
  });
}

// Get repository information
router.get('/repo', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: repository } = await octokit.repos.get({ owner, repo });

    res.json({
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      watchers: repository.watchers_count,
      openIssues: repository.open_issues_count,
      language: repository.language,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
      defaultBranch: repository.default_branch,
      isPrivate: repository.private,
      isFork: repository.fork,
      htmlUrl: repository.html_url,
      cloneUrl: repository.clone_url,
      sshUrl: repository.ssh_url,
      topics: repository.topics || [],
      license: repository.license?.name || null,
      size: repository.size,
    });
  } catch (error) {
    console.error('GitHub repo error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch repository information',
      details: error.response?.data?.message,
    });
  }
});

// Get commit history
router.get('/commits', async (req, res) => {
  const { owner, repo, branch, page = 1, perPage = 30, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      page: parseInt(page),
      per_page: parseInt(perPage),
    });

    const formattedCommits = commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name,
        email: commit.commit.author?.email,
        date: commit.commit.author?.date,
        avatar: commit.author?.avatar_url,
        username: commit.author?.login,
      },
      committer: {
        name: commit.commit.committer?.name,
        email: commit.commit.committer?.email,
        date: commit.commit.committer?.date,
        avatar: commit.committer?.avatar_url,
        username: commit.committer?.login,
      },
      htmlUrl: commit.html_url,
      stats: commit.stats,
    }));

    res.json({ commits: formattedCommits });
  } catch (error) {
    console.error('GitHub commits error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch commits',
      details: error.response?.data?.message,
    });
  }
});

// Get contributors
router.get('/contributors', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: contributors } = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });

    const formattedContributors = contributors.map((contributor) => ({
      username: contributor.login,
      avatarUrl: contributor.avatar_url,
      htmlUrl: contributor.html_url,
      contributions: contributor.contributions,
    }));

    res.json({ contributors: formattedContributors });
  } catch (error) {
    console.error('GitHub contributors error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch contributors',
      details: error.response?.data?.message,
    });
  }
});

// Get commit activity (for charts)
router.get('/commit-activity', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: activity } = await octokit.repos.getCommitActivityStats({
      owner,
      repo,
    });

    // Format activity data for charts
    const formattedActivity = activity?.map((week) => ({
      week: week.week,
      total: week.total,
      days: week.days,
    })) || [];

    res.json({ activity: formattedActivity });
  } catch (error) {
    console.error('GitHub commit activity error:', error);
    // Return empty data instead of error for better UX
    res.json({ activity: [] });
  }
});

// Get code frequency (additions/deletions)
router.get('/code-frequency', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: frequency } = await octokit.repos.getCodeFrequencyStats({
      owner,
      repo,
    });

    // Format frequency data
    const formattedFrequency = frequency?.map((week) => ({
      week: week[0],
      additions: week[1],
      deletions: week[2],
    })) || [];

    res.json({ frequency: formattedFrequency });
  } catch (error) {
    console.error('GitHub code frequency error:', error);
    // Return empty data instead of error for better UX
    res.json({ frequency: [] });
  }
});

// Get branches
router.get('/branches', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    const formattedBranches = branches.map((branch) => ({
      name: branch.name,
      protected: branch.protected,
      commitSha: branch.commit.sha,
    }));

    res.json({ branches: formattedBranches });
  } catch (error) {
    console.error('GitHub branches error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch branches',
      details: error.response?.data?.message,
    });
  }
});

// Get pull requests
router.get('/pull-requests', async (req, res) => {
  const { owner, repo, state = 'open', token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state,
      per_page: 50,
    });

    const formattedPRs = prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
      author: {
        username: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      htmlUrl: pr.html_url,
      draft: pr.draft,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      comments: pr.comments,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    }));

    res.json({ pullRequests: formattedPRs });
  } catch (error) {
    console.error('GitHub pull requests error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch pull requests',
      details: error.response?.data?.message,
    });
  }
});

// Get issues
router.get('/issues', async (req, res) => {
  const { owner, repo, state = 'open', token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: 50,
    });

    const formattedIssues = issues
      .filter((issue) => !issue.pull_request) // Filter out pull requests
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at,
        author: {
          username: issue.user.login,
          avatarUrl: issue.user.avatar_url,
        },
        htmlUrl: issue.html_url,
        labels: issue.labels.map((label) => ({
          name: label.name,
          color: label.color,
        })),
        comments: issue.comments,
      }));

    res.json({ issues: formattedIssues });
  } catch (error) {
    console.error('GitHub issues error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch issues',
      details: error.response?.data?.message,
    });
  }
});

// Get repository contents
router.get('/contents', async (req, res) => {
  const { owner, repo, path = '', ref, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    // Handle both file and directory responses
    if (Array.isArray(contents)) {
      // Directory
      const formattedContents = contents.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        sha: item.sha,
        htmlUrl: item.html_url,
        downloadUrl: item.download_url,
      }));
      res.json({ contents: formattedContents });
    } else {
      // Single file
      res.json({
        content: {
          name: contents.name,
          path: contents.path,
          type: contents.type,
          size: contents.size,
          sha: contents.sha,
          content: contents.content,
          encoding: contents.encoding,
          htmlUrl: contents.html_url,
          downloadUrl: contents.download_url,
        },
      });
    }
  } catch (error) {
    console.error('GitHub contents error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch contents',
      details: error.response?.data?.message,
    });
  }
});

// Get languages
router.get('/languages', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: languages } = await octokit.repos.listLanguages({
      owner,
      repo,
    });

    // Calculate percentages
    const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
    const formattedLanguages = Object.entries(languages).map(([name, bytes]) => ({
      name,
      bytes,
      percentage: ((bytes / total) * 100).toFixed(2),
    }));

    res.json({ languages: formattedLanguages });
  } catch (error) {
    console.error('GitHub languages error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch languages',
      details: error.response?.data?.message,
    });
  }
});

// Get releases
router.get('/releases', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: releases } = await octokit.repos.listReleases({
      owner,
      repo,
      per_page: 20,
    });

    const formattedReleases = releases.map((release) => ({
      id: release.id,
      tagName: release.tag_name,
      name: release.name,
      body: release.body,
      draft: release.draft,
      prerelease: release.prerelease,
      createdAt: release.created_at,
      publishedAt: release.published_at,
      author: {
        username: release.author.login,
        avatarUrl: release.author.avatar_url,
      },
      htmlUrl: release.html_url,
      tarballUrl: release.tarball_url,
      zipballUrl: release.zipball_url,
      assets: release.assets.map((asset) => ({
        name: asset.name,
        size: asset.size,
        downloadCount: asset.download_count,
        downloadUrl: asset.browser_download_url,
      })),
    }));

    res.json({ releases: formattedReleases });
  } catch (error) {
    console.error('GitHub releases error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch releases',
      details: error.response?.data?.message,
    });
  }
});

// Search repositories
router.get('/search', async (req, res) => {
  const { q, sort, order, page = 1, perPage = 30, token } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: searchResults } = await octokit.search.repos({
      q,
      sort,
      order,
      page: parseInt(page),
      per_page: parseInt(perPage),
    });

    const formattedRepos = searchResults.items.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
      owner: {
        username: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    }));

    res.json({
      totalCount: searchResults.total_count,
      repositories: formattedRepos,
    });
  } catch (error) {
    console.error('GitHub search error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to search repositories',
      details: error.response?.data?.message,
    });
  }
});

// Get user's repositories
router.get('/user/repos', async (req, res) => {
  const { token, type = 'owner', sort = 'updated', page = 1, perPage = 30 } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'GitHub token is required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      type,
      sort,
      page: parseInt(page),
      per_page: parseInt(perPage),
    });

    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
      private: repo.private,
      isFork: repo.fork,
      defaultBranch: repo.default_branch,
    }));

    res.json({ repositories: formattedRepos });
  } catch (error) {
    console.error('GitHub user repos error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch user repositories',
      details: error.response?.data?.message,
    });
  }
});

// Get authenticated user info
router.get('/user', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'GitHub token is required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: user } = await octokit.users.getAuthenticated();

    res.json({
      login: user.login,
      id: user.id,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
      name: user.name,
      company: user.company,
      blog: user.blog,
      location: user.location,
      email: user.email,
      bio: user.bio,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('GitHub user error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch user information',
      details: error.response?.data?.message,
    });
  }
});

// Get repository README
router.get('/readme', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);
    const { data: readme } = await octokit.repos.getReadme({
      owner,
      repo,
    });

    // Decode base64 content
    const content = Buffer.from(readme.content, 'base64').toString('utf-8');

    res.json({
      content,
      name: readme.name,
      path: readme.path,
      htmlUrl: readme.html_url,
    });
  } catch (error) {
    console.error('GitHub README error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch README',
      details: error.response?.data?.message,
    });
  }
});

// Get repository details for article generation
router.get('/details', async (req, res) => {
  const { owner, repo, token } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo are required' });
  }

  try {
    const octokit = getOctokit(token);

    // Get repository info
    const { data: repository } = await octokit.repos.get({
      owner,
      repo,
    });

    // Get README
    let readmeContent = '';
    let readmePreview = '';
    try {
      const { data: readme } = await octokit.repos.getReadme({
        owner,
        repo,
      });
      readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8');
      // Get first 500 chars as preview
      readmePreview = readmeContent.substring(0, 500).replace(/[#*`_\[\]]/g, '');
    } catch (e) {
      console.log('No README found');
    }

    // Get top contributors
    let topContributors = [];
    try {
      const { data: contributors } = await octokit.repos.listContributors({
        owner,
        repo,
        per_page: 5,
      });
      topContributors = contributors.map(c => ({
        username: c.login,
        avatarUrl: c.avatar_url,
        contributions: c.contributions,
      }));
    } catch (e) {
      console.log('Could not fetch contributors');
    }

    // Get recent releases
    let latestRelease = null;
    try {
      const { data: releases } = await octokit.repos.listReleases({
        owner,
        repo,
        per_page: 1,
      });
      if (releases.length > 0) {
        latestRelease = {
          tagName: releases[0].tag_name,
          name: releases[0].name,
          publishedAt: releases[0].published_at,
        };
      }
    } catch (e) {
      console.log('No releases found');
    }

    res.json({
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      watchers: repository.watchers_count,
      openIssues: repository.open_issues_count,
      language: repository.language,
      languagesUrl: repository.languages_url,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
      homepage: repository.homepage,
      htmlUrl: repository.html_url,
      topics: repository.topics || [],
      license: repository.license?.name || null,
      readmeContent,
      readmePreview,
      topContributors,
      latestRelease,
      isFork: repository.fork,
      isTemplate: repository.is_template,
      hasWiki: repository.has_wiki,
      hasPages: repository.has_pages,
      hasDiscussions: repository.has_discussions,
    });
  } catch (error) {
    console.error('GitHub details error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch repository details',
      details: error.response?.data?.message,
    });
  }
});

// Get trending repositories
router.get('/trending', async (req, res) => {
  const { language, since = 'daily', sort = 'stars', token } = req.query;

  try {
    const octokit = getOctokit(token);

    // Build search query for trending repos
    // GitHub search doesn't have a direct "trending" API, so we use search with sort
    const date = new Date();
    let dateFilter = '';
    let querySort = sort;
    let order = 'desc';

    switch (since) {
      case 'daily':
        date.setDate(date.getDate() - 1);
        dateFilter = `created:>${date.toISOString().split('T')[0]}`;
        break;
      case 'weekly':
        date.setDate(date.getDate() - 7);
        dateFilter = `created:>${date.toISOString().split('T')[0]}`;
        break;
      case 'monthly':
        date.setDate(date.getDate() - 30);
        dateFilter = `created:>${date.toISOString().split('T')[0]}`;
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() - 1);
        dateFilter = `created:>${date.toISOString().split('T')[0]}`;
        break;
      case 'all':
        // 全部时间：不按创建日期过滤，按总星数排序
        dateFilter = 'stars:>1000';
        break;
      default:
        date.setDate(date.getDate() - 1);
        dateFilter = `created:>${date.toISOString().split('T')[0]}`;
    }

    let query = dateFilter;

    if (language && language !== 'all') {
      query += ` language:${language}`;
    }

    // Handle different sort options
    // GitHub API supports: stars, forks, updated, created
    // For 'forks', we add a minimum star filter to get quality repos
    if (sort === 'forks') {
      querySort = 'forks';
      if (!query.includes('stars:')) {
        query += ' stars:>100';
      }
    } else if (sort === 'updated') {
      querySort = 'updated';
    } else if (sort === 'created') {
      querySort = 'created';
      // For created sort, we might want to adjust date filter
      if (since === 'all') {
        // Remove date filter for created sort with all time
        query = query.replace(/created:>\d{4}-\d{2}-\d{2}/g, '');
        if (language && language !== 'all') {
          query = `language:${language}`;
        } else {
          query = 'stars:>1000';
        }
      }
    }

    const { data: searchResults } = await octokit.search.repos({
      q: query,
      sort: querySort,
      order: order,
      per_page: 30,
    });

    const formattedRepos = searchResults.items.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
      htmlUrl: repo.html_url,
      owner: {
        username: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
      topics: repo.topics || [],
    }));

    res.json({
      totalCount: searchResults.total_count,
      repositories: formattedRepos,
      since,
      language: language || 'all',
      sort,
    });
  } catch (error) {
    console.error('GitHub trending error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch trending repositories',
      details: error.response?.data?.message,
    });
  }
});

// Get popular languages for trending filter
router.get('/languages/popular', async (req, res) => {
  const popularLanguages = [
    { value: 'all', label: '所有语言' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'vue', label: 'Vue' },
    { value: 'shell', label: 'Shell' },
  ];

  res.json({ languages: popularLanguages });
});

export default router;
