"""
自动化测试生成器 (Automated Test Generator)
根据代码自动生成单元测试
"""

import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from backend.core.code_analyzer import CodeAnalyzer, get_code_analyzer

logger = logging.getLogger("TestGenerator")


class TestGenerator:
    """自动化测试生成器"""
    
    def __init__(self):
        self.code_analyzer = get_code_analyzer()
    
    def generate_tests(
        self,
        file_path: str,
        content: str,
        test_framework: str = "pytest"
    ) -> Dict[str, Any]:
        """
        生成单元测试
        
        Args:
            file_path: 文件路径
            content: 文件内容
            test_framework: 测试框架 (pytest, jest, unittest)
        
        Returns:
            生成的测试代码
        """
        try:
            # 分析代码结构
            code_analysis = self.code_analyzer.analyze(file_path, content)
            
            # 根据语言和测试框架生成测试
            ext = Path(file_path).suffix.lower()
            
            if ext in ['.py']:
                test_code = self._generate_python_tests(content, code_analysis, test_framework)
            elif ext in ['.js', '.jsx', '.ts', '.tsx']:
                test_code = self._generate_javascript_tests(content, code_analysis, test_framework)
            else:
                return {"error": f"不支持的文件类型: {ext}"}
            
            return {
                "success": True,
                "test_code": test_code,
                "test_framework": test_framework,
                "functions_tested": len(code_analysis.get("functions", [])),
                "classes_tested": len(code_analysis.get("classes", []))
            }
        
        except Exception as e:
            logger.exception(f"生成测试失败: {e}")
            return {"error": f"生成测试失败: {str(e)}"}
    
    def _generate_python_tests(
        self,
        content: str,
        code_analysis: Dict[str, Any],
        test_framework: str
    ) -> str:
        """生成 Python 测试"""
        functions = code_analysis.get("functions", [])
        classes = code_analysis.get("classes", [])
        
        test_code = f'''"""
自动生成的单元测试
测试框架: {test_framework}
"""

'''
        
        # 导入必要的模块
        test_code += "import pytest\n"
        test_code += f"from {Path(code_analysis.get('file_path', 'module.py')).stem} import *\n\n"
        
        # 生成函数测试
        for func in functions:
            func_name = func.get("name", "test_func")
            params = func.get("parameters", [])
            
            test_code += f'''def test_{func_name}():
    """测试 {func_name} 函数"""
    # TODO: 实现测试逻辑
    # 示例:
    # result = {func_name}()
    # assert result is not None
    pass

'''
        
        # 生成类测试
        for cls in classes:
            class_name = cls.get("name", "TestClass")
            methods = cls.get("methods", [])
            
            test_code += f'''class Test{class_name}:
    """测试 {class_name} 类"""

    def test_init(self):
        """测试 {class_name} 初始化"""
        # TODO: 实现测试逻辑
        # obj = {class_name}()
        # assert obj is not None
        pass

'''
            
            for method in methods:
                method_name = method.get("name", "test_method")
                test_code += f'''    def test_{method_name}(self):
        """测试 {method_name} 方法"""
        # TODO: 实现测试逻辑
        # obj = {class_name}()
        # result = obj.{method_name}()
        # assert result is not None
        pass

'''
        
        return test_code
    
    def _generate_javascript_tests(
        self,
        content: str,
        code_analysis: Dict[str, Any],
        test_framework: str
    ) -> str:
        """生成 JavaScript/TypeScript 测试"""
        functions = code_analysis.get("functions", [])
        classes = code_analysis.get("classes", [])
        
        test_code = f'''/**
 * 自动生成的单元测试
 * 测试框架: {test_framework}
 */

'''
        
        if test_framework == "jest":
            test_code += "import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';\n"
        
        # 生成函数测试
        for func in functions:
            func_name = func.get("name", "testFunc")
            
            test_code += f'''describe('{func_name}', () => {{
    it('应该正常工作', () => {{
        // TODO: 实现测试逻辑
        // const result = {func_name}();
        // expect(result).toBeDefined();
    }});
    
    it('应该处理边界情况', () => {{
        // TODO: 实现边界测试
    }});
}});

'''
        
        # 生成类测试
        for cls in classes:
            class_name = cls.get("name", "TestClass")
            methods = cls.get("methods", [])
            
            test_code += f'''describe('{class_name}', () => {{
    let instance;
    
    beforeEach(() => {{
        // TODO: 初始化实例
        // instance = new {class_name}();
    }});
    
    afterEach(() => {{
        // TODO: 清理
    }});
    
'''
            
            for method in methods:
                method_name = method.get("name", "testMethod")
                test_code += f'''    describe('{method_name}', () => {{
        it('应该正常工作', () => {{
            // TODO: 实现测试逻辑
            // const result = instance.{method_name}();
            // expect(result).toBeDefined();
        }});
    }});

'''
            
            test_code += "});\n\n"
        
        return test_code


# 全局实例
_test_generator = None


def get_test_generator() -> TestGenerator:
    """获取测试生成器实例"""
    global _test_generator
    if _test_generator is None:
        _test_generator = TestGenerator()
    return _test_generator