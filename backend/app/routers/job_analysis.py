"""
招聘网页分析API

提供招聘网页内容提取和分析功能。
"""

import asyncio
import logging
from typing import Any, Dict, List
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.core.services.job_scraper import scrape_job_page
from backend.core.services.job_analyzer import analyze_job_page, JobAnalyzer

router = APIRouter(prefix="/api/job-analysis", tags=["job-analysis"])
logger = logging.getLogger(__name__)


class JobUrlRequest(BaseModel):
    """招聘网页URL请求"""
    url: str


class JobAnalysisResponse(BaseModel):
    """招聘分析响应"""
    job_title: str = ""
    company: str = ""
    location: str = ""
    salary: str = ""
    experience: str = ""
    education: str = ""
    skills: List[str] = []
    responsibilities: List[str] = []
    requirements: List[str] = []
    benefits: List[str] = []
    raw_content: str = ""
    interview_questions: List[Dict[str, Any]] = []


# 简单内存缓存
_analysis_cache: Dict[str, Dict[str, Any]] = {}


@router.post("/analyze", response_model=JobAnalysisResponse)
async def analyze_job_page_endpoint(request: JobUrlRequest):
    """
    分析招聘网页

    提取职位信息、技能要求、职责描述等关键信息。
    支持BOSS直聘、拉勾网、猎聘网、智联招聘、前程无忧等主流招聘网站。
    """
    url = request.url.strip()

    # 验证URL
    if not url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="无效的URL格式")

    # 检查缓存
    if url in _analysis_cache:
        logger.info(f"使用缓存数据: {url}")
        return JobAnalysisResponse(**_analysis_cache[url])

    try:
        # 1. 爬取网页内容（带超时）
        logger.info(f"开始爬取: {url}")
        page_data = await asyncio.wait_for(scrape_job_page(url), timeout=45.0)

        # 2. 分析内容（带超时）
        logger.info(f"开始分析内容: {url}")
        analysis_result = await asyncio.wait_for(analyze_job_page(page_data), timeout=30.0)

        # 3. 生成面试问题（带超时）
        analyzer = JobAnalyzer()
        interview_questions = await asyncio.wait_for(
            analyzer.generate_interview_questions(analysis_result, num_questions=5),
            timeout=30.0
        )

        # 4. 组合结果
        result = {
            **analysis_result,
            'raw_content': page_data.get('text', '')[:2000],  # 限制原始内容长度
            'interview_questions': interview_questions,
        }

        # 5. 缓存结果
        _analysis_cache[url] = result

        return JobAnalysisResponse(**result)

    except Exception as e:
        logger.error(f"分析失败: {url}, 错误: {e}")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.post("/extract-skills")
async def extract_skills_from_text(text: str) -> Dict[str, Any]:
    """
    从文本中提取技能关键词

    用于分析职位描述中的技能要求。
    """
    if not text:
        raise HTTPException(status_code=400, detail="文本不能为空")

    try:
        analyzer = JobAnalyzer()
        skills = await analyzer.extract_skills(text)

        return {
            "skills": skills,
            "count": len(skills),
        }

    except Exception as e:
        logger.error(f"提取技能失败: {e}")
        raise HTTPException(status_code=500, detail=f"提取技能失败: {str(e)}")


@router.get("/supported-sites")
async def get_supported_sites() -> List[Dict[str, str]]:
    """获取支持的招聘网站列表"""
    return [
        {"name": "BOSS直聘", "domain": "zhipin.com", "icon": "💼"},
        {"name": "拉勾网", "domain": "lagou.com", "icon": "🎯"},
        {"name": "猎聘网", "domain": "liepin.com", "icon": "🎣"},
        {"name": "智联招聘", "domain": "zhaopin.com", "icon": "📋"},
        {"name": "前程无忧", "domain": "51job.com", "icon": "📄"},
        {"name": "脉脉", "domain": "maimai.cn", "icon": "💬"},
    ]


@router.get("/cache/clear")
async def clear_cache():
    """清除分析缓存（仅用于测试）"""
    global _analysis_cache
    count = len(_analysis_cache)
    _analysis_cache.clear()
    return {"message": f"已清除 {count} 条缓存"}
