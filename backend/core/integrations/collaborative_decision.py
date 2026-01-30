"""
协同决策引擎

实现多 Agent 协同决策工作流：
- 多 Agent 投票机制
- 辩论/讨论模式
- 共识达成算法
- 决策追踪和解释
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable
from enum import Enum, auto
import time
import asyncio


class DecisionStrategy(Enum):
    """决策策略"""
    MAJORITY_VOTE = auto()      # 多数投票
    WEIGHTED_VOTE = auto()      # 加权投票
    UNANIMOUS = auto()          # 一致同意
    CONSENSUS = auto()          # 共识达成
    DELEGATION = auto()         # 委派决策


@dataclass
class DecisionContext:
    """决策上下文"""
    problem: str
    options: List[str]
    constraints: List[str] = field(default_factory=list)
    deadline: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentOpinion:
    """Agent 意见"""
    agent_id: str
    choice: str
    confidence: float  # 0-1
    reasoning: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class DecisionResult:
    """决策结果"""
    decision: str
    confidence: float
    strategy: DecisionStrategy
    opinions: List[AgentOpinion]
    consensus_level: float  # 0-1，一致性程度
    execution_trace: List[Dict] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)


class CollaborativeDecisionEngine:
    """
    协同决策引擎
    
    实现多 Agent 协同决策的多种策略：
    1. 多数投票：简单多数决定
    2. 加权投票：根据 Agent 权重投票
    3. 一致同意：所有 Agent 必须同意
    4. 共识达成：通过讨论达成共识
    5. 委派决策：指定专家 Agent 决策
    
    特性：
    - 支持实时决策和异步决策
    - 完整的决策链路追踪
    - 可解释的决策过程
    - 可配置的共识阈值
    """
    
    def __init__(
        self,
        default_strategy: DecisionStrategy = DecisionStrategy.CONSENSUS,
        consensus_threshold: float = 0.7,
        max_debate_rounds: int = 3,
    ):
        self.default_strategy = default_strategy
        self.consensus_threshold = consensus_threshold
        self.max_debate_rounds = max_debate_rounds
        self.agents: Dict[str, Any] = {}  # agent_id -> agent
        self.agent_weights: Dict[str, float] = {}  # agent_id -> weight
        self.decision_history: List[DecisionResult] = []
    
    def register_agent(
        self,
        agent_id: str,
        agent: Any,
        weight: float = 1.0,
        expertise: Optional[List[str]] = None,
    ):
        """注册决策 Agent"""
        self.agents[agent_id] = {
            "agent": agent,
            "weight": weight,
            "expertise": expertise or [],
        }
        self.agent_weights[agent_id] = weight
    
    async def make_decision(
        self,
        context: DecisionContext,
        strategy: Optional[DecisionStrategy] = None,
        agent_ids: Optional[List[str]] = None,
    ) -> DecisionResult:
        """
        执行协同决策
        
        Args:
            context: 决策上下文
            strategy: 决策策略
            agent_ids: 参与决策的 Agent ID 列表
            
        Returns:
            决策结果
        """
        strategy = strategy or self.default_strategy
        agents_to_use = agent_ids or list(self.agents.keys())
        
        # 收集各 Agent 意见
        opinions = await self._gather_opinions(context, agents_to_use)
        
        # 根据策略执行决策
        if strategy == DecisionStrategy.MAJORITY_VOTE:
            return self._majority_vote(opinions, context)
        elif strategy == DecisionStrategy.WEIGHTED_VOTE:
            return self._weighted_vote(opinions, context)
        elif strategy == DecisionStrategy.UNANIMOUS:
            return self._unanimous_decision(opinions, context)
        elif strategy == DecisionStrategy.CONSENSUS:
            return await self._consensus_decision(opinions, context, agents_to_use)
        elif strategy == DecisionStrategy.DELEGATION:
            return await self._delegation_decision(opinions, context)
        else:
            raise ValueError(f"未知的决策策略: {strategy}")
    
    async def _gather_opinions(
        self,
        context: DecisionContext,
        agent_ids: List[str],
    ) -> List[AgentOpinion]:
        """收集各 Agent 的意见"""
        opinions = []
        
        tasks = []
        for agent_id in agent_ids:
            if agent_id in self.agents:
                agent_info = self.agents[agent_id]
                task = self._get_agent_opinion(agent_id, agent_info, context)
                tasks.append(task)
        
        # 并行收集意见
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                # 记录错误但继续
                continue
            if result:
                opinions.append(result)
        
        return opinions
    
    async def _get_agent_opinion(
        self,
        agent_id: str,
        agent_info: Dict,
        context: DecisionContext,
    ) -> Optional[AgentOpinion]:
        """获取单个 Agent 的意见"""
        try:
            agent = agent_info["agent"]
            
            # 构建决策提示
            prompt = f"""请对以下问题给出你的决策意见：

