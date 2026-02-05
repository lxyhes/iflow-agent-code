"""
简历管理 API

提供完整的简历管理功能，包括创建、编辑、AI优化、职位匹配等。
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

import sys
import os

project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.core.services.resume_service import get_resume_service

router = APIRouter(prefix="/api/resumes", tags=["resumes"])
logger = logging.getLogger(__name__)


async def get_optional_user_id(authorization: str = None) -> str:
    """
    获取用户ID，如果未提供token则使用默认用户
    """
    if not authorization:
        return "default-user"

    try:
        # 尝试解析token
        import jwt
        import os
        JWT_SECRET = os.getenv("JWT_SECRET", "claude-ui-dev-secret-change-in-production")
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return "default-user"
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return str(payload.get("userId", "default-user"))
    except:
        return "default-user"


# ============ Pydantic Models ============


class ResumeCreate(BaseModel):
    name: str = Field(..., description="简历名称")
    target_position: Optional[str] = Field(None, description="目标职位")
    template: str = Field("modern", description="模板类型")


class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    target_position: Optional[str] = None
    template: Optional[str] = None


class PersonalInfo(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    avatar: Optional[str] = None


class WorkExperience(BaseModel):
    id: Optional[int] = None
    company: str
    position: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    achievements: Optional[List[str]] = None


class Education(BaseModel):
    id: Optional[int] = None
    school: str
    degree: Optional[str] = None
    major: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class Skill(BaseModel):
    id: Optional[int] = None
    name: str
    level: int = Field(3, ge=1, le=5)
    category: Optional[str] = "技术"


class Project(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    role: Optional[str] = None
    achievements: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class JobMatchRequest(BaseModel):
    job_description: str = Field(..., description="职位描述")


class OptimizeRequest(BaseModel):
    job_description: Optional[str] = Field(None, description="目标职位描述（可选）")


class CoverLetterRequest(BaseModel):
    company: str = Field(..., description="目标公司")
    position: str = Field(..., description="目标职位")
    job_description: Optional[str] = Field(None, description="职位描述")


# ============ Resume CRUD Endpoints ============


@router.get("/")
async def get_resumes(user_id: str = Depends(get_optional_user_id)):
    """获取用户的所有简历列表"""
    service = get_resume_service()
    resumes = service.get_resumes(user_id)
    return {"success": True, "data": resumes}


@router.post("/")
async def create_resume(
    request: ResumeCreate, user_id: str = Depends(get_optional_user_id)
):
    """创建新简历"""
    service = get_resume_service()
    resume = service.create_resume(
        user_id=user_id,
        name=request.name,
        target_position=request.target_position,
        template=request.template,
    )
    return {"success": True, "data": resume}


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user_id: str = Depends(get_optional_user_id)):
    """获取简历详情"""
    service = get_resume_service()
    resume = service.get_resume(resume_id)

    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    return {"success": True, "data": resume}


@router.put("/{resume_id}")
async def update_resume(
    resume_id: str, request: ResumeUpdate, user_id: str = Depends(get_optional_user_id)
):
    """更新简历基本信息"""
    service = get_resume_service()

    # 检查简历是否存在
    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    updates = request.dict(exclude_unset=True)
    service.update_resume(resume_id, updates)

    # 返回更新后的简历
    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user_id: str = Depends(get_optional_user_id)):
    """删除简历"""
    service = get_resume_service()

    # 检查简历是否存在
    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.delete_resume(resume_id)
    return {"success": True, "message": "简历已删除"}


# ============ Personal Info Endpoints ============


@router.put("/{resume_id}/personal-info")
async def update_personal_info(
    resume_id: str, info: PersonalInfo, user_id: str = Depends(get_optional_user_id)
):
    """更新个人信息"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.update_personal_info(resume_id, info.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


# ============ Work Experience Endpoints ============


