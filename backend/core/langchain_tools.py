from __future__ import annotations

import os
import json
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Optional

from backend.core.async_command import get_async_command_executor
from backend.core.file_service import file_service
from backend.core.git_service import git_service


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    args_schema: Dict[str, Any]
    run: Callable[[Dict[str, Any]], Awaitable[Any]]
    tool_type: str
    side_effects: bool = False


def _powershell_command(command: str) -> List[str]:
    return ["powershell.exe", "-NoLogo", "-NoProfile", "-Command", command]


def _bash_command(command: str) -> List[str]:
    return ["/bin/bash", "-lc", command]


def build_tool_specs(
    project_path: str,
    allow_side_effects: bool,
) -> List[ToolSpec]:
    project_path = os.path.abspath(project_path or os.getcwd())

    async def file_read(args: Dict[str, Any]):
        rel = str(args.get("path") or "")
        return file_service.read_file(project_path, rel)

    async def file_write(args: Dict[str, Any]):
        if not allow_side_effects:
            raise PermissionError("Side effects disabled")
        rel = str(args.get("path") or "")
        content = str(args.get("content") or "")
        file_service.write_file(project_path, rel, content)
        return {"success": True, "path": rel, "bytes": len(content.encode("utf-8", errors="ignore"))}

    async def file_tree(args: Dict[str, Any]):
        return file_service.get_tree(project_path)

    async def shell_run(args: Dict[str, Any]):
        if not allow_side_effects:
            raise PermissionError("Side effects disabled")
        command = str(args.get("command") or "").strip()
        timeout = args.get("timeout")
        timeout = int(timeout) if timeout is not None else 120
        if not command:
            raise ValueError("command is required")
        executor = get_async_command_executor()
        cmd = _powershell_command(command) if os.name == "nt" else _bash_command(command)
        return await executor.execute_command(cmd, cwd=project_path, timeout=timeout)

    async def git_status(args: Dict[str, Any]):
        return await git_service.get_status(project_path)

    async def git_diff(args: Dict[str, Any]):
        file_path = str(args.get("path") or "")
        return await git_service.get_diff(project_path, file_path)

    async def workflow_list(args: Dict[str, Any]):
        from backend.core.workflow_service import workflow_service

        project_name = str(args.get("project_name") or os.path.basename(project_path))
        workflows = workflow_service.get_workflows_by_project(project_name)
        return [{"id": w.id, "name": w.name, "project_name": w.project_name} for w in workflows]

    async def workflow_execute(args: Dict[str, Any]):
        from backend.core.workflow_executor import workflow_executor
        from backend.core.workflow_service import workflow_service

        if not allow_side_effects:
            raise PermissionError("Side effects disabled")
        workflow_id = str(args.get("workflow_id") or "")
        if not workflow_id:
            raise ValueError("workflow_id is required")
        wf = workflow_service.get_workflow(workflow_id)
        if not wf:
            return {"success": False, "error": f"Workflow not found: {workflow_id}"}
        ctx = args.get("context") if isinstance(args.get("context"), dict) else {}
        res = await workflow_executor.execute_workflow(workflow_id, {"nodes": wf.nodes, "edges": wf.edges}, project_path, ctx)
        return {
            "success": bool(res.success),
            "error": res.error,
            "steps_completed": res.steps_completed,
            "steps_total": res.steps_total,
            "output": res.output,
        }

    specs = [
        ToolSpec(
            name="file_read",
            description="读取项目内文件内容",
            args_schema={"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
            run=file_read,
            tool_type="file",
            side_effects=False,
        ),
        ToolSpec(
            name="file_write",
            description="写入项目内文件内容（会覆盖）",
            args_schema={"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]},
            run=file_write,
            tool_type="file",
            side_effects=True,
        ),
        ToolSpec(
            name="file_tree",
            description="获取项目文件树（遵循 .gitignore）",
            args_schema={"type": "object", "properties": {}},
            run=file_tree,
            tool_type="file",
            side_effects=False,
        ),
        ToolSpec(
            name="shell_run",
            description="在项目目录执行命令并返回 stdout/stderr/exit code",
            args_schema={"type": "object", "properties": {"command": {"type": "string"}, "timeout": {"type": "integer"}}, "required": ["command"]},
            run=shell_run,
            tool_type="shell",
            side_effects=True,
        ),
        ToolSpec(
            name="git_status",
            description="获取 git 状态（分支、modified/added/deleted/untracked）",
            args_schema={"type": "object", "properties": {}},
            run=git_status,
            tool_type="git",
            side_effects=False,
        ),
        ToolSpec(
            name="git_diff",
            description="获取某个文件相对 HEAD 的 diff",
            args_schema={"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
            run=git_diff,
            tool_type="git",
            side_effects=False,
        ),
        ToolSpec(
            name="workflow_list",
            description="列出某个项目名下的工作流",
            args_schema={"type": "object", "properties": {"project_name": {"type": "string"}}},
            run=workflow_list,
            tool_type="workflow",
            side_effects=False,
        ),
        ToolSpec(
            name="workflow_execute",
            description="执行某个工作流（按 workflow_id）",
            args_schema={"type": "object", "properties": {"workflow_id": {"type": "string"}, "context": {"type": "object"}}, "required": ["workflow_id"]},
            run=workflow_execute,
            tool_type="workflow",
            side_effects=True,
        ),
    ]

    if allow_side_effects:
        return specs
    return [s for s in specs if not s.side_effects]


def build_langchain_tools(tool_specs: List[ToolSpec]):
    try:
        from langchain_core.tools import Tool
    except Exception:
        return []

    def _normalize_args(spec: ToolSpec, tool_input: Any) -> Dict[str, Any]:
        if isinstance(tool_input, dict):
            return tool_input
        if tool_input is None:
            return {}
        if not isinstance(tool_input, str):
            return {"value": tool_input}
        raw = tool_input.strip()
        if raw.startswith("{") and raw.endswith("}"):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except Exception:
                pass
        if spec.name in ("file_read", "git_diff"):
            return {"path": raw}
        if spec.name == "shell_run":
            return {"command": raw}
        if spec.name == "workflow_execute":
            return {"workflow_id": raw}
        return {"value": raw}

    tools = []
    def _make_coroutine(spec: ToolSpec):
        async def _coro(tool_input: Any = None):
            args = _normalize_args(spec, tool_input)
            return await spec.run(args)

        return _coro

    def _sync(*args, **kwargs):
        raise RuntimeError("This tool is async-only")

    for spec in tool_specs:
        tools.append(
            Tool(
                name=spec.name,
                description=spec.description,
                func=_sync,
                coroutine=_make_coroutine(spec),
            )
        )
    return tools
