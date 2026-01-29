"""
面试系统API路由

提供多智能体面试系统的RESTful API接口。
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel

from backend.core.agent import Agent
from backend.core.interview_agents import (
    AgentCoordinator,
    CandidateProfile,
    InterviewConfig,
)
from backend.core.interview_engine import InterviewSessionManager
from backend.core.evaluation import ScoringEngine, WeightedScore

router = APIRouter(prefix="/interview", tags=["interview"])

# 全局会话管理器
session_manager = InterviewSessionManager()


# ============ 数据模型 ============

class CandidateProfileRequest(BaseModel):
    """候选人画像请求"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    resume_summary: Optional[str] = None
    skills: List[str] = []
    experience_years: float = 0
    education: List[Dict[str, Any]] = []
    previous_roles: List[str] = []
    target_position: str = ""
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None


class InterviewConfigRequest(BaseModel):
    """面试配置请求"""
    total_rounds: int = 5
    max_duration: int = 3600
    agent_order: List[str] = ["technical", "behavioral", "hr"]
    enable_follow_up: bool = True
    enable_stress_test: bool = False


class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    candidate_profile: CandidateProfileRequest
    config: Optional[InterviewConfigRequest] = None
    job_position_id: Optional[str] = None


class AnswerRequest(BaseModel):
    """回答请求"""
    answer: str
    duration: Optional[int] = None  # 回答时长（秒）


class InterviewResponse(BaseModel):
    """面试响应"""
    session_id: str
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None


# ============ REST API ============