@router.post("/{resume_id}/work-experience")
async def add_work_experience(
    resume_id: str,
    experience: WorkExperience,
    user_id: str = Depends(get_optional_user_id),
):
    """添加工作经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    exp_id = service.add_work_experience(resume_id, experience.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated, "experience_id": exp_id}


@router.put("/{resume_id}/work-experience/{exp_id}")
async def update_work_experience(
    resume_id: str,
    exp_id: int,
    experience: WorkExperience,
    user_id: str = Depends(get_optional_user_id),
):
    """更新工作经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.update_work_experience(exp_id, experience.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


@router.delete("/{resume_id}/work-experience/{exp_id}")
async def delete_work_experience(
    resume_id: str, exp_id: int, user_id: str = Depends(get_optional_user_id)
):
    """删除工作经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.delete_work_experience(exp_id)

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


# ============ Education Endpoints ============


@router.post("/{resume_id}/education")
async def add_education(
    resume_id: str, education: Education, user_id: str = Depends(get_optional_user_id)
):
    """添加教育经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    edu_id = service.add_education(resume_id, education.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated, "education_id": edu_id}


@router.put("/{resume_id}/education/{edu_id}")
async def update_education(
    resume_id: str,
    edu_id: int,
    education: Education,
    user_id: str = Depends(get_optional_user_id),
):
    """更新教育经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.update_education(edu_id, education.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


@router.delete("/{resume_id}/education/{edu_id}")
async def delete_education(
    resume_id: str, edu_id: int, user_id: str = Depends(get_optional_user_id)
):
    """删除教育经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.delete_education(edu_id)

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


# ============ Skills Endpoints ============


@router.post("/{resume_id}/skills")
async def add_skill(
    resume_id: str, skill: Skill, user_id: str = Depends(get_optional_user_id)
):
    """添加技能"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    skill_id = service.add_skill(resume_id, skill.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated, "skill_id": skill_id}


@router.put("/{resume_id}/skills/{skill_id}")
async def update_skill(
    resume_id: str,
    skill_id: int,
    skill: Skill,
    user_id: str = Depends(get_optional_user_id),
):
    """更新技能"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.update_skill(skill_id, skill.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


@router.delete("/{resume_id}/skills/{skill_id}")
async def delete_skill(
    resume_id: str, skill_id: int, user_id: str = Depends(get_optional_user_id)
):
    """删除技能"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.delete_skill(skill_id)

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


# ============ Projects Endpoints ============


@router.post("/{resume_id}/projects")
async def add_project(
    resume_id: str, project: Project, user_id: str = Depends(get_optional_user_id)
):
    """添加项目经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    project_id = service.add_project(resume_id, project.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated, "project_id": project_id}


@router.put("/{resume_id}/projects/{project_id}")
async def update_project(
    resume_id: str,
    project_id: int,
    project: Project,
    user_id: str = Depends(get_optional_user_id),
):
    """更新项目经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.update_project(project_id, project.dict(exclude_unset=True))

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


@router.delete("/{resume_id}/projects/{project_id}")
async def delete_project(
    resume_id: str, project_id: int, user_id: str = Depends(get_optional_user_id)
):
    """删除项目经历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    service.delete_project(project_id)

    updated = service.get_resume(resume_id)
    return {"success": True, "data": updated}


# ============ AI Features Endpoints ============


@router.post("/{resume_id}/optimize")
async def optimize_resume(
    resume_id: str,
    request: OptimizeRequest,
    user_id: str = Depends(get_optional_user_id),
):
    """AI优化简历"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    result = await service.optimize_resume(resume_id, request.job_description)
    return {"success": True, "data": result}


@router.post("/{resume_id}/match-job")
async def match_job(
    resume_id: str,
    request: JobMatchRequest,
    user_id: str = Depends(get_optional_user_id),
):
    """简历与职位匹配分析"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    result = await service.match_job(resume_id, request.job_description)
    return {"success": True, "data": result}


@router.post("/{resume_id}/generate-cover-letter")
async def generate_cover_letter(
    resume_id: str,
    request: CoverLetterRequest,
    user_id: str = Depends(get_optional_user_id),
):
    """生成求职信"""
    service = get_resume_service()

    resume = service.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    cover_letter = await service.generate_cover_letter(
        resume_id, request.company, request.position, request.job_description
    )
    return {"success": True, "data": {"cover_letter": cover_letter}}


# ============ Templates Endpoints ============


@router.get("/templates/list")
async def get_templates():
    """获取可用的简历模板列表"""
    templates = [
        {
            "id": "modern",
            "name": "现代简约",
            "description": "简洁现代的设计，适合大多数职位",
            "preview": "/templates/modern.png",
            "category": "通用",
        },
        {
            "id": "professional",
            "name": "专业商务",
            "description": "传统商务风格，适合金融、咨询等行业",
            "preview": "/templates/professional.png",
            "category": "商务",
        },
        {
            "id": "creative",
            "name": "创意设计",
            "description": "富有创意的设计，适合设计、艺术类职位",
            "preview": "/templates/creative.png",
            "category": "创意",
        },
        {
            "id": "technical",
            "name": "技术风格",
            "description": "清晰的技术风格，适合IT、工程类职位",
            "preview": "/templates/technical.png",
            "category": "技术",
        },
        {
            "id": "minimal",
            "name": "极简风格",
            "description": "极简主义设计，突出重点内容",
            "preview": "/templates/minimal.png",
            "category": "通用",
        },
        {
            "id": "elegant",
            "name": "优雅精致",
            "description": "优雅精致的风格，适合高端职位",
            "preview": "/templates/elegant.png",
            "category": "商务",
        },
    ]

    return {"success": True, "data": templates}
