from __future__ import annotations

from typing import Any, Dict, List, Optional

from .catalog import framework_status


def recommend_stack(
    goals: List[str],
    constraints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    constraints = constraints or {}
    status = framework_status()

    def pick(keys: List[str]) -> List[str]:
        chosen: List[str] = []
        for k in keys:
            if k in status and k not in chosen:
                chosen.append(k)
        return chosen

    goal_text = " ".join([str(x) for x in goals if x])
    is_enterprise = any(x in goal_text for x in ["企业", "合规", "权限", "审计", "连接器"])
    is_rag = any(x in goal_text for x in ["RAG", "检索", "知识库", "向量", "索引"])
    is_multi_agent = any(x in goal_text for x in ["多智能体", "协作", "群聊", "角色"])
    is_controlled_output = any(x in goal_text for x in ["精确", "结构化", "约束", "schema", "json"])
    is_coding = any(x in goal_text for x in ["代码", "修复", "PR", "测试", "重构", "SWE"])
    wants_long_memory = any(x in goal_text for x in ["长期记忆", "记忆", "画像", "偏好", "沉淀"])

    stack: List[str] = []
    rationale: List[str] = []

    stack += pick(["langchain"])
    rationale.append("LangChain 作为编排层（链路/路由/工具）适合快速落地。")

    if is_rag:
        stack += pick(["llamaindex"])
        rationale.append("RAG 优先用 LlamaIndex 做索引/检索编排；也可继续走现有 rag_service 作为默认实现。")

    if is_enterprise:
        stack += pick(["semantic_kernel"])
        rationale.append("企业连接器与插件体系可用 Semantic Kernel；与现有工作流/工具注册机制互补。")

    if is_multi_agent:
        preferred = "autogen" if constraints.get("multi_agent") != "crewai" else "crewai"
        stack += pick([preferred])
        rationale.append(f"多智能体编排建议用 {status.get(preferred, {}).get('display_name', preferred)}，执行仍走本系统工具层。")

    if wants_long_memory:
        stack += pick(["memgpt"])
        rationale.append("长期记忆建议先对齐 Memory 接口；本系统已具备业务记忆/摘要/版本管理，可逐步引入 MemGPT。")

    if is_controlled_output:
        stack += pick(["dspy", "guidance"])
        rationale.append("结构化输出建议先用 DSPy/Guidance；短期也可用 Pydantic/JSON Schema + 重试保障。")

    if is_coding:
        stack += pick(["swe_agent"])
        rationale.append("代码任务可对齐 SWE-agent 能力；本系统已有代码分析/修复/工作流执行能力，可先做桥接。")

    unique_stack = []
    for k in stack:
        if k not in unique_stack:
            unique_stack.append(k)

    availability = {k: status[k]["available"] for k in unique_stack if k in status}
    missing = [k for k, ok in availability.items() if not ok]

    return {
        "goals": goals,
        "stack": unique_stack,
        "availability": availability,
        "missing": missing,
        "rationale": rationale,
        "system_mapping": {
            "orchestration": [
                "现有：backend/core/workflow_executor.py（工作流执行）",
                "现有：backend/core/registry.py（工具/服务注册）",
                "建议：LangChain/Semantic Kernel 只做“编排”，具体读写文件/执行命令走现有 file_service/shell_service。",
            ],
            "rag": [
                "现有：backend/core/rag_service.py（索引/检索/摘要/分块）",
                "建议：可新增 LlamaIndex 实现作为可选后端，与现有 TF-IDF/embedding 路径并行。",
            ],
            "memory": [
                "现有：backend/core/business_memory_service.py（长期偏好/使用统计/推荐）",
                "现有：backend/core/document_version_manager.py（版本/历史）",
                "建议：对齐 MemGPT 的 Memory API，再决定是否替换或并行。",
            ],
            "coding": [
                "现有：backend/core/code_analyzer.py / auto_fixer.py / auto_heal_service.py",
                "现有：backend/core/workflow_service.py（工作流生成与执行）",
                "建议：SWE-agent 用于“策略/步骤”，落地执行仍走现有工具层，避免权限与可控性问题。",
            ],
        },
    }

