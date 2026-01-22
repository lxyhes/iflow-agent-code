from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class ProviderConfig:
    orchestration_provider: str
    orchestration_fallback: List[str]
    memory_provider: str
    output_provider: str
    rag_backend: str


def _split_list(value: str) -> List[str]:
    parts = [p.strip() for p in (value or "").split(",")]
    return [p for p in parts if p]


def get_provider_config() -> ProviderConfig:
    orchestration_provider = os.getenv("ORCHESTRATOR_PROVIDER", "langchain").strip().lower()
    orchestration_fallback = _split_list(os.getenv("ORCHESTRATOR_FALLBACK", "langchain,json"))
    memory_provider = os.getenv("MEMORY_PROVIDER", "business").strip().lower()
    output_provider = os.getenv("OUTPUT_PROVIDER", "legacy").strip().lower()
    rag_backend = os.getenv("RAG_BACKEND", "legacy").strip().lower()
    return ProviderConfig(
        orchestration_provider=orchestration_provider,
        orchestration_fallback=orchestration_fallback,
        memory_provider=memory_provider,
        output_provider=output_provider,
        rag_backend=rag_backend,
    )

