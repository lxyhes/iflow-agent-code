from __future__ import annotations

import json
import os
import asyncio
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Dict, List, Optional, Union

from backend.core.agent import Agent
from backend.core.langchain_tools import ToolSpec, build_langchain_tools, build_tool_specs
from backend.core.rag_backend import get_rag_backend
from backend.core.providers.provider_status import effective_provider_plan
from backend.core.providers.provider_config import get_provider_config
from backend.core.memory_provider import get_memory_provider
from backend.core.providers.native.native_orchestrators import run_native_orchestrator, stream_text


@dataclass
class ToolCall:
    name: str
    args: Dict[str, Any]


def _is_enabled() -> bool:
    return os.getenv("ORCHESTRATION_ENABLED", "true").lower() == "true"


def _tool_prompt(tool_specs: List[ToolSpec]) -> str:
    items = []
    for s in tool_specs:
        items.append(
            {
                "name": s.name,
                "description": s.description,
                "args_schema": s.args_schema,
                "side_effects": s.side_effects,
            }
        )
    return json.dumps(items, ensure_ascii=False)


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    s = str(text or "").strip()
    if not s:
        return None
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = s[start : end + 1]
    try:
        obj = json.loads(snippet)
        if isinstance(obj, dict):
            return obj
    except Exception:
        return None
    return None


