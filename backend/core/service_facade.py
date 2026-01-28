"""
服务外观模式 - 整合散落的服务，提供统一的业务接口
解决服务孤岛问题，让前端能够真正调用后端功能
"""
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from backend.core.service_registry import get_service
from backend.core.project_registry import validate_project_path

logger = logging.getLogger("ServiceFacade")


@dataclass
class AnalysisResult:
    """分析结果统一格式"""
    success: bool
    data: Any = None
    error: str = None
    suggestions: List[str] = None
    metrics: Dict[str, Any] = None


class CodeAnalysisFacade:
    """
    代码分析服务外观
    
    整合 code_analyzer, code_review_service, code_style_analyzer
    提供统一的代码分析接口
    """
    
    def __init__(self):
        self._analyzer = None
        self._reviewer = None
        self._style_analyzer = None
    
    def _lazy_init(self):
        """延迟初始化服务"""
        if self._analyzer is None:
            from backend.core.code_analyzer import CodeAnalyzer
            self._analyzer = get_service(CodeAnalyzer)
        
        if self._reviewer is None:
            from backend.core.code_review_service import CodeReviewService
            self._reviewer = get_service(CodeReviewService)
        
        if self._style_analyzer is None:
            from backend.core.code_style_analyzer import CodeStyleAnalyzer
            self._style_analyzer = get_service(CodeStyleAnalyzer)
    
    async def analyze_file(self, project: str, file_path: str) -> AnalysisResult:
        """
        完整分析单个文件
        
        整合语法分析、代码审查、风格检查
        """
        self._lazy_init()
        
        try:
            # 验证路径
            full_path = validate_project_path(project, file_path)
            if not full_path:
                return AnalysisResult(
                    success=False,
                    error=f"Invalid path: {file_path}"
                )
            
            # 读取文件内容
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            results = {
                "file": file_path,
                "analysis": {},
                "review": {},
                "style": {}
            }
            
            # 执行分析
            if self._analyzer:
                try:
                    results["analysis"] = await self._analyzer.analyze(content, file_path)
                except Exception as e:
                    logger.warning(f"Code analysis failed: {e}")
            
            if self._reviewer:
                try:
                    results["review"] = await self._reviewer.review(content, file_path)
                except Exception as e:
                    logger.warning(f"Code review failed: {e}")
            
            if self._style_analyzer:
                try:
                    results["style"] = await self._style_analyzer.analyze(content, file_path)
                except Exception as e:
                    logger.warning(f"Style analysis failed: {e}")
            
            # 整合建议
            suggestions = []
            if results["review"].get("suggestions"):
                suggestions.extend(results["review"]["suggestions"])
            if results["style"].get("issues"):
                suggestions.extend([i.get("message", "") for i in results["style"]["issues"]])
            
            return AnalysisResult(
                success=True,
                data=results,
                suggestions=suggestions
            )
            
        except Exception as e:
            logger.error(f"File analysis failed: {e}")
            return AnalysisResult(
                success=False,
                error=str(e)
            )
    
    async def analyze_project(self, project: str) -> AnalysisResult:
        """
        分析整个项目
        
        扫描项目中的所有代码文件进行分析
        """
        self._lazy_init()
        
        try:
            project_path = validate_project_path(project)
            if not project_path:
                return AnalysisResult(
                    success=False,
                    error=f"Project not found: {project}"
                )
            
            # 扫描代码文件
            import os
            code_files = []
            for root, dirs, files in os.walk(project_path):
                # 跳过常见非代码目录
                dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__', 'venv', '.venv']]
                
                for file in files:
                    if file.endswith(('.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h')):
                        rel_path = os.path.relpath(os.path.join(root, file), project_path)
                        code_files.append(rel_path)
            
            # 限制分析文件数量
            code_files = code_files[:20]  # 最多分析20个文件
            
            file_results = []
            for file_path in code_files:
                result = await self.analyze_file(project, file_path)
                if result.success:
                    file_results.append({
                        "file": file_path,
                        "suggestions": result.suggestions or []
                    })
            
            # 统计
            total_suggestions = sum(len(r["suggestions"]) for r in file_results)
            
            return AnalysisResult(
                success=True,
                data={
                    "files_analyzed": len(file_results),
                    "file_results": file_results
                },
                metrics={
                    "total_files": len(code_files),
                    "analyzed_files": len(file_results),
                    "total_suggestions": total_suggestions
                }
            )
            
        except Exception as e:
            logger.error(f"Project analysis failed: {e}")
            return AnalysisResult(
                success=False,
                error=str(e)
            )


