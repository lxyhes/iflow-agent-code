"""
JManus 与 AgentScope 集成模块

提供多智能体协同引擎和技能模块化封装的适配层
"""

from .jmanus_adapter import JManusReActAgent, ReActStep, ReActTrace
from .agentscope_wrapper import (
    AgentScopeSkill,
    AgentScopeSkillRegistry,
    CompositeSkill,
    SkillContext,
)
from .config import IntegrationConfig, MigrationPhase
from .collaborative_decision import CollaborativeDecisionEngine, DecisionContext
from .agent_tracing import AgentExecutionTracer, ExecutionTrace

__all__ = [
    # JManus 适配器
    "JManusReActAgent",
    "ReActStep",
    "ReActTrace",
    # AgentScope 包装器
    "AgentScopeSkill",
    "AgentScopeSkillRegistry",
    "CompositeSkill",
    "SkillContext",
    # 配置
    "IntegrationConfig",
    "MigrationPhase",
    # 协同决策
    "CollaborativeDecisionEngine",
    "DecisionContext",
    # 追踪
    "AgentExecutionTracer",
    "ExecutionTrace",
]
