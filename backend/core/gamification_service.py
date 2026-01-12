"""
游戏化服务 (Gamification Service)
成就徽章、等级系统和积分系统
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger("GamificationService")


class Achievement:
    """成就定义"""
    
    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        icon: str,
        category: str,
        requirement: Dict[str, Any],
        reward: int = 100
    ):
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.category = category
        self.requirement = requirement
        self.reward = reward


class GamificationService:
    """游戏化服务"""
    
    def __init__(self):
        self.achievements = self._init_achievements()
        self.user_progress = {}
        self.storage_dir = Path(__file__).parent.parent.parent / "storage" / "gamification"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
    
    def _init_achievements(self) -> List[Achievement]:
        """初始化成就列表"""
        return [
            # 编程相关成就
            Achievement(
                id="first_code",
                name="初出茅庐",
                description="编写第一行代码",
                icon="🌱",
                category="coding",
                requirement={"type": "code_lines", "count": 1},
                reward=50
            ),
            Achievement(
                id="code_master",
                name="代码大师",
                description="累计编写 1000 行代码",
                icon="👨‍💻",
                category="coding",
                requirement={"type": "code_lines", "count": 1000},
                reward=500
            ),
            Achievement(
                id="bug_hunter",
                name="Bug 猎人",
                description="修复 10 个 Bug",
                icon="🐛",
                category="coding",
                requirement={"type": "bugs_fixed", "count": 10},
                reward=300
            ),
            Achievement(
                id="feature_creator",
                name="功能创造者",
                description="实现 5 个新功能",
                icon="✨",
                category="coding",
                requirement={"type": "features_created", "count": 5},
                reward=400
            ),
            
            # 协作相关成就
            Achievement(
                id="collaborator",
                name="团队协作者",
                description="与 AI 协作 10 次",
                icon="🤝",
                category="collaboration",
                requirement={"type": "sessions", "count": 10},
                reward=200
            ),
            Achievement(
                id="mentor",
                name="导师",
                description="帮助解决 20 个问题",
                icon="🎓",
                category="collaboration",
                requirement={"type": "problems_solved", "count": 20},
                reward=350
            ),
            
            # 学习相关成就
            Achievement(
                id="learner",
                name="学习达人",
                description="学习 5 种编程语言",
                icon="📚",
                category="learning",
                requirement={"type": "languages_learned", "count": 5},
                reward=300
            ),
            Achievement(
                id="explorer",
                name="探索者",
                description="探索 10 个不同的项目",
                icon="🗺️",
                category="learning",
                requirement={"type": "projects_explored", "count": 10},
                reward=250
            ),
            
            # 连续成就
            Achievement(
                id="streak_3",
                name="三日连胜",
                description="连续 3 天编码",
                icon="🔥",
                category="streak",
                requirement={"type": "consecutive_days", "count": 3},
                reward=200
            ),
            Achievement(
                id="streak_7",
                name="一周连胜",
                description="连续 7 天编码",
                icon="💪",
                category="streak",
                requirement={"type": "consecutive_days", "count": 7},
                reward=500
            ),
            Achievement(
                id="streak_30",
                name="月度传奇",
                description="连续 30 天编码",
                icon="🏆",
                category="streak",
                requirement={"type": "consecutive_days", "count": 30},
                reward=2000
            ),
        ]
    
    def get_user_progress(self, user_id: str) -> Dict[str, Any]:
        """获取用户进度"""
        if user_id not in self.user_progress:
            self._load_user_progress(user_id)
        
        return self.user_progress.get(user_id, self._create_default_progress())
    
    def _create_default_progress(self) -> Dict[str, Any]:
        """创建默认进度"""
        return {
            "level": 1,
            "experience": 0,
            "total_experience": 0,
            "achievements_unlocked": [],
            "stats": {
                "code_lines": 0,
                "bugs_fixed": 0,
                "features_created": 0,
                "sessions": 0,
                "problems_solved": 0,
                "languages_learned": set(),
                "projects_explored": set(),
                "consecutive_days": 0,
                "last_active_date": None
            }
        }
    
    def _load_user_progress(self, user_id: str):
        """加载用户进度"""
        progress_file = self.storage_dir / f"{user_id}.json"
        
        if progress_file.exists():
            try:
                with open(progress_file, 'r', encoding='utf-8') as f:
                    self.user_progress[user_id] = json.load(f)
                
                # 转换 set
                if "languages_learned" in self.user_progress[user_id]["stats"]:
                    self.user_progress[user_id]["stats"]["languages_learned"] = set(
                        self.user_progress[user_id]["stats"]["languages_learned"]
                    )
                if "projects_explored" in self.user_progress[user_id]["stats"]:
                    self.user_progress[user_id]["stats"]["projects_explored"] = set(
                        self.user_progress[user_id]["stats"]["projects_explored"]
                    )
            except Exception as e:
                logger.error(f"Failed to load user progress: {e}")
                self.user_progress[user_id] = self._create_default_progress()
        else:
            self.user_progress[user_id] = self._create_default_progress()
    
    def _save_user_progress(self, user_id: str):
        """保存用户进度"""
        progress_file = self.storage_dir / f"{user_id}.json"
        
        try:
            # 转换 set 为 list
            progress = self.user_progress[user_id].copy()
            progress["stats"]["languages_learned"] = list(progress["stats"]["languages_learned"])
            progress["stats"]["projects_explored"] = list(progress["stats"]["projects_explored"])
            
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump(progress, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save user progress: {e}")
    
    def update_stat(self, user_id: str, stat_type: str, value: Any = 1, project_path: str = None):
        """更新用户统计"""
        progress = self.get_user_progress(user_id)
        stats = progress["stats"]
        
        if stat_type in stats:
            if isinstance(stats[stat_type], set):
                stats[stat_type].add(value)
            else:
                stats[stat_type] += value
        
        # 更新连续天数
        if stat_type in ["code_lines", "sessions"]:
            self._update_streak(user_id)
        
        # 检查成就
        self._check_achievements(user_id)
        
        # 保存进度
        self._save_user_progress(user_id)
        
        return progress
    
    def _update_streak(self, user_id: str):
        """更新连续天数"""
        progress = self.get_user_progress(user_id)
        stats = progress["stats"]
        
        today = datetime.now().strftime("%Y-%m-%d")
        last_date = stats.get("last_active_date")
        
        if last_date:
            last_date_dt = datetime.strptime(last_date, "%Y-%m-%d")
            today_dt = datetime.strptime(today, "%Y-%m-%d")
            delta = (today_dt - last_date_dt).days
            
            if delta == 1:
                # 连续
                stats["consecutive_days"] += 1
            elif delta > 1:
                # 中断
                stats["consecutive_days"] = 1
        
        stats["last_active_date"] = today
    
    def _check_achievements(self, user_id: str):
        """检查成就解锁"""
        progress = self.get_user_progress(user_id)
        stats = progress["stats"]
        
        for achievement in self.achievements:
            if achievement.id in progress["achievements_unlocked"]:
                continue
            
            # 检查成就条件
            req_type = achievement.requirement["type"]
            req_count = achievement.requirement["count"]
            
            unlocked = False
            if req_type in stats:
                if isinstance(stats[req_type], set):
                    unlocked = len(stats[req_type]) >= req_count
                else:
                    unlocked = stats[req_type] >= req_count
            
            if unlocked:
                progress["achievements_unlocked"].append(achievement.id)
                progress["experience"] += achievement.reward
                progress["total_experience"] += achievement.reward
                
                # 检查升级
                self._check_level_up(user_id, progress)
                
                logger.info(f"Achievement unlocked: {achievement.name}")
    
    def _check_level_up(self, user_id: str, progress: Dict[str, Any]):
        """检查是否升级"""
        new_level = self._calculate_level(progress["total_experience"])
        
        if new_level > progress["level"]:
            progress["level"] = new_level
            logger.info(f"User {user_id} leveled up to {new_level}")
    
    def _calculate_level(self, total_experience: int) -> int:
        """计算等级"""
        # 等级公式：level = sqrt(experience / 100)
        import math
        return int(math.sqrt(total_experience / 100)) + 1
    
    def get_level_info(self, level: int) -> Dict[str, Any]:
        """获取等级信息"""
        # 计算升级所需经验
        exp_needed = level * level * 100
        
        return {
            "level": level,
            "title": self._get_level_title(level),
            "exp_needed": exp_needed,
            "exp_for_next": (level + 1) * (level + 1) * 100 - exp_needed
        }
    
    def _get_level_title(self, level: int) -> str:
        """获取等级称号"""
        titles = {
            1: "初级助手",
            5: "中级开发者",
            10: "高级工程师",
            20: "资深架构师",
            30: "技术专家",
            50: "传奇大师"
        }
        
        for threshold in sorted(titles.keys(), reverse=True):
            if level >= threshold:
                return titles[threshold]
        
        return "初级助手"
    
    def get_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户成就列表"""
        progress = self.get_user_progress(user_id)
        unlocked_ids = set(progress["achievements_unlocked"])
        
        result = []
        for achievement in self.achievements:
            result.append({
                "id": achievement.id,
                "name": achievement.name,
                "description": achievement.description,
                "icon": achievement.icon,
                "category": achievement.category,
                "reward": achievement.reward,
                "unlocked": achievement.id in unlocked_ids,
                "progress": self._get_achievement_progress(achievement, progress)
            })
        
        return result
    
    def _get_achievement_progress(self, achievement: Achievement, progress: Dict[str, Any]) -> Dict[str, Any]:
        """获取成就进度"""
        req_type = achievement.requirement["type"]
        req_count = achievement.requirement["count"]
        
        current = 0
        if req_type in progress["stats"]:
            if isinstance(progress["stats"][req_type], set):
                current = len(progress["stats"][req_type])
            else:
                current = progress["stats"][req_type]
        
        return {
            "current": current,
            "target": req_count,
            "percentage": min(100, int(current / req_count * 100))
        }


# 全局实例
_gamification_service = None


def get_gamification_service() -> GamificationService:
    """获取游戏化服务实例"""
    global _gamification_service
    if _gamification_service is None:
        _gamification_service = GamificationService()
    return _gamification_service