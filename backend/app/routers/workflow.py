"""
Workflow Router
工作流相关的 API 路由
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.core.workflow_service import workflow_service, Workflow
from backend.core.workflow_executor import workflow_executor
from backend.core.workflow_execution_store import workflow_execution_store
from backend.core.path_validator import project_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workflows", tags=["Workflow"])


# ============================================
# 数据模型
# ============================================

class WorkflowSaveRequest(BaseModel):
    project_name: str
    workflow_name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class WorkflowGenerateRequest(BaseModel):
    prompt: str


# ============================================
# Workflow 端点
# ============================================

@router.post("/save")
async def save_workflow(req: WorkflowSaveRequest):
    """保存工作流"""
    try:
        workflow = Workflow(
            id=None,
            name=req.workflow_name,
            nodes=req.nodes,
            edges=req.edges,
            project_name=req.project_name,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        workflow_id = workflow_service.save_workflow(workflow)

        return {
            "success": True,
            "workflow_id": workflow_id,
            "message": "工作流保存成功"
        }
    except Exception as e:
        logger.error(f"Error saving workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/{project_name}")
async def get_workflows(project_name: str):
    """获取项目的所有工作流"""
    try:
        workflows = workflow_service.get_workflows_by_project(project_name)
        return {
            "workflows": [
                {
                    "id": w.id,
                    "name": w.name,
                    "created_at": w.created_at,
                    "updated_at": w.updated_at,
                    "nodes_count": len(w.nodes),
                    "edges_count": len(w.edges)
                }
                for w in workflows
            ]
        }
    except Exception as e:
        logger.error(f"Error getting workflows: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/{project_name}/{workflow_id}")
async def get_workflow(project_name: str, workflow_id: str):
    """获取工作流详情"""
    try:
        workflow = workflow_service.get_workflow(workflow_id)
        if not workflow:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)

        return {
            "id": workflow.id,
            "name": workflow.name,
            "nodes": workflow.nodes,
            "edges": workflow.edges,
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at
        }
    except Exception as e:
        logger.error(f"Error getting workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/{project_name}/{workflow_id}")
async def delete_workflow(project_name: str, workflow_id: str):
    """删除工作流"""
    try:
        success = workflow_service.delete_workflow(workflow_id)
        if success:
            return {"success": True, "message": "工作流删除成功"}
        else:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error deleting workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/generate")
async def generate_workflow(req: WorkflowGenerateRequest):
    """AI 生成工作流"""
    try:
        result = workflow_service.generate_workflow_from_prompt(req.prompt)
        return result
    except Exception as e:
        logger.error(f"Error generating workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, context: Dict[str, Any] = None):
    """执行工作流"""
    try:
        workflow = workflow_service.get_workflow(workflow_id)
        if not workflow:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)

        # 获取项目路径
        project_path = project_registry.get_project_path(workflow.project_name)
        if not project_path:
            return JSONResponse({"error": "Project path not found"}, status_code=404)

        # 执行工作流
        result = await workflow_executor.execute_workflow(
            workflow_id,
            _normalize_workflow_graph(workflow.nodes, workflow.edges),
            project_path,
            context
        )

        return {
            "success": result.success,
            "steps_completed": result.steps_completed,
            "steps_total": result.steps_total,
            "logs": result.logs,
            "output": result.output,
            "error": result.error
        }
    except Exception as e:
        logger.error(f"Error executing workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/stream/{workflow_id}/execute")
async def execute_workflow_stream(workflow_id: str, project_name: str = Query(None)):
    """流式执行工作流（SSE）"""
    workflow = None
    execution_id = None
    started_at = datetime.now().isoformat()

    try:
        # 获取工作流
        workflow = workflow_service.get_workflow(workflow_id)
        if not workflow:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)

        # 获取项目路径
        actual_project_name = project_name or workflow.project_name
        project_path = project_registry.get_project_path(actual_project_name)
        if not project_path:
            return JSONResponse({"error": "Project path not found"}, status_code=404)

        # 创建执行记录
        execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        workflow_execution_store.create(execution_id, {
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "project_name": actual_project_name,
            "status": "running",
            "started_at": started_at,
            "ended_at": None,
            "error": None
        })

        async def event_generator():
            nonlocal execution_id
            steps_completed = 0

            try:
                # 执行工作流并流式输出
                async for update in workflow_executor.execute_workflow_stream(
                    workflow_id,
                    _normalize_workflow_graph(workflow.nodes, workflow.edges),
                    project_path,
                    {}
                ):
                    if isinstance(update, dict):
                        # 更新执行记录
                        if update.get('type') == 'step_completed':
                            steps_completed += 1
                            workflow_execution_store.append_event(execution_id, {
                                "type": "step_completed",
                                "steps_completed": steps_completed
                            })

                        workflow_execution_store.append_event(execution_id, update)

                    yield f"data: {json.dumps(update, ensure_ascii=False)}\n\n"

                # 执行完成
                workflow_execution_store.update(execution_id, {
                    "status": "completed",
                    "ended_at": datetime.now().isoformat()
                })

            except Exception as e:
                logger.error(f"Error executing workflow stream: {e}")
                if not execution_id:
                    execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    workflow_execution_store.create(execution_id, {
                        "workflow_id": workflow_id,
                        "workflow_name": workflow.name if workflow else None,
                        "project_name": project_name,
                        "status": "failed",
                        "started_at": started_at,
                        "ended_at": datetime.now().isoformat(),
                        "error": str(e)
                    })
                err_event = {
                    'type': 'error',
                    'error': str(e),
                    'execution_id': execution_id,
                    'timestamp': datetime.now().isoformat()
                }
                workflow_execution_store.append_event(execution_id, err_event)
                yield f"data: {json.dumps(err_event, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )

    except Exception as e:
        logger.error(f"Error setting up workflow stream: {e}")
        if not execution_id:
            execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            workflow_execution_store.create(execution_id, {
                "workflow_id": workflow_id,
                "workflow_name": workflow.name if workflow else None,
                "project_name": project_name,
                "status": "failed",
                "started_at": started_at,
                "ended_at": datetime.now().isoformat(),
                "error": str(e)
            })
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/executions")
async def list_workflow_executions(
    limit: int = Query(50, ge=1, le=200),
    workflow_id: str = Query(None),
    project_name: str = Query(None)
):
    """列出工作流执行记录"""
    items = workflow_execution_store.list(
        limit=limit,
        workflow_id=workflow_id,
        project_name=project_name
    )
    return {"success": True, "executions": items}


@router.get("/executions/{execution_id}")
async def get_workflow_execution(execution_id: str):
    """获取工作流执行详情"""
    record = workflow_execution_store.get(execution_id)
    if not record:
        return JSONResponse({"error": "Execution not found"}, status_code=404)
    return {"success": True, "execution": record}


# ============================================
# 辅助函数
# ============================================

def _normalize_workflow_graph(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    """规范化工作流图，转换节点类型"""
    type_mapping = {
        "readFile": "fileRead",
        "writeFile": "fileWrite",
        "searchFiles": "search",
        "gitCommit": "git",
        "gitBranch": "git",
    }

    normalized_nodes = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        node_type = node.get("type")
        mapped_type = type_mapping.get(node_type, node_type)
        if mapped_type == node_type:
            normalized_nodes.append(node)
        else:
            normalized_nodes.append({**node, "type": mapped_type})

    return {"nodes": normalized_nodes, "edges": edges}