问题：{context.problem}

选项：
{chr(10).join(f"- {opt}" for opt in context.options)}

约束条件：
{chr(10).join(f"- {con}" for con in context.constraints) if context.constraints else "无"}

请输出：
1. 你的选择（从选项中选择）
2. 置信度（0-1）
3. 决策理由

格式：
选择: <选项>
置信度: <0-1>
理由: <详细理由>"""
            
            # 调用 Agent
            if hasattr(agent, 'chat'):
                response = await agent.chat(prompt)
            elif callable(agent):
                if asyncio.iscoroutinefunction(agent):
                    response = await agent(prompt)
                else:
                    response = agent(prompt)
            else:
                return None
            
            # 解析响应
            return self._parse_opinion(agent_id, response)
            
        except Exception as e:
            # 返回低置信度的默认意见
            return AgentOpinion(
                agent_id=agent_id,
                choice=context.options[0] if context.options else "unknown",
                confidence=0.1,
                reasoning=f"决策过程出错: {str(e)}",
            )
    
    def _parse_opinion(self, agent_id: str, response: str) -> AgentOpinion:
        """解析 Agent 响应为意见对象"""
        import re
        
        # 提取选择
        choice_match = re.search(r'选择[:：]\s*(.+)', response)
        choice = choice_match.group(1).strip() if choice_match else "unknown"
        
        # 提取置信度
        confidence_match = re.search(r'置信度[:：]\s*(\d*\.?\d+)', response)
        confidence = float(confidence_match.group(1)) if confidence_match else 0.5
        confidence = max(0, min(1, confidence))  # 限制在 0-1
        
        # 提取理由
        reasoning_match = re.search(r'理由[:：]\s*(.+)', response, re.DOTALL)
        reasoning = reasoning_match.group(1).strip() if reasoning_match else response[:200]
        
        return AgentOpinion(
            agent_id=agent_id,
            choice=choice,
            confidence=confidence,
            reasoning=reasoning,
        )
    
    def _majority_vote(
        self,
        opinions: List[AgentOpinion],
        context: DecisionContext,
    ) -> DecisionResult:
        """多数投票决策"""
        from collections import Counter
        
        # 统计票数
        votes = Counter(op.choice for op in opinions)
        winner = votes.most_common(1)[0]
        
        # 计算置信度
        total_votes = len(opinions)
        confidence = winner[1] / total_votes if total_votes > 0 else 0
        
        # 计算共识程度
        consensus = confidence
        
        result = DecisionResult(
            decision=winner[0],
            confidence=confidence,
            strategy=DecisionStrategy.MAJORITY_VOTE,
            opinions=opinions,
            consensus_level=consensus,
        )
        
        self.decision_history.append(result)
        return result
    
    def _weighted_vote(
        self,
        opinions: List[AgentOpinion],
        context: DecisionContext,
    ) -> DecisionResult:
        """加权投票决策"""
        from collections import defaultdict
        
        # 统计加权票数
        weighted_votes = defaultdict(float)
        total_weight = 0
        
        for opinion in opinions:
            weight = self.agent_weights.get(opinion.agent_id, 1.0)
            weighted_votes[opinion.choice] += weight * opinion.confidence
            total_weight += weight
        
        # 找出胜者
        winner = max(weighted_votes.items(), key=lambda x: x[1])
        confidence = winner[1] / total_weight if total_weight > 0 else 0
        
        result = DecisionResult(
            decision=winner[0],
            confidence=confidence,
            strategy=DecisionStrategy.WEIGHTED_VOTE,
            opinions=opinions,
            consensus_level=confidence,
        )
        
        self.decision_history.append(result)
        return result
    
    def _unanimous_decision(
        self,
        opinions: List[AgentOpinion],
        context: DecisionContext,
    ) -> DecisionResult:
        """一致同意决策"""
        choices = set(op.choice for op in opinions)
        
        if len(choices) == 1:
            # 完全一致
            decision = choices.pop()
            confidence = sum(op.confidence for op in opinions) / len(opinions)
            consensus = 1.0
        else:
            # 未达成一致，选择置信度最高的
            best_opinion = max(opinions, key=lambda op: op.confidence)
            decision = best_opinion.choice
            confidence = best_opinion.confidence
            consensus = 1.0 / len(choices)
        
        result = DecisionResult(
            decision=decision,
            confidence=confidence,
            strategy=DecisionStrategy.UNANIMOUS,
            opinions=opinions,
            consensus_level=consensus,
        )
        
        self.decision_history.append(result)
        return result
    
    async def _consensus_decision(
        self,
        initial_opinions: List[AgentOpinion],
        context: DecisionContext,
        agent_ids: List[str],
    ) -> DecisionResult:
        """共识达成决策（带辩论）"""
        opinions = initial_opinions
        debate_history = []
        
        for round_num in range(self.max_debate_rounds):
            # 检查是否已达成共识
            consensus_level = self._calculate_consensus(opinions)
            
            if consensus_level >= self.consensus_threshold:
                break
            
            # 进行辩论
            debate_result = await self._debate_round(
                context, opinions, agent_ids, round_num
            )
            debate_history.append(debate_result)
            
            # 更新意见
            opinions = debate_result["updated_opinions"]
        
        # 最终投票
        final_consensus = self._calculate_consensus(opinions)
        
        # 选择多数意见
        from collections import Counter
        votes = Counter(op.choice for op in opinions)
        winner = votes.most_common(1)[0]
        
        result = DecisionResult(
            decision=winner[0],
            confidence=winner[1] / len(opinions),
            strategy=DecisionStrategy.CONSENSUS,
            opinions=opinions,
            consensus_level=final_consensus,
            execution_trace=debate_history,
        )
        
        self.decision_history.append(result)
        return result
    
    async def _debate_round(
        self,
        context: DecisionContext,
        current_opinions: List[AgentOpinion],
        agent_ids: List[str],
        round_num: int,
    ) -> Dict[str, Any]:
        """执行一轮辩论"""
        # 收集不同观点
        opinion_groups = {}
        for op in current_opinions:
            if op.choice not in opinion_groups:
                opinion_groups[op.choice] = []
            opinion_groups[op.choice].append(op)
        
        # 让持有少数意见的 Agent 重新考虑
        updated_opinions = []
        
        for agent_id in agent_ids:
            current_op = next((op for op in current_opinions if op.agent_id == agent_id), None)
            if not current_op:
                continue
            
            # 构建辩论提示
            other_opinions = [op for op in current_opinions if op.agent_id != agent_id]
            
            debate_prompt = f"""第 {round_num + 1} 轮辩论：

