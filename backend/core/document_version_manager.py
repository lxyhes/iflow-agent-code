"""
文档版本管理器
记录文档的修改历史，支持查看不同版本
"""

import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger("DocumentVersionManager")


class DocumentVersionManager:
    """文档版本管理器"""
    
    def __init__(self, project_path: str):
        """
        初始化文档版本管理器
        
        Args:
            project_path: 项目路径
        """
        self.project_path = project_path
        self.version_dir = self._get_version_dir()
        os.makedirs(self.version_dir, exist_ok=True)
        
        # 版本索引文件
        self.index_file = os.path.join(self.version_dir, "version_index.json")
        self.index = self._load_index()
    
    def _get_version_dir(self) -> str:
        """获取版本存储目录"""
        # 使用项目路径的哈希值作为版本目录名
        hash_value = hashlib.md5(self.project_path.encode()).hexdigest()
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base_dir, "..", "storage", "document_versions", hash_value)
    
    def _load_index(self) -> Dict[str, List[Dict]]:
        """加载版本索引"""
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载版本索引失败: {e}")
                return {}
        return {}
    
    def _save_index(self):
        """保存版本索引"""
        try:
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(self.index, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"保存版本索引失败: {e}")
    
    def _get_file_hash(self, file_path: str) -> str:
        """获取文件内容的哈希值"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            logger.error(f"计算文件哈希失败: {e}")
            return ""
    
    def _get_relative_path(self, file_path: str) -> str:
        """获取相对于项目根目录的路径"""
        try:
            return os.path.relpath(file_path, self.project_path)
        except Exception:
            return file_path
    
    def record_version(self, file_path: str, content: str = None, metadata: Dict = None) -> Optional[Dict]:
        """
        记录文档版本
        
        Args:
            file_path: 文件路径
            content: 文件内容（可选，如果不提供则从文件读取）
            metadata: 元数据（可选）
        
        Returns:
            版本信息字典，如果失败返回 None
        """
        try:
            # 获取相对路径
            relative_path = self._get_relative_path(file_path)
            
            # 获取文件内容
            if content is None:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except Exception as e:
                    logger.error(f"读取文件失败: {e}")
                    return None
            
            # 计算文件哈希
            file_hash = self._get_file_hash(file_path)
            
            # 检查是否已经有相同哈希的版本
            if relative_path in self.index:
                last_version = self.index[relative_path][-1]
                if last_version.get('hash') == file_hash:
                    logger.debug(f"文件未修改，跳过版本记录: {relative_path}")
                    return last_version
            
            # 生成版本号
            version_number = len(self.index.get(relative_path, [])) + 1
            version_id = f"v{version_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # 保存版本内容
            version_file = os.path.join(self.version_dir, f"{version_id}.txt")
            with open(version_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 创建版本信息
            version_info = {
                "version_id": version_id,
                "version_number": version_number,
                "file_path": relative_path,
                "absolute_path": file_path,
                "hash": file_hash,
                "timestamp": datetime.now().isoformat(),
                "size": len(content),
                "metadata": metadata or {}
            }
            
            # 更新索引
            if relative_path not in self.index:
                self.index[relative_path] = []
            self.index[relative_path].append(version_info)
            self._save_index()
            
            logger.info(f"记录文档版本: {relative_path} -> {version_id}")
            return version_info
            
        except Exception as e:
            logger.error(f"记录文档版本失败: {e}")
            return None
    
    def get_versions(self, file_path: str) -> List[Dict]:
        """
        获取文档的所有版本
        
        Args:
            file_path: 文件路径
        
        Returns:
            版本信息列表
        """
        try:
            relative_path = self._get_relative_path(file_path)
            return self.index.get(relative_path, [])
        except Exception as e:
            logger.error(f"获取版本列表失败: {e}")
            return []
    
    def get_version(self, file_path: str, version_id: str) -> Optional[Dict]:
        """
        获取特定版本的内容
        
        Args:
            file_path: 文件路径
            version_id: 版本 ID
        
        Returns:
            包含版本信息和内容的字典，如果失败返回 None
        """
        try:
            versions = self.get_versions(file_path)
            for version in versions:
                if version['version_id'] == version_id:
                    # 读取版本内容
                    version_file = os.path.join(self.version_dir, f"{version_id}.txt")
                    if os.path.exists(version_file):
                        with open(version_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                        return {
                            **version,
                            "content": content
                        }
            return None
        except Exception as e:
            logger.error(f"获取版本内容失败: {e}")
            return None
    
    def get_latest_version(self, file_path: str) -> Optional[Dict]:
        """
        获取最新版本
        
        Args:
            file_path: 文件路径
        
        Returns:
            最新版本信息，如果失败返回 None
        """
        try:
            versions = self.get_versions(file_path)
            if versions:
                latest = versions[-1]
                version_file = os.path.join(self.version_dir, f"{latest['version_id']}.txt")
                if os.path.exists(version_file):
                    with open(version_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    return {
                        **latest,
                        "content": content
                    }
            return None
        except Exception as e:
            logger.error(f"获取最新版本失败: {e}")
            return None
    
    def compare_versions(self, file_path: str, version_id1: str, version_id2: str) -> Optional[Dict]:
        """
        比较两个版本
        
        Args:
            file_path: 文件路径
            version_id1: 第一个版本 ID
            version_id2: 第二个版本 ID
        
        Returns:
            比较结果字典，如果失败返回 None
        """
        try:
            version1 = self.get_version(file_path, version_id1)
            version2 = self.get_version(file_path, version_id2)
            
            if not version1 or not version2:
                return None
            
            # 简单比较：内容是否相同
            content1 = version1.get('content', '')
            content2 = version2.get('content', '')
            
            lines1 = content1.splitlines()
            lines2 = content2.splitlines()
            
            # 计算差异
            added_lines = []
            removed_lines = []
            
            # 简单的差异检测（可以改进为更复杂的 diff 算法）
            for i, line in enumerate(lines2):
                if i >= len(lines1) or lines1[i] != line:
                    added_lines.append((i, line))
            
            for i, line in enumerate(lines1):
                if i >= len(lines2) or lines2[i] != line:
                    removed_lines.append((i, line))
            
            return {
                "version1": version1,
                "version2": version2,
                "added_lines": added_lines,
                "removed_lines": removed_lines,
                "is_different": content1 != content2
            }
        except Exception as e:
            logger.error(f"比较版本失败: {e}")
            return None
    
    def delete_version(self, file_path: str, version_id: str) -> bool:
        """
        删除特定版本
        
        Args:
            file_path: 文件路径
            version_id: 版本 ID
        
        Returns:
            是否成功
        """
        try:
            relative_path = self._get_relative_path(file_path)
            
            if relative_path not in self.index:
                return False
            
            # 从索引中移除
            self.index[relative_path] = [
                v for v in self.index[relative_path]
                if v['version_id'] != version_id
            ]
            
            # 删除版本文件
            version_file = os.path.join(self.version_dir, f"{version_id}.txt")
            if os.path.exists(version_file):
                os.remove(version_file)
            
            self._save_index()
            logger.info(f"删除文档版本: {relative_path} -> {version_id}")
            return True
            
        except Exception as e:
            logger.error(f"删除版本失败: {e}")
            return False
    
    def clear_all_versions(self, file_path: str = None) -> bool:
        """
        清除所有版本
        
        Args:
            file_path: 文件路径（可选，如果不提供则清除所有文件的版本）
        
        Returns:
            是否成功
        """
        try:
            if file_path:
                # 清除特定文件的所有版本
                relative_path = self._get_relative_path(file_path)
                if relative_path in self.index:
                    versions = self.index[relative_path]
                    for version in versions:
                        version_file = os.path.join(self.version_dir, f"{version['version_id']}.txt")
                        if os.path.exists(version_file):
                            os.remove(version_file)
                    del self.index[relative_path]
            else:
                # 清除所有版本
                for versions in self.index.values():
                    for version in versions:
                        version_file = os.path.join(self.version_dir, f"{version['version_id']}.txt")
                        if os.path.exists(version_file):
                            os.remove(version_file)
                self.index.clear()
            
            self._save_index()
            logger.info(f"清除所有版本: {file_path or '所有文件'}")
            return True
            
        except Exception as e:
            logger.error(f"清除版本失败: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        获取版本统计信息
        
        Returns:
            统计信息字典
        """
        try:
            total_files = len(self.index)
            total_versions = sum(len(versions) for versions in self.index.values())
            total_size = sum(
                sum(v.get('size', 0) for v in versions)
                for versions in self.index.values()
            )
            
            # 计算存储目录大小
            storage_size = sum(
                os.path.getsize(os.path.join(self.version_dir, f))
                for f in os.listdir(self.version_dir)
                if f.endswith('.txt') or f.endswith('.json')
            )
            
            return {
                "total_files": total_files,
                "total_versions": total_versions,
                "total_content_size": total_size,
                "storage_size": storage_size,
                "version_dir": self.version_dir
            }
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}


# 版本管理器缓存
_version_managers = {}


def get_version_manager(project_path: str) -> DocumentVersionManager:
    """
    获取文档版本管理器实例
    
    Args:
        project_path: 项目路径
    
    Returns:
        DocumentVersionManager 实例
    """
    if project_path not in _version_managers:
        _version_managers[project_path] = DocumentVersionManager(project_path)
    return _version_managers[project_path]