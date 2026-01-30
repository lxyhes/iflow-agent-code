"""
JManus ReAct 模式适配器

实现类 Manus 的轻量级多 Agent 协同引擎核心能力：
- ReAct 推理循环 (Thought -> Action -> Observation -> Answer)
- Agent 分工策略设计
- 协同决策工作流
"""

import json
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, TypeVar, Generic
from enum import Enum, auto
from abc import ABC, abstractmethod


class ReActStepType(Enum):
    """ReAct 步骤类型"""
    THOUGHT = auto()      # 思考步骤
    ACTION = auto()       # 行动步骤
    OBSERVATION = auto()  # 观察步骤
    ANSWER = auto()       # 最终答案


@dataclass
class ReActStep:
    """
    ReAct 单步记录
    
    记录 ReAct 循环中的每一个步骤，用于追踪和调试
    """
    step_type: ReActStepType
    content: str
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_type": self.step_type.name,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


@dataclass
class ReActTrace:
    """
    ReAct 执行链路追踪
    
    记录完整的 ReAct 推理过程，支持可视化和调试
    """
    trace_id: str
    agent_id: str
    query: str
    steps: List[ReActStep] = field(default_factory=list)
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    final_answer: Optional[str] = None
    
    def add_step(self, step: ReActStep):
        """添加步骤到追踪记录"""
        self.steps.append(step)
    
    def finish(self, answer: str):
        """完成追踪"""
        self.end_time = time.time()
        self.final_answer = answer
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "agent_id": self.agent_id,
            "query": self.query,
            "steps": [s.to_dict() for s in self.steps],
            "duration": (self.end_time or time.time()) - self.start_time,
            "final_answer": self.final_answer,
        }


class Tool(ABC):
    """
    工具抽象基类
    
    符合 AgentScope 技能规范的简化版本
    """
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    @abstractmethod
    async def execute(self, **kwargs) -> str:
        """执行工具，返回观察结果"""
        pass
    
    def get_schema(self) -> Dict[str, Any]:
        """获取工具参数 schema"""
        return {
            "name": self.name,
            "description": self.description,
        }


