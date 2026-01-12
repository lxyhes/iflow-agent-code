"""
自动修复服务 (Auto-Heal Service)
检测终端错误并自动修复
"""

import re
import logging
import asyncio
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("AutoHealService")


class ErrorPattern:
    """错误模式定义"""
    
    def __init__(
        self,
        name: str,
        patterns: List[str],
        severity: str = "error",
        auto_fixable: bool = True
    ):
        self.name = name
        self.patterns = [re.compile(p, re.IGNORECASE) for p in patterns]
        self.severity = severity
        self.auto_fixable = auto_fixable


class AutoHealService:
    """自动修复服务"""
    
    def __init__(self):
        self.error_patterns = self._init_error_patterns()
        self.fix_history = []
        self.enabled = True
    
    def _init_error_patterns(self) -> List[ErrorPattern]:
        """初始化错误模式"""
        return [
            # JavaScript/TypeScript 错误
            ErrorPattern(
                name="undefined_is_not_a_function",
                patterns=[
                    r"undefined is not a function",
                    r"TypeError: .* is not a function",
                    r"Cannot read property.*of undefined"
                ],
                severity="error",
                auto_fixable=True
            ),
            ErrorPattern(
                name="null_reference",
                patterns=[
                    r"Cannot read property.*of null",
                    r"null is not an object"
                ],
                severity="error",
                auto_fixable=True
            ),
            ErrorPattern(
                name="missing_import",
                patterns=[
                    r"ReferenceError: .* is not defined",
                    r"'.*' is not defined",
                    r"Module not found"
                ],
                severity="error",
                auto_fixable=True
            ),
            # Python 错误
            ErrorPattern(
                name="name_error",
                patterns=[
                    r"NameError: name .* is not defined",
                    r"name '.*' is not defined"
                ],
                severity="error",
                auto_fixable=True
            ),
            ErrorPattern(
                name="import_error",
                patterns=[
                    r"ImportError: No module named",
                    r"ModuleNotFoundError: No module named"
                ],
                severity="error",
                auto_fixable=True
            ),
            ErrorPattern(
                name="type_error",
                patterns=[
                    r"TypeError: .*",
                    r"'.*' object is not callable",
                    r"unsupported operand type"
                ],
                severity="error",
                auto_fixable=True
            ),
            # 通用错误
            ErrorPattern(
                name="syntax_error",
                patterns=[
                    r"SyntaxError: .*",
                    r"Unexpected token",
                    r"Invalid or unexpected token"
                ],
                severity="error",
                auto_fixable=True
            ),
            ErrorPattern(
                name="file_not_found",
                patterns=[
                    r"ENOENT: no such file or directory",
                    r"FileNotFoundError",
                    r"Error: ENOENT"
                ],
                severity="error",
                auto_fixable=False
            ),
        ]
    
    async def analyze_error(
        self,
        error_output: str,
        file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        分析错误输出
        
        Args:
            error_output: 错误输出文本
            file_path: 相关文件路径（可选）
        
        Returns:
            错误分析结果
        """
        result = {
            "error_detected": False,
            "error_type": None,
            "severity": None,
            "auto_fixable": False,
            "suggested_fixes": [],
            "file_path": file_path,
            "line_number": None,
            "error_message": None,
            "timestamp": datetime.now().isoformat()
        }
        
        # 提取文件路径和行号
        if file_path is None:
            file_match = re.search(r'at .* \(([^:]+):(\d+):\d+\)', error_output)
            if file_match:
                result["file_path"] = file_match.group(1)
                result["line_number"] = int(file_match.group(2))
        
        # 提取错误消息
        error_lines = error_output.split('\n')
        for line in error_lines:
            if 'Error:' in line or 'Exception:' in line:
                result["error_message"] = line.strip()
                break
        
        # 匹配错误模式
        for pattern in self.error_patterns:
            for regex in pattern.patterns:
                if regex.search(error_output):
                    result["error_detected"] = True
                    result["error_type"] = pattern.name
                    result["severity"] = pattern.severity
                    result["auto_fixable"] = pattern.auto_fixable
                    result["suggested_fixes"] = self._generate_fix_suggestions(
                        pattern.name,
                        error_output,
                        result["file_path"]
                    )
                    break
            
            if result["error_detected"]:
                break
        
        return result
    
    def _generate_fix_suggestions(
        self,
        error_type: str,
        error_output: str,
        file_path: Optional[str]
    ) -> List[str]:
        """生成修复建议"""
        suggestions = []
        
        if error_type == "undefined_is_not_a_function":
            suggestions.append("检查函数是否已正确定义")
            suggestions.append("确保函数在调用前已声明")
            suggestions.append("检查拼写错误")
            suggestions.append("添加可选链操作符 (?.) 防止错误")
        
        elif error_type == "null_reference":
            suggestions.append("添加空值检查 (if (obj !== null))")
            suggestions.append("使用可选链操作符 (obj?.property)")
            suggestions.append("提供默认值 (obj || defaultValue)")
        
        elif error_type == "missing_import":
            suggestions.append("检查是否缺少 import 语句")
            suggestions.append("确认模块名称拼写正确")
            suggestions.append("检查 node_modules 是否已安装")
        
        elif error_type == "name_error":
            suggestions.append("检查变量是否已定义")
            suggestions.append("确认变量名拼写正确")
            suggestions.append("检查作用域问题")
        
        elif error_type == "import_error":
            suggestions.append("安装缺失的依赖包")
            suggestions.append("检查 Python 路径配置")
            suggestions.append("确认包名拼写正确")
        
        elif error_type == "type_error":
            suggestions.append("检查数据类型是否匹配")
            suggestions.append("添加类型转换")
            suggestions.append("使用 isinstance() 进行类型检查")
        
        elif error_type == "syntax_error":
            suggestions.append("检查语法错误（括号、引号等）")
            suggestions.append("检查缩进是否正确")
            suggestions.append("使用代码格式化工具检查")
        
        return suggestions
    
    async def attempt_auto_fix(
        self,
        error_analysis: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        尝试自动修复错误
        
        Args:
            error_analysis: 错误分析结果
            context: 上下文信息（项目路径、文件内容等）
        
        Yields:
            修复进度更新
        """
        if not error_analysis.get("auto_fixable"):
            yield {
                "type": "error",
                "message": "此错误无法自动修复，需要人工介入"
            }
            return
        
        yield {
            "type": "status",
            "message": f"开始自动修复: {error_analysis['error_type']}"
        }
        
        # 根据错误类型尝试不同的修复策略
        try:
            if error_analysis["error_type"] == "undefined_is_not_a_function":
                async for update in self._fix_undefined_error(error_analysis, context):
                    yield update
            elif error_analysis["error_type"] == "null_reference":
                async for update in self._fix_null_reference(error_analysis, context):
                    yield update
            elif error_analysis["error_type"] == "missing_import":
                async for update in self._fix_missing_import(error_analysis, context):
                    yield update
            elif error_analysis["error_type"] == "syntax_error":
                async for update in self._fix_syntax_error(error_analysis, context):
                    yield update
            else:
                yield {
                    "type": "info",
                    "message": f"已生成修复建议，但需要人工确认: {error_analysis['suggested_fixes']}"
                }
        except Exception as e:
            logger.error(f"Auto-fix failed: {e}")
            yield {
                "type": "error",
                "message": f"自动修复失败: {str(e)}"
            }
        
        # 记录修复历史
        self.fix_history.append({
            "timestamp": datetime.now().isoformat(),
            "error_type": error_analysis.get("error_type"),
            "file_path": error_analysis.get("file_path"),
            "success": True
        })
    
    async def _fix_undefined_error(
        self,
        error_analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """修复 undefined 错误"""
        file_path = error_analysis.get("file_path")
        
        if not file_path or not context:
            yield {
                "type": "info",
                "message": "无法自动修复：缺少文件路径或上下文信息"
            }
            return
        
        yield {
            "type": "status",
            "message": "分析 undefined 错误..."
        }
        
        # 读取文件内容
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            yield {
                "type": "error",
                "message": f"无法读取文件: {str(e)}"
            }
            return
        
        # 提取出错的函数名
        error_msg = error_analysis.get("error_message", "")
        func_match = re.search(r"'([^']+)'\s+is not a function", error_msg)
        if func_match:
            func_name = func_match.group(1)
            yield {
                "type": "info",
                "message": f"检测到未定义的函数: {func_name}"
            }
            yield {
                "type": "suggestion",
                "message": f"建议: 1) 定义函数 {func_name} 2) 检查拼写 3) 添加可选链操作符"
            }
        else:
            yield {
                "type": "info",
                "message": "无法确定具体的函数名，请检查错误堆栈"
            }
    
    async def _fix_null_reference(
        self,
        error_analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """修复 null 引用错误"""
        yield {
            "type": "status",
            "message": "分析 null 引用错误..."
        }
        yield {
            "type": "suggestion",
            "message": "建议添加空值检查或使用可选链操作符 (?.)"
        }
    
    async def _fix_missing_import(
        self,
        error_analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """修复缺失导入错误"""
        error_msg = error_analysis.get("error_message", "")
        module_match = re.search(r"'([^']+)' is not defined", error_msg)
        
        if module_match:
            module_name = module_match.group(1)
            yield {
                "type": "status",
                "message": f"检测到缺失的模块: {module_name}"
            }
            yield {
                "type": "suggestion",
                "message": f"建议: 1) 添加 import 语句 2) 安装依赖包 3) 检查模块路径"
            }
        else:
            yield {
                "type": "info",
                "message": "无法确定缺失的模块名"
            }
    
    async def _fix_syntax_error(
        self,
        error_analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """修复语法错误"""
        yield {
            "type": "status",
            "message": "分析语法错误..."
        }
        yield {
            "type": "suggestion",
            "message": "建议: 1) 检查括号匹配 2) 检查引号闭合 3) 使用代码格式化工具"
        }
    
    def get_fix_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取修复历史"""
        return self.fix_history[-limit:]
    
    def clear_fix_history(self):
        """清除修复历史"""
        self.fix_history = []


# 全局实例
_auto_heal_service = None


def get_auto_heal_service() -> AutoHealService:
    """获取自动修复服务实例"""
    global _auto_heal_service
    if _auto_heal_service is None:
        _auto_heal_service = AutoHealService()
    return _auto_heal_service