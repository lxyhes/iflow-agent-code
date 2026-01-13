/**
 * Code Review API Routes
 * 代码审查 API
 */

import express from 'express';
import { db } from '../database/db.js';

const router = express.Router();

// ============================================
// POST /api/review/code - 审查代码
// ============================================
router.post('/code', async (req, res) => {
  try {
    const { project_name, file_path, check_types = ['quality', 'style', 'security', 'performance'] } = req.body;
    
    if (!project_name || !file_path) {
      return res.status(400).json({
        success: false,
        error: '项目名称和文件路径不能为空'
      });
    }
    
    // 读取文件内容
    const fs = require('fs');
    const path = require('path');
    
    let content;
    try {
      content = fs.readFileSync(file_path, 'utf-8');
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: '文件不存在或无法读取'
      });
    }
    
    // 模拟代码审查（实际应该调用 AI 或静态分析工具）
    const issues = [];
    
    // 质量检查
    if (check_types.includes('quality')) {
      // 检查函数长度
      const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g) || [];
      functionMatches.forEach((func, index) => {
        const lines = func.split('\n').length;
        if (lines > 50) {
          issues.push({
            id: `quality-${index}`,
            severity: 'medium',
            category: 'quality',
            title: '函数过长',
            description: `函数包含 ${lines} 行代码，建议拆分为更小的函数`,
            line: content.indexOf(func) + 1,
            suggestion: '考虑将函数拆分为多个更小的、单一职责的函数'
          });
        }
      });
      
      // 检查重复代码
      const lines = content.split('\n');
      const lineMap = new Map();
      lines.forEach((line, index) => {
        if (line.trim().length > 10) {
          if (lineMap.has(line.trim())) {
            issues.push({
              id: `quality-dup-${index}`,
              severity: 'low',
              category: 'quality',
              title: '重复代码',
              description: `第 ${index + 1} 行与第 ${lineMap.get(line.trim()) + 1} 行代码重复`,
              line: index + 1,
              suggestion: '考虑提取重复代码为独立的函数'
            });
          } else {
            lineMap.set(line.trim(), index);
          }
        }
      });
    }
    
    // 风格检查
    if (check_types.includes('style')) {
      // 检查缩进
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.trim().length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
          // 顶层代码不需要缩进
        } else if (line.match(/^\s+\S/) && !line.match(/^(\s{2,4}|\t)/)) {
          issues.push({
            id: `style-indent-${index}`,
            severity: 'low',
            category: 'style',
            title: '缩进不一致',
            description: `第 ${index + 1} 行的缩进不符合规范`,
            line: index + 1,
            suggestion: '使用 2 或 4 个空格进行缩进，保持一致'
          });
        }
      });
      
      // 检查行长度
      lines.forEach((line, index) => {
        if (line.length > 120) {
          issues.push({
            id: `style-length-${index}`,
            severity: 'low',
            category: 'style',
            title: '行过长',
            description: `第 ${index + 1} 行超过 120 个字符`,
            line: index + 1,
            suggestion: '考虑将长行拆分为多行'
          });
        }
      });
    }
    
    // 安全检查
    if (check_types.includes('security')) {
      // 检查 eval
      if (content.includes('eval(')) {
        issues.push({
          id: 'security-eval',
          severity: 'critical',
          category: 'security',
          title: '使用 eval',
          description: '代码中使用了 eval，可能导致代码注入攻击',
          line: content.indexOf('eval(') + 1,
          suggestion: '避免使用 eval，考虑使用更安全的替代方案'
        });
      }
      
      // 检查 innerHTML
      if (content.includes('innerHTML')) {
        issues.push({
          id: 'security-innerhtml',
          severity: 'high',
          category: 'security',
          title: '使用 innerHTML',
          description: '代码中使用了 innerHTML，可能导致 XSS 攻击',
          line: content.indexOf('innerHTML') + 1,
          suggestion: '考虑使用 textContent 或 DOM API 替代'
        });
      }
      
      // 检查硬编码密钥
      const secretPatterns = [
        /password\s*[:=]\s*['"]/gi,
        /api[_-]?key\s*[:=]\s*['"]/gi,
        /secret\s*[:=]\s*['"]/gi
      ];
      
      secretPatterns.forEach((pattern, index) => {
        const match = content.match(pattern);
        if (match) {
          issues.push({
            id: `security-secret-${index}`,
            severity: 'critical',
            category: 'security',
            title: '硬编码密钥',
            description: '代码中可能包含硬编码的密钥或密码',
            line: content.indexOf(match[0]) + 1,
            suggestion: '将密钥和密码存储在环境变量或配置文件中'
          });
        }
      });
    }
    
    // 性能检查
    if (check_types.includes('performance')) {
      // 检查循环中的 DOM 操作
      if (content.match(/for\s*\([^)]+\)\s*\{[\s\S]*?\.innerHTML/g)) {
        issues.push({
          id: 'performance-dom-loop',
          severity: 'high',
          category: 'performance',
          title: '循环中的 DOM 操作',
          description: '在循环中操作 DOM 会导致性能问题',
          line: content.indexOf('for') + 1,
          suggestion: '考虑使用文档片段或批量更新 DOM'
        });
      }
      
      // 检查同步请求
      if (content.includes('XMLHttpRequest') && content.includes('false')) {
        issues.push({
          id: 'performance-sync',
          severity: 'high',
          category: 'performance',
          title: '同步请求',
          description: '使用同步请求会阻塞主线程',
          line: content.indexOf('XMLHttpRequest') + 1,
          suggestion: '使用异步请求替代'
        });
      }
    }
    
    // 生成摘要
    const summary = {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      by_category: {
        quality: issues.filter(i => i.category === 'quality').length,
        style: issues.filter(i => i.category === 'style').length,
        security: issues.filter(i => i.security === 'security').length,
        performance: issues.filter(i => i.category === 'performance').length
      }
    };
    
    res.json({
      success: true,
      issues: issues,
      summary: summary
    });
  } catch (error) {
    console.error('[CodeReview API] 审查代码失败:', error);
    res.status(500).json({
      success: false,
      error: '审查代码失败'
    });
  }
});

// ============================================
// POST /api/review/fix - 修复问题
// ============================================
router.post('/fix', async (req, res) => {
  try {
    const { issue_id, file_path, fix_type = 'auto' } = req.body;
    
    if (!issue_id || !file_path) {
      return res.status(400).json({
        success: false,
        error: '问题 ID 和文件路径不能为空'
      });
    }
    
    // 模拟修复（实际应该调用 AI 或自动修复工具）
    res.json({
      success: true,
      message: '问题已修复',
      fix_applied: true
    });
  } catch (error) {
    console.error('[CodeReview API] 修复问题失败:', error);
    res.status(500).json({
      success: false,
      error: '修复问题失败'
    });
  }
});

export default router;