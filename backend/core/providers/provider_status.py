from __future__ import annotations

from importlib.util import find_spec
from typing import Dict

from .provider_config import get_provider_config


def _has(module: str) -> bool:
    return find_spec(module) is not None


def provider_availability() -> Dict[str, bool]:
    return {
        "langchain": _has("langchain") or _has("langchain_core"),
        "semantic_kernel": _has("semantic_kernel"),
        "autogen": _has("autogen"),
        "crewai": _has("crewai"),
        "memgpt": _has("memgpt"),
        "guidance": _has("guidance"),
        "dspy": _has("dspy"),
        "swe_agent": _has("sweagent"),
        "llamaindex": _has("llama_index"),
    }


def effective_provider_plan() -> Dict:
    cfg = get_provider_config()
    avail = provider_availability()
    compatible = {
        "langchain": avail.get("langchain", False),
        "json": True,
        "semantic_kernel": avail.get("semantic_kernel", False) or avail.get("langchain", False),
        "autogen": avail.get("autogen", False) or avail.get("langchain", False),
        "crewai": avail.get("crewai", False) or avail.get("langchain", False),
        "memgpt": True,
        "guidance": True,
        "dspy": True,
        "swe_agent": avail.get("swe_agent", False) or avail.get("langchain", False),
        "llamaindex": avail.get("llamaindex", False),
    }
    candidates = [cfg.orchestration_provider] + [p for p in cfg.orchestration_fallback if p != cfg.orchestration_provider]
    chosen = None
    for c in candidates:
        if c in ("json", "legacy_json"):
            if compatible.get("json"):
                chosen = "json"
                break
        if c in ("langchain", "lc"):
            if compatible.get("langchain"):
                chosen = "langchain"
                break
        if c in ("sk", "semantic_kernel"):
            if compatible.get("semantic_kernel"):
                chosen = "semantic_kernel"
                break
        if c in ("autogen",):
            if compatible.get("autogen"):
                chosen = "autogen"
                break
        if c in ("crewai",):
            if compatible.get("crewai"):
                chosen = "crewai"
                break
        if c in ("swe_agent", "sweagent"):
            if compatible.get("swe_agent"):
                chosen = "swe_agent"
                break
    if not chosen:
        chosen = "json"

    rag_effective = "legacy"
    if cfg.rag_backend in ("llamaindex", "llama") and avail.get("llamaindex", False):
        rag_effective = "llamaindex"

    memory_effective = "business"
    if cfg.memory_provider in ("memgpt",) and compatible.get("memgpt"):
        memory_effective = "memgpt"

    output_effective = "legacy"
    if cfg.output_provider in ("dspy",) and compatible.get("dspy"):
        output_effective = "dspy"
    if cfg.output_provider in ("guidance",) and compatible.get("guidance"):
        output_effective = "guidance"

    return {
        "config": {
            "orchestration_provider": cfg.orchestration_provider,
            "orchestration_fallback": cfg.orchestration_fallback,
            "memory_provider": cfg.memory_provider,
            "output_provider": cfg.output_provider,
            "rag_backend": cfg.rag_backend,
        },
        "availability": avail,
        "compatible": compatible,
        "effective": {
            "orchestration_provider": chosen,
            "rag_backend": rag_effective,
            "memory_provider": memory_effective,
            "output_provider": output_effective,
        },
        "native_used": {
            "orchestration_provider": bool(avail.get(chosen, False)) if chosen in avail else (chosen == "json"),
            "rag_backend": rag_effective == "llamaindex" and bool(avail.get("llamaindex", False)),
            "memory_provider": False,
            "output_provider": output_effective == "legacy",
        },
    }