class AutoFixFacade:
    """
    自动修复服务外观
    
    整合 auto_fixer 和 error_analyzer
    """
    
    def __init__(self):
        self._fixer = None
        self._error_analyzer = None
    
    def _lazy_init(self):
        if self._fixer is None:
            from backend.core.auto_fixer import AutoFixer
            self._fixer = get_service(AutoFixer)
        
        if self._error_analyzer is None:
            from backend.core.error_analyzer import ErrorAnalyzer
            self._error_analyzer = get_service(ErrorAnalyzer)
    
    async def analyze_errors(self, project: str, error_log: str) -> AnalysisResult:
        """分析错误日志"""
        self._lazy_init()
        
        try:
            if not self._error_analyzer:
                return AnalysisResult(
                    success=False,
                    error="Error analyzer not available"
                )
            
            analysis = await self._error_analyzer.analyze(error_log)
            
            return AnalysisResult(
                success=True,
                data=analysis,
                suggestions=analysis.get("suggestions", [])
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                error=str(e)
            )
    
    async def fix_file(self, project: str, file_path: str, issue_type: str = None) -> AnalysisResult:
        """尝试自动修复文件"""
        self._lazy_init()
        
        try:
            full_path = validate_project_path(project, file_path)
            if not full_path:
                return AnalysisResult(
                    success=False,
                    error=f"Invalid path: {file_path}"
                )
            
            if not self._fixer:
                return AnalysisResult(
                    success=False,
                    error="Auto fixer not available"
                )
            
            # 读取文件
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 应用修复
            fix_result = await self._fixer.fix(content, file_path, issue_type)
            
            # 如果有修复，写回文件
            if fix_result.get("fixed_content") and fix_result.get("fixed_content") != content:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(fix_result["fixed_content"])
                fix_result["applied"] = True
            else:
                fix_result["applied"] = False
            
            return AnalysisResult(
                success=True,
                data=fix_result,
                suggestions=fix_result.get("suggestions", [])
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                error=str(e)
            )


class IntelligenceFacade:
    """
    智能服务统一外观
    
    整合所有 AI/智能相关服务
    """
    
    def __init__(self):
        self.code_analysis = CodeAnalysisFacade()
        self.auto_fix = AutoFixFacade()
    
    async def smart_code_complete(self, project: str, file_path: str, cursor_position: int, context: str = None) -> AnalysisResult:
        """智能代码补全"""
        try:
            from backend.core.code_completion_service import CodeCompletionService
            completer = get_service(CodeCompletionService)
            
            if not completer:
                return AnalysisResult(
                    success=False,
                    error="Code completion service not available"
                )
            
            full_path = validate_project_path(project, file_path)
            if not full_path:
                return AnalysisResult(
                    success=False,
                    error=f"Invalid path: {file_path}"
                )
            
            # 读取文件内容
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            completion = await completer.complete(
                content=content,
                cursor_position=cursor_position,
                file_path=file_path,
                context=context
            )
            
            return AnalysisResult(
                success=True,
                data=completion
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                error=str(e)
            )
    
    async def generate_tests(self, project: str, file_path: str) -> AnalysisResult:
        """生成单元测试"""
        try:
            from backend.core.test_generator import TestGenerator
            generator = get_service(TestGenerator)
            
            if not generator:
                return AnalysisResult(
                    success=False,
                    error="Test generator not available"
                )
            
            full_path = validate_project_path(project, file_path)
            if not full_path:
                return AnalysisResult(
                    success=False,
                    error=f"Invalid path: {file_path}"
                )
            
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tests = await generator.generate(content, file_path)
            
            return AnalysisResult(
                success=True,
                data=tests
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                error=str(e)
            )
    
    async def suggest_refactoring(self, project: str, file_path: str) -> AnalysisResult:
        """建议重构"""
        try:
            from backend.core.refactor_suggester import RefactorSuggester
            suggester = get_service(RefactorSuggester)
            
            if not suggester:
                return AnalysisResult(
                    success=False,
                    error="Refactor suggester not available"
                )
            
            full_path = validate_project_path(project, file_path)
            if not full_path:
                return AnalysisResult(
                    success=False,
                    error=f"Invalid path: {file_path}"
                )
            
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            suggestions = await suggester.suggest(content, file_path)
            
            return AnalysisResult(
                success=True,
                data=suggestions,
                suggestions=[s.get("description", "") for s in suggestions.get("refactorings", [])]
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                error=str(e)
            )


# 全局外观实例
intelligence = IntelligenceFacade()
