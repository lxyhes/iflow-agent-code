"""
评估器

提供评估标准和评估逻辑。
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class EvaluationCriteria:
    """评估标准"""
    name: str
    description: str
    weight: float = 1.0
    min_score: float = 0.0
    max_score: float = 100.0
    rubric: Dict[str, str] = field(default_factory=dict)


class Evaluator:
    """
    评估器

    管理评估标准和执行评估。
    """

    DEFAULT_CRITERIA = {
        "technical_depth": EvaluationCriteria(
            name="技术深度",
            description="对技术概念和原理的深入理解",
            weight=1.2,
            rubric={
                "90-100": "专家级理解，能够深入解释原理和优化",
                "80-89": "深入理解，能够处理复杂场景",
                "70-79": "良好理解，掌握核心概念",
                "60-69": "基本理解，需要进一步学习",
                "<60": "理解不足，基础知识薄弱",
            }
        ),
        "coding_ability": EvaluationCriteria(
            name="编码能力",
            description="代码质量、规范性和效率",
            weight=1.1,
            rubric={
                "90-100": "代码优雅、高效、易于维护",
                "80-89": "代码质量高，符合最佳实践",
                "70-79": "代码良好，有小问题",
                "60-69": "代码基本可用，需要改进",
                "<60": "代码质量差，难以维护",
            }
        ),
        "problem_solving": EvaluationCriteria(
            name="问题解决",
            description="分析问题和提出解决方案的能力",
            weight=1.0,
            rubric={
                "90-100": "能够系统性解决复杂问题",
                "80-89": "善于分析问题，提出有效方案",
                "70-79": "能够解决一般性问题",
                "60-69": "需要指导才能解决问题",
                "<60": "缺乏问题解决能力",
            }
        ),
        "teamwork": EvaluationCriteria(
            name="团队协作",
            description="与他人合作的能力",
            weight=1.0,
            rubric={
                "90-100": "优秀的团队合作者，能够促进团队协作",
                "80-89": "良好的团队意识，能够有效协作",
                "70-79": "能够配合团队工作",
                "60-69": "团队意识有待提高",
                "<60": "不善于团队合作",
            }
        ),
        "communication": EvaluationCriteria(
            name="沟通表达",
            description="清晰表达和有效倾听的能力",
            weight=1.0,
            rubric={
                "90-100": "表达清晰，善于沟通",
                "80-89": "沟通良好，能够准确表达",
                "70-79": "基本能够表达清楚",
                "60-69": "表达不够清晰",
                "<60": "沟通困难",
            }
        ),
        "cultural_fit": EvaluationCriteria(
            name="文化契合",
            description="与公司文化的匹配程度",
            weight=1.1,
            rubric={
                "90-100": "完美契合公司文化",
                "80-89": "高度契合，能够快速融入",
                "70-79": "基本契合，需要适应",
                "60-69": "契合度一般",
                "<60": "文化差异较大",
            }
        ),
    }

    def __init__(self, criteria: Optional[Dict[str, EvaluationCriteria]] = None):
        self.criteria = criteria or self.DEFAULT_CRITERIA

    def get_criteria(self, name: str) -> Optional[EvaluationCriteria]:
        """获取评估标准"""
        return self.criteria.get(name)

    def evaluate(
        self,
        criteria_name: str,
        score: float,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        执行评估

        Args:
            criteria_name: 标准名称
            score: 分数
            notes: 备注

        Returns:
            评估结果
        """
        criteria = self.get_criteria(criteria_name)
        if not criteria:
            return {
                "criteria": criteria_name,
                "score": score,
                "error": "标准不存在",
            }

        # 确定等级描述
        grade_description = self._get_grade_description(criteria, score)

        return {
            "criteria": criteria_name,
            "criteria_name": criteria.name,
            "score": score,
            "weight": criteria.weight,
            "weighted_score": score * criteria.weight,
            "grade_description": grade_description,
            "notes": notes,
        }

    def _get_grade_description(self, criteria: EvaluationCriteria, score: float) -> str:
        """获取等级描述"""
        if score >= 90:
            return criteria.rubric.get("90-100", "优秀")
        elif score >= 80:
            return criteria.rubric.get("80-89", "良好")
        elif score >= 70:
            return criteria.rubric.get("70-79", "中等")
        elif score >= 60:
            return criteria.rubric.get("60-69", "及格")
        else:
            return criteria.rubric.get("<60", "不及格")

    def get_all_criteria(self) -> Dict[str, EvaluationCriteria]:
        """获取所有评估标准"""
        return self.criteria.copy()

    def add_criteria(self, name: str, criteria: EvaluationCriteria):
        """添加评估标准"""
        self.criteria[name] = criteria

    def remove_criteria(self, name: str) -> bool:
        """移除评估标准"""
        if name in self.criteria:
            del self.criteria[name]
            return True
        return False
