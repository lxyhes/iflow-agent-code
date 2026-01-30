"""
代码执行技能

安全地执行候选人提供的代码，验证正确性和性能
"""

import subprocess
import tempfile
import os
import asyncio
from typing import Optional, Dict, Any
from ...integrations.agentscope_wrapper import (
    AgentScopeSkill,
    SkillParameter,
    SkillOutput,
    SkillContext,
)


class CodeExecutionSkill(AgentScopeSkill):
    """
    代码执行技能
    
    在安全环境中执行代码，验证候选人答案的正确性
    
    支持语言：
    - Python
    - JavaScript (Node.js)
    - Java
    - C++
    """
    
    def __init__(self):
        super().__init__(
            name="code_execution",
            description="在安全环境中执行代码，验证正确性和性能",
            parameters=[
                SkillParameter(
                    name="code",
                    description="要执行的代码",
                    type=str,
                    required=True,
                    example="def fibonacci(n):\n    if n <= 1: return n\n    return fibonacci(n-1) + fibonacci(n-2)",
                ),
                SkillParameter(
                    name="language",
                    description="编程语言",
                    type=str,
                    required=False,
                    default="python",
                    enum=["python", "javascript", "java", "cpp"],
                ),
                SkillParameter(
                    name="test_cases",
                    description="测试用例列表，每个用例包含 input 和 expected_output",
                    type=list,
                    required=False,
                    default=None,
                ),
                SkillParameter(
                    name="timeout",
                    description="执行超时时间（秒）",
                    type=int,
                    required=False,
                    default=5,
                ),
            ],
            output=SkillOutput(
                description="代码执行结果，包含输出、错误、执行时间等信息",
                type=dict,
            ),
            tags=["technical", "code", "execution", "validation"],
            version="1.0.0",
        )
    
    async def execute(
        self,
        code: str,
        language: str = "python",
        test_cases: Optional[list] = None,
        timeout: int = 5,
        context: Optional[SkillContext] = None,
    ) -> Dict[str, Any]:
        """
        执行代码
        
        Args:
            code: 要执行的代码
            language: 编程语言
            test_cases: 测试用例
            timeout: 超时时间
            context: 执行上下文
            
        Returns:
            执行结果字典
        """
        # 根据语言选择执行器
        executors = {
            "python": self._execute_python,
            "javascript": self._execute_javascript,
            "java": self._execute_java,
            "cpp": self._execute_cpp,
        }
        
        executor = executors.get(language)
        if not executor:
            return {
                "success": False,
                "error": f"不支持的语言: {language}",
                "output": None,
                "execution_time": 0,
            }
        
        # 执行代码
        result = await executor(code, timeout)
        
        # 如果有测试用例，运行测试
        if test_cases and result.get("success"):
            test_results = await self._run_test_cases(code, language, test_cases, timeout)
            result["test_results"] = test_results
            result["test_passed"] = all(r["passed"] for r in test_results)
        
        return result
    
    async def _execute_python(self, code: str, timeout: int) -> Dict[str, Any]:
        """执行 Python 代码"""
        import time
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            start_time = time.time()
            
            # 使用 subprocess 执行代码
            process = await asyncio.create_subprocess_exec(
                'python', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
                execution_time = time.time() - start_time
                
                return {
                    "success": process.returncode == 0,
                    "output": stdout.decode('utf-8') if stdout else None,
                    "error": stderr.decode('utf-8') if stderr else None,
                    "execution_time": round(execution_time, 3),
                    "language": "python",
                }
            except asyncio.TimeoutError:
                process.kill()
                return {
                    "success": False,
                    "error": f"执行超时（超过 {timeout} 秒）",
                    "output": None,
                    "execution_time": timeout,
                    "language": "python",
                }
        finally:
            os.unlink(temp_file)
    
    async def _execute_javascript(self, code: str, timeout: int) -> Dict[str, Any]:
        """执行 JavaScript 代码"""
        import time
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            start_time = time.time()
            
            process = await asyncio.create_subprocess_exec(
                'node', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
                execution_time = time.time() - start_time
                
                return {
                    "success": process.returncode == 0,
                    "output": stdout.decode('utf-8') if stdout else None,
                    "error": stderr.decode('utf-8') if stderr else None,
                    "execution_time": round(execution_time, 3),
                    "language": "javascript",
                }
            except asyncio.TimeoutError:
                process.kill()
                return {
                    "success": False,
                    "error": f"执行超时（超过 {timeout} 秒）",
                    "output": None,
                    "execution_time": timeout,
                    "language": "javascript",
                }
        finally:
            os.unlink(temp_file)
    
    async def _execute_java(self, code: str, timeout: int) -> Dict[str, Any]:
        """执行 Java 代码（简化版）"""
        return {
            "success": False,
            "error": "Java 执行暂未实现",
            "output": None,
            "execution_time": 0,
            "language": "java",
        }
    
    async def _execute_cpp(self, code: str, timeout: int) -> Dict[str, Any]:
        """执行 C++ 代码（简化版）"""
        return {
            "success": False,
            "error": "C++ 执行暂未实现",
            "output": None,
            "execution_time": 0,
            "language": "cpp",
        }
    
    async def _run_test_cases(
        self,
        code: str,
        language: str,
        test_cases: list,
        timeout: int,
    ) -> list:
        """运行测试用例"""
        results = []
        
        for i, test_case in enumerate(test_cases):
            # 构建测试代码
            test_code = self._build_test_code(code, language, test_case)
            
            # 执行测试
            result = await self._execute_python(test_code, timeout)
            
            results.append({
                "case_id": i + 1,
                "input": test_case.get("input"),
                "expected": test_case.get("expected_output"),
                "actual": result.get("output"),
                "passed": result.get("success") and result.get("output", "").strip() == test_case.get("expected_output", "").strip(),
                "error": result.get("error"),
            })
        
        return results
    
    def _build_test_code(self, code: str, language: str, test_case: dict) -> str:
        """构建测试代码"""
        if language == "python":
            input_data = test_case.get("input", "")
            return f"""
{code}

# 测试代码
if __name__ == "__main__":
    result = solution({repr(input_data)})
    print(result)
"""
        return code
