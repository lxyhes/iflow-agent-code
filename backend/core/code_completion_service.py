"""
智能代码补全服务 (Intelligent Code Completion Service)
基于项目上下文和 RAG 提供智能代码补全建议
"""

import os
import re
import ast
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from backend.core.code_analyzer import CodeAnalyzer, get_code_analyzer
from backend.core.rag_service import get_rag_service

logger = logging.getLogger("CodeCompletionService")


class CompletionSuggestion:
    """代码补全建议"""
    
    def __init__(
        self,
        label: str,
        insert_text: str,
        type: str,  # function, variable, class, import, snippet
        detail: str,
        documentation: str,
        priority: int,  # 1-10, 越高越优先
        context_score: float  # 0-1, 上下文匹配度
    ):
        self.label = label
        self.insert_text = insert_text
        self.type = type
        self.detail = detail
        self.documentation = documentation
        self.priority = priority
        self.context_score = context_score
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "label": self.label,
            "insert_text": self.insert_text,
            "type": self.type,
            "detail": self.detail,
            "documentation": self.documentation,
            "priority": self.priority,
            "context_score": self.context_score
        }


class CodeCompletionService:
    """智能代码补全服务"""
    
    def __init__(self):
        self.code_analyzer = get_code_analyzer()
        self.rag_service = get_rag_service()
        self.project_context_cache = {}
        self.patterns_cache = {}
    
    async def get_completions(
        self,
        project_path: str,
        file_path: str,
        content: str,
        line_number: int,
        column: int,
        trigger_character: Optional[str] = None
    ) -> List[CompletionSuggestion]:
        """
        获取代码补全建议
        
        Args:
            project_path: 项目路径
            file_path: 文件路径
            content: 文件内容
            line_number: 当前行号
            column: 当前列号
            trigger_character: 触发字符（如 ., (, "）
        
        Returns:
            补全建议列表
        """
        try:
            suggestions = []
            
            # 获取当前行和上下文
            lines = content.split('\n')
            current_line = lines[line_number - 1] if line_number <= len(lines) else ""
            
            # 获取项目上下文
            project_context = await self._get_project_context(project_path)
            
            # 分析当前文件
            file_analysis = self.code_analyzer.analyze(file_path, content)
            
            # 根据触发字符生成不同类型的补全
            if trigger_character == '.':
                suggestions.extend(self._get_property_completions(
                    current_line, column, file_analysis, project_context
                ))
            elif trigger_character == '(':
                suggestions.extend(self._get_function_completions(
                    current_line, column, file_analysis, project_context
                ))
            elif trigger_character in ['"', "'"]:
                suggestions.extend(self._get_string_completions(
                    current_line, column, project_context
                ))
            else:
                # 通用补全
                suggestions.extend(self._get_general_completions(
                    current_line, column, file_analysis, project_context
                ))
            
            # 使用 RAG 检索相关代码示例
            if self.rag_service:
                rag_suggestions = await self._get_rag_completions(
                    current_line, column, project_path, file_path
                )
                suggestions.extend(rag_suggestions)
            
            # 根据优先级和上下文分数排序
            suggestions.sort(key=lambda x: (x.priority, x.context_score), reverse=True)
            
            # 返回前 20 个建议
            return suggestions[:20]
        
        except Exception as e:
            logger.exception(f"获取补全建议失败: {e}")
            return []
    
    async def _get_project_context(self, project_path: str) -> Dict[str, Any]:
        """获取项目上下文"""
        if project_path in self.project_context_cache:
            return self.project_context_cache[project_path]
        
        try:
            context = {
                "imports": set(),
                "functions": set(),
                "classes": set(),
                "variables": set(),
                "patterns": []
            }
            
            # 扫描项目文件
            for root, dirs, files in os.walk(project_path):
                # 跳过常见忽略目录
                dirs[:] = [d for d in dirs if d not in ['node_modules', '__pycache__', '.git', 'dist', 'build']]
                
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext not in ['.py', '.js', '.jsx', '.ts', '.tsx']:
                        continue
                    
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        
                        analysis = self.code_analyzer.analyze(file_path, content)
                        
                        # 收集导入
                        for imp in analysis.get("imports", []):
                            if isinstance(imp, dict):
                                context["imports"].add(imp.get("name", ""))
                            else:
                                context["imports"].add(imp)
                        
                        # 收集函数
                        for func in analysis.get("functions", []):
                            context["functions"].add(func.get("name", ""))
                        
                        # 收集类
                        for cls in analysis.get("classes", []):
                            context["classes"].add(cls.get("name", ""))
                        
                        # 收集变量
                        for var in analysis.get("variables", []):
                            context["variables"].add(var.get("name", ""))
                    
                    except Exception as e:
                        logger.warning(f"Failed to analyze {file_path}: {e}")
            
            self.project_context_cache[project_path] = context
            return context
        
        except Exception as e:
            logger.exception(f"获取项目上下文失败: {e}")
            return {"imports": set(), "functions": set(), "classes": set(), "variables": set(), "patterns": []}
    
    def _get_property_completions(
        self,
        current_line: str,
        column: int,
        file_analysis: Dict,
        project_context: Dict
    ) -> List[CompletionSuggestion]:
        """获取属性补全（在 . 之后）"""
        suggestions = []
        
        # 获取对象名
        before_dot = current_line[:column].split('.')[-1].strip()
        
        # 如果是常见的内置对象，提供其属性
        builtin_objects = {
            'console': ['log', 'warn', 'error', 'info', 'debug'],
            'document': ['getElementById', 'querySelector', 'querySelectorAll', 'createElement', 'addEventListener'],
            'window': ['location', 'history', 'localStorage', 'sessionStorage', 'fetch'],
            'array': ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'],
            'string': ['split', 'join', 'trim', 'toLowerCase', 'toUpperCase', 'includes'],
            'object': ['keys', 'values', 'entries', 'assign', 'freeze'],
        }
        
        if before_dot.lower() in builtin_objects:
            for prop in builtin_objects[before_dot.lower()]:
                suggestions.append(CompletionSuggestion(
                    label=prop,
                    insert_text=prop,
                    type="property",
                    detail=f"{before_dot}.{prop}",
                    documentation=f"Built-in property of {before_dot}",
                    priority=8,
                    context_score=0.9
                ))
        
        # 从项目上下文中查找匹配的类
        for cls_name in project_context.get("classes", []):
            if before_dot.lower() in cls_name.lower():
                suggestions.append(CompletionSuggestion(
                    label=cls_name,
                    insert_text=cls_name,
                    type="class",
                    detail=f"Class: {cls_name}",
                    documentation=f"Class defined in the project",
                    priority=7,
                    context_score=0.8
                ))
        
        return suggestions
    
    def _get_function_completions(
        self,
        current_line: str,
        column: int,
        file_analysis: Dict,
        project_context: Dict
    ) -> List[CompletionSuggestion]:
        """获取函数补全（在 ( 之后）"""
        suggestions = []
        
        # 获取函数名
        before_paren = current_line[:column].split('(')[-1].strip()
        func_name = before_paren.split('.')[-1].strip()
        
        # 从项目上下文中查找匹配的函数
        for func_name_ctx in project_context.get("functions", []):
            if func_name.lower() in func_name_ctx.lower():
                suggestions.append(CompletionSuggestion(
                    label=func_name_ctx,
                    insert_text=func_name_ctx,
                    type="function",
                    detail=f"Function: {func_name_ctx}",
                    documentation=f"Function defined in the project",
                    priority=7,
                    context_score=0.8
                ))
        
        return suggestions
    
    def _get_string_completions(
        self,
        current_line: str,
        column: int,
        project_context: Dict
    ) -> List[CompletionSuggestion]:
        """获取字符串补全（在引号内）"""
        suggestions = []
        
        # 检查是否是文件路径
        if 'import' in current_line or 'require' in current_line or 'from' in current_line:
            # 提取可能的文件路径
            # 这里可以添加文件路径补全逻辑
            pass
        
        return suggestions
    
    def _get_general_completions(
        self,
        current_line: str,
        column: int,
        file_analysis: Dict,
        project_context: Dict
    ) -> List[CompletionSuggestion]:
        """获取通用补全"""
        suggestions = []
        
        # 获取当前单词
        words = re.findall(r'\w+', current_line[:column])
        current_word = words[-1] if words else ""
        
        # 从项目上下文中查找匹配的导入
        for imp in project_context.get("imports", []):
            if current_word.lower() in imp.lower():
                suggestions.append(CompletionSuggestion(
                    label=imp,
                    insert_text=imp,
                    type="import",
                    detail=f"Import: {imp}",
                    documentation=f"Imported module/package",
                    priority=6,
                    context_score=0.7
                ))
        
        # 从项目上下文中查找匹配的函数
        for func_name in project_context.get("functions", []):
            if current_word.lower() in func_name.lower():
                suggestions.append(CompletionSuggestion(
                    label=func_name,
                    insert_text=func_name,
                    type="function",
                    detail=f"Function: {func_name}",
                    documentation=f"Function defined in the project",
                    priority=7,
                    context_score=0.8
                ))
        
        # 从项目上下文中查找匹配的类
        for cls_name in project_context.get("classes", []):
            if current_word.lower() in cls_name.lower():
                suggestions.append(CompletionSuggestion(
                    label=cls_name,
                    insert_text=cls_name,
                    type="class",
                    detail=f"Class: {cls_name}",
                    documentation=f"Class defined in the project",
                    priority=7,
                    context_score=0.8
                ))
        
        # 从项目上下文中查找匹配的变量
        for var_name in project_context.get("variables", []):
            if current_word.lower() in var_name.lower():
                suggestions.append(CompletionSuggestion(
                    label=var_name,
                    insert_text=var_name,
                    type="variable",
                    detail=f"Variable: {var_name}",
                    documentation=f"Variable defined in the project",
                    priority=5,
                    context_score=0.6
                ))
        
        # 添加代码片段
        snippets = self._get_code_snippets(current_word)
        suggestions.extend(snippets)
        
        return suggestions
    
    def _get_code_snippets(self, prefix: str) -> List[CompletionSuggestion]:
        """获取代码片段"""
        snippets = [
            {
                "label": "for",
                "insert_text": "for (let i = 0; i < ${1:length}; i++) {\n\t${2:// code}\n}",
                "type": "snippet",
                "detail": "for loop",
                "documentation": "Create a for loop",
                "priority": 9,
                "context_score": 0.5
            },
            {
                "label": "if",
                "insert_text": "if (${1:condition}) {\n\t${2:// code}\n}",
                "type": "snippet",
                "detail": "if statement",
                "documentation": "Create an if statement",
                "priority": 9,
                "context_score": 0.5
            },
            {
                "label": "function",
                "insert_text": "function ${1:name}(${2:params}) {\n\t${3:// code}\n}",
                "type": "snippet",
                "detail": "function declaration",
                "documentation": "Create a function",
                "priority": 9,
                "context_score": 0.5
            },
            {
                "label": "const",
                "insert_text": "const ${1:name} = ${2:value};",
                "type": "snippet",
                "detail": "const declaration",
                "documentation": "Create a const variable",
                "priority": 9,
                "context_score": 0.5
            },
            {
                "label": "async",
                "insert_text": "async function ${1:name}(${2:params}) {\n\t${3:// code}\n}",
                "type": "snippet",
                "detail": "async function",
                "documentation": "Create an async function",
                "priority": 8,
                "context_score": 0.5
            },
            {
                "label": "try",
                "insert_text": "try {\n\t${1:// code}\n} catch (error) {\n\t${2:// handle error}\n}",
                "type": "snippet",
                "detail": "try-catch block",
                "documentation": "Create a try-catch block",
                "priority": 8,
                "context_score": 0.5
            }
        ]
        
        result = []
        for snippet in snippets:
            if prefix.lower() in snippet["label"].lower():
                result.append(CompletionSuggestion(**snippet))
        
        return result
    
    async def _get_rag_completions(
        self,
        current_line: str,
        column: int,
        project_path: str,
        file_path: str
    ) -> List[CompletionSuggestion]:
        """使用 RAG 检索相关代码示例"""
        suggestions = []
        
        try:
            # 构建查询
            query = current_line[:column].strip()
            
            if not query or len(query) < 3:
                return suggestions
            
            # 使用 RAG 检索
            results = await self.rag_service.retrieve(query, n_results=3)
            
            for result in results:
                content = result.get("content", "")
                metadata = result.get("metadata", {})
                
                # 从结果中提取可能的补全建议
                # 这里可以根据实际需求实现更复杂的逻辑
                
                suggestions.append(CompletionSuggestion(
                    label=f"RAG: {metadata.get('file', 'unknown')}",
                    insert_text=content[:100],  # 简化的示例
                    type="rag",
                    detail=f"Similar code from {metadata.get('file', 'unknown')}",
                    documentation=content[:200],
                    priority=5,
                    context_score=result.get("score", 0.5)
                ))
        
        except Exception as e:
            logger.warning(f"RAG 补全失败: {e}")
        
        return suggestions
    
    def clear_cache(self):
        """清除缓存"""
        self.project_context_cache.clear()
        self.patterns_cache.clear()


# 全局实例
_code_completion_service = None


def get_code_completion_service() -> CodeCompletionService:
    """获取代码补全服务实例"""
    global _code_completion_service
    if _code_completion_service is None:
        _code_completion_service = CodeCompletionService()
    return _code_completion_service