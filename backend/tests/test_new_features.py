import pytest
import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.cicd_generator import cicd_generator
from backend.core.project_template_service import ProjectTemplateService
from backend.core.task_master_service import task_master_service, Task

class TestNewFeatures:
    def test_cicd_generator(self):
        result = cicd_generator.generate('github', 'react', 'test-project')
        assert result['success'] is True
        assert '.github/workflows/ci.yml' in result['files']
        assert 'test-project' in result['files']['.github/workflows/ci.yml']

    def test_project_template_service(self):
        service = ProjectTemplateService()
        templates = service.get_templates()
        assert len(templates) > 0
        assert any(t['template_id'] == 'react-ts' for t in templates)

    def test_task_master_service_crud(self):
        # Use a temporary in-memory DB for testing
        task_master_service.db_path = ":memory:"
        task_master_service.init_tables()
        
        # Create
        task = Task(title="Test Task", project_name="demo", description="desc")
        created = task_master_service.create_task(task)
        assert created['title'] == "Test Task"
        assert created['id'] is not None
        
        # Read
        tasks = task_master_service.get_tasks("demo")
        assert len(tasks) == 1
        assert tasks[0]['title'] == "Test Task"
        
        # Update
        updated = task_master_service.update_task(created['id'], {"status": "in-progress"})
        assert updated['status'] == "in-progress"
        
        # Delete
        task_master_service.delete_task(created['id'])
        tasks = task_master_service.get_tasks("demo")
        assert len(tasks) == 0

    def test_task_master_prd(self):
        task_master_service.db_path = ":memory:"
        task_master_service.init_tables()
        
        # Save PRD
        prd = task_master_service.save_prd("demo", "PRD 1", "Content")
        assert prd['version'] == 1
        
        # Save new version
        prd2 = task_master_service.save_prd("demo", "PRD 1", "New Content")
        assert prd2['version'] == 2
        
        # Get content
        content = task_master_service.get_prd_content("demo", "PRD 1")
        assert content['content'] == "New Content"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
