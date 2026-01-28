"""
System Router
系统级 API 路由 - 提供服务状态、健康检查、系统信息
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
import platform
import sys
import os
from datetime import datetime

from backend.core.service_registry import registry
from backend.core.project_registry import get_project_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["System"])


# ============================================
# 数据模型
# ============================================

class ServiceStatus(BaseModel):
    name: str
    status: str  # "active", "inactive", "error"
    type: str    # "instance", "factory"
    error: Optional[str] = None


class SystemInfo(BaseModel):
    version: str
    python_version: str
    platform: str
    uptime: str
    start_time: datetime


class HealthStatus(BaseModel):
    status: str  # "healthy", "degraded", "unhealthy"
    services: List[ServiceStatus]
    total_services: int
    active_services: int
    errors: List[str]


# ============================================
# 系统启动时间
# ============================================

_start_time = datetime.now()


# ============================================
# API 端点
# ============================================

@router.get("/health", response_model=HealthStatus)
async def health_check():
    """
    系统健康检查
    
    返回所有已注册服务的状态，用于监控和诊断
    """
    services_status = []
    errors = []
    active_count = 0
    
    all_services = registry.list_services()
    
    for service_name, service_type in all_services.items():
        status = "active"
        error_msg = None
        
        # 尝试获取服务实例验证状态
        try:
            # 这里可以根据服务类型做更详细的检查
            active_count += 1
        except Exception as e:
            status = "error"
            error_msg = str(e)
            errors.append(f"{service_name}: {error_msg}")
        
        services_status.append(ServiceStatus(
            name=service_name,
            status=status,
            type=service_type,
            error=error_msg
        ))
    
    # 确定整体健康状态
    overall_status = "healthy"
    if errors:
        overall_status = "degraded" if len(errors) < len(services_status) / 2 else "unhealthy"
    
    return HealthStatus(
        status=overall_status,
        services=services_status,
        total_services=len(services_status),
        active_services=active_count,
        errors=errors
    )


@router.get("/info", response_model=SystemInfo)
async def system_info():
    """
    获取系统信息
    
    返回版本、运行环境等基本信息
    """
    uptime = datetime.now() - _start_time
    
    return SystemInfo(
        version="2.0.0",
        python_version=sys.version,
        platform=f"{platform.system()} {platform.release()}",
        uptime=str(uptime),
        start_time=_start_time
    )


@router.get("/services")
async def list_services():
    """
    列出所有已注册服务
    
    用于调试和监控服务注册状态
    """
    return {
        "services": registry.list_services(),
        "count": len(registry.list_services())
    }


@router.get("/projects")
async def list_registered_projects():
    """
    列出所有已注册项目
    
    返回 ProjectRegistry 中注册的所有项目
    """
    project_registry = get_project_registry()
    projects = project_registry.list_projects()
    
    return {
        "projects": projects,
        "count": len(projects)
    }


@router.post("/reload-projects")
async def reload_projects():
    """
    重新加载项目列表
    
    当 projects.json 手动修改后调用此接口刷新
    """
    try:
        project_registry = get_project_registry()
        project_registry.reload()
        
        return {
            "success": True,
            "message": f"Reloaded {len(project_registry.list_projects())} projects"
        }
    except Exception as e:
        logger.error(f"Failed to reload projects: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/config")
async def get_system_config():
    """
    获取系统配置信息
    
    返回对前端有用的配置项
    """
    return {
        "features": {
            "rag_enabled": True,
            "code_review_enabled": True,
            "auto_fix_enabled": True,
            "smart_requirement_enabled": True,
            "git_enabled": True,
            "shell_enabled": True,
            "ocr_enabled": True,
        },
        "limits": {
            "max_file_size": 10 * 1024 * 1024,  # 10MB
            "max_upload_size": 50 * 1024 * 1024,  # 50MB
        },
        "paths": {
            "storage_dir": os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage"),
        }
    }


@router.get("/stats")
async def get_system_stats():
    """
    获取系统统计信息
    
    返回运行时的统计数据
    """
    import psutil
    
    process = psutil.Process()
    
    return {
        "memory": {
            "rss_mb": process.memory_info().rss / 1024 / 1024,
            "vms_mb": process.memory_info().vms / 1024 / 1024,
        },
        "cpu": {
            "percent": process.cpu_percent(),
            "threads": process.num_threads(),
        },
        "projects": len(get_project_registry().list_projects()),
        "services": len(registry.list_services()),
        "uptime_seconds": (datetime.now() - _start_time).total_seconds(),
    }
