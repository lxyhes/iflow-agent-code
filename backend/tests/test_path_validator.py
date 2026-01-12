"""
路径验证器测试
"""

import pytest
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.path_validator import PathValidator, project_registry


class TestPathValidator:
    """路径验证器测试"""
    
    def test_is_path_safe_normal_path(self):
        """测试正常路径"""
        is_safe, error = PathValidator.is_path_safe("my_project")
        assert is_safe is True
        assert error is None
    
    def test_is_path_safe_path_traversal(self):
        """测试路径遍历攻击"""
        is_safe, error = PathValidator.is_path_safe("../../../etc/passwd")
        assert is_safe is False
        assert error is not None
    
    def test_is_path_safe_system_directory(self):
        """测试系统目录"""
        is_safe, error = PathValidator.is_path_safe("/etc/passwd")
        assert is_safe is False
        assert error is not None
    
    def test_is_path_safe_windows_system(self):
        """测试 Windows 系统目录"""
        is_safe, error = PathValidator.is_path_safe("C:\\Windows\\System32")
        assert is_safe is False
        assert error is not None
    
    def test_validate_project_path(self):
        """测试项目路径验证"""
        # 测试正常路径
        is_valid, error, normalized = PathValidator.validate_project_path("my_project")
        assert is_valid is True
        assert error is None
        
        # 测试路径遍历
        is_valid, error, normalized = PathValidator.validate_project_path("../../../etc/passwd")
        assert is_valid is False
        assert error is not None
    
    def test_project_registry(self):
        """测试项目注册表"""
        project_registry.clear()
        
        # 注册项目
        project_registry.register_project("test_project", "/tmp/test_project")
        
        # 获取项目
        path = project_registry.get_project_path("test_project")
        assert path == "/tmp/test_project"
        
        # 测试不存在的项目
        path = project_registry.get_project_path("nonexistent")
        assert path is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
