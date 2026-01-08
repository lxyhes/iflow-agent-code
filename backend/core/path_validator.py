"""
Project Path Validator - 增强的项目路径安全验证
用于验证和规范化项目路径，防止路径遍历攻击
"""

import os
import re
from typing import List, Optional, Tuple
from pathlib import Path


class PathValidator:
    """安全的路径验证器"""
    
    # 禁止访问的敏感目录模式
    FORBIDDEN_PATTERNS = [
        r'\.\.[\\/]',  # 路径遍历
        r'^[\\/]etc',  # Linux 系统配置
        r'^[\\/]root',  # Linux root 目录
        r'^[\\/]sys',  # Linux 系统目录
        r'^[\\/]proc',  # Linux 进程目录
        r'^[\\/]dev',  # Linux 设备目录
        r'^[\\/]var[\\/]log',  # 日志目录
        r'^[a-zA-Z]:[\\/]Windows',  # Windows 系统目录
        r'^[a-zA-Z]:[\\/]Program Files',  # Windows Program Files
        r'^[a-zA-Z]:[\\/]ProgramData',  # Windows 程序数据
        r'^[a-zA-Z]:[\\/]\$',  # Windows 隐藏系统目录
        r'^[a-zA-Z]:[\\/]Users[\\/][^\\\/]+[\\/]AppData',  # Windows AppData
        r'\.git[\\/]',  # Git 内部目录
        r'node_modules[\\/]',  # Node modules
        r'__pycache__[\\/]',  # Python 缓存
        r'\.ssh[\\/]',  # SSH 密钥目录
        r'\.gnupg[\\/]',  # GPG 密钥目录
        r'\.aws[\\/]',  # AWS 凭证
        r'\.azure[\\/]',  # Azure 凭证
    ]
    
    # 允许的项目根目录列表 (可通过配置扩展)
    _allowed_roots: List[str] = []
    
    @classmethod
    def set_allowed_roots(cls, roots: List[str]):
        """设置允许的项目根目录"""
        cls._allowed_roots = [os.path.realpath(r) for r in roots if os.path.isdir(r)]
    
    @classmethod
    def add_allowed_root(cls, root: str):
        """添加一个允许的根目录"""
        real_path = os.path.realpath(root)
        if os.path.isdir(real_path) and real_path not in cls._allowed_roots:
            cls._allowed_roots.append(real_path)
    
    @classmethod
    def is_path_safe(cls, path: str) -> Tuple[bool, str]:
        """
        检查路径是否安全
        
        Returns:
            (is_safe, reason)
        """
        if not path:
            return False, "空路径"
        
        # 规范化路径
        try:
            normalized = os.path.normpath(path)
            real_path = os.path.realpath(path) if os.path.exists(path) else normalized
        except (OSError, ValueError) as e:
            return False, f"路径无效: {e}"
        
        # 检查禁止的模式
        for pattern in cls.FORBIDDEN_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                return False, f"路径包含禁止的模式: {pattern}"
            if re.search(pattern, normalized, re.IGNORECASE):
                return False, f"规范化路径包含禁止的模式"
        
        # 检查是否在允许的根目录下
        if cls._allowed_roots:
            is_allowed = any(
                real_path.startswith(root) or real_path == root
                for root in cls._allowed_roots
            )
            if not is_allowed:
                return False, "路径不在允许的根目录范围内"
        
        # 检查空字节注入
        if '\x00' in path:
            return False, "路径包含空字节"
        
        return True, ""
    
    @classmethod
    def validate_project_path(cls, path: str, must_exist: bool = True) -> Tuple[bool, str, Optional[str]]:
        """
        验证项目路径
        
        Args:
            path: 要验证的路径
            must_exist: 路径是否必须存在
            
        Returns:
            (is_valid, error_message, normalized_path)
        """
        is_safe, reason = cls.is_path_safe(path)
        if not is_safe:
            return False, reason, None
        
        normalized = os.path.realpath(path) if os.path.exists(path) else os.path.normpath(path)
        
        if must_exist and not os.path.exists(normalized):
            return False, "路径不存在", None
        
        if must_exist and not os.path.isdir(normalized):
            return False, "路径不是目录", None
        
        return True, "", normalized
    
    @classmethod
    def validate_file_path(cls, base_dir: str, rel_path: str) -> Tuple[bool, str, Optional[str]]:
        """
        验证文件路径（相对于基础目录）
        
        Args:
            base_dir: 基础目录（项目根目录）
            rel_path: 相对路径
            
        Returns:
            (is_valid, error_message, full_path)
        """
        # 验证基础目录
        is_safe, reason = cls.is_path_safe(base_dir)
        if not is_safe:
            return False, f"基础目录不安全: {reason}", None
        
        # 检查相对路径中的路径遍历
        if '..' in rel_path.split(os.sep) or '..' in rel_path.split('/'):
            return False, "相对路径包含路径遍历", None
        
        # 构建完整路径
        try:
            full_path = os.path.normpath(os.path.join(base_dir, rel_path))
            real_base = os.path.realpath(base_dir)
            real_full = os.path.realpath(full_path) if os.path.exists(full_path) else full_path
            
            # 确保最终路径在基础目录下
            if not real_full.startswith(real_base):
                return False, "文件路径超出项目目录范围", None
            
        except (OSError, ValueError) as e:
            return False, f"路径构建失败: {e}", None
        
        return True, "", full_path


class ProjectRegistry:
    """项目注册表 - 管理已注册的项目及其权限"""
    
    _instance: Optional['ProjectRegistry'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance
    
    def _init(self):
        self._projects = {}  # name -> project_info
        self._path_to_name = {}  # path -> name
    
    def register_project(self, name: str, path: str, **kwargs) -> Tuple[bool, str]:
        """注册一个项目"""
        is_valid, error, normalized = PathValidator.validate_project_path(path)
        if not is_valid:
            return False, error
        
        # 检查路径是否已被其他项目使用
        if normalized in self._path_to_name and self._path_to_name[normalized] != name:
            existing = self._path_to_name[normalized]
            return False, f"路径已被项目 '{existing}' 使用"
        
        self._projects[name] = {
            'name': name,
            'path': normalized,
            'display_name': kwargs.get('display_name', name),
            **kwargs
        }
        self._path_to_name[normalized] = name
        
        # 将路径添加到允许列表
        PathValidator.add_allowed_root(normalized)
        
        return True, ""
    
    def unregister_project(self, name: str) -> bool:
        """注销一个项目"""
        if name in self._projects:
            path = self._projects[name]['path']
            del self._projects[name]
            if path in self._path_to_name:
                del self._path_to_name[path]
            return True
        return False
    
    def get_project(self, name: str) -> Optional[dict]:
        """获取项目信息"""
        return self._projects.get(name)
    
    def get_project_path(self, name: str) -> Optional[str]:
        """获取项目路径"""
        project = self._projects.get(name)
        return project['path'] if project else None
    
    def is_registered(self, name: str) -> bool:
        """检查项目是否已注册"""
        return name in self._projects
    
    def list_projects(self) -> List[dict]:
        """列出所有已注册的项目"""
        return list(self._projects.values())
    
    def validate_access(self, project_name: str, file_path: str = None) -> Tuple[bool, str]:
        """验证对项目（或项目内文件）的访问权限"""
        project = self.get_project(project_name)
        if not project:
            return False, f"项目 '{project_name}' 未注册"
        
        if file_path:
            is_valid, error, _ = PathValidator.validate_file_path(project['path'], file_path)
            if not is_valid:
                return False, error
        
        return True, ""


# 全局单例
project_registry = ProjectRegistry()
