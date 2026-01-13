"""
提示词管理系统服务
用于管理和快速插入常用提示词
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import hashlib


class PromptManagerService:
    """提示词管理服务"""
    
    def __init__(self, storage_dir: str = None):
        """
        初始化提示词管理服务
        
        Args:
            storage_dir: 存储目录路径
        """
        if storage_dir is None:
            # 默认存储在项目根目录的 storage/prompts 下
            project_root = Path(__file__).parent.parent.parent
            storage_dir = project_root / "storage" / "prompts"
        
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # 元数据文件
        self.metadata_file = self.storage_dir / "metadata.json"
        self._load_metadata()
        
        # 初始化默认分类
        self._initialize_default_categories()
    
    def _load_metadata(self):
        """加载元数据"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                "prompts": {},
                "categories": [
                    "前端常用",
                    "后端常用",
                    "数据库",
                    "API开发",
                    "UI设计",
                    "测试",
                    "部署",
                    "自定义"
                ],
                "tags": {}
            }
    
    def _save_metadata(self):
        """保存元数据"""
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
    
    def _initialize_default_categories(self):
        """初始化默认分类和提示词"""
        # 如果是第一次运行，添加一些默认提示词
        if not self.metadata["prompts"]:
            default_prompts = [
                {
                    "title": "React 组件开发",
                    "content": "请帮我创建一个 React 组件，要求：\n1. 使用函数组件和 Hooks\n2. 使用 TypeScript\n3. 包含 Props 类型定义\n4. 添加必要的注释\n5. 遵循最佳实践",
                    "category": "前端常用",
                    "description": "创建标准 React 组件的提示词模板",
                    "tags": ["React", "TypeScript", "组件"]
                },
                {
                    "title": "Python API 接口开发",
                    "content": "请帮我创建一个 Python API 接口，要求：\n1. 使用 FastAPI 框架\n2. 包含输入验证\n3. 添加错误处理\n4. 包含 API 文档\n5. 遵循 RESTful 规范",
                    "category": "后端常用",
                    "description": "创建 FastAPI 接口的提示词模板",
                    "tags": ["Python", "FastAPI", "API"]
                },
                {
                    "title": "数据库查询优化",
                    "content": "请帮我优化这个 SQL 查询，要求：\n1. 分析查询性能瓶颈\n2. 提供优化建议\n3. 添加索引建议\n4. 解释优化原理",
                    "category": "数据库",
                    "description": "SQL 查询优化的提示词模板",
                    "tags": ["SQL", "数据库", "优化"]
                },
                {
                    "title": "代码审查",
                    "content": "请帮我审查这段代码，检查：\n1. 代码质量问题\n2. 潜在的安全漏洞\n3. 性能优化建议\n4. 最佳实践遵循情况\n5. 提供具体的改进建议",
                    "category": "测试",
                    "description": "代码审查的提示词模板",
                    "tags": ["代码审查", "质量", "安全"]
                },
                {
                    "title": "UI 设计建议",
                    "content": "请为这个功能提供 UI 设计建议，包括：\n1. 布局设计\n2. 色彩搭配\n3. 交互设计\n4. 响应式设计\n5. 无障碍设计",
                    "category": "UI设计",
                    "description": "UI 设计的提示词模板",
                    "tags": ["UI", "设计", "用户体验"]
                }
            ]
            
            for prompt_data in default_prompts:
                self.create_prompt(**prompt_data)
    
    def _generate_id(self, title: str) -> str:
        """生成提示词 ID"""
        content = f"{title}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def create_prompt(
        self,
        title: str,
        content: str,
        category: str = "自定义",
        description: str = "",
        tags: List[str] = None,
        parameters: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        创建提示词
        
        Args:
            title: 提示词标题
            content: 提示词内容
            category: 分类
            description: 描述
            tags: 标签列表
            parameters: 参数列表（用于参数化提示词）
            
        Returns:
            创建的提示词信息
        """
        prompt_id = self._generate_id(title)
        
        prompt = {
            "id": prompt_id,
            "title": title,
            "content": content,
            "category": category,
            "description": description,
            "tags": tags or [],
            "parameters": parameters or [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "usage_count": 0,
            "is_favorite": False
        }
        
        # 保存提示词文件
        prompt_file = self.storage_dir / f"{prompt_id}.json"
        with open(prompt_file, 'w', encoding='utf-8') as f:
            json.dump(prompt, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.metadata["prompts"][prompt_id] = {
            "id": prompt_id,
            "title": title,
            "category": category,
            "tags": tags or [],
            "created_at": prompt["created_at"],
            "is_favorite": False
        }
        
        # 添加分类（如果不存在）
        if category not in self.metadata["categories"]:
            self.metadata["categories"].append(category)
        
        # 添加标签
        for tag in (tags or []):
            if tag not in self.metadata["tags"]:
                self.metadata["tags"][tag] = []
            if prompt_id not in self.metadata["tags"][tag]:
                self.metadata["tags"][tag].append(prompt_id)
        
        self._save_metadata()
        return prompt
    
    def get_prompt(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """
        获取提示词
        
        Args:
            prompt_id: 提示词 ID
            
        Returns:
            提示词信息，如果不存在则返回 None
        """
        prompt_file = self.storage_dir / f"{prompt_id}.json"
        if prompt_file.exists():
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def update_prompt(
        self,
        prompt_id: str,
        title: str = None,
        content: str = None,
        category: str = None,
        description: str = None,
        tags: List[str] = None,
        parameters: List[Dict[str, str]] = None,
        is_favorite: bool = None
    ) -> Optional[Dict[str, Any]]:
        """
        更新提示词
        
        Args:
            prompt_id: 提示词 ID
            title: 新标题
            content: 新内容
            category: 新分类
            description: 新描述
            tags: 新标签
            parameters: 新参数
            is_favorite: 是否收藏
            
        Returns:
            更新后的提示词信息，如果不存在则返回 None
        """
        prompt = self.get_prompt(prompt_id)
        if not prompt:
            return None
        
        # 更新字段
        if title is not None:
            prompt["title"] = title
        if content is not None:
            prompt["content"] = content
        if category is not None:
            prompt["category"] = category
        if description is not None:
            prompt["description"] = description
        if tags is not None:
            prompt["tags"] = tags
        if parameters is not None:
            prompt["parameters"] = parameters
        if is_favorite is not None:
            prompt["is_favorite"] = is_favorite
        
        prompt["updated_at"] = datetime.now().isoformat()
        
        # 保存提示词文件
        prompt_file = self.storage_dir / f"{prompt_id}.json"
        with open(prompt_file, 'w', encoding='utf-8') as f:
            json.dump(prompt, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.metadata["prompts"][prompt_id] = {
            "id": prompt_id,
            "title": prompt["title"],
            "category": prompt["category"],
            "tags": prompt["tags"],
            "created_at": prompt["created_at"],
            "is_favorite": prompt["is_favorite"]
        }
        
        self._save_metadata()
        return prompt
    
    def delete_prompt(self, prompt_id: str) -> bool:
        """
        删除提示词
        
        Args:
            prompt_id: 提示词 ID
            
        Returns:
            是否删除成功
        """
        prompt = self.get_prompt(prompt_id)
        if not prompt:
            return False
        
        # 删除提示词文件
        prompt_file = self.storage_dir / f"{prompt_id}.json"
        prompt_file.unlink()
        
        # 从元数据中移除
        if prompt_id in self.metadata["prompts"]:
            del self.metadata["prompts"][prompt_id]
        
        # 从标签中移除
        for tag in prompt.get("tags", []):
            if tag in self.metadata["tags"] and prompt_id in self.metadata["tags"][tag]:
                self.metadata["tags"][tag].remove(prompt_id)
                if not self.metadata["tags"][tag]:
                    del self.metadata["tags"][tag]
        
        self._save_metadata()
        return True
    
    def list_prompts(
        self,
        category: str = None,
        tag: str = None,
        search: str = None,
        favorite_only: bool = False
    ) -> List[Dict[str, Any]]:
        """
        列出提示词
        
        Args:
            category: 按分类筛选
            tag: 按标签筛选
            search: 搜索关键词
            favorite_only: 只显示收藏的
            
        Returns:
            提示词列表
        """
        prompts = []
        
        for prompt_id, metadata in self.metadata["prompts"].items():
            # 应用筛选条件
            if category and metadata.get("category") != category:
                continue
            if tag and tag not in metadata.get("tags", []):
                continue
            if favorite_only and not metadata.get("is_favorite", False):
                continue
            if search:
                search_lower = search.lower()
                if (search_lower not in metadata.get("title", "").lower() and
                    search_lower not in metadata.get("category", "").lower()):
                    continue
            
            prompts.append(metadata)
        
        # 按创建时间倒序排序
        prompts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return prompts
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        return self.metadata["categories"]
    
    def get_tags(self) -> List[str]:
        """获取所有标签"""
        return list(self.metadata["tags"].keys())
    
    def increment_usage(self, prompt_id: str) -> bool:
        """
        增加使用次数
        
        Args:
            prompt_id: 提示词 ID
            
        Returns:
            是否成功
        """
        prompt = self.get_prompt(prompt_id)
        if not prompt:
            return False
        
        prompt["usage_count"] = prompt.get("usage_count", 0) + 1
        prompt["last_used_at"] = datetime.now().isoformat()
        
        # 保存提示词文件
        prompt_file = self.storage_dir / f"{prompt_id}.json"
        with open(prompt_file, 'w', encoding='utf-8') as f:
            json.dump(prompt, f, ensure_ascii=False, indent=2)
        
        return True
    
    def get_popular_prompts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取热门提示词（按使用次数）
        
        Args:
            limit: 返回数量限制
            
        Returns:
            热门提示词列表
        """
        prompts = []
        
        for prompt_id in self.metadata["prompts"]:
            prompt = self.get_prompt(prompt_id)
            if prompt:
                prompts.append(prompt)
        
        # 按使用次数倒序排序
        prompts.sort(key=lambda x: x.get("usage_count", 0), reverse=True)
        
        return prompts[:limit]
    
    def get_favorite_prompts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取收藏的提示词
        
        Args:
            limit: 返回数量限制
            
        Returns:
            收藏的提示词列表
        """
        prompts = []
        
        for prompt_id in self.metadata["prompts"]:
            prompt = self.get_prompt(prompt_id)
            if prompt and prompt.get("is_favorite", False):
                prompts.append(prompt)
        
        # 按最后使用时间倒序排序
        prompts.sort(key=lambda x: x.get("last_used_at", ""), reverse=True)
        
        return prompts[:limit]
    
    def get_recent_prompts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取最近使用的提示词
        
        Args:
            limit: 返回数量限制
            
        Returns:
            最近使用的提示词列表
        """
        prompts = []
        
        for prompt_id in self.metadata["prompts"]:
            prompt = self.get_prompt(prompt_id)
            if prompt and prompt.get("last_used_at"):
                prompts.append(prompt)
        
        # 按最后使用时间倒序排序
        prompts.sort(key=lambda x: x.get("last_used_at", ""), reverse=True)
        
        return prompts[:limit]


# 全局实例
prompt_manager_service = PromptManagerService()
