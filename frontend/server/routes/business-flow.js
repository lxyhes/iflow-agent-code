/**
 * Business Flow API Routes
 * 业务流程总结 API
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

// ============================================
// GET /api/business-flow/summary - 获取业务流程总结
// ============================================
router.get('/summary', async (req, res) => {
  try {
    const { limit = 50, project_path } = req.query;
    
    // 如果没有提供项目路径，使用当前目录
    const workingDir = project_path || process.cwd();
    
    // 获取 Git 日志
    const gitLogCommand = `cd ${workingDir} && git log --pretty=format:'%H|%an|%ae|%ad|%s' --date=iso -${limit}`;
    
    let gitLogOutput;
    try {
      const { stdout } = await execAsync(gitLogCommand);
      gitLogOutput = stdout;
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: '不是 Git 仓库或无法访问 Git 历史'
      });
    }
    
    if (!gitLogOutput.trim()) {
      return res.json({
        success: true,
        business_flow: {
          overview: {
            total_commits: 0,
            time_range: null,
            contributors: []
          },
          flows: []
        }
      });
    }
    
    // 解析 Git 日志
    const commits = gitLogOutput.split('\n').filter(line => line.trim()).map(line => {
      const [hash, author, email, date, message] = line.split('|');
      return {
        hash,
        author,
        email,
        date: new Date(date),
        message
      };
    });
    
    // 分析业务流程
    const contributors = {};
    const commitTypes = {
      feature: 0,
      fix: 0,
      refactor: 0,
      docs: 0,
      test: 0,
      chore: 0,
      other: 0
    };
    
    commits.forEach(commit => {
      // 统计贡献者
      if (!contributors[commit.author]) {
        contributors[commit.author] = {
          name: commit.author,
          email: commit.email,
          commits: 0,
          first_commit: commit.date,
          last_commit: commit.date
        };
      }
      contributors[commit.author].commits++;
      if (commit.date > contributors[commit.author].last_commit) {
        contributors[commit.author].last_commit = commit.date;
      }
      if (commit.date < contributors[commit.author].first_commit) {
        contributors[commit.author].first_commit = commit.date;
      }
      
      // 分类提交类型
      const messageLower = commit.message.toLowerCase();
      if (messageLower.startsWith('feat') || messageLower.startsWith('feature')) {
        commitTypes.feature++;
      } else if (messageLower.startsWith('fix') || messageLower.startsWith('bugfix')) {
        commitTypes.fix++;
      } else if (messageLower.startsWith('refactor')) {
        commitTypes.refactor++;
      } else if (messageLower.startsWith('docs') || messageLower.startsWith('doc')) {
        commitTypes.docs++;
      } else if (messageLower.startsWith('test')) {
        commitTypes.test++;
      } else if (messageLower.startsWith('chore')) {
        commitTypes.chore++;
      } else {
        commitTypes.other++;
      }
    });
    
    // 提取业务流程
    const flows = [];
    let currentFlow = null;
    
    commits.forEach((commit, index) => {
      const message = commit.message.toLowerCase();
      
      // 检测功能开始
      if (message.startsWith('feat') || message.startsWith('feature')) {
        if (currentFlow) {
          flows.push(currentFlow);
        }
        currentFlow = {
          type: 'feature',
          title: commit.message,
          start_commit: commit,
          commits: [commit],
          status: 'completed'
        };
      } else if (message.startsWith('fix') || message.startsWith('bugfix')) {
        if (currentFlow) {
          flows.push(currentFlow);
        }
        currentFlow = {
          type: 'bugfix',
          title: commit.message,
          start_commit: commit,
          commits: [commit],
          status: 'completed'
        };
      } else if (message.startsWith('refactor')) {
        if (currentFlow) {
          flows.push(currentFlow);
        }
        currentFlow = {
          type: 'refactor',
          title: commit.message,
          start_commit: commit,
          commits: [commit],
          status: 'completed'
        };
      } else if (currentFlow) {
        // 添加到当前流程
        currentFlow.commits.push(commit);
        currentFlow.end_commit = commit;
      }
    });
    
    if (currentFlow) {
      flows.push(currentFlow);
    }
    
    // 生成总结
    const businessFlow = {
      overview: {
        total_commits: commits.length,
        time_range: {
          start: commits[commits.length - 1].date,
          end: commits[0].date
        },
        contributors: Object.values(contributors).map(c => ({
          name: c.name,
          commits: c.commits,
          contribution_percentage: ((c.commits / commits.length) * 100).toFixed(2)
        })).sort((a, b) => b.commits - a.commits)
      },
      commit_types: commitTypes,
      flows: flows.slice(0, 10), // 只返回前 10 个流程
      recent_activity: commits.slice(0, 5).map(commit => ({
        hash: commit.hash.substring(0, 7),
        author: commit.author,
        date: commit.date,
        message: commit.message
      }))
    };
    
    res.json({
      success: true,
      business_flow: businessFlow
    });
  } catch (error) {
    console.error('[BusinessFlow API] 获取业务流程总结失败:', error);
    res.status(500).json({
      success: false,
      error: '获取业务流程总结失败'
    });
  }
});

// ============================================
// GET /api/business-flow/stats - 获取统计信息
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const { project_path } = req.query;
    const workingDir = project_path || process.cwd();
    
    // 获取各种统计信息
    const commands = [
      `cd ${workingDir} && git rev-list --count HEAD`,
      `cd ${workingDir} && git shortlog -sn --all`,
      `cd ${workingDir} && git log --pretty=format:'%ad' --date=short | head -1`,
      `cd ${workingDir} && git log --pretty=format:'%ad' --date=short | tail -1`
    ];
    
    const results = await Promise.all(commands.map(cmd => execAsync(cmd).catch(() => ({ stdout: '' }))));
    
    const stats = {
      total_commits: parseInt(results[0].stdout.trim()) || 0,
      total_contributors: results[1].stdout.trim().split('\n').length || 0,
      first_commit: results[2].stdout.trim() || null,
      last_commit: results[3].stdout.trim() || null
    };
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('[BusinessFlow API] 获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败'
    });
  }
});

export default router;