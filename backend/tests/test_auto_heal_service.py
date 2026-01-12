"""
自动修复服务测试
"""

import pytest
import sys
import os
import asyncio

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.auto_heal_service import get_auto_heal_service


class TestAutoHealService:
    """自动修复服务测试"""
    
    @pytest.fixture
    def auto_heal_service(self):
        """获取自动修复服务实例"""
        return get_auto_heal_service()
    
    @pytest.mark.asyncio
    async def test_analyze_error_undefined_function(self, auto_heal_service):
        """测试分析 undefined 函数错误"""
        error_output = "TypeError: undefined is not a function"
        
        result = await auto_heal_service.analyze_error(error_output)
        
        assert result["error_detected"] is True
        assert result["error_type"] == "undefined_is_not_a_function"
        assert result["auto_fixable"] is True
        assert len(result["suggested_fixes"]) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_error_null_reference(self, auto_heal_service):
        """测试分析 null 引用错误"""
        error_output = "TypeError: Cannot read property 'name' of null"
        
        result = await auto_heal_service.analyze_error(error_output)
        
        assert result["error_detected"] is True
        assert result["error_type"] == "null_reference"
        assert result["auto_fixable"] is True
    
    @pytest.mark.asyncio
    async def test_analyze_error_syntax_error(self, auto_heal_service):
        """测试分析语法错误"""
        error_output = "SyntaxError: Unexpected token '}'"
        
        result = await auto_heal_service.analyze_error(error_output)
        
        assert result["error_detected"] is True
        assert result["error_type"] == "syntax_error"
        assert result["auto_fixable"] is True
    
    @pytest.mark.asyncio
    async def test_analyze_error_no_error(self, auto_heal_service):
        """测试无错误的情况"""
        error_output = "This is just normal output, no error here"
        
        result = await auto_heal_service.analyze_error(error_output)
        
        assert result["error_detected"] is False
        assert result["error_type"] is None
    
    @pytest.mark.asyncio
    async def test_attempt_auto_fix_not_fixable(self, auto_heal_service):
        """测试不可自动修复的错误"""
        error_analysis = {
            "error_detected": True,
            "error_type": "file_not_found",
            "auto_fixable": False,
            "suggested_fixes": []
        }
        
        updates = []
        async for update in auto_heal_service.attempt_auto_fix(error_analysis):
            updates.append(update)
        
        assert any(u["type"] == "error" for u in updates)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])