@router.post("/sessions", response_model=InterviewResponse)
async def create_session(request: CreateSessionRequest):
    """
    创建面试会话

    创建一个新的多智能体面试会话。
    """
    try:
        # 创建候选人画像
        candidate_profile = CandidateProfile(
            name=request.candidate_profile.name,
            email=request.candidate_profile.email or "",
            phone=request.candidate_profile.phone or "",
            resume_summary=request.candidate_profile.resume_summary or "",
            skills=request.candidate_profile.skills,
            experience_years=request.candidate_profile.experience_years,
            education=request.candidate_profile.education,
            previous_roles=request.candidate_profile.previous_roles,
            target_position=request.candidate_profile.target_position,
            current_salary=request.candidate_profile.current_salary or "",
            expected_salary=request.candidate_profile.expected_salary or "",
            notice_period=request.candidate_profile.notice_period or "",
        )

        # 创建面试配置
        config = None
        if request.config:
            from backend.core.interview_agents import InterviewerType
            agent_order = []
            for agent_type in request.config.agent_order:
                try:
                    agent_order.append(InterviewerType(agent_type))
                except ValueError:
                    pass

            config = InterviewConfig(
                total_rounds=request.config.total_rounds,
                max_duration=request.config.max_duration,
                agent_order=agent_order or [InterviewerType.TECHNICAL, InterviewerType.BEHAVIORAL, InterviewerType.HR],
                enable_follow_up=request.config.enable_follow_up,
                enable_stress_test=request.config.enable_stress_test,
            )

        # 创建会话
        session = session_manager.create_session(
            candidate_id=candidate_profile.id,
            job_position_id=request.job_position_id or "",
            config=config,
        )

        # 初始化会话
        success = await session.initialize(candidate_profile)
        if not success:
            raise HTTPException(status_code=500, detail="会话初始化失败")

        return InterviewResponse(
            session_id=session.metadata.session_id,
            status="created",
            message="面试会话创建成功",
            data={
                "candidate_name": candidate_profile.name,
                "session_status": session.metadata.status.value,
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建会话失败: {str(e)}")


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """
    获取会话信息

    获取指定面试会话的详细信息和当前状态。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    return {
        "session_id": session_id,
        "status": session.get_status(),
        "candidate_profile": session.candidate_profile.to_dict() if session.candidate_profile else None,
        "result": session.get_result(),
    }


@router.post("/sessions/{session_id}/start")
async def start_interview(session_id: str):
    """
    开始面试

    启动面试流程。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    success = await session.start()
    if not success:
        raise HTTPException(status_code=400, detail="无法开始面试，会话状态不正确")

    return InterviewResponse(
        session_id=session_id,
        status="started",
        message="面试已开始",
    )


@router.post("/sessions/{session_id}/answer")
async def submit_answer(session_id: str, request: AnswerRequest):
    """
    提交回答

    候选人提交回答，系统会评估并返回下一个问题。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    # 这里返回的是流式响应，实际实现需要使用StreamingResponse
    # 简化版本返回基本状态
    return InterviewResponse(
        session_id=session_id,
        status="processing",
        message="回答已接收，正在处理",
        data={
            "answer": request.answer[:100] + "..." if len(request.answer) > 100 else request.answer,
        }
    )


@router.post("/sessions/{session_id}/pause")
async def pause_interview(session_id: str):
    """
    暂停面试

    暂停当前面试会话。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    success = await session.pause()
    if not success:
        raise HTTPException(status_code=400, detail="无法暂停面试")

    return InterviewResponse(
        session_id=session_id,
        status="paused",
        message="面试已暂停",
    )


@router.post("/sessions/{session_id}/resume")
async def resume_interview(session_id: str):
    """
    恢复面试

    恢复暂停的面试会话。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    success = await session.resume()
    if not success:
        raise HTTPException(status_code=400, detail="无法恢复面试")

    return InterviewResponse(
        session_id=session_id,
        status="resumed",
        message="面试已恢复",
    )


@router.post("/sessions/{session_id}/complete")
async def complete_interview(session_id: str):
    """
    完成面试

    结束面试并生成评估报告。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    result = await session.complete()

    return InterviewResponse(
        session_id=session_id,
        status="completed",
        message="面试已完成",
        data=result,
    )


@router.post("/sessions/{session_id}/cancel")
async def cancel_interview(session_id: str):
    """
    取消面试

    取消当前面试会话。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    success = await session.cancel()
    if not success:
        raise HTTPException(status_code=400, detail="无法取消面试")

    return InterviewResponse(
        session_id=session_id,
        status="cancelled",
        message="面试已取消",
    )


@router.get("/sessions/{session_id}/result")
async def get_interview_result(session_id: str):
    """
    获取面试结果

    获取面试的完整评估结果和报告。
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    result = session.get_result()
    if not result:
        raise HTTPException(status_code=400, detail="面试结果尚未生成")

    return result


@router.get("/sessions/{session_id}/export")
async def export_interview_report(session_id: str, format: str = "json"):
    """
    导出面试报告

    以指定格式导出面试报告。
    """
    from fastapi.responses import JSONResponse, PlainTextResponse
    from backend.core.evaluation import ReportGenerator

    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    result = session.get_result()
    if not result:
        raise HTTPException(status_code=400, detail="面试结果尚未生成")

    if format == "json":
        return JSONResponse(content=result)

    elif format == "markdown":
        # 生成 Markdown 报告
        generator = ReportGenerator()
        from backend.core.interview_agents import CandidateProfile

        profile = session.candidate_profile
        profile_dict = profile.to_dict() if profile else {}

        report = generator.generate_report(
            session_id=session_id,
            candidate_profile=profile_dict,
            evaluation_results=result.get("evaluation_summary", {}),
            interview_history=result.get("interview_turns", []),
        )

        markdown = generator.generate_markdown_report(report, template="summary")
        return PlainTextResponse(content=markdown, media_type="text/markdown")

    else:
        raise HTTPException(status_code=400, detail=f"不支持的格式: {format}")


@router.get("/sessions")
async def list_sessions(
    candidate_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    """
    列表面试会话

    列出所有面试会话，支持按候选人ID和状态过滤。
    """
    from backend.core.interview_engine.interview_session import SessionStatus

    status_enum = None
    if status:
        try:
            status_enum = SessionStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"无效的状态: {status}")

    sessions = session_manager.list_sessions(
        candidate_id=candidate_id,
        status=status_enum,
        limit=limit,
    )

    return {
        "sessions": sessions,
        "total": len(sessions),
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    删除会话

    删除指定的面试会话。
    """
    success = session_manager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="删除会话失败")

    return InterviewResponse(
        session_id=session_id,
        status="deleted",
        message="会话已删除",
    )


# ============ WebSocket ============

class InterviewWebSocket:
    """面试WebSocket连接管理"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        """建立连接"""
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        """断开连接"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: Dict[str, Any]):
        """发送消息"""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)


interview_ws = InterviewWebSocket()


@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """
    面试WebSocket

    提供实时的面试交互功能。
    """
    await interview_ws.connect(session_id, websocket)

    try:
        session = session_manager.get_session(session_id)
        if not session:
            await websocket.send_json({
                "type": "error",
                "message": "会话不存在",
            })
            await websocket.close()
            return

        while True:
            # 接收客户端消息
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "answer":
                # 处理候选人回答
                answer = data.get("answer", "")

                # 发送处理中状态
                await websocket.send_json({
                    "type": "status",
                    "status": "processing",
                })

                # 处理回合
                async for chunk in session.process_turn(answer):
                    await websocket.send_json(chunk)

            elif action == "start":
                # 开始面试
                demo_mode = data.get("demo_mode", False)
                if demo_mode:
                    # 启用演示模式
                    session.config.demo_mode = True
                    session.config.demo_delay = data.get("demo_delay", 3)
                    await websocket.send_json({
                        "type": "status",
                        "status": "demo_mode_enabled",
                        "message": f"演示模式已启用，自动回答延迟 {session.config.demo_delay} 秒",
                    })

                success = await session.start()
                await websocket.send_json({
                    "type": "status",
                    "status": "started" if success else "error",
                })

                # 演示模式下自动开始第一轮
                if demo_mode and success:
                    await asyncio.sleep(1)
                    async for chunk in session.process_turn():
                        await websocket.send_json(chunk)

            elif action == "pause":
                # 暂停面试
                success = await session.pause()
                await websocket.send_json({
                    "type": "status",
                    "status": "paused" if success else "error",
                })

            elif action == "resume":
                # 恢复面试
                success = await session.resume()
                await websocket.send_json({
                    "type": "status",
                    "status": "resumed" if success else "error",
                })

            elif action == "complete":
                # 完成面试
                result = await session.complete()
                await websocket.send_json({
                    "type": "completed",
                    "result": result,
                })

            elif action == "get_status":
                # 获取状态
                status = session.get_status()
                await websocket.send_json({
                    "type": "status",
                    "data": status,
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"未知操作: {action}",
                })

    except WebSocketDisconnect:
        interview_ws.disconnect(session_id)
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e),
        })
        interview_ws.disconnect(session_id)
