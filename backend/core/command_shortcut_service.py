"""
命令快捷方式服务
用于保存、管理和快速执行常用终端命令
"""

import json
import os
import subprocess
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import hashlib


class CommandShortcutService:
    """命令快捷方式服务"""
    
    def __init__(self, storage_dir: str = None):
        """
        初始化命令快捷方式服务
        
        Args:
            storage_dir: 存储目录路径
        """
        if storage_dir is None:
            # 默认存储在项目根目录的 storage/command_shortcuts 下
            project_root = Path(__file__).parent.parent.parent
            storage_dir = project_root / "storage" / "command_shortcuts"
        
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
                "shortcuts": {},
                "categories": ["开发", "测试", "部署", "Git", "数据库", "通用"],
                "tags": {}
            }
    
    def _save_metadata(self):
        """保存元数据"""
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
    
    def _generate_id(self, name: str) -> str:
        """生成快捷方式 ID"""
        content = f"{name}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def create_shortcut(
        self,
        name: str,
        command: str,
        category: str = "通用",
        description: str = "",
        tags: List[str] = None,
        working_dir: str = None,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        创建命令快捷方式
        
        Args:
            name: 快捷方式名称
            command: 命令字符串
            category: 分类
            description: 描述
            tags: 标签列表
            working_dir: 工作目录
            timeout: 超时时间（秒）
            
        Returns:
            创建的快捷方式信息
        """
        shortcut_id = self._generate_id(name)
        
        shortcut = {
            "id": shortcut_id,
            "name": name,
            "command": command,
            "category": category,
            "description": description,
            "tags": tags or [],
            "working_dir": working_dir,
            "timeout": timeout,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "usage_count": 0
        }
        
        # 保存快捷方式文件
        shortcut_file = self.storage_dir / f"{shortcut_id}.json"
        with open(shortcut_file, 'w', encoding='utf-8') as f:
            json.dump(shortcut, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.metadata["shortcuts"][shortcut_id] = {
            "id": shortcut_id,
            "name": name,
            "category": category,
            "tags": tags or [],
            "created_at": shortcut["created_at"]
        }
        
        # 添加分类（如果不存在）
        if category not in self.metadata["categories"]:
            self.metadata["categories"].append(category)
        
        # 添加标签
        for tag in (tags or []):
            if tag not in self.metadata["tags"]:
                self.metadata["tags"][tag] = []
            if shortcut_id not in self.metadata["tags"][tag]:
                self.metadata["tags"][tag].append(shortcut_id)
        
        self._save_metadata()
        return shortcut
    
    def get_shortcut(self, shortcut_id: str) -> Optional[Dict[str, Any]]:
        """
        获取命令快捷方式
        
        Args:
            shortcut_id: 快捷方式 ID
            
        Returns:
            快捷方式信息，如果不存在则返回 None
        """
        shortcut_file = self.storage_dir / f"{shortcut_id}.json"
        if shortcut_file.exists():
            with open(shortcut_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def update_shortcut(
        self,
        shortcut_id: str,
        name: str = None,
        command: str = None,
        category: str = None,
        description: str = None,
        tags: List[str] = None,
        working_dir: str = None,
        timeout: int = None
    ) -> Optional[Dict[str, Any]]:
        """
        更新命令快捷方式
        
        Args:
            shortcut_id: 快捷方式 ID
            name: 新名称
            command: 新命令
            category: 新分类
            description: 新描述
            tags: 新标签
            working_dir: 新工作目录
            timeout: 新超时时间
            
        Returns:
            更新后的快捷方式信息，如果不存在则返回 None
        """
        shortcut = self.get_shortcut(shortcut_id)
        if not shortcut:
            return None
        
        # 更新字段
        if name is not None:
            shortcut["name"] = name
        if command is not None:
            shortcut["command"] = command
        if category is not None:
            shortcut["category"] = category
        if description is not None:
            shortcut["description"] = description
        if tags is not None:
            shortcut["tags"] = tags
        if working_dir is not None:
            shortcut["working_dir"] = working_dir
        if timeout is not None:
            shortcut["timeout"] = timeout
        
        shortcut["updated_at"] = datetime.now().isoformat()
        
        # 保存快捷方式文件
        shortcut_file = self.storage_dir / f"{shortcut_id}.json"
        with open(shortcut_file, 'w', encoding='utf-8') as f:
            json.dump(shortcut, f, ensure_ascii=False, indent=2)
        
        # 更新元数据
        self.metadata["shortcuts"][shortcut_id] = {
            "id": shortcut_id,
            "name": shortcut["name"],
            "category": shortcut["category"],
            "tags": shortcut["tags"],
            "created_at": shortcut["created_at"]
        }
        
        self._save_metadata()
        return shortcut
    
    def delete_shortcut(self, shortcut_id: str) -> bool:
        """
        删除命令快捷方式
        
        Args:
            shortcut_id: 快捷方式 ID
            
        Returns:
            是否删除成功
        """
        shortcut = self.get_shortcut(shortcut_id)
        if not shortcut:
            return False
        
        # 删除快捷方式文件
        shortcut_file = self.storage_dir / f"{shortcut_id}.json"
        shortcut_file.unlink()
        
        # 从元数据中移除
        if shortcut_id in self.metadata["shortcuts"]:
            del self.metadata["shortcuts"][shortcut_id]
        
        # 从标签中移除
        for tag in shortcut.get("tags", []):
            if tag in self.metadata["tags"] and shortcut_id in self.metadata["tags"][tag]:
                self.metadata["tags"][tag].remove(shortcut_id)
                if not self.metadata["tags"][tag]:
                    del self.metadata["tags"][tag]
        
        self._save_metadata()
        return True
    
    def list_shortcuts(
        self,
        category: str = None,
        tag: str = None,
        search: str = None
    ) -> List[Dict[str, Any]]:
        """
        列出命令快捷方式
        
        Args:
            category: 按分类筛选
            tag: 按标签筛选
            search: 搜索关键词
            
        Returns:
            快捷方式列表
        """
        shortcuts = []
        
        for shortcut_id, metadata in self.metadata["shortcuts"].items():
            # 应用筛选条件
            if category and metadata.get("category") != category:
                continue
            if tag and tag not in metadata.get("tags", []):
                continue
            if search:
                search_lower = search.lower()
                if (search_lower not in metadata.get("name", "").lower() and
                    search_lower not in metadata.get("category", "").lower()):
                    continue
            
            shortcuts.append(metadata)
        
        # 按创建时间倒序排序
        shortcuts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return shortcuts
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        return self.metadata["categories"]
    
    def get_tags(self) -> List[str]:
        """获取所有标签"""
        return list(self.metadata["tags"].keys())
    
    def execute_shortcut(
        self,
        shortcut_id: str,
        params: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        执行命令快捷方式
        
        Args:
            shortcut_id: 快捷方式 ID
            params: 参数字典（用于替换命令中的占位符）
            
        Returns:
            执行结果
        """
        shortcut = self.get_shortcut(shortcut_id)
        if not shortcut:
            return {
                "success": False,
                "error": "快捷方式不存在"
            }
        
        # 替换参数占位符
        command = shortcut["command"]
        if params:
            for key, value in params.items():
                command = command.replace(f"${{{key}}}", str(value))
        
        # 准备工作目录
        working_dir = shortcut.get("working_dir")
        if working_dir:
            working_dir = Path(working_dir)
            if not working_dir.is_absolute():
                # 如果是相对路径，相对于项目根目录
                project_root = Path(__file__).parent.parent.parent
                working_dir = project_root / working_dir
        
        try:
            # 执行命令
            result = subprocess.run(
                command,
                shell=True,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=shortcut.get("timeout", 60)
            )
            
            # 增加使用次数
            self.increment_usage(shortcut_id)
            
            # 保存执行历史
            self._save_execution_history(shortcut_id, command, result)
            
            return {
                "success": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "command": command
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": f"命令执行超时（{shortcut.get('timeout', 60)}秒）",
                "command": command
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "command": command
            }
    
    async def execute_shortcut_async(
        self,
        shortcut_id: str,
        params: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        异步执行命令快捷方式
        
        Args:
            shortcut_id: 快捷方式 ID
            params: 参数字典（用于替换命令中的占位符）
            
        Returns:
            执行结果
        """
        shortcut = self.get_shortcut(shortcut_id)
        if not shortcut:
            return {
                "success": False,
                "error": "快捷方式不存在"
            }
        
        # 替换参数占位符
        command = shortcut["command"]
        if params:
            for key, value in params.items():
                command = command.replace(f"${{{key}}}", str(value))
        
        # 准备工作目录
        working_dir = shortcut.get("working_dir")
        if working_dir:
            working_dir = Path(working_dir)
            if not working_dir.is_absolute():
                # 如果是相对路径，相对于项目根目录
                project_root = Path(__file__).parent.parent.parent
                working_dir = project_root / working_dir
        
        try:
            # 异步执行命令
            process = await asyncio.create_subprocess_shell(
                command,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=shortcut.get("timeout", 60)
            )
            
            # 增加使用次数
            self.increment_usage(shortcut_id)
            
            # 保存执行历史
            self._save_execution_history(
                shortcut_id,
                command,
                type('obj', (object,), {
                    'returncode': process.returncode,
                    'stdout': stdout.decode('utf-8', errors='ignore'),
                    'stderr': stderr.decode('utf-8', errors='ignore')
                })
            )
            
            return {
                "success": process.returncode == 0,
                "returncode": process.returncode,
                "stdout": stdout.decode('utf-8', errors='ignore'),
                "stderr": stderr.decode('utf-8', errors='ignore'),
                "command": command
            }
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error": f"命令执行超时（{shortcut.get('timeout', 60)}秒）",
                "command": command
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "command": command
            }
    
    def _save_execution_history(self, shortcut_id: str, command: str, result):
        """保存执行历史"""
        history_file = self.storage_dir / "history.json"
        
        history = []
        if history_file.exists():
            with open(history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
        
        history_entry = {
            "id": hashlib.md5(f"{shortcut_id}_{datetime.now().isoformat()}".encode()).hexdigest()[:12],
            "shortcut_id": shortcut_id,
            "command": command,
            "returncode": result.returncode,
            "stdout": result.stdout[:1000] if len(result.stdout) > 1000 else result.stdout,  # 限制长度
            "stderr": result.stderr[:1000] if len(result.stderr) > 1000 else result.stderr,  # 限制长度
            "timestamp": datetime.now().isoformat()
        }
        
        history.insert(0, history_entry)
        
        # 只保留最近 100 条记录
        history = history[:100]
        
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    
    def get_execution_history(self, shortcut_id: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        获取执行历史
        
        Args:
            shortcut_id: 快捷方式 ID（可选，如果不指定则返回所有历史）
            limit: 返回数量限制
            
        Returns:
            执行历史列表
        """
        history_file = self.storage_dir / "history.json"
        
        if not history_file.exists():
            return []
        
        with open(history_file, 'r', encoding='utf-8') as f:
            history = json.load(f)
        
        # 筛选
        if shortcut_id:
            history = [h for h in history if h.get("shortcut_id") == shortcut_id]
        
        # 限制数量
        return history[:limit]
    
    def increment_usage(self, shortcut_id: str) -> bool:
        """
        增加使用次数
        
        Args:
            shortcut_id: 快捷方式 ID
            
        Returns:
            是否成功
        """
        shortcut = self.get_shortcut(shortcut_id)
        if not shortcut:
            return False
        
        shortcut["usage_count"] = shortcut.get("usage_count", 0) + 1
        shortcut["last_used_at"] = datetime.now().isoformat()
        
        # 保存快捷方式文件
        shortcut_file = self.storage_dir / f"{shortcut_id}.json"
        with open(shortcut_file, 'w', encoding='utf-8') as f:
            json.dump(shortcut, f, ensure_ascii=False, indent=2)
        
        return True
    
    def get_popular_shortcuts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取热门快捷方式（按使用次数）
        
        Args:
            limit: 返回数量限制
            
        Returns:
            热门快捷方式列表
        """
        shortcuts = []
        
        for shortcut_id in self.metadata["shortcuts"]:
            shortcut = self.get_shortcut(shortcut_id)
            if shortcut:
                shortcuts.append(shortcut)
        
        # 按使用次数倒序排序
        shortcuts.sort(key=lambda x: x.get("usage_count", 0), reverse=True)
        
        return shortcuts[:limit]
    
    def get_recent_shortcuts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取最近使用的快捷方式
        
        Args:
            limit: 返回数量限制
            
        Returns:
            最近使用的快捷方式列表
        """
        shortcuts = []
        
        for shortcut_id in self.metadata["shortcuts"]:
            shortcut = self.get_shortcut(shortcut_id)
            if shortcut and shortcut.get("last_used_at"):
                shortcuts.append(shortcut)
        
        # 按最后使用时间倒序排序
        shortcuts.sort(key=lambda x: x.get("last_used_at", ""), reverse=True)
        
        return shortcuts[:limit]


# 全局实例
command_shortcut_service = CommandShortcutService()