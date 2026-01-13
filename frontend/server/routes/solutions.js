/**
 * Solutions API Routes
 * 方案生成 API
 */

import express from 'express';
import { db } from '../database/db.js';

const router = express.Router();

// ============================================
// GET /api/solutions - 获取方案列表
// ============================================
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT * FROM solutions
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      solutions: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('[Solutions API] 获取方案列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取方案列表失败'
    });
  }
});

// ============================================
// GET /api/solutions/:id - 获取单个方案
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM solutions WHERE solution_id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '方案不存在'
      });
    }
    
    res.json({
      success: true,
      solution: result.rows[0]
    });
  } catch (error) {
    console.error('[Solutions API] 获取方案失败:', error);
    res.status(500).json({
      success: false,
      error: '获取方案失败'
    });
  }
});

// ============================================
// POST /api/solutions/generate - 生成方案
// ============================================
router.post('/generate', async (req, res) => {
  try {
    const { requirement, template_type, project_context } = req.body;
    
    if (!requirement) {
      return res.status(400).json({
        success: false,
        error: '需求描述不能为空'
      });
    }
    
    // 模拟 AI 生成方案（实际应该调用 AI API）
    const solution = {
      requirement: requirement,
      template_type: template_type || 'general',
      title: `针对需求的技术方案`,
      overview: `本方案旨在解决以下需求：${requirement}`,
      tech_stack: ['JavaScript', 'React', 'Node.js'],
      architecture: {
        frontend: {
          framework: 'React',
          state_management: 'Redux',
          ui_library: 'Tailwind CSS'
        },
        backend: {
          framework: 'Node.js',
          database: 'PostgreSQL',
          api: 'REST API'
        }
      },
      implementation_steps: [
        {
          step: 1,
          title: '需求分析',
          description: '详细分析业务需求和技术要求',
          estimated_time: '1-2 天'
        },
        {
          step: 2,
          title: '架构设计',
          description: '设计系统架构和技术选型',
          estimated_time: '2-3 天'
        },
        {
          step: 3,
          title: '前端开发',
          description: '开发用户界面和交互逻辑',
          estimated_time: '5-7 天'
        },
        {
          step: 4,
          title: '后端开发',
          description: '开发 API 和业务逻辑',
          estimated_time: '5-7 天'
        },
        {
          step: 5,
          title: '测试和部署',
          description: '进行测试并部署到生产环境',
          estimated_time: '2-3 天'
        }
      ],
      risks: [
        {
          risk: '技术风险',
          description: '新技术栈的学习曲线可能影响开发进度',
          mitigation: '提前进行技术调研和原型验证'
        },
        {
          risk: '时间风险',
          description: '需求变更可能导致延期',
          mitigation: '建立变更管理流程，预留缓冲时间'
        }
      ],
      success_criteria: [
        '所有功能按需求实现',
        '系统性能满足要求',
        '用户界面友好易用',
        '代码质量符合标准'
      ],
      estimated_cost: {
        development: '15-20 人天',
        testing: '3-5 人天',
        deployment: '1-2 人天',
        total: '19-27 人天'
      }
    };
    
    // 保存到数据库
    const insertQuery = `
      INSERT INTO solutions (requirement, template_type, title, overview, tech_stack, architecture, implementation_steps, risks, success_criteria, estimated_cost, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      requirement,
      template_type,
      solution.title,
      solution.overview,
      JSON.stringify(solution.tech_stack),
      JSON.stringify(solution.architecture),
      JSON.stringify(solution.implementation_steps),
      JSON.stringify(solution.risks),
      JSON.stringify(solution.success_criteria),
      JSON.stringify(solution.estimated_cost)
    ]);
    
    res.json({
      success: true,
      solution: {
        ...solution,
        id: result.rows[0].solution_id
      }
    });
  } catch (error) {
    console.error('[Solutions API] 生成方案失败:', error);
    res.status(500).json({
      success: false,
      error: '生成方案失败'
    });
  }
});

// ============================================
// POST /api/solutions/:id - 保存方案
// ============================================
router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const solution = req.body;
    
    const query = `
      UPDATE solutions
      SET title = $1, overview = $2, tech_stack = $3, architecture = $4, implementation_steps = $5, risks = $6, success_criteria = $7, estimated_cost = $8, updated_at = NOW()
      WHERE solution_id = $9
      RETURNING *
    `;
    
    const result = await db.query(query, [
      solution.title,
      solution.overview,
      JSON.stringify(solution.tech_stack),
      JSON.stringify(solution.architecture),
      JSON.stringify(solution.implementation_steps),
      JSON.stringify(solution.risks),
      JSON.stringify(solution.success_criteria),
      JSON.stringify(solution.estimated_cost),
      id
    ]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '方案不存在'
      });
    }
    
    res.json({
      success: true,
      message: '方案保存成功'
    });
  } catch (error) {
    console.error('[Solutions API] 保存方案失败:', error);
    res.status(500).json({
      success: false,
      error: '保存方案失败'
    });
  }
});

// ============================================
// DELETE /api/solutions/:id - 删除方案
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM solutions WHERE solution_id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: '方案不存在'
      });
    }
    
    res.json({
      success: true,
      message: '方案删除成功'
    });
  } catch (error) {
    console.error('[Solutions API] 删除方案失败:', error);
    res.status(500).json({
      success: false,
      error: '删除方案失败'
    });
  }
});

export default router;