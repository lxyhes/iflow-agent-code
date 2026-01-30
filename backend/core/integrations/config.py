"""
集成配置管理

提供配置开关和迁移策略，支持渐进式启用新功能
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from enum import Enum, auto
import os


class MigrationPhase(Enum):
    """
    迁移阶段
    
    支持渐进式迁移策略：
    - LEGACY: 仅使用原有实现
    - HYBRID: 混合模式，部分功能使用新实现
    - FULL: 完全使用新实现
    """
    LEGACY = "legacy"      # 传统模式：使用原有实现
    HYBRID = "hybrid"      # 混合模式：新旧并存
    FULL = "full"          # 完整模式：完全使用新实现


@dataclass
class IntegrationConfig:
    """
    JManus 与 AgentScope 集成配置
    
    所有新功能都通过配置开关控制，默认关闭以保持向后兼容
    
    示例：
        # 启用所有新功能
        config = IntegrationConfig(
            migration_phase=MigrationPhase.FULL,
            enable_jmanus_react=True,
            enable_agentscope_skills=True,
        )
        
        # 仅启用 ReAct 模式
        config = IntegrationConfig(
            enable_jmanus_react=True,
        )
    """
    
    # ============ 迁移阶段 ============
    migration_phase: MigrationPhase = field(
        default_factory=lambda: MigrationPhase(
            os.getenv("MIGRATION_PHASE", "legacy")
        )
    )
    
    # ============ JManus 功能开关 ============
    enable_jmanus_react: bool = field(
        default_factory=lambda: os.getenv("ENABLE_JMANUS_REACT", "false").lower() == "true"
    )
    """启用 JManus ReAct 推理模式"""
    
    enable_collaborative_decision: bool = field(
        default_factory=lambda: os.getenv("ENABLE_COLLABORATIVE_DECISION", "false").lower() == "true"
    )
    """启用多 Agent 协同决策"""
    
    enable_agent_tracing: bool = field(
        default_factory=lambda: os.getenv("ENABLE_AGENT_TRACING", "false").lower() == "true"
    )
    """启用 Agent 执行链路追踪"""
    
    # ============ AgentScope 功能开关 ============
    enable_agentscope_skills: bool = field(
        default_factory=lambda: os.getenv("ENABLE_AGENTSCOPE_SKILLS", "false").lower() == "true"
    )
    """启用 AgentScope 技能系统"""
    
    enable_skill_registry: bool = field(
        default_factory=lambda: os.getenv("ENABLE_SKILL_REGISTRY", "false").lower() == "true"
    )
    """启用技能注册中心"""
    
    enable_composite_skills: bool = field(
        default_factory=lambda: os.getenv("ENABLE_COMPOSITE_SKILLS", "false").lower() == "true"
    )
    """启用组合技能（工作流）"""
    
    # ============ ReAct 配置 ============
    react_max_iterations: int = field(
        default_factory=lambda: int(os.getenv("REACT_MAX_ITERATIONS", "5"))
    )
    """ReAct 最大迭代次数"""
    
    react_enable_trace: bool = field(
        default_factory=lambda: os.getenv("REACT_ENABLE_TRACE", "true").lower() == "true"
    )
    """ReAct 是否启用执行追踪"""
    
    # ============ 协同决策配置 ============
    collaborative_strategy: str = field(
        default_factory=lambda: os.getenv("COLLABORATIVE_STRATEGY", "sequential")
    )
    """协同决策策略: sequential, parallel, debate"""
    
    collaborative_debate_rounds: int = field(
        default_factory=lambda: int(os.getenv("COLLABORATIVE_DEBATE_ROUNDS", "2"))
    )
    """辩论模式轮数"""
    
    # ============ 技能系统配置 ============
    skill_registry_auto_discover: bool = field(
        default_factory=lambda: os.getenv("SKILL_REGISTRY_AUTO_DISCOVER", "true").lower() == "true"
    )
    """技能注册中心是否自动发现技能"""
    
    skill_execution_timeout: int = field(
        default_factory=lambda: int(os.getenv("SKILL_EXECUTION_TIMEOUT", "30"))
    )
    """技能执行超时时间（秒）"""
    
    # ============ 追踪配置 ============
    tracing_max_traces: int = field(
        default_factory=lambda: int(os.getenv("TRACING_MAX_TRACES", "1000"))
    )
    """最大追踪记录数"""
    
    tracing_enable_visualization: bool = field(
        default_factory=lambda: os.getenv("TRACING_ENABLE_VISUALIZATION", "true").lower() == "true"
    )
    """启用追踪可视化"""
    
    def __post_init__(self):
        """初始化后处理"""
        # 根据迁移阶段自动设置功能开关
        if self.migration_phase == MigrationPhase.FULL:
            self._enable_all_features()
        elif self.migration_phase == MigrationPhase.HYBRID:
            self._enable_hybrid_features()
    
    def _enable_all_features(self):
        """启用所有新功能"""
        self.enable_jmanus_react = True
        self.enable_collaborative_decision = True
        self.enable_agent_tracing = True
        self.enable_agentscope_skills = True
        self.enable_skill_registry = True
        self.enable_composite_skills = True
    
    def _enable_hybrid_features(self):
        """启用混合模式功能"""
        # 默认启用安全的、向后兼容的功能
        self.enable_jmanus_react = True
        self.enable_agentscope_skills = True
        self.enable_skill_registry = True
        # 保持其他功能关闭，逐步开启
    
    def is_feature_enabled(self, feature_name: str) -> bool:
        """
        检查功能是否启用
        
        Args:
            feature_name: 功能名称
            
        Returns:
            是否启用
        """
        feature_map = {
            "jmanus_react": self.enable_jmanus_react,
            "collaborative_decision": self.enable_collaborative_decision,
            "agent_tracing": self.enable_agent_tracing,
            "agentscope_skills": self.enable_agentscope_skills,
            "skill_registry": self.enable_skill_registry,
            "composite_skills": self.enable_composite_skills,
        }
        return feature_map.get(feature_name, False)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "migration_phase": self.migration_phase.value,
            "features": {
                "jmanus_react": self.enable_jmanus_react,
                "collaborative_decision": self.enable_collaborative_decision,
                "agent_tracing": self.enable_agent_tracing,
                "agentscope_skills": self.enable_agentscope_skills,
                "skill_registry": self.enable_skill_registry,
                "composite_skills": self.enable_composite_skills,
            },
            "react_config": {
                "max_iterations": self.react_max_iterations,
                "enable_trace": self.react_enable_trace,
            },
            "collaborative_config": {
                "strategy": self.collaborative_strategy,
                "debate_rounds": self.collaborative_debate_rounds,
            },
            "skill_config": {
                "auto_discover": self.skill_registry_auto_discover,
                "execution_timeout": self.skill_execution_timeout,
            },
            "tracing_config": {
                "max_traces": self.tracing_max_traces,
                "enable_visualization": self.tracing_enable_visualization,
            },
        }
    
    @classmethod
    def from_env(cls) -> "IntegrationConfig":
        """从环境变量创建配置"""
        return cls()
    
    @classmethod
    def full_mode(cls) -> "IntegrationConfig":
        """创建完整模式配置"""
        return cls(migration_phase=MigrationPhase.FULL)
    
    @classmethod
    def legacy_mode(cls) -> "IntegrationConfig":
        """创建传统模式配置"""
        return cls(migration_phase=MigrationPhase.LEGACY)


# 全局配置实例
_global_config: Optional[IntegrationConfig] = None


def get_config() -> IntegrationConfig:
    """
    获取全局配置实例
    
    使用单例模式确保全局只有一个配置实例
    """
    global _global_config
    if _global_config is None:
        _global_config = IntegrationConfig.from_env()
    return _global_config


def set_config(config: IntegrationConfig):
    """设置全局配置"""
    global _global_config
    _global_config = config


def reset_config():
    """重置配置为默认值"""
    global _global_config
    _global_config = IntegrationConfig.from_env()
