from __future__ import annotations

import os
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass(frozen=True)
class MemoryItem:
    ts: str
    user: str
    assistant: str


class MemoryProvider:
    def recent(self, limit: int = 8) -> List[MemoryItem]:
        raise NotImplementedError

    def add(self, user: str, assistant: str) -> None:
        raise NotImplementedError

    def format_context(self, limit: int = 8, max_chars: int = 4000) -> str:
        items = self.recent(limit=limit)
        lines: List[str] = []
        for it in items:
            lines.append(f"[{it.ts}] User: {it.user}")
            lines.append(f"[{it.ts}] Assistant: {it.assistant}")
            lines.append("")
        text = "\n".join(lines).strip()
        if len(text) > max_chars:
            text = text[-max_chars:]
        return text


class JsonlMemoryProvider(MemoryProvider):
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)

    def recent(self, limit: int = 8) -> List[MemoryItem]:
        if not os.path.exists(self.storage_path):
            return []
        items: List[MemoryItem] = []
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        items.append(
                            MemoryItem(
                                ts=str(obj.get("ts") or ""),
                                user=str(obj.get("user") or ""),
                                assistant=str(obj.get("assistant") or ""),
                            )
                        )
                    except Exception:
                        continue
        except Exception:
            return []
        return items[-limit:]

    def add(self, user: str, assistant: str) -> None:
        rec = {"ts": datetime.now().isoformat(timespec="seconds"), "user": user, "assistant": assistant}
        with open(self.storage_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def get_memory_provider(project_path: str, provider: str = "business") -> MemoryProvider:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    storage_dir = os.path.join(root, "storage", "llm_memory")
    project_name = os.path.basename(os.path.abspath(project_path or "."))
    provider = (provider or "business").strip().lower()

    if provider == "memgpt":
        return JsonlMemoryProvider(os.path.join(storage_dir, f"{project_name}.memgpt.jsonl"))
    return JsonlMemoryProvider(os.path.join(storage_dir, f"{project_name}.business.jsonl"))

