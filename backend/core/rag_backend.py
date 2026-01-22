from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class RAGBackend(ABC):
    @abstractmethod
    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def format_context(self, results: List[Dict[str, Any]]) -> str:
        raise NotImplementedError


class LegacyRAGBackend(RAGBackend):
    def __init__(self, project_path: str):
        from backend.core.rag_service import get_rag_service

        self.project_path = project_path
        self._service = get_rag_service(project_path, use_chromadb=False)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        return self._service.retrieve(query, n_results=top_k)

    def format_context(self, results: List[Dict[str, Any]]) -> str:
        lines: List[str] = []
        for i, r in enumerate(results or []):
            meta = r.get("metadata") if isinstance(r, dict) else {}
            file_path = ""
            if isinstance(meta, dict):
                file_path = str(meta.get("file_path") or meta.get("path") or "")
            content = str(r.get("content") or r.get("text") or "")
            score = r.get("score") if isinstance(r, dict) else None
            head = f"[{i + 1}] {file_path}".strip()
            if score is not None:
                head = f"{head} (score={score})"
            lines.append(head)
            if content:
                lines.append(content[:2000])
            lines.append("")
        return "\n".join(lines).strip()


class LlamaIndexRAGBackend(RAGBackend):
    def __init__(self, project_path: str):
        self.project_path = project_path
        try:
            import llama_index  # noqa: F401
        except Exception as e:
            raise ImportError("llama_index not installed") from e

        self._index = None

    def _ensure_index(self):
        if self._index is not None:
            return
        from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

        reader = SimpleDirectoryReader(self.project_path, recursive=True, required_exts=None)
        docs = reader.load_data()
        self._index = VectorStoreIndex.from_documents(docs)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        self._ensure_index()
        qe = self._index.as_query_engine(similarity_top_k=top_k)
        resp = qe.query(query)
        return [{"content": str(resp), "metadata": {"source": "llamaindex"}}]

    def format_context(self, results: List[Dict[str, Any]]) -> str:
        return "\n\n".join([str(r.get("content") or "") for r in (results or [])]).strip()


def get_rag_backend(project_path: str) -> Optional[RAGBackend]:
    enabled = os.getenv("RAG_ENABLED", "true").lower() == "true"
    if not enabled:
        return None

    backend = os.getenv("RAG_BACKEND", "legacy").lower().strip()
    if backend in ("llamaindex", "llama"):
        try:
            return LlamaIndexRAGBackend(project_path)
        except Exception:
            return LegacyRAGBackend(project_path)
    return LegacyRAGBackend(project_path)

