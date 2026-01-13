"""
业务记忆服务
用于记录和推荐常用功能
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import hashlib
from collections import defaultdict


class BusinessMemoryService:
    """业务记忆服务"""
    
    def __init__(self, storage_dir: str = None):
        """
        初始化业务记忆服务
        
        Args:
            storage_dir: 存储目录路径
        """
        if storage_dir is None:
            # 默认存储在项目根目录的 storage/business_memory 下
            project_root = Path(__file__).parent.parent.parent
            storage_dir = project_root / "storage" / "business_memory"
        
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
                "features": {},
                "usage_history": [],
                "favorites": {},
                "recommendations": {}
            }
    
    def _save_metadata(self):
        """保存元数据"""
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
    
    def _generate_id(self, name: str, category: str) -> str:
        """生成功能 ID"""
        content = f"{name}_{category}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def register_feature(
        self,
        name: str,
        category: str,
        description: str = "",
        icon: str = "",
        path: str = ""
    ) -> Dict[str, Any]:
        """
        注册功能
        
        Args:
            name: 功能名称
            category: 功能分类
            description: 功能描述
            icon: 图标
            path: 功能路径
            
        Returns:
            注册的功能信息
        """
        feature_id = self._generate_id(name, category)
        
        feature = {
            "id": feature_id,
            "name": name,
            "category": category,
            "description": description,
            "icon": icon,
            "path": path,
            "created_at": datetime.now().isoformat(),
            "usage_count": 0,
            "last_used_at": None,
            "is_favorite": False
        }
        
        self.metadata["features"][feature_id] = feature
        self._save_metadata()
        
        return feature
    
    def record_usage(
        self,
        feature_id: str,
        context: Dict[str, Any] = None
    ) -> bool:
        """
        记录功能使用
        
        Args:
            feature_id: 功能 ID
            context: 使用上下文
            
        Returns:
            是否记录成功
        """
        if feature_id not in self.metadata["features"]:
            return False
        
        # 更新功能使用统计
        feature = self.metadata["features"][feature_id]
        feature["usage_count"] = feature.get("usage_count", 0) + 1
        feature["last_used_at"] = datetime.now().isoformat()
        
        # 记录使用历史
        usage_record = {
            "feature_id": feature_id,
            "feature_name": feature["name"],
            "timestamp": datetime.now().isoformat(),
            "context": context or {}
        }
        
        self.metadata["usage_history"].append(usage_record)
        
        # 限制历史记录数量（保留最近 1000 条）
        if len(self.metadata["usage_history"]) > 1000:
            self.metadata["usage_history"] = self.metadata["usage_history"][-1000:]
        
        self._save_metadata()
        return True
    
    def record_usage_by_name(
        self,
        feature_name: str,
        context: Dict[str, Any] = None
    ) -> bool:
        """
        通过功能名称记录使用
        
        Args:
            feature_name: 功能名称
            context: 使用上下文
            
        Returns:
            是否记录成功
        """
        # 查找功能
        for feature_id, feature in self.metadata["features"].items():
            if feature["name"] == feature_name:
                return self.record_usage(feature_id, context)
        
        # 如果功能不存在，自动注册
        self.register_feature(
            name=feature_name,
            category="自动注册",
            description=f"自动注册的功能: {feature_name}"
        )
        
        # 再次记录
        for feature_id, feature in self.metadata["features"].items():
            if feature["name"] == feature_name:
                return self.record_usage(feature_id, context)
        
        return False
    
    def toggle_favorite(self, feature_id: str) -> bool:
        """
        切换功能收藏状态
        
        Args:
            feature_id: 功能 ID
            
        Returns:
            是否切换成功
        """
        if feature_id not in self.metadata["features"]:
            return False
        
        feature = self.metadata["features"][feature_id]
        feature["is_favorite"] = not feature.get("is_favorite", False)
        
        if feature["is_favorite"]:
            self.metadata["favorites"][feature_id] = {
                "added_at": datetime.now().isoformat()
            }
        else:
            if feature_id in self.metadata["favorites"]:
                del self.metadata["favorites"][feature_id]
        
        self._save_metadata()
        return True
    
    def get_features(
        self,
        category: str = None,
        favorite_only: bool = False
    ) -> List[Dict[str, Any]]:
        """
        获取功能列表
        
        Args:
            category: 按分类筛选
            favorite_only: 只显示收藏的
            
        Returns:
            功能列表
        """
        features = []
        
        for feature_id, feature in self.metadata["features"].items():
            if category and feature.get("category") != category:
                continue
            if favorite_only and not feature.get("is_favorite", False):
                continue
            
            features.append(feature)
        
        # 按使用次数倒序排序
        features.sort(key=lambda x: x.get("usage_count", 0), reverse=True)
        
        return features
    
    def get_popular_features(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取热门功能（按使用次数）
        
        Args:
            limit: 返回数量限制
            
        Returns:
            热门功能列表
        """
        features = list(self.metadata["features"].values())
        features.sort(key=lambda x: x.get("usage_count", 0), reverse=True)
        return features[:limit]
    
    def get_favorite_features(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取收藏的功能
        
        Args:
            limit: 返回数量限制
            
        Returns:
            收藏的功能列表
        """
        features = []
        
        for feature_id, feature in self.metadata["features"].items():
            if feature.get("is_favorite", False):
                features.append(feature)
        
        # 按最后使用时间倒序排序
        features.sort(key=lambda x: x.get("last_used_at", ""), reverse=True)
        
        return features[:limit]
    
    def get_recent_features(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取最近使用的功能
        
        Args:
            limit: 返回数量限制
            
        Returns:
            最近使用的功能列表
        """
        # 从使用历史中提取最近使用的功能
        recent_features = []
        seen_feature_ids = set()
        
        for record in reversed(self.metadata["usage_history"]):
            if record["feature_id"] not in seen_feature_ids:
                feature = self.metadata["features"].get(record["feature_id"])
                if feature:
                    recent_features.append(feature)
                    seen_feature_ids.add(record["feature_id"])
                
                if len(recent_features) >= limit:
                    break
        
        return recent_features
    
    def get_usage_statistics(self, feature_id: str = None) -> Dict[str, Any]:
        """
        获取使用统计
        
        Args:
            feature_id: 功能 ID（可选，如果不提供则返回所有功能的统计）
            
        Returns:
            使用统计信息
        """
        if feature_id:
            if feature_id not in self.metadata["features"]:
                return {}
            
            feature = self.metadata["features"][feature_id]
            
            # 计算该功能的详细统计
            feature_records = [
                r for r in self.metadata["usage_history"]
                if r["feature_id"] == feature_id
            ]
            
            return {
                "feature_id": feature_id,
                "feature_name": feature["name"],
                "total_usage": feature.get("usage_count", 0),
                "last_used_at": feature.get("last_used_at"),
                "usage_by_day": self._calculate_usage_by_day(feature_records),
                "usage_by_hour": self._calculate_usage_by_hour(feature_records)
            }
        else:
            # 返回所有功能的统计
            return {
                "total_features": len(self.metadata["features"]),
                "total_usage": len(self.metadata["usage_history"]),
                "total_favorites": len(self.metadata["favorites"]),
                "popular_features": self.get_popular_features(5),
                "recent_features": self.get_recent_features(5)
            }
    
    def _calculate_usage_by_day(self, records: List[Dict]) -> Dict[str, int]:
        """计算按天的使用次数"""
        usage_by_day = defaultdict(int)
        
        for record in records:
            timestamp = datetime.fromisoformat(record["timestamp"])
            day = timestamp.strftime("%Y-%m-%d")
            usage_by_day[day] += 1
        
        return dict(usage_by_day)
    
    def _calculate_usage_by_hour(self, records: List[Dict]) -> Dict[str, int]:
        """计算按小时的使用次数"""
        usage_by_hour = defaultdict(int)
        
        for record in records:
            timestamp = datetime.fromisoformat(record["timestamp"])
            hour = timestamp.strftime("%H:00")
            usage_by_hour[hour] += 1
        
        return dict(usage_by_hour)
    
    def get_recommendations(
        self,
        context: Dict[str, Any] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        获取智能推荐
        
        Args:
            context: 当前上下文
            limit: 返回数量限制
            
        Returns:
            推荐的功能列表
        """
        recommendations = []
        
        # 基于使用频率推荐
        popular_features = self.get_popular_features(limit)
        for feature in popular_features:
            recommendations.append({
                "feature": feature,
                "reason": "热门功能",
                "score": feature.get("usage_count", 0)
            })
        
        # 基于收藏推荐
        favorite_features = self.get_favorite_features(limit)
        for feature in favorite_features:
            existing = next((r for r in recommendations if r["feature"]["id"] == feature["id"]), None)
            if existing:
                existing["score"] += 10
            else:
                recommendations.append({
                    "feature": feature,
                    "reason": "收藏功能",
                    "score": 10
                })
        
        # 基于上下文推荐
        if context:
            # 这里可以添加更复杂的上下文匹配逻辑
            pass
        
        # 按分数排序
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        return recommendations[:limit]
    
    def get_categories(self) -> List[str]:
        """获取所有功能分类"""
        categories = set()
        
        for feature in self.metadata["features"].values():
            if feature.get("category"):
                categories.add(feature["category"])
        
        return sorted(list(categories))
    
    def search_features(self, query: str) -> List[Dict[str, Any]]:
        """
        搜索功能
        
        Args:
            query: 搜索关键词
            
        Returns:
            匹配的功能列表
        """
        query_lower = query.lower()
        results = []
        
        for feature in self.metadata["features"].values():
            if (query_lower in feature.get("name", "").lower() or
                query_lower in feature.get("description", "").lower() or
                query_lower in feature.get("category", "").lower()):
                results.append(feature)
        
        return results
    
    def get_usage_history(
        self,
        feature_id: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        获取使用历史
        
        Args:
            feature_id: 功能 ID（可选）
            limit: 返回数量限制
            
        Returns:
            使用历史列表
        """
        history = self.metadata["usage_history"]
        
        if feature_id:
            history = [r for r in history if r["feature_id"] == feature_id]
        
        # 按时间倒序排序
        history = sorted(history, key=lambda x: x["timestamp"], reverse=True)
        
        return history[:limit]


# 全局实例
business_memory_service = BusinessMemoryService()