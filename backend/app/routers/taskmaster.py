"""
TaskMaster Router
任务管理（TaskMaster）相关的 API 路由
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.core.task_master_service import task_master_service, Task as TaskModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/taskmaster", tags=["TaskMaster"])


# ============================================
# 数据模型
# ============================================

class PRDSaveRequest(BaseModel):
    title: str
    content: str


# ============================================
# TaskMaster 端点
# ============================================

@router.get("/installation-status")
async def get_taskmaster_installation_status():
    """获取 TaskMaster 安装状态"""
    return {
        "installation": {"isInstalled": False},
        "isReady": False
    }


@router.get("/tasks/{project_name}")
async def get_taskmaster_tasks(project_name: str):
    """获取项目的任务列表"""
    try:
        tasks = task_master_service.get_tasks(project_name)

        # 统计任务状态
        total = len(tasks)
        completed = sum(1 for task in tasks if task.get("status") == "completed")

        return {
            "success": True,
            "tasks": tasks,
            "total": total,
            "completed": completed
        }
    except Exception as e:
        logger.exception(f"获取任务列表失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "tasks": [],
            "total": 0,
            "completed": 0
        }


@router.post("/tasks/{project_name}")
async def create_project_task(project_name: str, task: TaskModel):
    """创建新任务"""
    try:
        # 确保项目名称匹配
        task.project_name = project_name
        created_task = task_master_service.create_task(task)
        return {"success": True, "task": created_task}
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/tasks/{project_name}/{task_id}")
async def update_project_task(project_name: str, task_id: str, updates: Dict[str, Any]):
    """更新任务"""
    try:
        updated_task = task_master_service.update_task(task_id, updates)
        if not updated_task:
            return JSONResponse({"error": "Task not found"}, status_code=404)
        return {"success": True, "task": updated_task}
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/tasks/{project_name}/{task_id}")
async def delete_project_task(project_name: str, task_id: str):
    """删除任务"""
    try:
        success = task_master_service.delete_task(task_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/prd/{project_name}")
async def get_project_prds(project_name: str):
    """获取项目的 PRD 列表"""
    try:
        prds = task_master_service.get_prds(project_name)
        return prds
    except Exception as e:
        logger.error(f"Error getting PRDs: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/prd/{project_name}/{prd_name}")
async def get_prd_details(project_name: str, prd_name: str):
    """获取 PRD 内容"""
    try:
        prd = task_master_service.get_prd_content(project_name, prd_name)
        if not prd:
            return JSONResponse({"error": "PRD not found"}, status_code=404)
        return prd
    except Exception as e:
        logger.error(f"Error getting PRD: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/prd/{project_name}")
async def save_project_prd(project_name: str, req: PRDSaveRequest):
    """保存/更新 PRD"""
    try:
        saved_prd = task_master_service.save_prd(project_name, req.title, req.content)
        return {"success": True, "prd": saved_prd}
    except Exception as e:
        logger.error(f"Error saving PRD: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)