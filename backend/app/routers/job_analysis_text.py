"""
招聘文本分析API

直接分析用户粘贴的职位描述文本，无需爬取网页。
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.core.services.llm_adapter import get_llm_service

router = APIRouter(prefix="/api/job-analysis", tags=["job-analysis"])
logger = logging.getLogger(__name__)


class JobTextRequest(BaseModel):
    """职位文本请求"""
    text: str
    source: str = "manual"  # manual, clipboard, upload


class JobTextAnalysisResponse(BaseModel):
    """职位文本分析响应"""
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
    interview_questions: List[Dict[str, Any]] = []


@router.post("/analyze-text", response_model=JobTextAnalysisResponse)
async def analyze_job_text(request: JobTextRequest):
    """
    分析职位描述文本

    直接分析用户粘贴的职位描述，无需爬取网页。
    适用于BOSS直聘等需要登录的网站。
    """
    text = request.text.strip()

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="文本内容太短，请提供完整的职位描述")

    try:
        llm = get_llm_service()

        # 构建分析提示词
        prompt = f"""请从以下职位描述中提取结构化信息。

职位描述:
{text[:5000]}

请提取以下信息并以JSON格式返回:
{{
    "job_title": "职位名称",
    "company": "公司名称（如果有）",
    "location": "工作地点",
    "salary": "薪资范围",
    "experience": "经验要求",
    "education": "学历要求",
    "skills": ["技能1", "技能2", ...],
    "responsibilities": ["职责1", "职责2", ...],
    "requirements": ["要求1", "要求2", ...],
    "benefits": ["福利1", "福利2", ...]
}}

注意:
1. 如果某项信息不存在，返回空字符串或空数组
2. skills应该是技术技能列表
3. 只返回JSON，不要其他内容"""

        response = await llm.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        content = response.get('content', '')

        # 解析JSON响应
        import json
        json_start = content.find('{')
        json_end = content.rfind('}') + 1

        if json_start >= 0 and json_end > json_start:
            json_str = content[json_start:json_end]
            analysis_result = json.loads(json_str)
        else:
            analysis_result = {
                'job_title': '',
                'company': '',
                'location': '',
                'salary': '',
                'experience': '',
                'education': '',
                'skills': [],
                'responsibilities': [],
                'requirements': [],
                'benefits': [],
            }

        # 生成面试问题
        interview_questions = await generate_interview_questions(llm, analysis_result)

        result = {
            **analysis_result,
            'interview_questions': interview_questions,
        }

        return JobTextAnalysisResponse(**result)

    except Exception as e:
        logger.error(f"文本分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


async def generate_interview_questions(llm, job_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """生成面试问题"""
    job_title = job_analysis.get('job_title', '')
    skills = job_analysis.get('skills', [])

    if not job_title or not skills:
        return []

    prompt = f"""基于以下职位信息生成5个面试问题。

职位: {job_title}
技能要求: {', '.join(skills)}

请生成面试问题，格式为JSON数组:
[
    {{
        "type": "technical",
        "question": "问题内容",
        "expected_points": ["要点1", "要点2"],
        "difficulty": "medium"
    }}
]

类型包括: technical(技术), behavioral(行为), system_design(系统设计), experience(经验)
难度: easy, medium, hard"""

    try:
        response = await llm.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        content = response.get('content', '')

        import json
        json_start = content.find('[')
        json_end = content.rfind(']') + 1

        if json_start >= 0 and json_end > json_start:
            json_str = content[json_start:json_end]
            questions = json.loads(json_str)
            return questions if isinstance(questions, list) else []

    except Exception as e:
        logger.error(f"生成面试问题失败: {e}")

    return []


@router.post("/extract-skills-text")
async def extract_skills_from_text_endpoint(request: JobTextRequest) -> Dict[str, Any]:
    """从文本中提取技能关键词"""
    text = request.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="文本不能为空")

    try:
        llm = get_llm_service()

        prompt = f"""请从以下文本中提取所有技术技能关键词。

文本内容:
{text[:2000]}

请返回技能列表，格式为JSON数组:
["技能1", "技能2", "技能3", ...]

只包含技术技能，如编程语言、框架、工具等。"""

        response = await llm.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        content = response.get('content', '')

        import json
        json_start = content.find('[')
        json_end = content.rfind(']') + 1

        if json_start >= 0 and json_end > json_start:
            json_str = content[json_start:json_end]
            skills = json.loads(json_str)
            skills = skills if isinstance(skills, list) else []
        else:
            skills = []

        return {
            "skills": skills,
            "count": len(skills),
        }

    except Exception as e:
        logger.error(f"提取技能失败: {e}")
        raise HTTPException(status_code=500, detail=f"提取技能失败: {str(e)}")
