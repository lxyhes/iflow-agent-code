from __future__ import annotations

from dataclasses import dataclass
from importlib.util import find_spec
from typing import Dict, List, Optional


@dataclass(frozen=True)
class FrameworkEntry:
    key: str
    display_name: str
    primary_packages: List[str]
    capabilities: List[str]
    recommended_for: List[str]
    notes: Optional[str] = None

    def is_available(self) -> bool:
        return any(find_spec(p) is not None for p in self.primary_packages)


CATALOG: List[FrameworkEntry] = [
    FrameworkEntry(
        key="langchain",
        display_name="LangChain",
        primary_packages=["langchain", "langchain_core"],
        capabilities=["orchestration", "tools", "agents", "routing"],
        recommended_for=["快速上手", "功能全", "工具编排", "对话链路"],
        notes="适合把现有 Tools/Services 快速组装成 Chain/Agent；建议只用 core 组件，避免过度耦合。"
    ),
    FrameworkEntry(
        key="llamaindex",
        display_name="LlamaIndex",
        primary_packages=["llama_index"],
        capabilities=["rag", "indexing", "retrieval", "routing"],
        recommended_for=["RAG 应用", "检索增强", "多索引路由"],
        notes="适合做索引/检索与 RAG 管道；可与现有 rag_service 并行作为可选实现。"
    ),
    FrameworkEntry(
        key="semantic_kernel",
        display_name="Semantic Kernel",
        primary_packages=["semantic_kernel"],
        capabilities=["orchestration", "connectors", "enterprise"],
        recommended_for=["企业级应用", "连接器", "插件化"],
        notes="适合企业连接器与插件体系；可作为“企业工作流/技能”层。"
    ),
    FrameworkEntry(
        key="autogen",
        display_name="AutoGen",
        primary_packages=["autogen"],
        capabilities=["multi_agent", "group_chat", "tool_use"],
        recommended_for=["多智能体协作", "复杂任务拆分", "角色扮演协作"],
        notes="适合多智能体协作；建议复用本系统现有工具执行层，避免 AutoGen 自行执行带来的安全/一致性问题。"
    ),
    FrameworkEntry(
        key="crewai",
        display_name="CrewAI",
        primary_packages=["crewai"],
        capabilities=["multi_agent", "planning", "tool_use"],
        recommended_for=["多智能体协作", "流程化执行"],
        notes="更偏“团队+任务”编排；同样建议只用编排，执行仍走本系统工具层。"
    ),
    FrameworkEntry(
        key="memgpt",
        display_name="MemGPT",
        primary_packages=["memgpt"],
        capabilities=["long_term_memory", "memory_management"],
        recommended_for=["长期记忆", "用户/项目画像", "知识沉淀"],
        notes="本系统已有 business_memory_service / 版本与摘要体系，可先对齐 Memory API 再决定是否引入。"
    ),
    FrameworkEntry(
        key="guidance",
        display_name="Guidance",
        primary_packages=["guidance"],
        capabilities=["structured_output", "constrained_decoding"],
        recommended_for=["精确控制输出", "强约束格式"],
        notes="适合强约束输出；也可先用 Pydantic/JSON Schema + 重试策略实现 80% 需求。"
    ),
    FrameworkEntry(
        key="dspy",
        display_name="DSPy",
        primary_packages=["dspy"],
        capabilities=["structured_output", "prompt_optimization", "programming_llm"],
        recommended_for=["精确控制输出", "提示词/策略优化"],
        notes="适合把“提示词+评估”工程化；可与现有 prompt_optimizer/prompt_manager 结合。"
    ),
    FrameworkEntry(
        key="swe_agent",
        display_name="SWE-agent",
        primary_packages=["sweagent"],
        capabilities=["coding_agent", "repo_browsing", "patch_generation"],
        recommended_for=["代码任务", "自动修复", "PR 生成"],
        notes="本系统已有 code_analyzer/auto_heal/auto_fixer/workflow_executor；建议先做能力对齐，再按需引入。"
    ),
]


def framework_status() -> Dict[str, Dict]:
    return {
        entry.key: {
            "display_name": entry.display_name,
            "available": entry.is_available(),
            "primary_packages": entry.primary_packages,
            "capabilities": entry.capabilities,
            "recommended_for": entry.recommended_for,
            "notes": entry.notes,
        }
        for entry in CATALOG
    }

