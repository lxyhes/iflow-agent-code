"""
Snippets Router
代码片段管理相关的 API 路由
"""

import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/snippets", tags=["Snippets"])


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

class SnippetCreate(BaseModel):
    title: str
    code: str
    language: str = "javascript"
    category: str = "通用"
    description: str = ""
    tags: List[str] = []


class SnippetUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


# ============================================
# Snippets 端点
# ============================================

@router.get("")
async def get_snippets(
    search: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    favorite_only: bool = False
):
    """获取代码片段列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM snippets WHERE 1=1"
        params = []

        if search:
            query += " AND (title LIKE ? OR description LIKE ? OR code LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        if category:
            query += " AND category = ?"
            params.append(category)

        if language:
            query += " AND language = ?"
            params.append(language)

        if favorite_only:
            query += " AND is_favorite = 1"

        query += " ORDER BY updated_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        snippets = []
        for row in rows:
            snippet = dict(row)
            snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
            snippets.append(snippet)

        # 获取分类和标签
        categories = [row[0] for row in cursor.execute("SELECT DISTINCT category FROM snippets ORDER BY category")]
        tags = set()
        for snippet in snippets:
            tags.update(snippet['tags'])

        conn.close()

        return JSONResponse({
            "snippets": snippets,
            "categories": categories,
            "tags": list(tags)
        })
    except Exception as e:
        logger.exception(f"获取代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("")
async def create_snippet(snippet: SnippetCreate):
    """创建代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO snippets (title, code, language, category, description, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            snippet.title,
            snippet.code,
            snippet.language,
            snippet.category,
            snippet.description,
            json.dumps(snippet.tags)
        ))

        snippet_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return JSONResponse({"id": snippet_id, "message": "代码片段创建成功"})
    except Exception as e:
        logger.exception(f"创建代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/categories")
async def get_snippet_categories():
    """获取代码片段分类"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT DISTINCT category FROM snippets ORDER BY category")
        categories = [row[0] for row in cursor.fetchall()]

        conn.close()

        return JSONResponse({"categories": categories})
    except Exception as e:
        logger.exception(f"获取代码片段分类失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/tags")
async def get_snippet_tags():
    """获取代码片段标签"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT tags FROM snippets")
        all_tags = set()
        for row in cursor.fetchall():
            if row[0]:
                tags = json.loads(row[0])
                all_tags.update(tags)

        conn.close()

        return JSONResponse({"tags": list(all_tags)})
    except Exception as e:
        logger.exception(f"获取代码片段标签失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/{snippet_id}")
async def get_snippet(snippet_id: int):
    """获取单个代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM snippets WHERE id = ?", (snippet_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)

        snippet = dict(row)
        snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []

        # 增加使用次数
        cursor.execute("UPDATE snippets SET usage_count = usage_count + 1 WHERE id = ?", (snippet_id,))
        conn.commit()

        conn.close()

        return JSONResponse(snippet)
    except Exception as e:
        logger.exception(f"获取代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/{snippet_id}")
async def update_snippet(snippet_id: int, snippet: SnippetUpdate):
    """更新代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查是否存在
        cursor.execute("SELECT id FROM snippets WHERE id = ?", (snippet_id,))
        if not cursor.fetchone():
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)

        # 构建更新语句
        updates = []
        params = []

        if snippet.title is not None:
            updates.append("title = ?")
            params.append(snippet.title)
        if snippet.code is not None:
            updates.append("code = ?")
            params.append(snippet.code)
        if snippet.language is not None:
            updates.append("language = ?")
            params.append(snippet.language)
        if snippet.category is not None:
            updates.append("category = ?")
            params.append(snippet.category)
        if snippet.description is not None:
            updates.append("description = ?")
            params.append(snippet.description)
        if snippet.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(snippet.tags))

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(snippet_id)

        query = f"UPDATE snippets SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)

        conn.commit()
        conn.close()

        return JSONResponse({"message": "代码片段更新成功"})
    except Exception as e:
        logger.exception(f"更新代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/{snippet_id}")
async def delete_snippet(snippet_id: int):
    """删除代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM snippets WHERE id = ?", (snippet_id,))

        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)

        conn.commit()
        conn.close()

        return JSONResponse({"message": "代码片段删除成功"})
    except Exception as e:
        logger.exception(f"删除代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/popular")
async def get_popular_snippets(limit: int = Query(10, ge=1, le=100)):
    """获取热门代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM snippets ORDER BY usage_count DESC, updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        snippets = []
        for row in rows:
            snippet = dict(row)
            snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
            snippets.append(snippet)

        conn.close()

        return JSONResponse({"snippets": snippets})
    except Exception as e:
        logger.exception(f"获取热门代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/recent")
async def get_recent_snippets(limit: int = Query(10, ge=1, le=100)):
    """获取最近代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM snippets ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        snippets = []
        for row in rows:
            snippet = dict(row)
            snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
            snippets.append(snippet)

        conn.close()

        return JSONResponse({"snippets": snippets})
    except Exception as e:
        logger.exception(f"获取最近代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/{snippet_id}/usage")
async def increment_snippet_usage(snippet_id: int):
    """增加代码片段使用次数"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("UPDATE snippets SET usage_count = usage_count + 1 WHERE id = ?", (snippet_id,))

        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)

        conn.commit()
        conn.close()

        return JSONResponse({"message": "使用次数已更新"})
    except Exception as e:
        logger.exception(f"更新使用次数失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)