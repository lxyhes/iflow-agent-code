"""
Git Router
Git 操作相关的 API 路由
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
import logging

from backend.core.git_service import git_service
from backend.core.file_service import file_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/git", tags=["Git"])


# ============================================
# 数据模型
# ============================================

class CheckoutRequest(BaseModel):
    project: str
    branch: str


class CommitRequest(BaseModel):
    project: str
    message: str
    files: list


# ============================================
# Git 端点
# ============================================

@router.get("/status")
async def get_git_status(project: str = Query(None)):
    """获取 Git 状态"""
    path = _get_project_path(project)
    logger.info(f"Getting git status for project '{project}' at path: '{path}'")
    return await git_service.get_status(path)


@router.get("/branches")
async def get_branches(project: str = Query(None)):
    """获取所有分支"""
    branches = await git_service.get_branches(_get_project_path(project))
    return {"branches": branches}


@router.get("/remote-status")
async def get_remote_status(project: str = Query(None)):
    """获取远程仓库状态"""
    return await git_service.get_remote_status(_get_project_path(project))


@router.get("/diff")
async def get_diff(project: str = Query(None), file: str = Query(None)):
    """获取文件差异"""
    diff = await git_service.get_diff(_get_project_path(project), file)
    return {"diff": diff}


@router.get("/commits")
async def get_commits(project: str = Query(None), limit: int = 10):
    """获取提交历史"""
    commits = await git_service.get_commits(_get_project_path(project), limit)
    return {"commits": commits}


@router.get("/commit-diff")
async def get_commit_diff(project: str = Query(None), commit: str = Query(None)):
    """获取提交的差异"""
    diff = await git_service.get_commit_diff(_get_project_path(project), commit)
    return {"diff": diff}


@router.post("/checkout")
async def checkout_branch(req: CheckoutRequest):
    """切换分支"""
    await git_service.checkout(_get_project_path(req.project), req.branch)
    return {"success": True}


@router.post("/create-branch")
async def create_new_branch(req: CheckoutRequest):
    """创建新分支"""
    await git_service.create_branch(_get_project_path(req.project), req.branch)
    return {"success": True}


@router.post("/commit")
async def commit_changes(req: CommitRequest):
    """提交更改"""
    output = await git_service.commit(_get_project_path(req.project), req.message, req.files)
    return {"success": True, "output": output}


@router.get("/file-with-diff")
async def get_file_with_diff(project: str = Query(None), file: str = Query(None)):
    """获取文件及其差异"""
    logger.info(f"[GitDiff] project={project}, file={file}")
    path = _get_project_path(project)
    current_content = ""
    try:
        current_content = file_service.read_file(path, file)
    except Exception as e:
        logger.warning(f"[GitDiff] Failed to read current file: {e}")
        pass  # File might be deleted

    old_content = await git_service.get_file_at_head(path, file)

    return {
        "current_content": current_content,
        "old_content": old_content
    }


# ============================================
# 辅助函数
# ============================================

def _get_project_path(project: str) -> str:
    """获取项目路径（临时实现，后续需要与 project_registry 集成）"""
    # TODO: 使用 project_registry 获取项目路径
    # 目前先返回 project 字符串，后续需要修改
    return project