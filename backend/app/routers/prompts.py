"""
Prompts Router
提示词管理相关的 API 路由
"""

import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prompts", tags=["Prompts"])


# ============================================
# 数据库连接函数
# ============================================

def get_db_connection():
    """获取数据库连接"""
    import sqlite3
    db_path = "storage/frontend/snippets.db"
    return sqlite3.connect(db_path)


# ============================================
# 数据模型
# ============================================

class PromptCreate(BaseModel):
    title: str
    content: str
    category: str = "自定义"
    description: str = ""
    tags: List[str] = []
    parameters: List[Dict[str, Any]] = []


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    parameters: Optional[List[Dict[str, Any]]] = None


# ============================================
# Prompts 端点
# ============================================

@router.get("")
async def get_prompts(
    search: Optional[str] = None,
    category: Optional[str] = None,
    favorite_only: bool = False
):
    """获取提示词列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM prompts WHERE 1=1"
        params = []

        if search:
            query += " AND (title LIKE ? OR description LIKE ? OR content LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        if category:
            query += " AND category = ?"
            params.append(category)

        if favorite_only:
            query += " AND is_favorite = 1"

        query += " ORDER BY usage_count DESC, updated_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)

        # 获取分类和标签
        categories = [row[0] for row in cursor.execute("SELECT DISTINCT category FROM prompts ORDER BY category")]
        tags = set()
        for prompt in prompts:
            tags.update(prompt['tags'])

        conn.close()

        return JSONResponse({
            "prompts": prompts,
            "categories": categories,
            "tags": list(tags)
        })
    except Exception as e:
        logger.exception(f"获取提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("")
async def create_prompt(prompt: PromptCreate):
    """创建提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO prompts (title, content, category, description, tags, parameters)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            prompt.title,
            prompt.content,
            prompt.category,
            prompt.description,
            json.dumps(prompt.tags),
            json.dumps(prompt.parameters)
        ))

        prompt_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return JSONResponse({"id": prompt_id, "message": "提示词创建成功"})
    except Exception as e:
        logger.exception(f"创建提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/categories")
async def get_prompt_categories():
    """获取提示词分类"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT DISTINCT category FROM prompts ORDER BY category")
        categories = [row[0] for row in cursor.fetchall()]

        conn.close()

        return JSONResponse({"categories": categories})
    except Exception as e:
        logger.exception(f"获取提示词分类失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/tags")
async def get_prompt_tags():
    """获取提示词标签"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT tags FROM prompts")
        all_tags = set()
        for row in cursor.fetchall():
            if row[0]:
                tags = json.loads(row[0])
                all_tags.update(tags)

        conn.close()

        return JSONResponse({"tags": list(all_tags)})
    except Exception as e:
        logger.exception(f"获取提示词标签失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/popular")
async def get_popular_prompts(limit: int = Query(10, ge=1, le=100)):
    """获取热门提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM prompts ORDER BY usage_count DESC, updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)

        conn.close()

        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取热门提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/recent")
async def get_recent_prompts(limit: int = Query(10, ge=1, le=100)):
    """获取最近提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM prompts ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)

        conn.close()

        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取最近提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/favorite")
async def get_favorite_prompts(limit: int = Query(10, ge=1, le=100)):
    """获取收藏的提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM prompts WHERE is_favorite = 1 ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)

        conn.close()

        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取收藏提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/{prompt_id}")
async def get_prompt(prompt_id: int):
    """获取单个提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM prompts WHERE id = ?", (prompt_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)

        prompt = dict(row)
        prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
        prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []

        # 增加使用次数
        cursor.execute("UPDATE prompts SET usage_count = usage_count + 1 WHERE id = ?", (prompt_id,))
        conn.commit()

        conn.close()

        return JSONResponse(prompt)
    except Exception as e:
        logger.exception(f"获取提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/{prompt_id}")
async def update_prompt(prompt_id: int, prompt: PromptUpdate):
    """更新提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查是否存在
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
        if not cursor.fetchone():
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)

        # 构建更新语句
        updates = []
        params = []

        if prompt.title is not None:
            updates.append("title = ?")
            params.append(prompt.title)
        if prompt.content is not None:
            updates.append("content = ?")
            params.append(prompt.content)
        if prompt.category is not None:
            updates.append("category = ?")
            params.append(prompt.category)
        if prompt.description is not None:
            updates.append("description = ?")
            params.append(prompt.description)
        if prompt.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(prompt.tags))
        if prompt.parameters is not None:
            updates.append("parameters = ?")
            params.append(json.dumps(prompt.parameters))

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(prompt_id)

        query = f"UPDATE prompts SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)

        conn.commit()
        conn.close()

        return JSONResponse({"message": "提示词更新成功"})
    except Exception as e:
        logger.exception(f"更新提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/{prompt_id}")
async def delete_prompt(prompt_id: int):
    """删除提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))

        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)

        conn.commit()
        conn.close()

        return JSONResponse({"message": "提示词删除成功"})
    except Exception as e:
        logger.exception(f"删除提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/{prompt_id}/usage")
async def increment_prompt_usage(prompt_id: int):
    """增加提示词使用次数"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("UPDATE prompts SET usage_count = usage_count + 1 WHERE id = ?", (prompt_id,))

        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)

        conn.commit()
        conn.close()

        return JSONResponse({"message": "使用次数已更新"})
    except Exception as e:
        logger.exception(f"更新使用次数失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)