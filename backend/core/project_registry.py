"""
项目注册中心 - 统一管理项目路径解析和验证
解决多处 _get_project_path 临时实现的问题
"""
import os
import json
import logging
from typing import Dict, Optional, List, Any
from pathlib import Path

from backend.core.path_validator import PathValidator

logger = logging.getLogger("ProjectRegistry")


class ProjectInfo:
    """项目信息数据类"""
    
    def __init__(self, name: str, path: str, display_name: str = None, **kwargs):
        self.name = name
        self.path = Path(path).resolve()
        self.display_name = display_name or name
        self.metadata = kwargs
    
    @property
    def exists(self) -> bool:
        """检查项目路径是否存在"""
        return self.path.exists() and self.path.is_dir()
    
    @property
    def safe_path(self) -> str:
        """获取安全的路径字符串"""
        return str(self.path)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "path": str(self.path),
            "display_name": self.display_name,
            "exists": self.exists,
            **self.metadata
        }


class ProjectRegistry:
    """
    统一项目注册中心
    
    功能：
    1. 管理所有项目的名称→路径映射
    2. 提供安全的项目路径解析
    3. 验证项目路径有效性
    4. 防止路径遍历攻击
    
    使用方法：
        registry = ProjectRegistry()
        
        # 注册项目
        registry.register("myproject", "/path/to/project")
        
        # 解析项目路径
        path = registry.resolve_path("myproject")
        # 返回: "/path/to/project"
        
        # 获取项目信息
        info = registry.get_info("myproject")
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._projects: Dict[str, ProjectInfo] = {}
            cls._instance._path_validator = PathValidator()
            cls._instance._projects_file = None
            cls._instance._initialized = False
        return cls._instance
    
    def initialize(self, projects_file: str = None) -> None:
        """初始化注册中心，加载项目列表"""
        if self._initialized:
            return
        
        # 确定项目文件路径
        if projects_file is None:
            project_root = self._find_project_root()
            projects_file = os.path.join(project_root, "projects.json")
        
        self._projects_file = projects_file
        self._load_projects()
        self._initialized = True
        logger.info(f"ProjectRegistry initialized with {len(self._projects)} projects")
    
    def _find_project_root(self) -> str:
        """查找项目根目录"""
        current = Path(__file__).resolve()
        # 向上查找直到找到 projects.json 或到达根目录
        for parent in current.parents:
            if (parent / "projects.json").exists() or (parent / "backend").exists():
                return str(parent)
        return str(current.parent.parent.parent)
    
    def _load_projects(self) -> None:
        """从文件加载项目列表"""
        if not self._projects_file or not os.path.exists(self._projects_file):
            logger.warning(f"Projects file not found: {self._projects_file}")
            return
        
        try:
            with open(self._projects_file, 'r', encoding='utf-8') as f:
                projects_data = json.load(f)
            
            for proj_data in projects_data:
                name = proj_data.get("name")
                path = proj_data.get("fullPath") or proj_data.get("path")
                display_name = proj_data.get("displayName", name)
                
                if name and path:
                    self._projects[name] = ProjectInfo(
                        name=name,
                        path=path,
                        display_name=display_name,
                        sessions=proj_data.get("sessions", []),
                        session_meta=proj_data.get("sessionMeta", {})
                    )
            
            logger.info(f"Loaded {len(self._projects)} projects from {self._projects_file}")
            
        except Exception as e:
            logger.error(f"Failed to load projects: {e}")
    
    def reload(self) -> None:
        """重新加载项目列表"""
        self._projects.clear()
        self._load_projects()
    
    def register(self, name: str, path: str, display_name: str = None, **metadata) -> ProjectInfo:
        """注册新项目"""
        # 验证路径安全
        if not self._path_validator.is_valid_project_path(path):
            raise ValueError(f"Invalid project path: {path}")
        
        resolved_path = Path(path).resolve()
        
        # 检查路径冲突
        for existing_name, existing_info in self._projects.items():
            if existing_info.path == resolved_path and existing_name != name:
                logger.warning(f"Path {path} already registered as '{existing_name}'")
        
        self._projects[name] = ProjectInfo(
            name=name,
            path=resolved_path,
            display_name=display_name or name,
            **metadata
        )
        
        logger.info(f"Registered project: {name} -> {resolved_path}")
        return self._projects[name]
    
    def unregister(self, name: str) -> bool:
        """注销项目"""
        if name in self._projects:
            del self._projects[name]
            logger.info(f"Unregistered project: {name}")
            return True
        return False
    
    def resolve_path(self, project_name: str) -> Optional[str]:
        """
        解析项目名称到实际路径
        
        这是替代各处 _get_project_path 临时实现的核心方法
        """
        # 如果已经是有效路径，直接返回
        if os.path.isabs(project_name) and os.path.isdir(project_name):
            # 验证路径安全性
            if self._path_validator.is_valid_project_path(project_name):
                return project_name
            return None
        
        # 从注册表查找
        if project_name in self._projects:
            info = self._projects[project_name]
            if info.exists:
                return info.safe_path
            else:
                logger.warning(f"Project path does not exist: {info.safe_path}")
                return None
        
        logger.warning(f"Project not found: {project_name}")
        return None
    
    def get_info(self, project_name: str) -> Optional[ProjectInfo]:
        """获取项目信息"""
        return self._projects.get(project_name)
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """列出所有项目"""
        return [info.to_dict() for info in self._projects.values()]
    
    def exists(self, project_name: str) -> bool:
        """检查项目是否存在"""
        info = self._projects.get(project_name)
        return info is not None and info.exists
    
    def validate_path(self, project_name: str, relative_path: str = "") -> Optional[str]:
        """
        验证并构建项目内的安全路径
        
        Args:
            project_name: 项目名称
            relative_path: 项目内的相对路径
            
        Returns:
            验证通过返回完整路径，失败返回 None
        """
        project_path = self.resolve_path(project_name)
        if not project_path:
            return None
        
        if not relative_path:
            return project_path
        
        # 构建完整路径并验证
        full_path = os.path.join(project_path, relative_path)
        
        # 使用 PathValidator 验证路径安全
        if self._path_validator.validate_path(full_path, project_path):
            return full_path
        
        return None
    
    def get_project_by_path(self, path: str) -> Optional[ProjectInfo]:
        """通过路径查找项目"""
        target = Path(path).resolve()
        for info in self._projects.values():
            if info.path == target or target.is_relative_to(info.path):
                return info
        return None


# 全局注册中心实例
_project_registry = ProjectRegistry()


def get_project_registry() -> ProjectRegistry:
    """获取项目注册中心实例"""
    if not _project_registry._initialized:
        _project_registry.initialize()
    return _project_registry


def resolve_project_path(project_name: str) -> Optional[str]:
    """
    便捷函数：解析项目路径
    
    替代原来各处的 _get_project_path 临时实现
    """
    return get_project_registry().resolve_path(project_name)


def validate_project_path(project_name: str, relative_path: str = "") -> Optional[str]:
    """便捷函数：验证项目路径"""
    return get_project_registry().validate_path(project_name, relative_path)