class OrchestratorAgent:
    def __init__(
        self,
        base_agent: Agent,
        project_path: str,
        allow_side_effects: bool = True,
        max_tool_rounds: int = 3,
    ):
        self.base_agent = base_agent
        self.project_path = project_path
        self.allow_side_effects = allow_side_effects
        self.max_tool_rounds = max_tool_rounds
        self.rag_backend = get_rag_backend(project_path)
        self.tool_specs = build_tool_specs(project_path, allow_side_effects=allow_side_effects)
        if self.rag_backend:
            async def rag_search(args: Dict[str, Any]):
                q = str(args.get("query") or "").strip()
                top_k = args.get("top_k")
                top_k = int(top_k) if top_k is not None else 5
                results = self.rag_backend.retrieve(q, top_k=top_k)
                return {"results": results, "context": self.rag_backend.format_context(results)}

            self.tool_specs = [
                *self.tool_specs,
                ToolSpec(
                    name="rag_search",
                    description="在项目知识库里检索相关内容，返回片段与拼接的上下文",
                    args_schema={"type": "object", "properties": {"query": {"type": "string"}, "top_k": {"type": "integer"}}, "required": ["query"]},
                    run=rag_search,
                    tool_type="rag",
                    side_effects=False,
                ),
            ]
        self.langchain_tools = build_langchain_tools(self.tool_specs)
        cfg = get_provider_config()
        self.memory_provider = get_memory_provider(project_path, provider=cfg.memory_provider)

    async def chat(self, user_input: str) -> str:
        full = ""
        async for chunk in self.chat_stream(user_input):
            if isinstance(chunk, str):
                full += chunk
            elif isinstance(chunk, dict):
                if chunk.get("type") == "assistant":
                    full += chunk.get("content", "")
        return full

    async def chat_stream(self, user_input: str) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        if not _is_enabled() or not self.tool_specs:
            async for chunk in self.base_agent.chat_stream(user_input):
                yield chunk
            return

        query = str(user_input or "").strip()
        if not query:
            async for chunk in self.base_agent.chat_stream(user_input):
                yield chunk
            return

        rag_context = ""
        if self.rag_backend and len(query) >= 6:
            try:
                rag_results = self.rag_backend.retrieve(query, top_k=5)
                rag_context = self.rag_backend.format_context(rag_results)
            except Exception:
                rag_context = ""

        plan = effective_provider_plan()
        effective = (plan.get("effective") or {}).get("orchestration_provider") or "json"
        memory_context = ""
        try:
            memory_context = self.memory_provider.format_context(limit=6, max_chars=3500)
        except Exception:
            memory_context = ""

        full_text = ""
        if effective == "langchain" and self.langchain_tools:
            async for out in self._chat_stream_langchain(query, rag_context, memory_context, provider_label="langchain"):
                if isinstance(out, str):
                    full_text += out
                yield out
        elif effective == "semantic_kernel" and self.langchain_tools:
            native = await run_native_orchestrator("semantic_kernel", query, self.tool_specs, rag_context, memory_context, self.max_tool_rounds)
            if native:
                async for chunk in stream_text(native):
                    full_text += chunk
                    yield chunk
            else:
                async for out in self._chat_stream_langchain(query, rag_context, memory_context, provider_label="semantic_kernel"):
                    if isinstance(out, str):
                        full_text += out
                    yield out
        elif effective == "autogen":
            native = await run_native_orchestrator("autogen", query, self.tool_specs, rag_context, memory_context, self.max_tool_rounds)
            if native:
                async for chunk in stream_text(native):
                    full_text += chunk
                    yield chunk
            else:
                async for out in self._chat_stream_autogen_like(query, rag_context, memory_context):
                    if isinstance(out, str):
                        full_text += out
                    yield out
        elif effective == "crewai":
            native = await run_native_orchestrator("crewai", query, self.tool_specs, rag_context, memory_context, self.max_tool_rounds)
            if native:
                async for chunk in stream_text(native):
                    full_text += chunk
                    yield chunk
            else:
                async for out in self._chat_stream_crewai_like(query, rag_context, memory_context):
                    if isinstance(out, str):
                        full_text += out
                    yield out
        elif effective == "swe_agent" and self.langchain_tools:
            native = await run_native_orchestrator("swe_agent", query, self.tool_specs, rag_context, memory_context, self.max_tool_rounds)
            if native:
                async for chunk in stream_text(native):
                    full_text += chunk
                    yield chunk
            else:
                async for out in self._chat_stream_langchain(query, rag_context, memory_context, provider_label="swe_agent"):
                    if isinstance(out, str):
                        full_text += out
                    yield out
        else:
            async for out in self._chat_stream_json_planner(query, rag_context):
                if isinstance(out, str):
                    full_text += out
                yield out

        try:
            if full_text.strip():
                self.memory_provider.add(query, full_text.strip())
        except Exception:
            pass

    async def _chat_stream_json_planner(self, query: str, rag_context: str) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        tool_results: List[Dict[str, Any]] = []
        remaining_rounds = self.max_tool_rounds

        while remaining_rounds > 0:
            remaining_rounds -= 1
            plan_prompt = (
                "你是工具编排器。根据用户问题，决定是否调用工具。"
                "只能输出一个 JSON 对象，不要输出其它文本。\n"
                "JSON 结构：\n"
                '{"tool_calls":[{"name":"tool_name","args":{...}}], "final": null}\n'
                "当不需要工具时：\n"
                '{"tool_calls":[], "final":"直接回答要点/思路（简短）"}\n\n'
                f"用户问题：{query}\n\n"
            )
            if rag_context:
                plan_prompt += f"可用检索上下文（可能为空）：\n{rag_context}\n\n"
            if tool_results:
                plan_prompt += f"已执行工具结果：\n{json.dumps(tool_results, ensure_ascii=False)[:8000]}\n\n"
            plan_prompt += f"可用工具清单：{_tool_prompt(self.tool_specs)}\n"

            plan_raw = await self.base_agent.chat(plan_prompt)
            plan_obj = _extract_json(plan_raw)
            if not plan_obj:
                break

            calls = plan_obj.get("tool_calls")
            if not isinstance(calls, list) or len(calls) == 0:
                break

            for c in calls[:5]:
                if not isinstance(c, dict):
                    continue
                name = str(c.get("name") or "")
                args = c.get("args") if isinstance(c.get("args"), dict) else {}
                spec = next((t for t in self.tool_specs if t.name == name), None)
                if not spec:
                    tool_results.append({"tool": name, "ok": False, "error": "Unknown tool"})
                    continue

                yield {
                    "type": "tool_start",
                    "tool_type": spec.tool_type,
                    "tool_name": spec.name,
                    "label": spec.description,
                    "tool_params": args,
                }

                try:
                    res = await spec.run(args)
                    tool_results.append({"tool": spec.name, "ok": True, "result": res})
                    yield {
                        "type": "tool_end",
                        "tool_type": spec.tool_type,
                        "tool_name": spec.name,
                        "status": "success",
                        "tool_params": args,
                        "result": res,
                    }
                except Exception as e:
                    tool_results.append({"tool": spec.name, "ok": False, "error": str(e)})
                    yield {
                        "type": "tool_end",
                        "tool_type": spec.tool_type,
                        "tool_name": spec.name,
                        "status": "error",
                        "tool_params": args,
                        "result": str(e),
                    }

        final_prompt = ""
        if rag_context:
            final_prompt += f"检索上下文：\n{rag_context}\n\n"
        if tool_results:
            final_prompt += f"工具执行结果（JSON）：\n{json.dumps(tool_results, ensure_ascii=False)[:12000]}\n\n"
        final_prompt += f"用户问题：{query}\n\n请结合上下文与工具结果给出最终答复。"

        async for chunk in self.base_agent.chat_stream(final_prompt):
            yield chunk

    async def _chat_stream_langchain(self, query: str, rag_context: str, memory_context: str, provider_label: str) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        try:
            from langchain_core.language_models import BaseChatModel
            from langchain_core.messages import AIMessage
            from langchain.agents import AgentExecutor, create_react_agent
            from langchain_core.prompts import PromptTemplate
            try:
                from langchain_core.tools import render_text_description
            except Exception:
                from langchain.tools.render import render_text_description
            from langchain_core.callbacks import AsyncCallbackHandler
        except Exception:
            async for out in self._chat_stream_json_planner(query, rag_context):
                yield out
            return

        try:
            class _LCChatModel(BaseChatModel):
                @property
                def _llm_type(self) -> str:
                    return "iflow_bridge"

                async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
                    text = "\n".join([getattr(m, "content", str(m)) for m in messages if getattr(m, "content", None)])
                    content = await self._call(text)
                    return self._make_result(content)

                async def _call(self, prompt: str, stop=None, run_manager=None, **kwargs):
                    return await self._agent.chat(prompt)

                def _make_result(self, content: str):
                    from langchain_core.outputs import ChatGeneration, ChatResult
                    return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])

                def __init__(self, agent: Agent):
                    super().__init__()
                    self._agent = agent

            llm = _LCChatModel(self.base_agent)

            tool_type_by_name = {s.name: s.tool_type for s in self.tool_specs}

            class _ToolEvents(AsyncCallbackHandler):
                def __init__(self):
                    super().__init__()
                    self.queue: asyncio.Queue = asyncio.Queue()
                    self._names_by_run: Dict[str, str] = {}

                async def on_tool_start(self, serialized, input_str=None, run_id=None, **kwargs):
                    name = None
                    if isinstance(serialized, dict):
                        name = serialized.get("name")
                    name = name or kwargs.get("name") or "unknown"
                    if run_id:
                        self._names_by_run[str(run_id)] = str(name)
                    await self.queue.put(
                        {
                            "type": "tool_start",
                            "tool_type": tool_type_by_name.get(str(name), "generic"),
                            "tool_name": str(name),
                            "label": "LangChain tool",
                            "tool_params": input_str,
                        }
                    )

                async def on_tool_end(self, output=None, run_id=None, **kwargs):
                    name = self._names_by_run.pop(str(run_id), None) if run_id else None
                    name = name or kwargs.get("name") or "unknown"
                    await self.queue.put(
                        {
                            "type": "tool_end",
                            "tool_type": tool_type_by_name.get(str(name), "generic"),
                            "tool_name": str(name),
                            "status": "success",
                            "result": output,
                        }
                    )

                async def on_tool_error(self, error, run_id=None, **kwargs):
                    name = self._names_by_run.pop(str(run_id), None) if run_id else None
                    name = name or kwargs.get("name") or "unknown"
                    await self.queue.put(
                        {
                            "type": "tool_end",
                            "tool_type": tool_type_by_name.get(str(name), "generic"),
                            "tool_name": str(name),
                            "status": "error",
                            "result": str(error),
                        }
                    )

            tools_desc = render_text_description(self.langchain_tools)
            tool_names = ", ".join([t.name for t in self.langchain_tools])
            system = (
                "你是本系统的编排代理。你可以调用工具完成读取/写入文件、执行命令、获取 git 状态、执行工作流等。"
                "除非必要，不要调用有副作用的工具。"
                "当需要调用工具时，Action Input 必须是 JSON 字符串，字段符合工具要求。\n"
            )
            if provider_label == "semantic_kernel":
                system = "你是企业级“技能/插件”编排代理（兼容模式）。" + system
            if provider_label == "swe_agent":
                system = "你是代码任务代理（兼容 SWE-agent 风格）。优先用工具读取/定位/修改，再给出最小改动。" + system
            if rag_context:
                system += f"\n检索上下文：\n{rag_context}\n"
            if memory_context:
                system += f"\n长期记忆（最近交互摘要）：\n{memory_context}\n"

            react_template = (
                f"{system}\n"
                "你可以使用以下工具：\n{tools}\n\n"
                "工具名称：{tool_names}\n\n"
                "使用以下格式：\n"
                "Question: 用户问题\n"
                "Thought: 你的思考\n"
                "Action: tool_name\n"
                "Action Input: {{\"key\": \"value\"}}\n"
                "Observation: 工具返回\n"
                "...（可重复多次）...\n"
                "Final: 最终回答\n\n"
                "Question: {input}\n"
                "{agent_scratchpad}"
            )

            prompt = PromptTemplate.from_template(react_template)
            agent = create_react_agent(llm, self.langchain_tools, prompt)
            handler = _ToolEvents()
            executor = AgentExecutor(agent=agent, tools=self.langchain_tools, verbose=False, max_iterations=self.max_tool_rounds, handle_parsing_errors=True)

            async def _invoke():
                return await executor.ainvoke({"input": query, "tools": tools_desc, "tool_names": tool_names}, config={"callbacks": [handler]})

            task = asyncio.create_task(_invoke())
            while True:
                try:
                    ev = await asyncio.wait_for(handler.queue.get(), timeout=0.1)
                    yield ev
                    continue
                except asyncio.TimeoutError:
                    if task.done():
                        break

            try:
                result = task.result()
                output = result.get("output") if isinstance(result, dict) else str(result)
            except Exception as e:
                output = f"编排执行失败：{e}"

            for i in range(0, len(str(output)), 800):
                yield str(output)[i : i + 800]
        except Exception:
            async for out in self._chat_stream_json_planner(query, rag_context):
                yield out

    async def _chat_stream_autogen_like(self, query: str, rag_context: str, memory_context: str) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        if not self.langchain_tools:
            async for out in self._chat_stream_json_planner(query, rag_context):
                yield out
            return
        plan_prompt = "你是 Planner，输出一个可执行的 5 步以内计划（每步一句话）。"
        if rag_context:
            plan_prompt += f"\n\n检索上下文：\n{rag_context}\n"
        if memory_context:
            plan_prompt += f"\n\n长期记忆：\n{memory_context}\n"
        plan_prompt += f"\n\n用户问题：{query}"
        plan = await self.base_agent.chat(plan_prompt)
        async for out in self._chat_stream_langchain(
            f"按以下计划执行并给出结果：\n{plan}\n\n原问题：{query}",
            rag_context,
            memory_context,
            provider_label="autogen",
        ):
            yield out
        review = await self.base_agent.chat(
            f"你是 Reviewer。请检查答案是否遗漏关键点或有风险，并给出最终修订版。\n\n计划：{plan}\n\n原问题：{query}"
        )
        yield "\n\n" + review

    async def _chat_stream_crewai_like(self, query: str, rag_context: str, memory_context: str) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        if not self.langchain_tools:
            async for out in self._chat_stream_json_planner(query, rag_context):
                yield out
            return
        research = await self.base_agent.chat(f"你是 Researcher。请给出关键信息点与风险点（简短）。\n\n问题：{query}")
        async for out in self._chat_stream_langchain(
            f"你是 Builder。基于 Researcher 信息完成任务并产出结果。\n\nResearcher：{research}\n\n问题：{query}",
            rag_context,
            memory_context,
            provider_label="crewai",
        ):
            yield out
        qa = await self.base_agent.chat(f"你是 QA。请列出结果的自检清单与下一步建议。\n\n问题：{query}")
        yield "\n\n" + qa

    def reset(self):
        self.base_agent.reset()
