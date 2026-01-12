"""
测试项目开发 Agent 的功能
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.core.project_developer_agent import get_project_developer_agent


async def test_agent_initialization():
    """测试 Agent 初始化"""
    print("\n=== 测试 1: Agent 初始化 ===")
    try:
        agent = get_project_developer_agent(
            project_path=os.getcwd(),
            mode="yolo",
            model="GLM-4.7",
            persona="senior"
        )
        print("✅ Agent 创建成功")
        print(f"   - 项目路径: {agent.project_path}")
        print(f"   - 模式: {agent.mode}")
        print(f"   - 性格: {agent.persona}")
        return agent
    except Exception as e:
        print(f"❌ Agent 初始化失败: {e}")
        return None


async def test_dev_mode_config(agent):
    """测试开发模式配置"""
    print("\n=== 测试 2: 开发模式配置 ===")
    try:
        agent.set_dev_mode(auto_test=False, auto_fix=True, code_review=True)
        print("✅ 开发模式配置成功")
        print(f"   - 配置: {agent.dev_mode}")
    except Exception as e:
        print(f"❌ 开发模式配置失败: {e}")


async def test_performance_metrics(agent):
    """测试性能指标"""
    print("\n=== 测试 3: 性能指标 ===")
    try:
        metrics = agent.get_performance_metrics()
        print("✅ 性能指标获取成功")
        print(f"   - 指标: {metrics}")
    except Exception as e:
        print(f"❌ 性能指标获取失败: {e}")


async def test_smart_suggestions(agent):
    """测试智能建议"""
    print("\n=== 测试 4: 智能建议 ===")
    try:
        suggestions = await agent.get_smart_suggestions("创建用户组件", "naming")
        print("✅ 智能建议获取成功")
        print(f"   - 建议数量: {len(suggestions)}")
        for i, suggestion in enumerate(suggestions, 1):
            print(f"   {i}. {suggestion.get('suggestion', 'N/A')} (置信度: {suggestion.get('confidence', 0)})")
    except Exception as e:
        print(f"❌ 智能建议获取失败: {e}")


async def test_project_health(agent):
    """测试项目健康度"""
    print("\n=== 测试 5: 项目健康度 ===")
    try:
        health = await agent.get_project_health()
        print("✅ 项目健康度获取成功")
        print(f"   - 项目路径: {health.get('project_path')}")
        print(f"   - 文件总数: {health.get('structure', {}).get('total_files', 0)}")
        print(f"   - 文件类型: {list(health.get('structure', {}).get('file_types', {}).keys())}")
    except Exception as e:
        print(f"❌ 项目健康度获取失败: {e}")


async def main():
    """主测试函数"""
    print("=" * 60)
    print("项目开发 Agent 功能测试")
    print("=" * 60)
    
    # 测试 1: 初始化
    agent = await test_agent_initialization()
    if not agent:
        print("\n❌ Agent 初始化失败，终止测试")
        return
    
    # 测试 2: 开发模式配置
    await test_dev_mode_config(agent)
    
    # 测试 3: 性能指标
    await test_performance_metrics(agent)
    
    # 测试 4: 智能建议
    await test_smart_suggestions(agent)
    
    # 测试 5: 项目健康度
    await test_project_health(agent)
    
    print("\n" + "=" * 60)
    print("✅ 所有基础功能测试完成")
    print("=" * 60)
    
    print("\n📋 可用的 API 端点:")
    print("  - GET  /api/project-developer/health/{project_name}")
    print("  - POST /api/project-developer/develop/{project_name}")
    print("  - POST /api/project-developer/debug/{project_name}")
    print("  - POST /api/project-developer/code-review/{project_name}")
    print("  - POST /api/project-developer/chat/{project_name}")
    print("  - POST /api/project-developer/config/{project_name}")
    print("  - POST /api/project-developer/refactor/{project_name}")
    print("  - POST /api/project-developer/generate-doc/{project_name}")
    print("  - POST /api/project-developer/analyze-performance/{project_name}")
    print("  - POST /api/project-developer/security-scan/{project_name}")
    print("  - POST /api/project-developer/intelligent-completion/{project_name}")
    print("  - GET  /api/project-developer/smart-suggestions/{project_name}")
    print("  - GET  /api/project-developer/performance-metrics/{project_name}")


if __name__ == "__main__":
    asyncio.run(main())