class JManusReActAgent:
    """
    JManus ReAct Agent 适配器
    
    实现 ReAct (Reasoning + Acting) 模式的核心逻辑：
    1. Thought: 分析当前情况，决定下一步行动
    2. Action: 执行工具/技能
    3. Observation: 观察执行结果
    4. Answer: 综合信息给出最终答案
    
    特性：
    - 支持多轮推理循环
    - 内置工具调用能力
    - 完整的执行链路追踪
    - 可配置的最大迭代次数
    """
    
    def __init__(
        self,
        agent_id: str,
        llm_client: Any,  # 现有的 Agent 类或 LLM 客户端
        tools: Optional[List[Tool]] = None,
        max_iterations: int = 5,
        enable_trace: bool = True,
    ):
        self.agent_id = agent_id
        self.llm_client = llm_client
        self.tools = {tool.name: tool for tool in (tools or [])}
        self.max_iterations = max_iterations
        self.enable_trace = enable_trace
        self.traces: List[ReActTrace] = []
    
    async def react_loop(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        执行 ReAct 推理循环
        
        Args:
            query: 用户查询/问题
            context: 额外上下文信息
            
        Returns:
            最终答案
        """
        trace = ReActTrace(
            trace_id=f"trace_{int(time.time() * 1000)}",
            agent_id=self.agent_id,
            query=query,
        )
        
        # 初始化上下文
        working_context = context or {}
        working_context["query"] = query
        working_context["iteration"] = 0
        
        try:
            for iteration in range(self.max_iterations):
                working_context["iteration"] = iteration
                
                # Step 1: Thought - 分析并决定行动
                thought = await self._think(query, working_context)
                trace.add_step(ReActStep(
                    step_type=ReActStepType.THOUGHT,
                    content=thought,
                    metadata={"iteration": iteration},
                ))
                
                # 检查是否可以直接回答
                if self._should_answer_directly(thought):
                    answer = await self._generate_answer(thought, working_context)
                    trace.add_step(ReActStep(
                        step_type=ReActStepType.ANSWER,
                        content=answer,
                    ))
                    trace.finish(answer)
                    if self.enable_trace:
                        self.traces.append(trace)
                    return answer
                
                # Step 2: Action - 解析并执行行动
                action_name, action_input = self._parse_action(thought)
                if action_name and action_name in self.tools:
                    trace.add_step(ReActStep(
                        step_type=ReActStepType.ACTION,
                        content=f"执行工具: {action_name}",
                        metadata={"tool": action_name, "input": action_input},
                    ))
                    
                    # 执行工具
                    observation = await self._execute_action(action_name, action_input)
                    trace.add_step(ReActStep(
                        step_type=ReActStepType.OBSERVATION,
                        content=observation,
                        metadata={"tool": action_name},
                    ))
                    
                    # 更新上下文
                    working_context[f"observation_{iteration}"] = observation
                    working_context["last_observation"] = observation
                else:
                    # 没有可执行的行动，尝试直接回答
                    answer = await self._generate_answer(thought, working_context)
                    trace.add_step(ReActStep(
                        step_type=ReActStepType.ANSWER,
                        content=answer,
                    ))
                    trace.finish(answer)
                    if self.enable_trace:
                        self.traces.append(trace)
                    return answer
            
            # 达到最大迭代次数，强制生成答案
            final_answer = await self._generate_answer(
                "基于以上观察和思考，给出最终答案",
                working_context,
            )
            trace.add_step(ReActStep(
                step_type=ReActStepType.ANSWER,
                content=final_answer,
                metadata={"forced": True},
            ))
            trace.finish(final_answer)
            if self.enable_trace:
                self.traces.append(trace)
            return final_answer
            
        except Exception as e:
            error_msg = f"ReAct 循环执行出错: {str(e)}"
            trace.add_step(ReActStep(
                step_type=ReActStepType.ANSWER,
                content=error_msg,
                metadata={"error": True},
            ))
            trace.finish(error_msg)
            if self.enable_trace:
                self.traces.append(trace)
            return error_msg
    
    async def _think(self, query: str, context: Dict[str, Any]) -> str:
        """
        思考步骤：分析情况并决定下一步行动
        
        构建 ReAct 格式的提示，引导 LLM 进行推理
        """
        # 构建工具描述
        tools_desc = "\n".join([
            f"- {name}: {tool.description}"
            for name, tool in self.tools.items()
        ])
        
        # 构建 ReAct 提示模板
        prompt = f"""你是一个智能面试官助手，使用 ReAct (Reasoning and Acting) 模式来分析和回答问题。

## 可用工具
{tools_desc if tools_desc else "（无可用工具）"}

## 当前问题
{query}

## 历史上下文
{self._format_context(context)}

## ReAct 格式说明
请按以下格式输出你的思考过程：

Thought: 分析当前情况，决定是否需要使用工具
Action: 如果需要工具，格式为 "工具名[参数]"；如果可以直接回答，输出 "Answer[你的答案]"

或者如果你认为已经有足够信息回答问题：
Thought: 综合分析所有信息
Answer: 给出完整答案

请开始你的思考：
Thought:"""
        
        # 调用 LLM
        response = await self._call_llm(prompt)
        return response.strip()
    
    def _parse_action(self, thought: str) -> tuple[Optional[str], Optional[str]]:
        """
        从思考输出中解析行动
        
        支持格式：
        - Action: 工具名[参数]
        - Answer: 答案内容
        """
        import re
        
        # 匹配 Action: 工具名[参数]
        action_match = re.search(r'Action:\s*(\w+)\[(.*?)\]', thought, re.DOTALL)
        if action_match:
            return action_match.group(1), action_match.group(2)
        
        # 匹配 Action: 工具名
        action_match = re.search(r'Action:\s*(\w+)', thought)
        if action_match:
            return action_match.group(1), ""
        
        return None, None
    
    def _should_answer_directly(self, thought: str) -> bool:
        """判断是否应该直接回答（不需要调用工具）"""
        return "Answer:" in thought or "answer:" in thought.lower()
    
    async def _execute_action(self, action_name: str, action_input: str) -> str:
        """执行工具行动"""
        if action_name not in self.tools:
            return f"错误：未知工具 '{action_name}'"
        
        tool = self.tools[action_name]
        try:
            # 解析参数
            kwargs = {}
            if action_input:
                try:
                    kwargs = json.loads(action_input)
                except json.JSONDecodeError:
                    kwargs = {"input": action_input}
            
            result = await tool.execute(**kwargs)
            return result
        except Exception as e:
            return f"工具执行错误: {str(e)}"
    
    async def _generate_answer(self, thought: str, context: Dict[str, Any]) -> str:
        """基于思考过程生成最终答案"""
        # 提取 Thought 和 Answer
        import re
        
        answer_match = re.search(r'Answer:\s*(.+)', thought, re.DOTALL)
        if answer_match:
            return answer_match.group(1).strip()
        
        # 如果没有明确标记，使用 thought 作为答案
        return thought.strip()
    
    async def _call_llm(self, prompt: str) -> str:
        """
        调用 LLM 客户端
        
        适配现有的 Agent 类或 LLM 客户端
        """
        # 如果 llm_client 是现有的 Agent 类
        if hasattr(self.llm_client, 'chat'):
            response = await self.llm_client.chat(prompt)
            return response
        
        # 如果 llm_client 是同步函数
        if callable(self.llm_client):
            import asyncio
            if asyncio.iscoroutinefunction(self.llm_client):
                return await self.llm_client(prompt)
            else:
                return self.llm_client(prompt)
        
        # 默认返回提示（用于测试）
        return f"Thought: 需要更多信息来回答这个问题\nAction: search[相关知识点]"
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """格式化上下文信息"""
        lines = []
        for key, value in context.items():
            if key.startswith("observation_"):
                lines.append(f"观察结果 {key}: {value}")
            elif key == "last_observation":
                lines.append(f"最新观察: {value}")
        return "\n".join(lines) if lines else "（无历史上下文）"
    
    def get_traces(self) -> List[ReActTrace]:
        """获取所有执行链路追踪"""
        return self.traces.copy()
    
    def get_latest_trace(self) -> Optional[ReActTrace]:
        """获取最新的执行链路"""
        return self.traces[-1] if self.traces else None
    
    def clear_traces(self):
        """清空追踪记录"""
        self.traces.clear()


class AgentRole(Enum):
    """Agent 角色定义（用于协同决策）"""
    PLANNER = auto()      # 规划者
    EXECUTOR = auto()     # 执行者
    REVIEWER = auto()     # 审查者
    COORDINATOR = auto()  # 协调者
    SPECIALIST = auto()   # 专家


@dataclass
class AgentProfile:
    """Agent 配置文件"""
    agent_id: str
    role: AgentRole
    expertise: List[str]  # 专长领域
    priority: int = 1     # 决策优先级
    can_delegate: bool = True  # 是否可以委派任务


class JManusCoordinator:
    """
    JManus 风格的多 Agent 协调器
    
    实现 Agent 分工策略设计和协同决策工作流
    """
    
    def __init__(self):
        self.agents: Dict[str, JManusReActAgent] = {}
        self.profiles: Dict[str, AgentProfile] = {}
        self.message_bus: List[Dict] = []  # 简化版消息总线
    
    def register_agent(
        self,
        agent_id: str,
        agent: JManusReActAgent,
        profile: AgentProfile,
    ):
        """注册 Agent"""
        self.agents[agent_id] = agent
        self.profiles[agent_id] = profile
    
    async def collaborative_solve(
        self,
        problem: str,
        agent_ids: Optional[List[str]] = None,
        strategy: str = "sequential",  # sequential, parallel, debate
    ) -> Dict[str, Any]:
        """
        多 Agent 协同解决问题
        
        Args:
            problem: 待解决的问题
            agent_ids: 参与协作的 Agent ID 列表
            strategy: 协作策略
            
        Returns:
            包含各 Agent 答案和最终共识的结果
        """
        agents_to_use = agent_ids or list(self.agents.keys())
        
        if strategy == "sequential":
            return await self._sequential_solve(problem, agents_to_use)
        elif strategy == "parallel":
            return await self._parallel_solve(problem, agents_to_use)
        elif strategy == "debate":
            return await self._debate_solve(problem, agents_to_use)
        else:
            raise ValueError(f"未知策略: {strategy}")
    
    async def _sequential_solve(
        self,
        problem: str,
        agent_ids: List[str],
    ) -> Dict[str, Any]:
        """顺序执行策略"""
        results = {}
        context = {"problem": problem}
        
        for agent_id in agent_ids:
            agent = self.agents[agent_id]
            result = await agent.react_loop(problem, context)
            results[agent_id] = result
            context[f"result_{agent_id}"] = result
        
        return {
            "strategy": "sequential",
            "results": results,
            "final_answer": results.get(agent_ids[-1], ""),
        }
    
    async def _parallel_solve(
        self,
        problem: str,
        agent_ids: List[str],
    ) -> Dict[str, Any]:
        """并行执行策略"""
        import asyncio
        
        tasks = [
            self.agents[agent_id].react_loop(problem)
            for agent_id in agent_ids
        ]
        results_list = await asyncio.gather(*tasks)
        
        results = {
            agent_id: result
            for agent_id, result in zip(agent_ids, results_list)
        }
        
        # 简单多数投票决定最终答案
        final_answer = self._vote_consensus(results)
        
        return {
            "strategy": "parallel",
            "results": results,
            "final_answer": final_answer,
        }
    
    async def _debate_solve(
        self,
        problem: str,
        agent_ids: List[str],
        rounds: int = 2,
    ) -> Dict[str, Any]:
        """辩论模式：多轮讨论后达成共识"""
        context = {"problem": problem, "round": 0}
        debate_history = []
        
        for round_num in range(rounds):
            context["round"] = round_num
            round_results = {}
            
            for agent_id in agent_ids:
                agent = self.agents[agent_id]
                prompt = f"""基于以下问题和其他 Agent 的观点，给出你的看法：

问题: {problem}

辩论历史:
{self._format_debate_history(debate_history)}

请给出你的分析和观点。"""
                result = await agent.react_loop(prompt, context)
                round_results[agent_id] = result
            
            debate_history.append({
                "round": round_num,
                "results": round_results,
            })
        
        # 最终投票
        final_results = debate_history[-1]["results"]
        final_answer = self._vote_consensus(final_results)
        
        return {
            "strategy": "debate",
            "debate_history": debate_history,
            "final_answer": final_answer,
        }
    
    def _vote_consensus(self, results: Dict[str, str]) -> str:
        """简单投票达成共识（简化版）"""
        # 实际实现中可以使用更复杂的共识算法
        # 这里简单返回第一个结果
        return list(results.values())[0] if results else ""
    
    def _format_debate_history(self, history: List[Dict]) -> str:
        """格式化辩论历史"""
        lines = []
        for round_info in history:
            lines.append(f"第 {round_info['round'] + 1} 轮:")
            for agent_id, result in round_info["results"].items():
                lines.append(f"  {agent_id}: {result[:100]}...")
        return "\n".join(lines)
