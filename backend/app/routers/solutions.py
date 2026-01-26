"""
Solutions Router
方案生成器相关的 API 路由
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.core.agent import Agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/solutions", tags=["Solutions"])


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

class SolutionGenerate(BaseModel):
    requirement: str
    template_type: Optional[str] = None


# ============================================
# Solutions 端点
# ============================================

@router.post("/generate")
async def generate_solution(request: Request, req: SolutionGenerate):
    """生成方案"""
    try:
        project_name = request.query_params.get("project")
        if not project_name:
            return JSONResponse({"error": "缺少项目名称"}, status_code=400)

        project_path = _get_project_path(project_name)
        logger.info(f"[generate_solution] 项目路径: {project_path}")

        # 使用 iFlow Agent 生成方案
        agent = Agent(
            name="IFlowAgent",
            cwd=project_path,
            mode="yolo",
            model="GLM-4.7",
            persona="partner"
        )
        logger.info(f"[generate_solution] Agent 创建成功")

        prompt = f"""请根据以下需求，生成一个详细的技术方案：

需求：{req.requirement}
{f'模板类型：{req.template_type}' if req.template_type else ''}

请提供：
1. 技术栈选择
2. 架构设计
3. 实现步骤
4. 关键代码示例
5. 注意事项

请用 Markdown 格式输出。"""

        logger.info(f"[generate_solution] 开始生成方案，需求: {req.requirement}")

        solution_content = ""
        message_count = 0
        async for msg in agent.chat_stream(prompt):
            message_count += 1
            msg_type = msg.get("type")
            logger.debug(f"[generate_solution] 收到消息 {message_count}: {msg_type}, 完整消息: {msg}")

            # 处理不同类型的消息
            if msg_type == "content":
                content = msg.get("content", "")
                solution_content += content
                logger.debug(f"[generate_solution] 累计内容长度: {len(solution_content)}")
            elif msg_type == "text":
                content = msg.get("text", "")
                solution_content += content
                logger.debug(f"[generate_solution] 累计内容长度: {len(solution_content)}")
            elif msg_type == "assistant":
                # assistant 消息可能包含内容
                if "content" in msg:
                    content = msg["content"]
                    if isinstance(content, str):
                        solution_content += content

        logger.info(f"[generate_solution] 生成完成，共 {message_count} 条消息，内容长度: {len(solution_content)}")

        # 保存到数据库
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO solutions (requirement, solution, template_type)
            VALUES (?, ?, ?)
        ''', (req.requirement, solution_content, req.template_type))
        solution_id = cursor.lastrowid
        conn.commit()
        conn.close()

        logger.info(f"[generate_solution] 方案已保存，ID: {solution_id}")

        return JSONResponse({
            "solution_id": solution_id,
            "solution": solution_content,
            "message": "方案生成成功"
        })
    except Exception as e:
        logger.exception(f"[generate_solution] 生成方案失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/generate-stream")
async def generate_solution_stream(request: Request, req: SolutionGenerate):
    """流式生成方案"""
    async def event_generator():
        try:
            project_name = request.query_params.get("project")
            if not project_name:
                yield f"data: {json.dumps({'error': '缺少项目名称'})}\n\n"
                return

            project_path = _get_project_path(project_name)
            logger.info(f"[generate_solution_stream] 项目路径: {project_path}")

            agent = Agent(
                name="IFlowAgent",
                cwd=project_path,
                mode="yolo",
                model="GLM-4.7",
                persona="partner"
            )
            logger.info(f"[generate_solution_stream] Agent 创建成功")

            prompt = f"""请根据以下需求，生成一个详细的技术方案：

需求：{req.requirement}
{f'模板类型：{req.template_type}' if req.template_type else ''}

请提供：
1. 技术栈选择
2. 架构设计
3. 实现步骤
4. 关键代码示例
5. 注意事项

请用 Markdown 格式输出。"""

            logger.info(f"[generate_solution_stream] 开始生成方案，需求: {req.requirement}")

            solution_content = ""
            message_count = 0
            async for msg in agent.chat_stream(prompt):
                message_count += 1
                msg_type = msg.get("type")
                logger.debug(f"[generate_solution_stream] 收到消息 {message_count}: {msg_type}")

                # 处理不同类型的消息
                if msg_type == "content":
                    content = msg.get("content", "")
                    solution_content += content
                    # 流式发送内容
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                elif msg_type == "text":
                    content = msg.get("text", "")
                    solution_content += content
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                elif msg_type == "assistant":
                    if "content" in msg:
                        content = msg["content"]
                        if isinstance(content, str):
                            solution_content += content
                            yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                        elif isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and "text" in item:
                                    solution_content += item["text"]
                                    yield f"data: {json.dumps({'type': 'content', 'content': item['text']})}\n\n"

            logger.info(f"[generate_solution_stream] 生成完成，共 {message_count} 条消息，内容长度: {len(solution_content)}")

            # 保存到数据库
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO solutions (requirement, solution, template_type)
                VALUES (?, ?, ?)
            ''', (req.requirement, solution_content, req.template_type))
            solution_id = cursor.lastrowid
            conn.commit()
            conn.close()

            logger.info(f"[generate_solution_stream] 方案已保存，ID: {solution_id}")

            # 发送完成事件
            yield f"data: {json.dumps({'type': 'done', 'solution_id': solution_id, 'solution': solution_content})}\n\n"

        except Exception as e:
            logger.exception(f"[generate_solution_stream] 生成方案失败: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("")
async def get_solutions(limit: int = Query(10, ge=1, le=100)):
    """获取已保存的方案"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM solutions ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        solutions = []
        for row in rows:
            solution = dict(row)
            solutions.append(solution)

        conn.close()

        return JSONResponse({"solutions": solutions})
    except Exception as e:
        logger.exception(f"获取方案失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/templates")
async def get_solution_templates():
    """获取方案模板"""
    try:
        templates = [
            {
                "id": "web-app",
                "name": "Web 应用",
                "description": "Web 应用开发方案模板"
            },
            {
                "id": "mobile-app",
                "name": "移动应用",
                "description": "移动应用开发方案模板"
            },
            {
                "id": "api-service",
                "name": "API 服务",
                "description": "API 服务开发方案模板"
            },
            {
                "id": "data-pipeline",
                "name": "数据管道",
                "description": "数据处理管道方案模板"
            }
        ]

        return JSONResponse({"templates": templates})
    except Exception as e:
        logger.exception(f"获取方案模板失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/{solution_id}")
async def get_solution(solution_id: int):
    """获取单个方案"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM solutions WHERE id = ?", (solution_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return JSONResponse({"error": "方案不存在"}, status_code=404)

        solution = dict(row)
        conn.close()

        return JSONResponse(solution)
    except Exception as e:
        logger.exception(f"获取方案失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================
# 辅助函数
# ============================================

def _get_project_path(project: str) -> str:
    """获取项目路径（临时实现，后续需要与 project_registry 集成）"""
    # TODO: 使用 project_registry 获取项目路径
    return project