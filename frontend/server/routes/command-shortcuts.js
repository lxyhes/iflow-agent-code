/**
 * Command Shortcuts API Routes
 * 命令快捷方式 API
 */

import express from 'express';
import { db } from '../database/db.js';

const router = express.Router();

// ============================================
// GET /api/command-shortcuts - 获取快捷方式列表
// ============================================
router.get('/', async (req, res) => {
  try {
    const { search, category, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM command_shortcuts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR command ILIKE $${paramIndex} OR tags::text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      shortcuts: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取快捷方式列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取快捷方式列表失败'
    });
  }
});

// ============================================
// GET /api/command-shortcuts/popular - 获取热门快捷方式
// ============================================
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT s.*, COUNT(e.execution_id) as execution_count
      FROM command_shortcuts s
      LEFT JOIN command_executions e ON s.shortcut_id = e.shortcut_id
      GROUP BY s.shortcut_id
      ORDER BY execution_count DESC, s.created_at DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [parseInt(limit)]);
    
    res.json({
      success: true,
      shortcuts: result.rows
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取热门快捷方式失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热门快捷方式失败'
    });
  }
});

// ============================================
// GET /api/command-shortcuts/recent - 获取最近快捷方式
// ============================================
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT s.*, MAX(e.executed_at) as last_executed_at
      FROM command_shortcuts s
      LEFT JOIN command_executions e ON s.shortcut_id = e.shortcut_id
      GROUP BY s.shortcut_id
      ORDER BY last_executed_at DESC NULLS LAST, s.updated_at DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [parseInt(limit)]);
    
    res.json({
      success: true,
      shortcuts: result.rows
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取最近快捷方式失败:', error);
    res.status(500).json({
      success: false,
      error: '获取最近快捷方式失败'
    });
  }
});

// ============================================
// GET /api/command-shortcuts/history - 获取执行历史
// ============================================
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT e.*, s.name as shortcut_name, s.command
      FROM command_executions e
      LEFT JOIN command_shortcuts s ON e.shortcut_id = s.shortcut_id
      ORDER BY e.executed_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取执行历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取执行历史失败'
    });
  }
});

// ============================================
// GET /api/command-shortcuts/categories - 获取分类列表
// ============================================
router.get('/categories', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM command_shortcuts
      GROUP BY category
      ORDER BY count DESC, category
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      categories: result.rows.map(row => row.category)
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类列表失败'
    });
  }
});

// ============================================
// GET /api/command-shortcuts/tags - 获取标签列表
// ============================================
router.get('/tags', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
      FROM command_shortcuts
      WHERE array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY count DESC, tag
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      tags: result.rows.map(row => row.tag)
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取标签列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取标签列表失败'
    });
  }
});

// ============================================
// GET /api/command-shortcuts/:id - 获取单个快捷方式
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM command_shortcuts WHERE shortcut_id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
    res.json({
      success: true,
      shortcut: result.rows[0]
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 获取快捷方式失败:', error);
    res.status(500).json({
      success: false,
      error: '获取快捷方式失败'
    });
  }
});

// ============================================
// POST /api/command-shortcuts - 创建新快捷方式
// ============================================
router.post('/', async (req, res) => {
  try {
    const { name, command, category, description, tags, working_dir, timeout } = req.body;
    
    if (!name || !command) {
      return res.status(400).json({
        success: false,
        error: '名称和命令不能为空'
      });
    }
    
    const query = `
      INSERT INTO command_shortcuts (name, command, category, description, tags, working_dir, timeout, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await db.query(query, [
      name,
      command,
      category || '通用',
      description || '',
      tags || [],
      working_dir || '',
      timeout || 60
    ]);
    
    res.json({
      success: true,
      shortcut: result.rows[0]
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 创建快捷方式失败:', error);
    res.status(500).json({
      success: false,
      error: '创建快捷方式失败'
    });
  }
});

// ============================================
// POST /api/command-shortcuts/:id/execute - 执行命令
// ============================================
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { params = {} } = req.body;
    
    // 获取快捷方式
    const shortcutQuery = 'SELECT * FROM command_shortcuts WHERE shortcut_id = $1';
    const shortcutResult = await db.query(shortcutQuery, [id]);
    
    if (shortcutResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
    const shortcut = shortcutResult.rows[0];
    
    // 替换参数
    let command = shortcut.command;
    Object.keys(params).forEach(key => {
      command = command.replace(`{${key}}`, params[key]);
    });
    
    // 执行命令（这里需要实际的命令执行逻辑）
    const { spawn } = require('child_process');
    
    res.json({
      success: true,
      message: '命令执行中...',
      command: command
    });
    
    // 异步执行命令
    spawn('sh', ['-c', command], {
      cwd: shortcut.working_dir || process.cwd(),
      timeout: shortcut.timeout * 1000
    });
    
  } catch (error) {
    console.error('[CommandShortcuts API] 执行命令失败:', error);
    res.status(500).json({
      success: false,
      error: '执行命令失败'
    });
  }
});

// ============================================
// PUT /api/command-shortcuts/:id - 更新快捷方式
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, command, category, description, tags, working_dir, timeout } = req.body;
    
    const query = `
      UPDATE command_shortcuts
      SET name = $1, command = $2, category = $3, description = $4, tags = $5, working_dir = $6, timeout = $7, updated_at = NOW()
      WHERE shortcut_id = $8
      RETURNING *
    `;
    
    const result = await db.query(query, [
      name,
      command,
      category,
      description,
      tags,
      working_dir,
      timeout,
      id
    ]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
    res.json({
      success: true,
      shortcut: result.rows[0]
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 更新快捷方式失败:', error);
    res.status(500).json({
      success: false,
      error: '更新快捷方式失败'
    });
  }
});

// ============================================
// DELETE /api/command-shortcuts/:id - 删除快捷方式
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM command_shortcuts WHERE shortcut_id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
    res.json({
      success: true,
      message: '快捷方式删除成功'
    });
  } catch (error) {
    console.error('[CommandShortcuts API] 删除快捷方式失败:', error);
    res.status(500).json({
      success: false,
      error: '删除快捷方式失败'
    });
  }
});

export default router;