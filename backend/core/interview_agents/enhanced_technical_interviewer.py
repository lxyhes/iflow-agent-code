"""
增强版技术面试官 Agent

集成 JManus ReAct 模式和 AgentScope 技能系统
"""

from typing import Optional, Dict, Any, List, AsyncGenerator
import time

from .technical_interviewer import TechnicalInterviewerAgent
from ..integrations.jmanus_adapter import JManusReActAgent, Tool
from ..integrations.agentscope_wrapper import (
    AgentScopeSkillRegistry,
    SkillContext,
)
from ..integrations.config import get_config
from .skills import (
    CodeExecutionSkill,
    AlgorithmAnalysisSkill,
    KnowledgeRetrievalSkill,
    SolutionComparisonSkill,
)


class EnhancedTechnicalInterviewer(TechnicalInterviewerAgent):
    """
    增强版技术面试官 Agent
    
    在原有 TechnicalInterviewerAgent 基础上集成：
    - JManus ReAct 推理模式
    - AgentScope 技能系统
    - 代码执行和验证能力
    - 算法复杂度分析
    - 知识点检索
    - 多方案对比
    
    特性：
    - 向后兼容：原有功能完全保留
    - 渐进增强：通过配置开关启用新功能
    - 可观测：完整的执行链路追踪
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # 获取配置
        self.config = get_config()
        
        # 初始化技能注册中心
        self.skill_registry = AgentScopeSkillRegistry()
        self._init_skills()
        
        # 初始化 ReAct Agent（如果启用）
        self.react_agent: Optional[JManusReActAgent] = None
        if self.config.enable_jmanus_react:
            self._init_react_agent()
        
        # 执行统计
        self._evaluations_with_react = 0
        self._evaluations_with_skills = 0
    
    def _init_skills(self):
        """初始化技术面试专用技能"""
        if not self.config.enable_agentscope_skills:
            return
        
        # 注册技能
        self.skill_registry \
            .register(CodeExecutionSkill(), category="execution") \
            .register(AlgorithmAnalysisSkill(), category="analysis") \
            .register(KnowledgeRetrievalSkill(), category="knowledge") \
            .register(SolutionComparisonSkill(), category="evaluation")
    
    def _init_react_agent(self):
        """初始化 ReAct Agent"""
        # 将技能转换为 ReAct 工具
        tools = self._skills_to_tools()
        
        self.react_agent = JManusReActAgent(
            agent_id=f"enhanced_tech_interviewer_{id(self)}",
            llm_client=self,  # 使用自身作为 LLM 客户端
            tools=tools,
            max_iterations=self.config.react_max_iterations,
            enable_trace=self.config.react_enable_trace,
        )
    
    def _skills_to_tools(self) -> List[Tool]:
        """将 AgentScope 技能转换为 ReAct 工具"""
        tools = []
        
        for skill_name in self.skill_registry.list_skills():
            skill = self.skill_registry.get(skill_name)
            if skill:
                # 创建适配器类
                tool = SkillToolAdapter(skill)
                tools.append(tool)
        
        return tools
    
    async def evaluate_answer(
        self,
        question: str,
        answer: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        评估候选人回答（增强版）
        
        如果启用了 ReAct 模式，使用 ReAct 循环进行深度评估；
        否则回退到原有实现。
        """
        # 如果未启用增强功能，使用原有实现
        if not self.config.enable_jmanus_react and not self.config.enable_agentscope_skills:
            return await super().evaluate_answer(question, answer, context)
        
        # 使用 ReAct 模式评估
        if self.config.enable_jmanus_react and self.react_agent:
            return await self._evaluate_with_react(question, answer, context)
        
        # 仅使用技能系统评估
        if self.config.enable_agentscope_skills:
            return await self._evaluate_with_skills(question, answer, context)
        
        # 默认回退
        return await super().evaluate_answer(question, answer, context)
    
    async def _evaluate_with_react(
        self,
        question: str,
        answer: str,
        context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        使用 ReAct 模式评估
        
        ReAct 循环：
        1. Thought: 分析回答质量
        2. Action: 调用技能验证（代码执行、复杂度分析等）
        3. Observation: 获取验证结果
        4. Answer: 综合评分和反馈
        """
        self._evaluations_with_react += 1
        
        # 构建评估查询
        eval_query = f"""评估候选人的技术回答：

问题：{question}

候选人回答：
{answer}

请使用可用工具验证回答的正确性，分析代码质量，并给出综合评分（0-100）。
评估维度：
1. 正确性：代码是否能正确运行
2. 效率：时间复杂度和空间复杂度
3. 可读性：代码结构和命名
4. 完整性：是否考虑边界情况

请给出评分和详细反馈。"""
        
        # 执行 ReAct 循环
        react_result = await self.react_agent.react_loop(
            query=eval_query,
            context={
                "question": question,
                "answer": answer,
                **(context or {}),
            },
        )
        
        # 解析 ReAct 结果
        evaluation = self._parse_react_evaluation(react_result)
        
        # 添加执行链路追踪
        if self.config.enable_agent_tracing:
            evaluation["react_trace"] = self.react_agent.get_latest_trace()
        
        return evaluation
    
    async def _evaluate_with_skills(
        self,
        question: str,
        answer: str,
        context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """使用技能系统评估"""
        self._evaluations_with_skills += 1
        
        skill_context = SkillContext(
            session_id=context.get("session_id") if context else None,
            agent_id="enhanced_tech_interviewer",
            metadata=context or {},
        )
        
        evaluation = {
            "score": 0,
            "feedback": "",
            "skill_results": {},
        }
        
        # 如果回答包含代码，执行代码验证
        if "```" in answer or "def " in answer or "class " in answer:
            code = self._extract_code(answer)
            if code:
                # 执行代码
                code_skill = self.skill_registry.get("code_execution")
                if code_skill:
                    result = await code_skill.run(
                        context=skill_context,
                        code=code,
                        language="python",
                    )
                    evaluation["skill_results"]["code_execution"] = result
                
                # 分析算法复杂度
                algo_skill = self.skill_registry.get("algorithm_analysis")
                if algo_skill:
                    result = await algo_skill.run(
                        context=skill_context,
                        code=code,
                        language="python",
                        detailed=True,
                    )
                    evaluation["skill_results"]["algorithm_analysis"] = result
        
        # 检索相关知识点
        knowledge_skill = self.skill_registry.get("knowledge_retrieval")
        if knowledge_skill:
            result = await knowledge_skill.run(
                context=skill_context,
                query=question,
                category="algorithm",
                limit=2,
            )
            evaluation["skill_results"]["knowledge_retrieval"] = result
        
        # 综合评分
        evaluation["score"] = self._calculate_skill_based_score(evaluation["skill_results"])
        evaluation["feedback"] = self._generate_skill_based_feedback(evaluation["skill_results"])
        
        return evaluation
    
    def _parse_react_evaluation(self, react_result: str) -> Dict[str, Any]:
        """解析 ReAct 评估结果"""
        # 尝试从 ReAct 输出中提取评分
        import re
        
        score_match = re.search(r'(\d{1,3})\s*分', react_result)
        score = int(score_match.group(1)) if score_match else 70
        score = min(100, max(0, score))  # 限制在 0-100
        
        return {
            "score": score,
            "feedback": react_result,
            "evaluation_method": "react",
        }
    
    def _calculate_skill_based_score(self, skill_results: Dict[str, Any]) -> int:
        """基于技能结果计算综合评分"""
        scores = []
        
        # 代码执行评分
        if "code_execution" in skill_results:
            code_result = skill_results["code_execution"]
            if code_result.get("success"):
                scores.append(80)
                if code_result.get("test_passed"):
                    scores.append(20)
            else:
                scores.append(30)
        
        # 算法分析评分
        if "algorithm_analysis" in skill_results:
            algo_result = skill_results["algorithm_analysis"]
            time_complexity = algo_result.get("time_complexity", {}).get("dominant", "")
            if "O(1)" in time_complexity or "O(log n)" in time_complexity:
                scores.append(95)
            elif "O(n)" in time_complexity:
                scores.append(85)
            elif "O(n log n)" in time_complexity:
                scores.append(75)
            else:
                scores.append(60)
        
        return int(sum(scores) / len(scores)) if scores else 70
    
    def _generate_skill_based_feedback(self, skill_results: Dict[str, Any]) -> str:
        """基于技能结果生成反馈"""
        feedback_parts = []
        
        if "code_execution" in skill_results:
            result = skill_results["code_execution"]
            if result.get("success"):
                feedback_parts.append("✅ 代码可以正确执行")
                if result.get("test_passed"):
                    feedback_parts.append("✅ 通过了所有测试用例")
            else:
                feedback_parts.append(f"❌ 代码执行失败: {result.get('error', '未知错误')}")
        
        if "algorithm_analysis" in skill_results:
            result = skill_results["algorithm_analysis"]
            time_comp = result.get("time_complexity", {}).get("dominant", "未知")
            space_comp = result.get("space_complexity", {}).get("dominant", "未知")
            feedback_parts.append(f"📊 时间复杂度: {time_comp}")
            feedback_parts.append(f"📊 空间复杂度: {space_comp}")
            
            # 添加优化建议
            optimizations = result.get("optimizations", [])
            if optimizations:
                feedback_parts.append("💡 优化建议:")
                for opt in optimizations[:2]:
                    feedback_parts.append(f"  - {opt.get('description', '')}")
        
        return "\n".join(feedback_parts)
    
    def _extract_code(self, text: str) -> Optional[str]:
        """从文本中提取代码块"""
        import re
        
        # 匹配 markdown 代码块
        code_match = re.search(r'```(?:\w+)?\n(.*?)```', text, re.DOTALL)
        if code_match:
            return code_match.group(1).strip()
        
        # 匹配缩进代码块（简化处理）
        lines = text.split('\n')
        code_lines = []
        in_code = False
        
        for line in lines:
            if line.strip().startswith('def ') or line.strip().startswith('class '):
                in_code = True
            if in_code:
                code_lines.append(line)
        
        return '\n'.join(code_lines) if code_lines else None
    
    async def compare_solutions(
        self,
        solutions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        对比多个解决方案
        
        使用 SolutionComparisonSkill 对比不同方案
        """
        if not self.config.enable_agentscope_skills:
            return {"error": "技能系统未启用"}
        
        skill = self.skill_registry.get("solution_comparison")
        if not skill:
            return {"error": "解决方案对比技能未找到"}
        
        context = SkillContext(agent_id="enhanced_tech_interviewer")
        result = await skill.run(context=context, solutions=solutions)
        
        return result
    
    def get_stats(self) -> Dict[str, Any]:
        """获取增强版 Agent 统计信息"""
        base_stats = {
            "evaluations_with_react": self._evaluations_with_react,
            "evaluations_with_skills": self._evaluations_with_skills,
            "config": self.config.to_dict(),
        }
        
        if self.config.enable_agentscope_skills:
            base_stats["skill_registry"] = self.skill_registry.get_stats()
        
        if self.config.enable_jmanus_react and self.react_agent:
            base_stats["react_traces_count"] = len(self.react_agent.get_traces())
        
        return base_stats


class SkillToolAdapter(Tool):
    """
    AgentScope Skill 到 ReAct Tool 的适配器
    
    使 AgentScope 技能可以在 ReAct 循环中使用
    """
    
    def __init__(self, skill):
        super().__init__(
            name=skill.name,
            description=skill.description,
        )
        self.skill = skill
    
    async def execute(self, **kwargs) -> str:
        """执行技能并返回字符串结果"""
        try:
            result = await self.skill.run(**kwargs)
            
            # 将结果转换为字符串
            if isinstance(result, dict):
                return f"{self.name} 执行结果:\n" + "\n".join(
                    f"  {k}: {v}" for k, v in result.items()
                )
            elif isinstance(result, list):
                return f"{self.name} 返回 {len(result)} 条结果"
            else:
                return str(result)
        except Exception as e:
            return f"执行失败: {str(e)}"
