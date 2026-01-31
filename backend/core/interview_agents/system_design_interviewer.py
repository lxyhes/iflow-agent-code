"""
系统设计面试官智能体

专注于系统架构设计能力评估，包括可扩展性、高可用性、性能优化等。
这是高薪职位（P7+）面试的核心考察点。
"""

from typing import Any, Dict, List

from backend.core.agent import Agent

from .base_interviewer import (
    Answer,
    BaseInterviewerAgent,
    Evaluation,
    InterviewerType,
    Question,
    QuestionStrategy,
)


class SystemDesignInterviewerAgent(BaseInterviewerAgent):
    """
    系统设计面试官智能体

    负责评估候选人的系统架构设计能力，包括：
    - 可扩展性设计（Scalability）
    - 高可用性设计（Availability）
    - 数据一致性（Consistency）
    - 性能优化（Performance）
    - 安全设计（Security）
    - 成本效益（Cost Efficiency）
    - 技术选型能力
    - 故障排查能力
    """

    def __init__(
        self,
        agent: Agent,
        name: str = "系统设计面试官",
        weight: float = 1.3,  # 系统设计权重最高
        question_strategy: QuestionStrategy = QuestionStrategy.ADAPTIVE,
    ):
        super().__init__(
            agent=agent,
            interviewer_type=InterviewerType.SYSTEM_DESIGN,
            name=name,
            persona="资深架构师，拥有15年以上大型分布式系统设计经验，曾主导过百万级QPS系统的架构设计",
            weight=weight,
            question_strategy=question_strategy,
        )
        self.evaluation_dimensions = [
            "scalability",           # 可扩展性
            "availability",          # 高可用性
            "consistency",           # 数据一致性
            "performance",           # 性能优化
            "security",              # 安全设计
            "cost_efficiency",       # 成本效益
            "tech_decision",         # 技术选型
            "troubleshooting",       # 故障排查
        ]

    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        return """你是一位经验丰富的系统架构师，专注于评估候选人的系统设计能力。

## 你的背景
- 15年以上大型分布式系统架构经验
- 曾主导设计百万级QPS的电商系统
- 精通微服务架构、云原生技术、大数据处理
- 面试风格：注重实际场景、关注设计权衡、深挖技术细节

## 评估维度
1. **可扩展性（Scalability）**：水平扩展、负载均衡、无状态设计
2. **高可用性（Availability）**：故障转移、降级策略、容灾设计
3. **数据一致性（Consistency）**：CAP权衡、分布式事务、最终一致性
4. **性能优化（Performance）**：缓存策略、异步处理、数据库优化
5. **安全设计（Security）**：身份认证、权限控制、数据加密
6. **成本效益（Cost Efficiency）**：资源利用、技术选型成本
7. **技术选型（Tech Decision）**：技术栈选择的合理性
8. **故障排查（Troubleshooting）**：问题定位、根因分析

## 提问策略
- 从实际业务场景出发（如：设计一个秒杀系统）
- 逐步深入：从宏观架构到具体实现细节
- 关注权衡：每个设计决策的优缺点
- 压力测试：质疑设计选择，观察应变能力

## 评分标准（0-100分）
- 90-100：卓越，具备架构师水平，考虑全面且有深度
- 80-89：优秀，设计合理，能处理复杂场景
- 70-79：良好，基本设计能力具备，但缺乏深度
- 60-69：及格，有基本概念，但缺乏实践经验
- <60：不及格，缺乏系统设计基础

请始终保持专业、严谨的态度，关注设计的合理性和可行性。"""

    async def generate_question(
        self,
        candidate_profile: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> Question:
        """生成系统设计问题"""
        experience = candidate_profile.get("experience_years", 0)
        target_position = candidate_profile.get("target_position", "")
        skills = candidate_profile.get("skills", [])

        # 根据经验确定难度
        difficulty = self._calculate_difficulty(experience)

        # 选择评估维度
        asked_dimensions = [h.get("dimension", "") for h in interview_history]
        remaining_dimensions = [
            d for d in self.evaluation_dimensions if d not in asked_dimensions
        ]
        target_dimension = remaining_dimensions[0] if remaining_dimensions else "scalability"

        # 系统设计场景库
        scenarios = {
            "scalability": [
                "设计一个支持百万用户同时在线的即时通讯系统",
                "设计一个日活千万的新闻推荐系统",
                "设计一个支持高并发的电商秒杀系统",
            ],
            "availability": [
                "设计一个99.99%可用性的支付系统",
                "设计一个多活数据中心架构",
                "设计一个故障自动转移的分布式缓存系统",
            ],
            "consistency": [
                "设计一个分布式订单系统，保证数据一致性",
                "设计一个跨地域的数据同步方案",
                "设计一个最终一致性的库存系统",
            ],
            "performance": [
                "设计一个支持万级QPS的短链服务",
                "设计一个高性能的实时排行榜系统",
                "设计一个低延迟的实时推荐系统",
            ],
            "security": [
                "设计一个安全的用户认证系统",
                "设计一个防止爬虫的内容保护系统",
                "设计一个数据加密传输的通信系统",
            ],
            "cost_efficiency": [
                "设计一个成本优化的日志存储系统",
                "设计一个冷热数据分离的存储方案",
                "设计一个Serverless架构的API网关",
            ],
            "tech_decision": [
                "为什么选择微服务架构而不是单体架构？",
                "如何为一个新项目选择数据库类型？",
                "什么时候应该选择消息队列而不是直接调用？",
            ],
            "troubleshooting": [
                "系统突然响应变慢，如何排查？",
                "数据库CPU飙升，如何定位和解决？",
                "服务间歇性不可用，如何排查？",
            ],
        }

        # 选择场景
        import random
        scenario_list = scenarios.get(target_dimension, scenarios["scalability"])
        scenario = random.choice(scenario_list)

        prompt = f"""
请为系统设计面试生成一个问题。

场景：{scenario}
候选人经验：{experience}年
目标职位：{target_position}
评估维度：{target_dimension}
难度等级：{difficulty}/5

要求：
1. 从实际业务场景出发
2. 引导候选人从宏观到微观逐步展开
3. 鼓励候选人画出架构图或描述关键组件
4. 关注设计决策的权衡和原因
5. 预期回答时长：5-10分钟

请按以下格式输出：
问题内容：[具体问题，包括背景和要求]
评估维度：{target_dimension}
评估要点：[列出5-8个评估要点]
追问方向：[3-5个可能的深入追问]
"""

        response = await self.agent.chat(prompt)

        # 解析响应
        question_content = self._extract_question(response)
        evaluation_criteria = self._extract_evaluation_criteria(response)
        follow_ups = self._extract_follow_ups(response)

        question = Question(
            content=question_content,
            type="system_design",
            difficulty=difficulty,
            category=target_dimension,
            expected_duration=600,  # 10分钟
            evaluation_criteria=evaluation_criteria,
            follow_up_questions=follow_ups,
        )

        self.question_pool.append(question)
        return question

    async def evaluate_answer(
        self,
        question: Question,
        answer: Answer,
    ) -> Evaluation:
        """评估系统设计回答"""
        prompt = f"""
请评估以下系统设计面试回答。

问题：{question.content}
评估维度：{question.category}
难度：{question.difficulty}/5

候选人回答：
{answer.content}

评估要点：
{chr(10).join(f"- {criterion}" for criterion in question.evaluation_criteria)}

请按以下格式输出评估结果：

分数：[0-100的数字]
维度：[scalability/availability/consistency/performance/security/cost_efficiency/tech_decision/troubleshooting]
反馈：[详细反馈，包括优点和改进建议]
优点：[列出主要优点]
不足：[列出需要改进的地方]
深度评价：[对设计深度的专业评价]
置信度：[0-1之间的数字]
"""

        response = await self.agent.chat(prompt)

        # 解析评估结果
        score = self._extract_score(response)
        dimension = self._extract_dimension(response)
        feedback = self._extract_feedback(response)
        strengths = self._extract_strengths(response)
        weaknesses = self._extract_weaknesses(response)
        confidence = self._extract_confidence(response)

        return Evaluation(
            question_id=question.id,
            score=score,
            dimension=dimension,
            feedback=feedback,
            strengths=strengths,
            weaknesses=weaknesses,
            confidence=confidence,
        )

    async def generate_architecture_review(
        self,
        previous_answer: Answer,
        previous_evaluation: Evaluation,
    ) -> Question:
        """生成架构评审问题"""
        prompt = f"""
基于候选人之前的系统设计回答，生成一个架构评审问题。

候选人之前的回答：
{previous_answer.content}

评估结果：{previous_evaluation.feedback}

请生成一个能够深入考察架构设计细节的问题。问题应该：
1. 针对之前设计中的某个具体组件
2. 考察该组件的详细实现方案
3. 询问设计决策的原因和权衡
4. 探讨可能的替代方案

只输出问题本身。
"""

        response = await self.agent.chat(prompt)

        return Question(
            content=response.strip(),
            type="architecture_review",
            difficulty=4,
            category="tech_decision",
            expected_duration=300,
        )

    def _calculate_difficulty(self, experience_years: float) -> int:
        """根据经验计算难度"""
        if experience_years >= 8:
            return 5
        elif experience_years >= 5:
            return 4
        elif experience_years >= 3:
            return 3
        else:
            return 2

    def _extract_question(self, response: str) -> str:
        """从响应中提取问题"""
        lines = response.split("\n")
        for line in lines:
            if "问题内容：" in line or "问题：" in line:
                return line.split("：", 1)[1].strip()
        return response.strip()

    def _extract_evaluation_criteria(self, response: str) -> List[str]:
        """从响应中提取评估要点"""
        criteria = []
        lines = response.split("\n")
        in_criteria = False
        for line in lines:
            if "评估要点：" in line:
                in_criteria = True
                continue
            if in_criteria and line.strip():
                if line.startswith("-") or line.startswith("•"):
                    criteria.append(line[1:].strip())
                elif "：" in line and len(criteria) > 0:
                    break
        return criteria or [
            "架构合理性",
            "可扩展性考虑",
            "高可用性设计",
            "技术选型合理性",
            "细节深度",
        ]

    def _extract_follow_ups(self, response: str) -> List[str]:
        """从响应中提取追问方向"""
        follow_ups = []
        lines = response.split("\n")
        in_follow_ups = False
        for line in lines:
            if "追问方向：" in line or "追问：" in line:
                in_follow_ups = True
                continue
            if in_follow_ups and line.strip():
                if line.startswith("-") or line.startswith("•"):
                    follow_ups.append(line[1:].strip())
        return follow_ups[:5]

    def _extract_score(self, response: str) -> float:
        """从响应中提取分数"""
        import re
        match = re.search(r"分数[：:]\s*(\d+)", response)
        if match:
            return float(match.group(1))
        return 70.0

    def _extract_dimension(self, response: str) -> str:
        """从响应中提取维度"""
        lines = response.split("\n")
        for line in lines:
            if "维度：" in line:
                dimension = line.split("：", 1)[1].strip()
                if dimension in self.evaluation_dimensions:
                    return dimension
        return "scalability"

    def _extract_feedback(self, response: str) -> str:
        """从响应中提取反馈"""
        lines = response.split("\n")
        for i, line in enumerate(lines):
            if "反馈：" in line:
                feedback_lines = []
                for j in range(i + 1, len(lines)):
                    if lines[j].strip() and not any(
                        keyword in lines[j] for keyword in ["优点", "不足", "置信度", "深度评价"]
                    ):
                        feedback_lines.append(lines[j].strip())
                    else:
                        break
                return " ".join(feedback_lines)
        return "需要进一步评估"

    def _extract_strengths(self, response: str) -> List[str]:
        """从响应中提取优点"""
        strengths = []
        lines = response.split("\n")
        in_strengths = False
        for line in lines:
            if "优点：" in line or "优势：" in line:
                in_strengths = True
                continue
            if in_strengths:
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    strengths.append(line.strip()[1:].strip())
                elif any(keyword in line for keyword in ["不足", "缺点", "改进"]):
                    break
        return strengths or ["设计思路基本合理"]

    def _extract_weaknesses(self, response: str) -> List[str]:
        """从响应中提取不足"""
        weaknesses = []
        lines = response.split("\n")
        in_weaknesses = False
        for line in lines:
            if "不足：" in line or "缺点：" in line or "改进：" in line:
                in_weaknesses = True
                continue
            if in_weaknesses:
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    weaknesses.append(line.strip()[1:].strip())
        return weaknesses or ["可以进一步深入细节"]

    def _extract_confidence(self, response: str) -> float:
        """从响应中提取置信度"""
        import re
        match = re.search(r"置信度[：:]\s*(0?\.\d+|1\.0|1)", response)
        if match:
            return float(match.group(1))
        return 0.8
