"""
Intelligence Router
智能分析服务 API 路由
整合所有 AI/智能相关功能，提供统一接口
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
import logging

from backend.core.service_facade import intelligence, CodeAnalysisFacade, AutoFixFacade

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])

# 外观实例
code_analysis = CodeAnalysisFacade()
auto_fix = AutoFixFacade()


# ============================================
# 数据模型
# ============================================

class AnalyzeFileRequest(BaseModel):
    project: str
    file_path: str


class AnalyzeProjectRequest(BaseModel):
    project: str


class FixFileRequest(BaseModel):
    project: str
    file_path: str
    issue_type: Optional[str] = None


class CompleteCodeRequest(BaseModel):
    project: str
    file_path: str
    cursor_position: int
    context: Optional[str] = None


class ErrorAnalysisRequest(BaseModel):
    project: str
    error_log: str


class GenerateTestsRequest(BaseModel):
    project: str
    file_path: str


class RefactorRequest(BaseModel):
    project: str
    file_path: str


# ============================================
# 代码分析端点
# ============================================

@router.post("/analyze-file")
async def analyze_file(req: AnalyzeFileRequest):
    """
    分析单个代码文件
    
    整合语法分析、代码审查、风格检查
    """
    logger.info(f"Analyzing file: {req.file_path} in project: {req.project}")
    
    result = await code_analysis.analyze_file(req.project, req.file_path)
    
    return {
        "success": result.success,
        "data": result.data,
        "suggestions": result.suggestions,
        "error": result.error
    }


@router.post("/analyze-project")
async def analyze_project(req: AnalyzeProjectRequest):
    """
    分析整个项目
    
    扫描项目中的所有代码文件
    """
    logger.info(f"Analyzing project: {req.project}")
    
    result = await code_analysis.analyze_project(req.project)
    
    return {
        "success": result.success,
        "data": result.data,
        "metrics": result.metrics,
        "error": result.error
    }


@router.get("/analyze-file")
async def analyze_file_get(
    project: str = Query(..., description="项目名称"),
    file_path: str = Query(..., description="文件路径")
):
    """GET 方式分析文件（便于快速测试）"""
    return await analyze_file(AnalyzeFileRequest(project=project, file_path=file_path))


# ============================================
# 自动修复端点
# ============================================

@router.post("/fix-file")
async def fix_file(req: FixFileRequest):
    """
    自动修复代码文件
    
    根据分析结果自动应用修复
    """
    logger.info(f"Fixing file: {req.file_path} in project: {req.project}")
    
    result = await auto_fix.fix_file(req.project, req.file_path, req.issue_type)
    
    return {
        "success": result.success,
        "data": result.data,
        "suggestions": result.suggestions,
        "error": result.error
    }


@router.post("/analyze-errors")
async def analyze_errors(req: ErrorAnalysisRequest):
    """
    分析错误日志
    
    解析错误日志并提供修复建议
    """
    logger.info(f"Analyzing errors for project: {req.project}")
    
    result = await auto_fix.analyze_errors(req.project, req.error_log)
    
    return {
        "success": result.success,
        "data": result.data,
        "suggestions": result.suggestions,
        "error": result.error
    }


# ============================================
# 智能代码功能端点
# ============================================

@router.post("/complete-code")
async def complete_code(req: CompleteCodeRequest):
    """
    智能代码补全
    
    根据上下文提供代码补全建议
    """
    logger.info(f"Completing code in: {req.file_path}")
    
    result = await intelligence.smart_code_complete(
        req.project,
        req.file_path,
        req.cursor_position,
        req.context
    )
    
    return {
        "success": result.success,
        "data": result.data,
        "error": result.error
    }


@router.post("/generate-tests")
async def generate_tests(req: GenerateTestsRequest):
    """
    生成单元测试
    
    为指定文件生成单元测试代码
    """
    logger.info(f"Generating tests for: {req.file_path}")
    
    result = await intelligence.generate_tests(req.project, req.file_path)
    
    return {
        "success": result.success,
        "data": result.data,
        "error": result.error
    }


@router.post("/suggest-refactoring")
async def suggest_refactoring(req: RefactorRequest):
    """
    建议重构
    
    分析代码并提供重构建议
    """
    logger.info(f"Suggesting refactoring for: {req.file_path}")
    
    result = await intelligence.suggest_refactoring(req.project, req.file_path)
    
    return {
        "success": result.success,
        "data": result.data,
        "suggestions": result.suggestions,
        "error": result.error
    }


# ============================================
# 批量操作端点
# ============================================

@router.post("/batch-analyze")
async def batch_analyze(req: AnalyzeProjectRequest):
    """
    批量分析项目
    
    快速扫描项目中的问题文件
    """
    logger.info(f"Batch analyzing project: {req.project}")
    
    # 先获取项目分析结果
    result = await code_analysis.analyze_project(req.project)
    
    if not result.success:
        return {
            "success": False,
            "error": result.error
        }
    
    # 提取有问题文件
    files_with_issues = [
        r for r in result.data.get("file_results", [])
        if r.get("suggestions")
    ]
    
    return {
        "success": True,
        "summary": {
            "total_files": result.data.get("files_analyzed", 0),
            "files_with_issues": len(files_with_issues),
        },
        "files_with_issues": files_with_issues[:10],  # 只返回前10个
        "metrics": result.metrics
    }
