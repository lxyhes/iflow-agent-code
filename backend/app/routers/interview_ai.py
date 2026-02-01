# 面试 AI Router
# 提供 AI 驱动的面试辅助功能

import os
import json
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview-ai", tags=["Interview AI"])

# 加载环境变量
IFLOW_API_KEY = os.getenv("IFLOW_API_KEY", "")

# 尝试导入 iflow_sdk
try:
    from iflow_sdk import IFlowClient, AssistantMessage
    IFLOW_SDK_AVAILABLE = True
except ImportError:
    IFLOW_SDK_AVAILABLE = False
    IFlowClient = None
    AssistantMessage = None


class InterviewQuestionRequest(BaseModel):
    company: str
    position: str
    question: str
    question_type: str = "technical"  # technical, behavioral, system_design, salary
    context: Optional[str] = None


class STARAnalysisRequest(BaseModel):
    story: str
    context: Optional[str] = None


class SalaryNegotiationRequest(BaseModel):
    current_salary: Optional[str] = None
    target_salary: str
    company: str
    position: str
    experience_years: int
    context: Optional[str] = None


class DeepDiveRequest(BaseModel):
    answer: str
    question: str
    depth: int = 1


class PressureInterviewRequest(BaseModel):
    candidate_answer: str
    pressure_type: str = "challenge"  # challenge, stress, logic


class InterviewReviewRequest(BaseModel):
    questions: List[Dict[str, Any]]
    answers: List[str]
    company: str
    position: str


async def call_ai(prompt: str, temperature: float = 0.7) -> str:
    """调用 AI 生成内容"""
    
    if not IFLOW_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    # 优先使用 SDK
    if IFLOW_SDK_AVAILABLE:
        try:
            full_content = ""
            async with IFlowClient() as client:
                await client.send_message(prompt)
                async for msg in client.receive_messages():
                    if AssistantMessage and isinstance(msg, AssistantMessage):
                        if msg.chunk and msg.chunk.text:
                            full_content += msg.chunk.text
                    if hasattr(msg, '__class__') and 'Finish' in msg.__class__.__name__:
                        break
            return full_content
        except Exception as e:
            logger.error(f"SDK failed: {e}")
    
    # 回退到 HTTP API
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.iflow.cn/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {IFLOW_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "你是一位专业的面试辅导专家，擅长帮助求职者准备各类面试。"},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "max_tokens": 4000,
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="AI service error")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]


@router.post("/master-answer")
async def generate_master_answer(request: InterviewQuestionRequest):
    """面试高手模式 - 生成高分回答"""
    try:
        company_style = {
            '阿里': '重视技术深度和架构设计能力',
            '字节': '重视算法和快速迭代能力',
            '腾讯': '重视基础扎实和团队协作',
            '美团': '重视业务理解和系统稳定性',
            '百度': '重视技术深度和创新能力',
            '京东': '重视高并发和电商经验',
            '拼多多': '重视极致性能和成本控制',
            '小米': '重视全栈能力和产品思维'
        }
        
        style = company_style.get(request.company, '综合技术能力和项目经验')
        
        prompt = f"""你是一位面试辅导专家，帮助求职者准备{request.company}的面试。

面试职位：{request.position}
面试问题：{request.question}
问题类型：{request.question_type}
公司偏好：{style}

请提供：
1. 高分回答框架（按步骤）
2. 具体回答内容（可直接使用）
3. 加分技巧和注意事项
4. 可能的追问及应对策略

回答要专业、实用、有针对性。"""

        content = await call_ai(prompt)
        return {"answer": content, "type": request.question_type}
    except Exception as e:
        logger.error(f"Master answer failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/star-analysis")
