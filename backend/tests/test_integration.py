"""
集成测试示例

测试多个组件之间的交互
"""
import pytest
import asyncio
import os
import json
from httpx import AsyncClient
from fastapi.testclient import TestClient

# 导入 FastAPI 应用
from backend.app.main import app

# 测试客户端
client = TestClient(app)


class TestProjectIntegration:
    """项目集成测试"""

    def test_create_and_list_projects(self):
        """测试创建和列出项目"""
        # 创建项目
        response = client.post(
            "/api/projects",
            json={"path": "/tmp/test_project"}
        )
        assert response.status_code == 200
        project_data = response.json()

        # 列出项目
        response = client.get("/api/projects")
        assert response.status_code == 200
        projects = response.json()

        # 验证项目已创建
        assert any(p["name"] == "test_project" for p in projects)

    def test_project_file_operations(self):
        """测试项目文件操作"""
        # 获取项目文件树
        response = client.get("/api/projects/default/files")
        assert response.status_code == 200

        files = response.json()
        assert isinstance(files, list)

        # 读取文件
        response = client.get(
            "/api/projects/default/file",
            params={"filePath": "README.md"}
        )
        # 文件可能不存在，所以可能是 404
        assert response.status_code in [200, 404]

        # 保存文件
        response = client.put(
            "/api/projects/default/file",
            json={
                "filePath": "test.txt",
                "content": "Test content"
            }
        )
        assert response.status_code == 200


class TestSessionIntegration:
    """会话集成测试"""

    def test_create_and_list_sessions(self):
        """测试创建和列出示例"""
        # 获取会话列表
        response = client.get("/api/projects/default/sessions")
        assert response.status_code == 200

        sessions = response.json()
        assert "sessions" in sessions
        assert isinstance(sessions["sessions"], list)

    def test_session_messages(self):
        """测试会话消息"""
        # 获取会话列表
        response = client.get("/api/projects/default/sessions")
        assert response.status_code == 200

        sessions = response.json()

        if sessions["sessions"]:
            # 获取第一个会话的消息
            session_id = sessions["sessions"][0]["id"]
            response = client.get(
                f"/api/projects/default/sessions/{session_id}/messages"
            )
            assert response.status_code == 200

            messages = response.json()
            assert "messages" in messages
            assert isinstance(messages["messages"], list)


class TestGitIntegration:
    """Git 集成测试"""

    def test_git_status(self):
        """测试 Git 状态"""
        response = client.get("/api/git/status", params={"project": "default"})
        assert response.status_code == 200

        status = response.json()
        assert "branch" in status or "error" in status

    def test_git_branches(self):
        """测试 Git 分支"""
        response = client.get("/api/git/branches", params={"project": "default"})
        assert response.status_code == 200

        branches = response.json()
        assert "branches" in branches
        assert isinstance(branches["branches"], list)


class TestStreamingIntegration:
    """流式响应集成测试"""

    def test_stream_chat(self):
        """测试流式聊天"""
        response = client.get(
            "/stream",
            params={
                "message": "Hello",
                "cwd": "/tmp",
                "model": "test"
            },
            timeout=10.0
        )

        # 流式响应应该返回 200
        assert response.status_code == 200

        # 验证响应是流式的
        content = response.text
        assert "data:" in content or "event:" in content


class TestAuthIntegration:
    """认证集成测试"""

    def test_auth_status(self):
        """测试认证状态"""
        response = client.get("/api/auth/status")
        assert response.status_code == 200

        status = response.json()
        assert "authenticated" in status


class TestConfigIntegration:
    """配置集成测试"""

    def test_get_config(self):
        """测试获取配置"""
        response = client.get("/api/config")
        assert response.status_code == 200

        config = response.json()
        assert "mode" in config
        assert "model" in config

    def test_update_config(self):
        """测试更新配置"""
        new_config = {
            "mode": "test",
            "model": "test-model"
        }

        response = client.post("/api/config", json=new_config)
        assert response.status_code == 200

        # 验证配置已更新
        response = client.get("/api/config")
        assert response.status_code == 200

        config = response.json()
        assert config["mode"] == "test"
        assert config["model"] == "test-model"


class TestErrorHandlingIntegration:
    """错误处理集成测试"""

    def test_invalid_project(self):
        """测试无效项目"""
        response = client.get("/api/projects/invalid_project/files")
        assert response.status_code == 200  # 应该返回空列表而不是错误

    def test_invalid_file_path(self):
        """测试无效文件路径"""
        response = client.get(
            "/api/projects/default/file",
            params={"filePath": "../../../etc/passwd"}
        )
        assert response.status_code in [403, 404]  # 应该拒绝访问

    def test_large_file_upload(self):
        """测试大文件上传"""
        large_content = "x" * (200 * 1024 * 1024)  # 200 MB

        response = client.put(
            "/api/projects/default/file",
            json={
                "filePath": "large.txt",
                "content": large_content
            }
        )
        assert response.status_code == 413  # Payload Too Large


class TestConcurrentRequestsIntegration:
    """并发请求集成测试"""

    @pytest.mark.asyncio
    async def test_concurrent_file_reads(self):
        """测试并发文件读取"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 创建多个并发请求
            tasks = [
                ac.get("/api/projects/default/files") for _ in range(10)
            ]

            # 等待所有请求完成
            responses = await asyncio.gather(*tasks)

            # 验证所有请求都成功
            for response in responses:
                assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])