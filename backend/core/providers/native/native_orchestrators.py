from __future__ import annotations

import asyncio
import os
from typing import Any, AsyncGenerator, Dict, List, Optional, Union


def _has_env(*names: str) -> bool:
    for n in names:
        if not os.getenv(n):
            return False
    return True


async def run_semantic_kernel(
    query: str,
    tool_specs: List[Any],
    rag_context: str,
    memory_context: str,
    max_rounds: int,
) -> Optional[str]:
    try:
        import semantic_kernel as sk  # noqa: F401
        from semantic_kernel import Kernel
        from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion
        from semantic_kernel.functions import KernelArguments
    except Exception:
        return None

    if not _has_env("OPENAI_API_KEY", "OPENAI_CHAT_MODEL_ID"):
        return None

    kernel = Kernel()
    kernel.add_service(OpenAIChatCompletion())

    tools_hint = "\n".join([f"- {t.name}: {t.description}" for t in tool_specs])
    prompt = (
        "你是一个编排代理。优先使用工具完成任务。\n"
        f"可用工具：\n{tools_hint}\n\n"
        f"长期记忆：\n{memory_context}\n\n"
        f"检索上下文：\n{rag_context}\n\n"
        f"用户问题：{query}\n"
        "请输出最终答案。"
    )
    fn = kernel.add_function(
        plugin_name="orchestrator",
        function_name="answer",
        prompt=prompt,
    )
    result = await fn.invoke(kernel, arguments=KernelArguments())
    try:
        return str(result)
    except Exception:
        return None


async def run_autogen(
    query: str,
    tool_specs: List[Any],
    rag_context: str,
    memory_context: str,
    max_rounds: int,
) -> Optional[str]:
    try:
        import autogen  # noqa: F401
        from autogen import AssistantAgent, UserProxyAgent
    except Exception:
        return None

    if not _has_env("OPENAI_API_KEY"):
        return None

    model = os.getenv("OPENAI_MODEL", os.getenv("OPENAI_CHAT_MODEL_ID", "gpt-4o-mini"))
    llm_config = {"config_list": [{"model": model, "api_key": os.getenv("OPENAI_API_KEY")}]}

    assistant = AssistantAgent(
        name="assistant",
        llm_config=llm_config,
        system_message="你是一个工具编排代理。尽量用工具获取事实再回答。",
    )
    user = UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=max_rounds,
        code_execution_config=False,
    )

    for spec in tool_specs:
        async def _run(_spec=spec, **kwargs):
            return await _spec.run(kwargs)

        try:
            user.register_function(function_map={spec.name: _run})
        except Exception:
            continue

    full = query
    if memory_context:
        full = f"长期记忆：\n{memory_context}\n\n" + full
    if rag_context:
        full = f"检索上下文：\n{rag_context}\n\n" + full

    try:
        user.initiate_chat(assistant, message=full)
        msgs = assistant.chat_messages.get(user, [])
        texts = [m.get("content") for m in msgs if isinstance(m, dict) and m.get("content")]
        return "\n".join(texts).strip() if texts else None
    except Exception:
        return None


async def run_crewai(
    query: str,
    tool_specs: List[Any],
    rag_context: str,
    memory_context: str,
    max_rounds: int,
) -> Optional[str]:
    try:
        from crewai import Agent, Crew, Task
    except Exception:
        return None

    if not _has_env("OPENAI_API_KEY"):
        return None

    try:
        from crewai_tools import BaseTool
    except Exception:
        BaseTool = None

    tools = []
    if BaseTool is not None:
        for spec in tool_specs:
            class _T(BaseTool):
                name = spec.name
                description = spec.description

                async def _arun(self, **kwargs):
                    return await spec.run(kwargs)

            tools.append(_T())

    agent = Agent(
        role="Orchestrator",
        goal="用工具完成任务并给出可靠答案",
        backstory="你是一个严谨的编排代理。",
        tools=tools,
        verbose=False,
    )
    ctx = ""
    if memory_context:
        ctx += f"长期记忆：\n{memory_context}\n\n"
    if rag_context:
        ctx += f"检索上下文：\n{rag_context}\n\n"
    task = Task(description=ctx + query, agent=agent)
    crew = Crew(agents=[agent], tasks=[task], verbose=False)
    try:
        res = crew.kickoff()
        return str(res)
    except Exception:
        return None


async def run_swe_agent(
    query: str,
    tool_specs: List[Any],
    rag_context: str,
    memory_context: str,
    max_rounds: int,
) -> Optional[str]:
    try:
        import sweagent  # noqa: F401
    except Exception:
        return None
    return None


async def run_native_orchestrator(
    provider: str,
    query: str,
    tool_specs: List[Any],
    rag_context: str,
    memory_context: str,
    max_rounds: int,
) -> Optional[str]:
    provider = (provider or "").strip().lower()
    if provider in ("semantic_kernel", "sk"):
        return await run_semantic_kernel(query, tool_specs, rag_context, memory_context, max_rounds)
    if provider == "autogen":
        return await run_autogen(query, tool_specs, rag_context, memory_context, max_rounds)
    if provider == "crewai":
        return await run_crewai(query, tool_specs, rag_context, memory_context, max_rounds)
    if provider in ("swe_agent", "sweagent"):
        return await run_swe_agent(query, tool_specs, rag_context, memory_context, max_rounds)
    return None


async def stream_text(text: str, chunk_size: int = 800) -> AsyncGenerator[str, None]:
    for i in range(0, len(text or ""), chunk_size):
        yield (text or "")[i : i + chunk_size]

