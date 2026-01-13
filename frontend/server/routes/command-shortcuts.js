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
router.get('/', (req, res) => {
  try {
    const { search, category, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM command_shortcuts WHERE 1=1';
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ? OR command LIKE ? OR tags LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const result = stmt.all(...params);
    
    res.json({
      success: true,
      shortcuts: result,
      total: result.length
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
router.get('/popular', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT s.*, COUNT(e.execution_id) as execution_count
      FROM command_shortcuts s
      LEFT JOIN command_executions e ON s.shortcut_id = e.shortcut_id
      GROUP BY s.shortcut_id
      ORDER BY execution_count DESC, s.created_at DESC
      LIMIT ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all(parseInt(limit));
    
    res.json({
      success: true,
      shortcuts: result
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
router.get('/recent', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT s.*, MAX(e.executed_at) as last_executed_at
      FROM command_shortcuts s
      LEFT JOIN command_executions e ON s.shortcut_id = e.shortcut_id
      GROUP BY s.shortcut_id
      ORDER BY last_executed_at DESC, s.updated_at DESC
      LIMIT ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all(parseInt(limit));
    
    res.json({
      success: true,
      shortcuts: result
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
router.get('/history', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT e.*, s.name as shortcut_name, s.command
      FROM command_executions e
      LEFT JOIN command_shortcuts s ON e.shortcut_id = s.shortcut_id
      ORDER BY e.executed_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      history: result
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
router.get('/categories', (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM command_shortcuts
      GROUP BY category
      ORDER BY count DESC, category
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all();
    
    res.json({
      success: true,
      categories: result.map(row => row.category)
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
router.get('/tags', (req, res) => {
  try {
    const query = `
      SELECT DISTINCT json_extract(value, '$') as tag, COUNT(*) as count
      FROM command_shortcuts, json_each(tags)
      WHERE json_valid(tags) AND json_array_length(tags) > 0
      GROUP BY tag
      ORDER BY count DESC, tag
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all();
    
    res.json({
      success: true,
      tags: result.map(row => row.tag)
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
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM command_shortcuts WHERE shortcut_id = ?';
    const stmt = db.prepare(query);
    const result = stmt.get(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
    res.json({
      success: true,
      shortcut: result
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
router.post('/', (req, res) => {
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
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.run(
      name,
      command,
      category || '通用',
      description || '',
      JSON.stringify(tags || []),
      working_dir || '',
      timeout || 60
    );
    
    // 获取插入的记录
    const inserted = db.prepare('SELECT * FROM command_shortcuts WHERE shortcut_id = ?').get(result.lastInsertRowid);
    
    res.json({
      success: true,
      shortcut: inserted
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
router.post('/:id/execute', (req, res) => {
  try {
    const { id } = req.params;
    const { params = {} } = req.body;
    
    // 获取快捷方式
    const shortcutQuery = 'SELECT * FROM command_shortcuts WHERE shortcut_id = ?';
    const stmt = db.prepare(shortcutQuery);
    const shortcut = stmt.get(id);
    
    if (!shortcut) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
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
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, command, category, description, tags, working_dir, timeout } = req.body;
    
    const query = `
      UPDATE command_shortcuts
      SET name = ?, command = ?, category = ?, description = ?, tags = ?, working_dir = ?, timeout = ?, updated_at = datetime('now')
      WHERE shortcut_id = ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.run(
      name,
      command,
      category,
      description,
      JSON.stringify(tags),
      working_dir,
      timeout,
      id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '快捷方式不存在'
      });
    }
    
    // 获取更新后的记录
    const updated = db.prepare('SELECT * FROM command_shortcuts WHERE shortcut_id = ?').get(id);
    
    res.json({
      success: true,
      shortcut: updated
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
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM command_shortcuts WHERE shortcut_id = ?';
    const stmt = db.prepare(query);
    const result = stmt.run(id);
    
    if (result.changes === 0) {
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