async def analyze_star_story(request: STARAnalysisRequest):
    """STAR法则训练 - 分析故事"""
    try:
        prompt = f"""你是一位STAR法则专家。请分析以下面试故事，并给出改进建议。

候选人的故事：
{request.story}

请按以下格式分析：
1. STAR要素识别（Situation, Task, Action, Result）
2. 每个要素的评分（1-10分）及改进建议
3. 优化后的完整故事
4. 可以突出的亮点
5. 需要避免的坑

要具体、 actionable，帮助候选人提升。"""

        content = await call_ai(prompt)
        return {"analysis": content}
    except Exception as e:
        logger.error(f"STAR analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/salary-negotiation")
async def generate_salary_strategy(request: SalaryNegotiationRequest):
    """薪资谈判模拟 - 生成谈判策略"""
    try:
        prompt = f"""你是一位薪资谈判专家。请为以下情况提供谈判策略。

候选人信息：
- 目标公司：{request.company}
- 目标职位：{request.position}
- 工作经验：{request.experience_years}年
- 目前薪资：{request.current_salary or '未提供'}
- 期望薪资：{request.target_salary}

请提供：
1. 市场薪资参考（该职位在该公司的薪资范围）
2. 谈判策略和话术
3. 整体Package谈判要点（股票、期权、福利等）
4. 常见谈判场景及应对
5. 谈判禁忌和注意事项

策略要实用、具体、有说服力。"""

        content = await call_ai(prompt)
        return {"strategy": content}
    except Exception as e:
        logger.error(f"Salary negotiation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deep-dive")
async def generate_deep_dive(request: DeepDiveRequest):
    """深度追问 - 生成追问问题"""
    try:
        prompt = f"""你是一位技术面试官。基于候选人的回答，生成深度追问问题。

原问题：{request.question}
候选人回答：{request.answer}
追问深度：{request.depth}/3（1=基础，2=深入，3=专家级）

请生成：
1. 3-5个追问问题（难度递增）
2. 每个问题的考察点
3. 期望的回答方向
4. 追问的目的和意图

问题要有挑战性，能考察候选人的真实水平。"""

        content = await call_ai(prompt)
        return {"questions": content, "depth": request.depth}
    except Exception as e:
        logger.error(f"Deep dive failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pressure-interview")
async def generate_pressure_response(request: PressureInterviewRequest):
    """压力面试 - 生成压力回应"""
    try:
        prompt = f"""你是一位压力面试专家。针对候选人的回答，生成压力面试的回应。

候选人回答：{request.candidate_answer}
压力类型：{request.pressure_type}

请提供：
1. 压力面试的追问（挑战、质疑、施压）
2. 为什么这样追问（考察点）
3. 期望候选人如何回应
4. 回应技巧和话术建议

要真实模拟压力面试场景，帮助候选人练习。"""

        content = await call_ai(prompt)
        return {"response": content, "type": request.pressure_type}
    except Exception as e:
        logger.error(f"Pressure interview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview-review")
async def generate_interview_review(request: InterviewReviewRequest):
    """面试复盘 - 生成复盘报告"""
    try:
        qa_pairs = "\n\n".join([
            f"Q{i+1}: {q['question']}\nA{i+1}: {a}"
            for i, (q, a) in enumerate(zip(request.questions, request.answers))
        ])
        
        prompt = f"""你是一位面试复盘专家。请对以下面试表现进行全面复盘。

面试信息：
- 公司：{request.company}
- 职位：{request.position}

面试问答：
{qa_pairs}

请提供复盘报告：
1. 整体表现评分（各项能力1-10分）
2. 优点和亮点
3. 不足和改进建议
4. 每个问题的具体评价
5. 下次面试的建议
6. 需要补充的知识或技能

报告要客观、建设性、 actionable。"""

        content = await call_ai(prompt)
        return {"review": content}
    except Exception as e:
        logger.error(f"Interview review failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status():
    """获取服务状态"""
    return {
        "status": "ok" if IFLOW_API_KEY else "not_configured",
        "api_key_configured": bool(IFLOW_API_KEY),
        "sdk_available": IFLOW_SDK_AVAILABLE,
    }