你的当前立场：{current_op.choice}
你的理由：{current_op.reasoning}

其他 Agent 的观点：
{chr(10).join(f"- {op.agent_id}: 选择 '{op.choice}'，理由：{op.reasoning[:100]}..." for op in other_opinions)}

请重新考虑你的决策。你可以：
1. 坚持原观点（如果认为自己是正确的）
2. 改变观点（如果被其他 Agent 说服）

请输出你的最终选择和理由。"""
            
            # 获取更新后的意见
            if agent_id in self.agents:
                agent_info = self.agents[agent_id]
                new_opinion = await self._get_agent_opinion(agent_id, agent_info, context)
                if new_opinion:
                    updated_opinions.append(new_opinion)
                else:
                    updated_opinions.append(current_op)
            else:
                updated_opinions.append(current_op)
        
        return {
            "round": round_num,
            "updated_opinions": updated_opinions,
            "opinion_groups": {k: len(v) for k, v in opinion_groups.items()},
        }
    
    def _calculate_consensus(self, opinions: List[AgentOpinion]) -> float:
        """计算共识程度"""
        if not opinions:
            return 0.0
        
        from collections import Counter
        votes = Counter(op.choice for op in opinions)
        
        # 最大票数占比
        max_votes = votes.most_common(1)[0][1]
        return max_votes / len(opinions)
    
    async def _delegation_decision(
        self,
        opinions: List[AgentOpinion],
        context: DecisionContext,
    ) -> DecisionResult:
        """委派决策（选择最自信的 Agent）"""
        if not opinions:
            return DecisionResult(
                decision="unknown",
                confidence=0,
                strategy=DecisionStrategy.DELEGATION,
                opinions=[],
                consensus_level=0,
            )
        
        # 选择置信度最高的 Agent
        best_opinion = max(opinions, key=lambda op: op.confidence)
        
        result = DecisionResult(
            decision=best_opinion.choice,
            confidence=best_opinion.confidence,
            strategy=DecisionStrategy.DELEGATION,
            opinions=opinions,
            consensus_level=best_opinion.confidence,
        )
        
        self.decision_history.append(result)
        return result
    
    def get_decision_history(self) -> List[DecisionResult]:
        """获取决策历史"""
        return self.decision_history.copy()
    
    def explain_decision(self, result: DecisionResult) -> str:
        """解释决策过程"""
        lines = [
            f"决策结果: {result.decision}",
            f"置信度: {result.confidence:.2%}",
            f"共识程度: {result.consensus_level:.2%}",
            f"决策策略: {result.strategy.name}",
            "",
            "各 Agent 意见：",
        ]
        
        for op in result.opinions:
            lines.append(f"  - {op.agent_id}: {op.choice} (置信度: {op.confidence:.2%})")
            lines.append(f"    理由: {op.reasoning[:100]}...")
        
        if result.execution_trace:
            lines.append("")
            lines.append("辩论过程：")
            for trace in result.execution_trace:
                lines.append(f"  第 {trace.get('round', 0) + 1} 轮")
        
        return "\n".join(lines)
