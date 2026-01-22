from __future__ import annotations

import os
from typing import Any, Dict, Optional


async def generate_json_with_dspy(agent: Any, prompt: str) -> Optional[Dict]:
    try:
        import dspy  # noqa: F401
    except Exception:
        return None
    if not os.getenv("OPENAI_API_KEY"):
        return None
    return None


async def generate_json_with_guidance(agent: Any, prompt: str) -> Optional[Dict]:
    try:
        import guidance  # noqa: F401
    except Exception:
        return None
    if not os.getenv("OPENAI_API_KEY"):
        return None
    return None

