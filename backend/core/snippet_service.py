"""
代码片段管理器服务
用于保存、管理和快速插入常用代码片段
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import hashlib


class SnippetService:
    """代码片段管理服务"""
    
    def __init__(self, storage_dir: str = None):
        """
        初始化代码片段服务
        
        Args:
            storage_dir: 存储目录路径
        """
        if storage_dir is None:
            # 默认存储在项目根目录的 storage/snippets 下
            project_root = Path(__file__).parent.parent.parent
            storage_dir = project_root / "storage" / "snippets"
        
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # 元数据文件
        self.metadata_file = self.storage_dir / "metadata.json"
        self._load_metadata()
    
    def _load_metadata(self):
        """加载元数据"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                "snippets": {},
                "categories": ["React", "Python", "JavaScript", "CSS", "SQL", "API", "通用"],
                "tags": {}
            }
    
    def _save_metadata(self):
        """保存元数据"""
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
    
    def _generate_id(self, title: str) -> str:
        """生成片段 ID"""
        content = f"{title}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def create_snippet(
        self,
        title: str,
        code: str,
        language: str,
        category: str = "通用",
        description: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """
        创建代码片段
        
        Args:
            title: 片段标题
            code: 代码内容
            language: 编程语言
            category: 分类
            description: 描述
            tags: 标签列表
            
        Returns:
            创建的片段信息
        """
        snippet_id = self._generate_id(title)
        
        snippet = {
            "id": snippet_id,
            "title": title,
            "code": code,
            "language": language,
            "category": category,
            "description": description,
            "tags": tags or [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "usage_count": 0
        }
        
        # 保存片段文件
        snippet_file = self.storage_dir / f"{snippet_id}.json"
        with open(snippet_file, 'w', encoding='utf-8') as f:
            json.dump(snippet, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.metadata["snippets"][snippet_id] = {
            "id": snippet_id,
            "title": title,
            "language": language,
            "category": category,
            "tags": tags or [],
            "created_at": snippet["created_at"]
        }
        
        # 添加分类（如果不存在）
        if category not in self.metadata["categories"]:
            self.metadata["categories"].append(category)
        
        # 添加标签
        for tag in (tags or []):
            if tag not in self.metadata["tags"]:
                self.metadata["tags"][tag] = []
            if snippet_id not in self.metadata["tags"][tag]:
                self.metadata["tags"][tag].append(snippet_id)
        
        self._save_metadata()
        return snippet
    
    def get_snippet(self, snippet_id: str) -> Optional[Dict[str, Any]]:
        """
        获取代码片段
        
        Args:
            snippet_id: 片段 ID
            
        Returns:
            片段信息，如果不存在则返回 None
        """
        snippet_file = self.storage_dir / f"{snippet_id}.json"
        if snippet_file.exists():
            with open(snippet_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def update_snippet(
        self,
        snippet_id: str,
        title: str = None,
        code: str = None,
        language: str = None,
        category: str = None,
        description: str = None,
        tags: List[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        更新代码片段
        
        Args:
            snippet_id: 片段 ID
            title: 新标题
            code: 新代码
            language: 新语言
            category: 新分类
            description: 新描述
            tags: 新标签
            
        Returns:
            更新后的片段信息，如果不存在则返回 None
        """
        snippet = self.get_snippet(snippet_id)
        if not snippet:
            return None
        
        # 更新字段
        if title is not None:
            snippet["title"] = title
        if code is not None:
            snippet["code"] = code
        if language is not None:
            snippet["language"] = language
        if category is not None:
            snippet["category"] = category
        if description is not None:
            snippet["description"] = description
        if tags is not None:
            snippet["tags"] = tags
        
        snippet["updated_at"] = datetime.now().isoformat()
        
        # 保存片段文件
        snippet_file = self.storage_dir / f"{snippet_id}.json"
        with open(snippet_file, 'w', encoding='utf-8') as f:
            json.dump(snippet, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.metadata["snippets"][snippet_id] = {
            "id": snippet_id,
            "title": snippet["title"],
            "language": snippet["language"],
            "category": snippet["category"],
            "tags": snippet["tags"],
            "created_at": snippet["created_at"]
        }
        
        self._save_metadata()
        return snippet
    
    def delete_snippet(self, snippet_id: str) -> bool:
        """
        删除代码片段
        
        Args:
            snippet_id: 片段 ID
            
        Returns:
            是否删除成功
        """
        snippet = self.get_snippet(snippet_id)
        if not snippet:
            return False
        
        # 删除片段文件
        snippet_file = self.storage_dir / f"{snippet_id}.json"
        snippet_file.unlink()
        
        # 从元数据中移除
        if snippet_id in self.metadata["snippets"]:
            del self.metadata["snippets"][snippet_id]
        
        # 从标签中移除
        for tag in snippet.get("tags", []):
            if tag in self.metadata["tags"] and snippet_id in self.metadata["tags"][tag]:
                self.metadata["tags"][tag].remove(snippet_id)
                if not self.metadata["tags"][tag]:
                    del self.metadata["tags"][tag]
        
        self._save_metadata()
        return True
    
    def list_snippets(
        self,
        category: str = None,
        language: str = None,
        tag: str = None,
        search: str = None
    ) -> List[Dict[str, Any]]:
        """
        列出代码片段
        
        Args:
            category: 按分类筛选
            language: 按语言筛选
            tag: 按标签筛选
            search: 搜索关键词
            
        Returns:
            片段列表
        """
        snippets = []
        
        for snippet_id, metadata in self.metadata["snippets"].items():
            # 应用筛选条件
            if category and metadata.get("category") != category:
                continue
            if language and metadata.get("language") != language:
                continue
            if tag and tag not in metadata.get("tags", []):
                continue
            if search:
                search_lower = search.lower()
                if (search_lower not in metadata.get("title", "").lower() and
                    search_lower not in metadata.get("language", "").lower() and
                    search_lower not in metadata.get("category", "").lower()):
                    continue
            
            snippets.append(metadata)
        
        # 按创建时间倒序排序
        snippets.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return snippets
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        return self.metadata["categories"]
    
    def get_tags(self) -> List[str]:
        """获取所有标签"""
        return list(self.metadata["tags"].keys())
    
    def increment_usage(self, snippet_id: str) -> bool:
        """
        增加使用次数
        
        Args:
            snippet_id: 片段 ID
            
        Returns:
            是否成功
        """
        snippet = self.get_snippet(snippet_id)
        if not snippet:
            return False
        
        snippet["usage_count"] = snippet.get("usage_count", 0) + 1
        snippet["last_used_at"] = datetime.now().isoformat()
        
        # 保存片段文件
        snippet_file = self.storage_dir / f"{snippet_id}.json"
        with open(snippet_file, 'w', encoding='utf-8') as f:
            json.dump(snippet, f, ensure_ascii=False, indent=2)
        
        return True
    
    def get_popular_snippets(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取热门片段（按使用次数）
        
        Args:
            limit: 返回数量限制
            
        Returns:
            热门片段列表
        """
        snippets = []
        
        for snippet_id in self.metadata["snippets"]:
            snippet = self.get_snippet(snippet_id)
            if snippet:
                snippets.append(snippet)
        
        # 按使用次数倒序排序
        snippets.sort(key=lambda x: x.get("usage_count", 0), reverse=True)
        
        return snippets[:limit]
    
    def get_recent_snippets(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取最近使用的片段
        
        Args:
            limit: 返回数量限制
            
        Returns:
            最近使用的片段列表
        """
        snippets = []
        
        for snippet_id in self.metadata["snippets"]:
            snippet = self.get_snippet(snippet_id)
            if snippet and snippet.get("last_used_at"):
                snippets.append(snippet)
        
        # 按最后使用时间倒序排序
        snippets.sort(key=lambda x: x.get("last_used_at", ""), reverse=True)
        
        return snippets[:limit]


# 全局实例
snippet_service = SnippetService()