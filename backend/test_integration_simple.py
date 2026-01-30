"""
JManus 与 AgentScope 集成测试（简化版）

运行此脚本验证集成效果
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 直接导入集成模块（避免其他模块的导入问题）
from core.integrations.jmanus_adapter import JManusReActAgent, Tool
from core.integrations.agentscope_wrapper import (
    AgentScopeSkillRegistry,
    SkillContext,
    AgentScopeSkill,
    SkillParameter,
    SkillOutput,
)
from core.integrations.config import IntegrationConfig, MigrationPhase, set_config
from core.integrations.collaborative_decision import (
    CollaborativeDecisionEngine,
    DecisionContext,
)
from core.integrations.agent_tracing import AgentExecutionTracer


class MockLLMClient:
    """模拟 LLM 客户端用于测试"""
    
    async def chat(self, prompt: str) -> str:
        """模拟 LLM 响应"""
        if "评估" in prompt:
            return """Thought: 我需要分析候选人的代码回答
Action: code_execution[{"code": "def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)"}]
Observation: 代码执行成功
Thought: 代码正确，但递归实现效率较低
Answer: 评分：75分。代码正确但可以使用动态规划优化"""
        
        return "Thought: 这是一个测试响应\nAnswer: 测试完成"


# 创建一个简单的测试技能
class SimpleTestSkill(AgentScopeSkill):
    """简单测试技能"""
    
    def __init__(self):
        super().__init__(
            name="simple_test",
            description="简单测试技能",
            parameters=[
                SkillParameter("input", "输入参数", str, required=True),
            ],
            output=SkillOutput("测试结果", str),
            tags=["test"],
        )
    
    async def execute(self, input: str, context=None):
        return f"处理结果: {input.upper()}"


async def test_jmanus_react():
    """测试 JManus ReAct Agent"""
    print("\n" + "="*60)
    print("测试 1: JManus ReAct Agent")
    print("="*60)
    
    # 创建模拟工具
    class TestTool(Tool):
        def __init__(self):
            super().__init__("search", "搜索工具")
        
        async def execute(self, **kwargs):
            return f"工具执行结果: {kwargs}"
    
    # 创建 ReAct Agent
    agent = JManusReActAgent(
        agent_id="test_agent",
        llm_client=MockLLMClient(),
        tools=[TestTool()],
        max_iterations=3,
        enable_trace=True,
    )
    
    # 执行 ReAct 循环
    result = await agent.react_loop(
        query="评估候选人回答",
        context={"question": "实现斐波那契数列", "answer": "def fib(n): ..."}
    )
    
    print(f"✅ ReAct 执行成功")
    print(f"   结果预览: {result[:80]}...")
    print(f"   追踪记录数: {len(agent.get_traces())}")
    
    return True


async def test_agentscope_skills():
    """测试 AgentScope 技能系统"""
    print("\n" + "="*60)
    print("测试 2: AgentScope 技能系统")
    print("="*60)
    
    # 创建技能注册中心
    registry = AgentScopeSkillRegistry()
    
    # 注册技能
    registry.register(SimpleTestSkill(), category="test")
    
    print(f"✅ 技能注册成功")
    print(f"   注册技能数: {len(registry.list_skills())}")
    print(f"   技能列表: {registry.list_skills()}")
    
    # 测试技能执行
    skill = registry.get("simple_test")
    if skill:
        context = SkillContext(agent_id="test")
        result = await skill.run(context=context, input="hello world")
        print(f"✅ 技能执行成功")
        print(f"   结果: {result}")
    
    return True


async def test_collaborative_decision():
    """测试协同决策引擎"""
    print("\n" + "="*60)
    print("测试 3: 协同决策引擎")
    print("="*60)
    
    from core.integrations.collaborative_decision import DecisionStrategy
    
    # 创建决策引擎
    engine = CollaborativeDecisionEngine(
        default_strategy=DecisionStrategy.CONSENSUS,
        consensus_threshold=0.6,
    )
    
    # 注册决策 Agent
    engine.register_agent("agent_1", MockLLMClient(), weight=1.0)
    engine.register_agent("agent_2", MockLLMClient(), weight=1.0)
    
    print(f"✅ 决策引擎初始化成功")
    print(f"   注册 Agent 数: {len(engine.agents)}")
    
    # 执行决策
    context = DecisionContext(
        problem="选择最佳算法",
        options=["快速排序", "归并排序", "堆排序"],
        constraints=["时间复杂度要低"],
    )
    
    result = await engine.make_decision(context)
    
    print(f"✅ 决策执行成功")
    print(f"   决策结果: {result.decision}")
    print(f"   置信度: {result.confidence:.2%}")
    print(f"   共识程度: {result.consensus_level:.2%}")
    
    return True


async def test_agent_tracing():
    """测试 Agent 执行链路追踪"""
    print("\n" + "="*60)
    print("测试 4: Agent 执行链路追踪")
    print("="*60)
    
    # 创建追踪器
    tracer = AgentExecutionTracer(max_traces=100)
    
    # 开始追踪
    trace = tracer.start_trace(
        agent_id="test_agent",
        session_id="test_session",
        metadata={"test": True},
    )
    
    # 记录事件
    tracer.trace_react_step("thought", "分析中...", iteration=0)
    tracer.trace_react_step("action", "调用工具", iteration=0)
    tracer.trace_react_step("observation", "获得结果", iteration=0)
    
    # 追踪技能调用
    event_id = tracer.trace_skill_call("test_skill", {"param": "value"})
    tracer.trace_skill_result(event_id, "success", 100, True)
    
    # 结束追踪
    tracer.end_trace()
    
    print(f"✅ 追踪记录成功")
    print(f"   追踪 ID: {trace.trace_id}")
    print(f"   事件数: {len(trace.events)}")
    print(f"   耗时: {trace.get_duration_ms():.2f} ms")
    
    # 获取可视化数据
    viz_data = tracer.get_visualization_data(trace.trace_id)
    if viz_data:
        print(f"✅ 可视化数据生成成功")
        print(f"   节点数: {len(viz_data['nodes'])}")
        print(f"   边数: {len(viz_data['edges'])}")
    
    return True


async def test_configuration():
    """测试配置系统"""
    print("\n" + "="*60)
    print("测试 5: 配置系统")
    print("="*60)
    
    # 设置配置
    config = IntegrationConfig(
        migration_phase=MigrationPhase.HYBRID,
        enable_jmanus_react=True,
        enable_agentscope_skills=True,
        enable_collaborative_decision=True,
        enable_agent_tracing=True,
    )
    
    set_config(config)
    
    print(f"✅ 配置设置成功")
    print(f"   迁移阶段: {config.migration_phase.value}")
    print(f"   ReAct 启用: {config.enable_jmanus_react}")
    print(f"   技能系统启用: {config.enable_agentscope_skills}")
    print(f"   协同决策启用: {config.enable_collaborative_decision}")
    print(f"   追踪启用: {config.enable_agent_tracing}")
    
    return True


async def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("JManus & AgentScope 集成测试")
    print("="*60)
    
    tests = [
        ("JManus ReAct Agent", test_jmanus_react),
        ("AgentScope 技能系统", test_agentscope_skills),
        ("协同决策引擎", test_collaborative_decision),
        ("Agent 执行链路追踪", test_agent_tracing),
        ("配置系统", test_configuration),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = await test_func()
            results.append((name, "✅ 通过" if success else "❌ 失败"))
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, f"❌ 错误: {e}"))
    
    # 打印总结
    print("\n" + "="*60)
    print("测试结果总结")
    print("="*60)
    for name, result in results:
        print(f"{name}: {result}")
    
    passed = sum(1 for _, r in results if "通过" in r)
    print(f"\n总计: {passed}/{len(results)} 通过")
    
    if passed == len(results):
        print("\n🎉 所有测试通过！集成成功！")
    
    return passed == len(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
