"""
游戏化服务测试
"""

import pytest
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.gamification_service import get_gamification_service


class TestGamificationService:
    """游戏化服务测试"""
    
    @pytest.fixture
    def gamification_service(self):
        """获取游戏化服务实例"""
        return get_gamification_service()
    
    def test_get_user_progress_new_user(self, gamification_service):
        """测试新用户进度"""
        user_id = "test_user_new"
        
        progress = gamification_service.get_user_progress(user_id)
        
        assert progress["level"] == 1
        assert progress["experience"] == 0
        assert len(progress["achievements_unlocked"]) == 0
    
    def test_update_stat_code_lines(self, gamification_service):
        """测试更新代码行数"""
        user_id = "test_user_code"
        
        progress = gamification_service.update_stat(user_id, "code_lines", 100)
        
        assert progress["stats"]["code_lines"] == 100
    
    def test_update_stat_sessions(self, gamification_service):
        """测试更新会话次数"""
        user_id = "test_user_sessions"
        
        progress = gamification_service.update_stat(user_id, "sessions", 5)
        
        assert progress["stats"]["sessions"] == 5
    
    def test_update_stat_languages_learned(self, gamification_service):
        """测试学习语言"""
        user_id = "test_user_languages"
        
        progress = gamification_service.update_stat(user_id, "languages_learned", "python")
        progress = gamification_service.update_stat(user_id, "languages_learned", "javascript")
        
        assert "python" in progress["stats"]["languages_learned"]
        assert "javascript" in progress["stats"]["languages_learned"]
        assert len(progress["stats"]["languages_learned"]) == 2
    
    def test_check_level_up(self, gamification_service):
        """测试等级提升"""
        user_id = "test_user_level"
        
        # 添加足够的经验值
        progress = gamification_service.update_stat(user_id, "code_lines", 1000)
        
        # 应该达到等级 4
        assert progress["level"] >= 4
    
    def test_get_achievements(self, gamification_service):
        """测试获取成就列表"""
        user_id = "test_user_achievements"
        
        achievements = gamification_service.get_achievements(user_id)
        
        assert len(achievements) > 0
        assert all("id" in a for a in achievements)
        assert all("name" in a for a in achievements)
        assert all("unlocked" in a for a in achievements)
    
    def test_get_level_info(self, gamification_service):
        """测试获取等级信息"""
        level_info = gamification_service.get_level_info(5)
        
        assert level_info["level"] == 5
        assert "title" in level_info
        assert "exp_needed" in level_info


if __name__ == "__main__":
    pytest.main([__file__, "-v"])