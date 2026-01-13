/**
 * Snippets API Routes
 * 代码片段管理 API
 */

import express from 'express';
import { db } from '../database/db.js';

const router = express.Router();

// ============================================
// GET /api/snippets - 获取代码片段列表
// ============================================
router.get('/', (req, res) => {
  try {
    const { search, category, language, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM snippets WHERE 1=1';
    const params = [];

    if (search) {
      query += ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (language) {
      query += ` AND language = ?`;
      params.push(language);
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const result = stmt.all(...params);
    
    res.json({
      success: true,
      snippets: result,
      total: result.length
    });
  } catch (error) {
    console.error('[Snippets API] 获取片段列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取片段列表失败'
    });
  }
});

// ============================================
// GET /api/snippets/popular - 获取热门片段
// ============================================
router.get('/popular', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT s.*, COUNT(u.usage_id) as usage_count
      FROM snippets s
      LEFT JOIN snippet_usage u ON s.snippet_id = u.snippet_id
      GROUP BY s.snippet_id
      ORDER BY usage_count DESC, s.created_at DESC
      LIMIT ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all(parseInt(limit));
    
    res.json({
      success: true,
      snippets: result
    });
  } catch (error) {
    console.error('[Snippets API] 获取热门片段失败:', error);
    res.status(500).json({
      success: false,
      error: '获取热门片段失败'
    });
  }
});

// ============================================
// GET /api/snippets/recent - 获取最近片段
// ============================================
router.get('/recent', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT s.*, MAX(u.used_at) as last_used_at
      FROM snippets s
      LEFT JOIN snippet_usage u ON s.snippet_id = u.snippet_id
      GROUP BY s.snippet_id
      ORDER BY last_used_at DESC NULLS LAST, s.updated_at DESC
      LIMIT ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all(parseInt(limit));
    
    res.json({
      success: true,
      snippets: result
    });
  } catch (error) {
    console.error('[Snippets API] 获取最近片段失败:', error);
    res.status(500).json({
      success: false,
      error: '获取最近片段失败'
    });
  }
});

// ============================================
// GET /api/snippets/categories - 获取分类列表（公开）
// ============================================
router.get('/categories', (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM snippets
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
    console.error('[Snippets API] 获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类列表失败'
    });
  }
});

// ============================================
// GET /api/snippets/tags - 获取标签列表（公开）
// ============================================
router.get('/tags', (req, res) => {
  try {
    // SQLite 不支持 unnest，使用不同的方法
    const query = `
      SELECT DISTINCT json_each.value as tag
      FROM snippets, json_each(snippets.tags)
      WHERE length(snippets.tags) > 0
      ORDER BY tag
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.all();
    
    res.json({
      success: true,
      tags: result.map(row => row.tag)
    });
  } catch (error) {
    console.error('[Snippets API] 获取标签列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取标签列表失败'
    });
  }
});

// ============================================
// GET /api/snippets/:id - 获取单个片段
// ============================================
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM snippets WHERE snippet_id = ?';
    const stmt = db.prepare(query);
    const result = stmt.get(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '片段不存在'
      });
    }
    
    // 记录使用
    const insertUsage = db.prepare('INSERT INTO snippet_usage (snippet_id, used_at) VALUES (?, datetime(\'now\'))');
    insertUsage.run(id);
    
    res.json({
      success: true,
      snippet: result
    });
  } catch (error) {
    console.error('[Snippets API] 获取片段失败:', error);
    res.status(500).json({
      success: false,
      error: '获取片段失败'
    });
  }
});

// ============================================
// POST /api/snippets - 创建新片段
// ============================================
router.post('/', (req, res) => {
  try {
    const { title, code, language, category, description, tags } = req.body;
    
    if (!title || !code) {
      return res.status(400).json({
        success: false,
        error: '标题和代码内容不能为空'
      });
    }
    
    const query = `
      INSERT INTO snippets (title, code, language, category, description, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      RETURNING *
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.run(title, code, language || 'javascript', category || '通用', description || '', JSON.stringify(tags || []));
    
    // 获取插入的数据
    const insertedSnippet = db.prepare('SELECT * FROM snippets WHERE snippet_id = ?').get(result.lastInsertRowid);
    
    res.json({
      success: true,
      snippet: insertedSnippet
    });
  } catch (error) {
    console.error('[Snippets API] 创建片段失败:', error);
    res.status(500).json({
      success: false,
      error: '创建片段失败'
    });
  }
});

// ============================================
// PUT /api/snippets/:id - 更新片段
// ============================================
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, code, language, category, description, tags } = req.body;
    
    const query = `
      UPDATE snippets
      SET title = ?, code = ?, language = ?, category = ?, description = ?, tags = ?, updated_at = datetime('now')
      WHERE snippet_id = ?
      RETURNING *
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.run(title, code, language, category, description, JSON.stringify(tags), id);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '片段不存在'
      });
    }
    
    const updatedSnippet = db.prepare('SELECT * FROM snippets WHERE snippet_id = ?').get(id);
    
    res.json({
      success: true,
      snippet: updatedSnippet
    });
  } catch (error) {
    console.error('[Snippets API] 更新片段失败:', error);
    res.status(500).json({
      success: false,
      error: '更新片段失败'
    });
  }
});

// ============================================
// DELETE /api/snippets/:id - 删除片段
// ============================================
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM snippets WHERE snippet_id = ?';
    const stmt = db.prepare(query);
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '片段不存在'
      });
    }
    
    res.json({
      success: true,
      message: '片段删除成功'
    });
  } catch (error) {
    console.error('[Snippets API] 删除片段失败:', error);
    res.status(500).json({
      success: false,
      error: '删除片段失败'
    });
  }
});

export default router;