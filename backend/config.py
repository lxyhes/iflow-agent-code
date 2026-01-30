"""
项目缓存配置
将所有缓存和存储目录配置到E盘，避免C盘空间不足
"""

import os
from pathlib import Path

# 基础缓存目录 - 修改这里来改变缓存位置
CACHE_BASE_DIR = Path("E:/cache/agent_project")

# 各模块缓存目录配置
CACHE_DIRS = {
    "storage": CACHE_BASE_DIR / "storage",
    "chroma_db": CACHE_BASE_DIR / "chroma_db",
    "rag_temp": CACHE_BASE_DIR / "rag_temp",
    "ocr_cache": CACHE_BASE_DIR / "ocr_cache",
    "llm_memory": CACHE_BASE_DIR / "llm_memory",
    "workflows": CACHE_BASE_DIR / "workflows",
    "solutions": CACHE_BASE_DIR / "solutions",
    "business_memory": CACHE_BASE_DIR / "business_memory",
    "prompts": CACHE_BASE_DIR / "prompts",
    "command_shortcuts": CACHE_BASE_DIR / "command_shortcuts",
    "snippets": CACHE_BASE_DIR / "snippets",
    "backups": CACHE_BASE_DIR / "backups",
    "database": CACHE_BASE_DIR / "database",
    "business_flow": CACHE_BASE_DIR / "business_flow",
}


def get_cache_dir(name: str) -> Path:
    """获取指定名称的缓存目录"""
    if name in CACHE_DIRS:
        path = CACHE_DIRS[name]
        path.mkdir(parents=True, exist_ok=True)
        return path
    raise ValueError(f"Unknown cache directory: {name}")


def setup_cache_dirs():
    """创建所有缓存目录"""
    for name, path in CACHE_DIRS.items():
        path.mkdir(parents=True, exist_ok=True)
        print(f"Cache dir '{name}': {path}")


# 自动创建目录
setup_cache_dirs()
