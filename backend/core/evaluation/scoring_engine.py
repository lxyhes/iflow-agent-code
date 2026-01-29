"""
评分引擎

实现多维度评分算法和加权综合计算。
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class WeightedScore:
    """加权分数"""
    dimension: str
    score: float
    weight: float
    confidence: float = 1.0
    source: str = ""  # 评分来源（智能体类型）

    @property
    def weighted_score(self) -> float:
        """获取加权后的分数"""
        return self.score * self.weight * self.confidence


class ScoringEngine:
    """
    评分引擎

    实现多维度评分算法，包括：
    - 加权平均计算
    - 置信度校准
    - 维度聚合
    - 趋势分析
    """

    # 默认维度权重配置
    DEFAULT_DIMENSION_WEIGHTS = {
        # 技术维度
        "technical_depth": 1.2,
        "coding_ability": 1.1,
        "problem_solving": 1.0,
        "system_design": 1.0,
        "knowledge_breadth": 0.8,

        # 行为维度
        "teamwork": 1.0,
        "leadership": 0.9,
        "communication": 1.0,
        "adaptability": 0.8,
        "cultural_fit": 1.1,

        # HR维度
        "career_alignment": 0.9,
        "motivation": 1.0,
        "stability": 0.8,
    }

    # 智能体类型权重
    AGENT_TYPE_WEIGHTS = {
        "technical": 1.2,
        "behavioral": 1.0,
        "hr": 0.8,
    }

    def __init__(
        self,
        dimension_weights: Optional[Dict[str, float]] = None,
        agent_weights: Optional[Dict[str, float]] = None,
    ):
        self.dimension_weights = dimension_weights or self.DEFAULT_DIMENSION_WEIGHTS
        self.agent_weights = agent_weights or self.AGENT_TYPE_WEIGHTS

    def calculate_dimension_score(
        self,
        scores: List[WeightedScore],
        dimension: str,
    ) -> Dict[str, Any]:
        """
        计算单个维度的综合分数

        Args:
            scores: 该维度的所有评分
            dimension: 维度名称

        Returns:
            维度评分结果
        """
        if not scores:
            return {
                "dimension": dimension,
                "score": 0.0,
                "confidence": 0.0,
                "count": 0,
            }

        # 计算加权平均
        total_weight = sum(s.weight * s.confidence for s in scores)
        if total_weight == 0:
            return {
                "dimension": dimension,
                "score": 0.0,
                "confidence": 0.0,
                "count": len(scores),
            }

        weighted_sum = sum(s.score * s.weight * s.confidence for s in scores)
        average_score = weighted_sum / total_weight

        # 计算置信度（基于评分数量和一致性）
        confidence = self._calculate_confidence(scores)

        return {
            "dimension": dimension,
            "score": round(average_score, 2),
            "confidence": round(confidence, 2),
            "count": len(scores),
            "min_score": min(s.score for s in scores),
            "max_score": max(s.score for s in scores),
            "std_dev": self._calculate_std_dev(scores),
        }

    def calculate_overall_score(
        self,
        dimension_scores: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        计算总体分数

        Args:
            dimension_scores: 各维度评分结果

        Returns:
            总体评分结果
        """
        if not dimension_scores:
            return {
                "overall_score": 0.0,
                "confidence": 0.0,
                "grade": "N/A",
            }

        total_weight = 0.0
        weighted_sum = 0.0
        total_confidence = 0.0

        for dimension, result in dimension_scores.items():
            weight = self.dimension_weights.get(dimension, 1.0)
            score = result["score"]
            confidence = result["confidence"]

            weighted_sum += score * weight * confidence
            total_weight += weight * confidence
            total_confidence += confidence

        if total_weight == 0:
            return {
                "overall_score": 0.0,
                "confidence": 0.0,
                "grade": "N/A",
            }

        overall_score = weighted_sum / total_weight
        avg_confidence = total_confidence / len(dimension_scores)

        return {
            "overall_score": round(overall_score, 2),
            "confidence": round(avg_confidence, 2),
            "grade": self._score_to_grade(overall_score),
            "dimension_count": len(dimension_scores),
        }

    def calculate_agent_contribution(
        self,
        scores: List[WeightedScore],
    ) -> Dict[str, Dict[str, Any]]:
        """
        计算各智能体的贡献

        Args:
            scores: 所有评分

        Returns:
            各智能体的贡献统计
        """
        agent_scores: Dict[str, List[WeightedScore]] = {}

        for score in scores:
            if score.source not in agent_scores:
                agent_scores[score.source] = []
            agent_scores[score.source].append(score)

        contributions = {}
        for agent_type, agent_score_list in agent_scores.items():
            weight = self.agent_weights.get(agent_type, 1.0)
            avg_score = sum(s.score for s in agent_score_list) / len(agent_score_list)

            contributions[agent_type] = {
                "average_score": round(avg_score, 2),
                "question_count": len(agent_score_list),
                "weight": weight,
                "contribution": round(avg_score * weight, 2),
            }

        return contributions

    def analyze_score_trend(
        self,
        scores: List[float],
    ) -> Dict[str, Any]:
        """
        分析分数趋势

        Args:
            scores: 分数序列

        Returns:
            趋势分析结果
        """
        if len(scores) < 2:
            return {
                "trend": "insufficient_data",
                "slope": 0.0,
                "improvement": 0.0,
            }

        # 简单线性回归计算趋势
        n = len(scores)
        x_mean = (n - 1) / 2
        y_mean = sum(scores) / n

        numerator = sum((i - x_mean) * (score - y_mean) for i, score in enumerate(scores))
        denominator = sum((i - x_mean) ** 2 for i in range(n))

        slope = numerator / denominator if denominator != 0 else 0

        # 判断趋势
        if slope > 2:
            trend = "improving"
        elif slope < -2:
            trend = "declining"
        else:
            trend = "stable"

        # 计算改进幅度
        improvement = scores[-1] - scores[0] if scores else 0

        return {
            "trend": trend,
            "slope": round(slope, 3),
            "improvement": round(improvement, 2),
            "first_score": scores[0] if scores else 0,
            "last_score": scores[-1] if scores else 0,
        }

    def identify_strengths_and_weaknesses(
        self,
        dimension_scores: Dict[str, Dict[str, Any]],
        threshold_high: float = 80.0,
        threshold_low: float = 60.0,
    ) -> Dict[str, List[str]]:
        """
        识别优势和劣势

        Args:
            dimension_scores: 各维度评分
            threshold_high: 优势阈值
            threshold_low: 劣势阈值

        Returns:
            优势和劣势列表
        """
        strengths = []
        weaknesses = []

        for dimension, result in dimension_scores.items():
            score = result["score"]
            confidence = result["confidence"]

            # 只考虑置信度足够高的评估
            if confidence >= 0.7:
                if score >= threshold_high:
                    strengths.append(dimension)
                elif score <= threshold_low:
                    weaknesses.append(dimension)

        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
        }

    def _calculate_confidence(self, scores: List[WeightedScore]) -> float:
        """计算置信度"""
        if not scores:
            return 0.0

        # 基于评分数量
        count_factor = min(1.0, len(scores) / 3)

        # 基于评分一致性（标准差的倒数）
        if len(scores) > 1:
            mean = sum(s.score for s in scores) / len(scores)
            variance = sum((s.score - mean) ** 2 for s in scores) / (len(scores) - 1)
            std_dev = variance ** 0.5
            consistency_factor = max(0, 1 - std_dev / 50)  # 标准差越小，一致性越高
        else:
            consistency_factor = 0.5

        # 基于平均置信度
        avg_confidence = sum(s.confidence for s in scores) / len(scores)

        return (count_factor * 0.3 + consistency_factor * 0.4 + avg_confidence * 0.3)

    def _calculate_std_dev(self, scores: List[WeightedScore]) -> float:
        """计算标准差"""
        if len(scores) < 2:
            return 0.0

        mean = sum(s.score for s in scores) / len(scores)
        variance = sum((s.score - mean) ** 2 for s in scores) / (len(scores) - 1)
        return round(variance ** 0.5, 2)

    def _score_to_grade(self, score: float) -> str:
        """分数转换为等级"""
        if score >= 90:
            return "A+"
        elif score >= 85:
            return "A"
        elif score >= 80:
            return "A-"
        elif score >= 75:
            return "B+"
        elif score >= 70:
            return "B"
        elif score >= 65:
            return "B-"
        elif score >= 60:
            return "C"
        else:
            return "D"

    def generate_score_breakdown(
        self,
        scores: List[WeightedScore],
    ) -> Dict[str, Any]:
        """
        生成分数明细

        Args:
            scores: 所有评分

        Returns:
            分数明细
        """
        # 按维度分组
        dimension_groups: Dict[str, List[WeightedScore]] = {}
        for score in scores:
            if score.dimension not in dimension_groups:
                dimension_groups[score.dimension] = []
            dimension_groups[score.dimension].append(score)

        # 计算各维度分数
        dimension_results = {}
        for dimension, dim_scores in dimension_groups.items():
            dimension_results[dimension] = self.calculate_dimension_score(
                dim_scores, dimension
            )

        # 计算总体分数
        overall = self.calculate_overall_score(dimension_results)

        # 计算智能体贡献
        agent_contributions = self.calculate_agent_contribution(scores)

        # 识别优势和劣势
        sw_analysis = self.identify_strengths_and_weaknesses(dimension_results)

        return {
            "overall": overall,
            "dimensions": dimension_results,
            "agent_contributions": agent_contributions,
            "strengths": sw_analysis["strengths"],
            "weaknesses": sw_analysis["weaknesses"],
            "total_evaluations": len(scores),
        }
