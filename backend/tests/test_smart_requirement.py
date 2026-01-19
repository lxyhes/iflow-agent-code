import pytest
import sys
import os
import json
from unittest.mock import MagicMock, AsyncMock, patch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.smart_requirement_service import smart_requirement_service

class TestSmartRequirementService:
    @pytest.mark.asyncio
    async def test_analyze_requirement(self):
        # Mock the Agent
        mock_agent = MagicMock()
        mock_agent.chat = AsyncMock(return_value=json.dumps({
            "summary": "Build a web app",
            "type": "Web",
            "keywords": ["react", "api"],
            "complexity_score": 5,
            "key_features": ["Login"],
            "tech_constraints": []
        }))
        
        # Patch the agent in the service
        smart_requirement_service.agent = mock_agent
        
        result = await smart_requirement_service.analyze_requirement("I want a web app")
        
        assert result["summary"] == "Build a web app"
        assert result["type"] == "Web"
        assert result["complexity_score"] == 5
        
    @pytest.mark.asyncio
    async def test_match_modules(self):
        # Mock Agent
        mock_agent = MagicMock()
        mock_agent.chat = AsyncMock(return_value=json.dumps([
            {"path": "backend/server.py", "relevance_score": 90, "reason": "It's the server"}
        ]))
        smart_requirement_service.agent = mock_agent
        
        # Mock scan_project_modules (it's synchronous)
        with patch.object(smart_requirement_service, '_scan_project_modules', return_value=[{"path": "backend/server.py", "type": "file"}]):
            matches = await smart_requirement_service.match_modules(["api"], ".")
            
            assert len(matches) == 1
            assert matches[0]["path"] == "backend/server.py"
            assert matches[0]["relevance_score"] == 90

    @pytest.mark.asyncio
    async def test_generate_solution(self):
        # Mock Agent
        mock_agent = MagicMock()
        mock_agent.chat = AsyncMock(return_value=json.dumps({
            "solution_doc": "# Solution\nUse React.",
            "execution_plan": {
                "milestones": [{"name": "Phase 1", "date": "2023-01-01", "tasks": ["Init"]}],
                "risks": []
            }
        }))
        smart_requirement_service.agent = mock_agent
        
        analysis = {"summary": "test"}
        matched_modules = []
        
        result = await smart_requirement_service.generate_solution(analysis, matched_modules)
        
        assert "# Solution" in result["solution_doc"]
        assert len(result["execution_plan"]["milestones"]) == 1

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
