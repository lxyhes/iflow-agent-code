from __future__ import annotations

import json
from typing import Any, Dict, Optional, Tuple


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


async def generate_json_object(
    agent: Any,
    prompt: str,
    max_attempts: int = 3,
    provider: str = "legacy",
) -> Tuple[Optional[Dict[str, Any]], str]:
    provider = (provider or "legacy").strip().lower()
    if provider == "dspy":
        try:
            from backend.core.providers.native.native_outputs import generate_json_with_dspy
            obj = await generate_json_with_dspy(agent, prompt)
            if isinstance(obj, dict):
                return obj, json.dumps(obj, ensure_ascii=False)
        except Exception:
            pass
    if provider == "guidance":
        try:
            from backend.core.providers.native.native_outputs import generate_json_with_guidance
            obj = await generate_json_with_guidance(agent, prompt)
            if isinstance(obj, dict):
                return obj, json.dumps(obj, ensure_ascii=False)
        except Exception:
            pass
    if provider in ("guidance", "dspy") and max_attempts < 5:
        max_attempts = 5
    last_raw = ""
    for _ in range(max_attempts):
        strict_prompt = prompt
        if provider in ("guidance", "dspy"):
            strict_prompt = (
                f"{prompt}\n\n约束：只能输出一个 JSON 对象；不要包含任何解释、markdown、代码块、前后缀文本；所有字符串必须使用双引号。"
            )
        last_raw = await agent.chat(strict_prompt)
        obj = _extract_json(last_raw)
        if obj is not None:
            return obj, last_raw
        prompt = (
            f"{prompt}\n\n上一次输出不是有效 JSON 对象。请只输出一个 JSON 对象（不要包含解释/代码块/前后缀文本）。"
        )
    return None, last_raw
