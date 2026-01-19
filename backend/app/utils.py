import os
import logging
from backend.core.path_validator import PathValidator, project_registry
from backend.core.project_manager import project_manager

logger = logging.getLogger("AppUtils")

def get_project_path(project_name: str) -> str:
    """安全地获取项目路径，防止路径遍历攻击"""
    logger.info(f"[get_project_path] Looking for project: '{project_name}'")

    if not project_name:
        logger.warning(f"[get_project_path] No project name provided, returning cwd: {os.getcwd()}")
        return os.getcwd()

    # 检查 project_name 是否本身就是一个有效的项目路径
    # 如果包含路径分隔符（Windows: \ 或 /），则认为它是一个路径
    if '\\' in project_name or '/' in project_name:
        # 验证路径安全性
        is_valid, error, normalized = PathValidator.validate_project_path(project_name)
        if is_valid and os.path.exists(normalized):
            logger.info(f"[get_project_path] project_name is a valid path: {normalized}")
            # 注册到项目注册表
            project_registry.register_project(os.path.basename(normalized), normalized)
            return normalized

    # 首先尝试从注册表获取
    registered_path = project_registry.get_project_path(project_name)
    if registered_path:
        logger.info(f"[get_project_path] Found in registry: {registered_path}")
        return registered_path
    
    logger.info(f"[get_project_path] Not in registry, checking project_manager...")
    
    # 然后从 project_manager 获取
    projects = project_manager.get_projects()
    logger.info(f"[get_project_path] Found {len(projects)} projects in manager")
    for p in projects:
        logger.info(f"[get_project_path]   - {p.get('name')}: {p.get('fullPath')}")
        if p["name"] == project_name:
            # 验证路径安全性
            is_valid, error, normalized = PathValidator.validate_project_path(p["fullPath"])
            if is_valid:
                project_registry.register_project(p["name"], normalized)
                logger.info(f"[get_project_path] Found in project_manager: {normalized}")
                return normalized

    # 如果还是找不到，尝试在父目录下寻找匹配的项目文件夹名
    # 获取 backend 的父目录即 agent_project
    # Note: this file is backend/app/utils.py, so __file__ is .../backend/app/utils.py
    # we want .../ (root)
    # original was backend/server.py -> .../backend/server.py -> .../
    # original: os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # now: os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    current_base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    logger.info(f"[get_project_path] Checking if project_name matches current_base: {project_name} == {os.path.basename(current_base)}")
    # 检查是否匹配当前项目文件夹名
    if project_name == os.path.basename(current_base):
        logger.info(f"[get_project_path] Matched current_base: {current_base}")
        return current_base
        
    # 检查当前工作目录的父目录
    parent_dir = os.path.dirname(os.getcwd())
    potential_path = os.path.join(parent_dir, project_name)
    logger.info(f"[get_project_path] Checking potential_path: {potential_path}")
    if os.path.isdir(potential_path):
        is_valid, _, normalized = PathValidator.validate_project_path(potential_path)
        if is_valid:
            project_registry.register_project(project_name, normalized)
            logger.info(f"[get_project_path] Found in parent_dir: {normalized}")
            return normalized
    
    # 不再直接返回用户输入的路径，而是返回安全的默认值
    logger.warning(f"[get_project_path] 未找到项目: {project_name}, 返回当前工作目录: {os.getcwd()}")
    return os.getcwd()
