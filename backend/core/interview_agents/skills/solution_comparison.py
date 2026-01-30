"""
解决方案对比技能

对比多个解决方案的优缺点，给出推荐
"""

from typing import Optional, Dict, Any, List
from ...integrations.agentscope_wrapper import (
    AgentScopeSkill,
    SkillParameter,
    SkillOutput,
    SkillContext,
)


class SolutionComparisonSkill(AgentScopeSkill):
    """
    解决方案对比技能
    
    对比多个解决方案在时间复杂度、空间复杂度、可读性等方面的表现
    """

    def __init__(self):
        super().__init__(
            name="solution_comparison",
            description="对比多个解决方案的优缺点，给出综合评分和推荐",
            parameters=[
                SkillParameter(
                    name="solutions",
                    description="解决方案列表，每个包含 name、code、description",
                    type=list,
                    required=True,
                ),
                SkillParameter(
                    name="criteria",
                    description="评估维度",
                    type=list,
                    required=False,
                    default=None,
                ),
                SkillParameter(
                    name="problem_type",
                    description="问题类型",
                    type=str,
                    required=False,
                    default="general",
                ),
            ],
            output=SkillOutput(
                description="对比结果，包含各方案评分、排名和推荐",
                type=dict,
            ),
            tags=["technical", "comparison", "evaluation", "recommendation"],
            version="1.0.0",
        )

    async def execute(
        self,
        solutions: List[Dict[str, Any]],
        criteria: Optional[List[str]] = None,
        problem_type: str = "general",
        context: Optional[SkillContext] = None,
    ) -> Dict[str, Any]:
        """
        对比多个解决方案

        Args:
            solutions: 解决方案列表
            criteria: 评估维度
            problem_type: 问题类型
            context: 执行上下文

        Returns:
            对比结果
        """
        if not solutions:
            return {"error": "没有提供解决方案"}

        # 默认评估维度
        default_criteria = [
            "time_complexity",
            "space_complexity",
            "readability",
            "maintainability",
            "robustness",
        ]
        criteria = criteria or default_criteria

        # 评估每个方案
        evaluated_solutions = []
        for solution in solutions:
            evaluation = self._evaluate_solution(solution, criteria, problem_type)
            evaluated_solutions.append({
                "name": solution.get("name", f"方案 {len(evaluated_solutions) + 1}"),
                "code": solution.get("code", ""),
                "description": solution.get("description", ""),
                "evaluation": evaluation,
                "total_score": sum(e["score"] for e in evaluation.values()),
            })

        # 排序
        evaluated_solutions.sort(key=lambda x: x["total_score"], reverse=True)

        # 生成推荐
        recommendation = self._generate_recommendation(evaluated_solutions, problem_type)

        return {
            "solutions": evaluated_solutions,
            "ranking": [s["name"] for s in evaluated_solutions],
            "best_solution": evaluated_solutions[0] if evaluated_solutions else None,
            "recommendation": recommendation,
            "criteria_used": criteria,
        }

    def _evaluate_solution(
        self,
        solution: Dict[str, Any],
        criteria: List[str],
        problem_type: str,
    ) -> Dict[str, Any]:
        """评估单个解决方案"""
        evaluation = {}
        code = solution.get("code", "")

        for criterion in criteria:
            if criterion == "time_complexity":
                evaluation[criterion] = self._evaluate_time_complexity(code)
            elif criterion == "space_complexity":
                evaluation[criterion] = self._evaluate_space_complexity(code)
            elif criterion == "readability":
                evaluation[criterion] = self._evaluate_readability(code)
            elif criterion == "maintainability":
                evaluation[criterion] = self._evaluate_maintainability(code)
            elif criterion == "robustness":
                evaluation[criterion] = self._evaluate_robustness(code)
            else:
                evaluation[criterion] = {"score": 5.0, "comment": "未实现该维度评估"}

        return evaluation

    def _evaluate_time_complexity(self, code: str) -> Dict[str, Any]:
        """评估时间复杂度"""
        import re

        # 检测嵌套循环
        nested_loops = len(re.findall(r'(for|while).*:.*\n.*(for|while)', code, re.MULTILINE))

        if nested_loops >= 2:
            return {
                "score": 3.0,
                "complexity": "O(n²) 或更高",
                "comment": "存在多层嵌套循环，时间复杂度较高",
            }
        elif nested_loops == 1:
            return {
                "score": 6.0,
                "complexity": "O(n²)",
                "comment": "存在嵌套循环，注意数据规模",
            }
        elif re.search(r'(for|while)', code):
            return {
                "score": 8.0,
                "complexity": "O(n)",
                "comment": "单层循环，线性时间复杂度",
            }
        else:
            return {
                "score": 10.0,
                "complexity": "O(1) 或 O(log n)",
                "comment": "无循环或递归，时间复杂度优秀",
            }

    def _evaluate_space_complexity(self, code: str) -> Dict[str, Any]:
        """评估空间复杂度"""
        import re

        # 检测数据结构使用
        uses_list = bool(re.search(r'\[.*for.*in', code))  # 列表推导式
        uses_dict = bool(re.search(r'dict\(|\{.*:', code))  # 字典
        uses_2d = bool(re.search(r'\[\[.*for.*in.*for.*in', code))  # 二维数组

        if uses_2d:
            return {
                "score": 4.0,
                "complexity": "O(n²)",
                "comment": "使用二维数组，空间复杂度较高",
            }
        elif uses_dict:
            return {
                "score": 7.0,
                "complexity": "O(n)",
                "comment": "使用哈希表，空间换时间策略",
            }
        elif uses_list:
            return {
                "score": 6.0,
                "complexity": "O(n)",
                "comment": "使用数组存储数据",
            }
        else:
            return {
                "score": 10.0,
                "complexity": "O(1)",
                "comment": "常数空间复杂度，空间效率优秀",
            }

    def _evaluate_readability(self, code: str) -> Dict[str, Any]:
        """评估代码可读性"""
        score = 5.0
        comments = []

        # 检查函数和变量命名
        if re.search(r'def [a-z_][a-z0-9_]*\(', code):
            score += 1.0
            comments.append("函数命名规范")

        # 检查注释
        if '#' in code or '"""' in code:
            score += 1.5
            comments.append("包含注释")

        # 检查代码长度
        lines = code.strip().split('\n')
        if len(lines) <= 20:
            score += 1.5
            comments.append("代码简洁")
        elif len(lines) <= 50:
            score += 0.5

        # 检查是否有文档字符串
        if '"""' in code or "'''" in code:
            score += 1.0
            comments.append("包含文档字符串")

        return {
            "score": min(score, 10.0),
            "comment": "; ".join(comments) if comments else "可读性一般",
        }

    def _evaluate_maintainability(self, code: str) -> Dict[str, Any]:
        """评估可维护性"""
        score = 5.0
        comments = []

        # 检查模块化程度
        if 'def ' in code and code.count('def ') > 1:
            score += 1.0
            comments.append("函数拆分合理")

        # 检查异常处理
        if 'try' in code and 'except' in code:
            score += 2.0
            comments.append("包含异常处理")

        # 检查魔法数字
        if re.search(r'[^\w](\d+)[^\w]', code):
            score -= 0.5
            comments.append("存在魔法数字")

        # 检查代码重复
        lines = code.split('\n')
        unique_lines = set(line.strip() for line in lines if line.strip())
        if len(lines) > 0 and len(unique_lines) / len(lines) < 0.7:
            score -= 1.0
            comments.append("存在代码重复")

        return {
            "score": max(0, min(score, 10.0)),
            "comment": "; ".join(comments) if comments else "可维护性一般",
        }

    def _evaluate_robustness(self, code: str) -> Dict[str, Any]:
        """评估健壮性"""
        score = 5.0
        comments = []

        # 检查输入验证
        if 'if' in code and ('is None' in code or '==' in code or '!=' in code):
            score += 1.5
            comments.append("包含输入验证")

        # 检查边界条件处理
        if 'len(' in code or 'empty' in code.lower():
            score += 1.5
            comments.append("考虑边界条件")

        # 检查异常处理
        if 'try' in code:
            score += 2.0
            comments.append("包含异常处理")

        # 检查类型检查
        if 'isinstance' in code or 'type(' in code:
            score += 1.0
            comments.append("包含类型检查")

        return {
            "score": min(score, 10.0),
            "comment": "; ".join(comments) if comments else "健壮性一般",
        }

    def _generate_recommendation(
        self,
        solutions: List[Dict[str, Any]],
        problem_type: str,
    ) -> Dict[str, Any]:
        """生成推荐"""
        if not solutions:
            return {"error": "没有可推荐的方案"}

        best = solutions[0]

        # 根据问题类型给出不同建议
        if problem_type == "performance_critical":
            recommendation = {
                "primary": best["name"],
                "reason": "该方案在时间复杂度和空间复杂度方面表现最佳，适合性能敏感场景",
                "trade_offs": "可能牺牲部分可读性",
            }
        elif problem_type == "maintainability_focused":
            # 找可维护性最高的
            most_maintainable = max(
                solutions,
                key=lambda s: s["evaluation"].get("maintainability", {}).get("score", 0)
            )
            recommendation = {
                "primary": most_maintainable["name"],
                "reason": "该方案可维护性最佳，适合长期维护的项目",
                "trade_offs": "性能可能不是最优",
            }
        else:
            recommendation = {
                "primary": best["name"],
                "reason": "综合评分最高，在多个维度都有良好表现",
                "alternatives": [s["name"] for s in solutions[1:3]],
            }

        return recommendation
