"""
报告生成器

生成面试评估报告。
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class InterviewReport:
    """面试报告"""
    session_id: str
    candidate_name: str
    position: str
    interview_date: datetime
    overall_score: float
    grade: str
    duration: int
    dimension_scores: Dict[str, float]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    detailed_feedback: Dict[str, Any]
    generated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "session_id": self.session_id,
            "candidate_name": self.candidate_name,
            "position": self.position,
            "interview_date": self.interview_date.isoformat(),
            "overall_score": self.overall_score,
            "grade": self.grade,
            "duration": self.duration,
            "dimension_scores": self.dimension_scores,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
            "recommendations": self.recommendations,
            "detailed_feedback": self.detailed_feedback,
            "generated_at": self.generated_at.isoformat(),
        }


class ReportGenerator:
    """
    报告生成器

    生成结构化的面试评估报告。
    """

    def __init__(self):
        self.templates = {
            "summary": self._generate_summary_template,
            "detailed": self._generate_detailed_template,
            "recommendation": self._generate_recommendation_template,
        }

    def generate_report(
        self,
        session_id: str,
        candidate_profile: Dict[str, Any],
        evaluation_results: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> InterviewReport:
        """
        生成面试报告

        Args:
            session_id: 会话ID
            candidate_profile: 候选人画像
            evaluation_results: 评估结果
            interview_history: 面试历史

        Returns:
            面试报告
        """
        # 提取基本信息
        candidate_name = candidate_profile.get("name", "")
        position = candidate_profile.get("target_position", "")

        # 计算总体分数
        overall = evaluation_results.get("overall", {})
        overall_score = overall.get("overall_score", 0)
        grade = overall.get("grade", "N/A")

        # 提取维度分数
        dimension_scores = {
            dim: result["score"]
            for dim, result in evaluation_results.get("dimensions", {}).items()
        }

        # 提取优势和劣势
        strengths = evaluation_results.get("strengths", [])
        weaknesses = evaluation_results.get("weaknesses", [])

        # 生成建议
        recommendations = self._generate_recommendations(
            strengths, weaknesses, dimension_scores
        )

        # 生成详细反馈
        detailed_feedback = self._generate_detailed_feedback(
            evaluation_results, interview_history
        )

        return InterviewReport(
            session_id=session_id,
            candidate_name=candidate_name,
            position=position,
            interview_date=datetime.now(),
            overall_score=overall_score,
            grade=grade,
            duration=sum(h.get("duration", 0) for h in interview_history),
            dimension_scores=dimension_scores,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
            detailed_feedback=detailed_feedback,
        )

    def _generate_recommendations(
        self,
        strengths: List[str],
        weaknesses: List[str],
        dimension_scores: Dict[str, float],
    ) -> List[str]:
        """生成建议"""
        recommendations = []

        # 基于优势的建议
        if strengths:
            recommendations.append(
                f"候选人在以下方面表现突出：{', '.join(strengths)}。建议在面试中进一步挖掘这些优势。"
            )

        # 基于劣势的建议
        if weaknesses:
            recommendations.append(
                f"候选人需要在以下方面加强：{', '.join(weaknesses)}。建议提供相关培训或指导。"
            )

        # 基于分数的建议
        low_scores = [dim for dim, score in dimension_scores.items() if score < 70]
        if low_scores:
            recommendations.append(
                f"以下维度得分较低：{', '.join(low_scores)}。建议在后续面试中重点关注。"
            )

        # 总体建议
        avg_score = sum(dimension_scores.values()) / len(dimension_scores) if dimension_scores else 0
        if avg_score >= 85:
            recommendations.append("候选人整体表现优秀，强烈推荐录用。")
        elif avg_score >= 75:
            recommendations.append("候选人表现良好，建议录用。")
        elif avg_score >= 65:
            recommendations.append("候选人基本符合要求，建议进一步评估。")
        else:
            recommendations.append("候选人表现一般，建议谨慎考虑。")

        return recommendations

    def _generate_detailed_feedback(
        self,
        evaluation_results: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """生成详细反馈"""
        return {
            "dimension_analysis": evaluation_results.get("dimensions", {}),
            "agent_contributions": evaluation_results.get("agent_contributions", {}),
            "interview_summary": {
                "total_questions": len(interview_history),
                "average_score": sum(h.get("evaluation_score", 0) for h in interview_history) / len(interview_history) if interview_history else 0,
            },
        }

    def _generate_summary_template(self, report: InterviewReport) -> str:
        """生成摘要模板"""
        return f"""
# 面试评估报告

## 基本信息
- **候选人**: {report.candidate_name}
- **职位**: {report.position}
- **面试日期**: {report.interview_date.strftime('%Y-%m-%d %H:%M')}
- **面试时长**: {report.duration // 60}分钟

## 总体评估
- **综合分数**: {report.overall_score}/100
- **等级**: {report.grade}

## 维度分数
{chr(10).join(f"- **{dim}**: {score}" for dim, score in report.dimension_scores.items())}

## 优势
{chr(10).join(f"- {s}" for s in report.strengths)}

## 劣势
{chr(10).join(f"- {w}" for w in report.weaknesses)}

## 建议
{chr(10).join(f"- {r}" for r in report.recommendations)}
"""

    def _generate_detailed_template(self, report: InterviewReport) -> str:
        """生成详细模板"""
        return self._generate_summary_template(report)

    def _generate_recommendation_template(self, report: InterviewReport) -> str:
        """生成推荐模板"""
        return f"""
# 录用建议

## 候选人: {report.candidate_name}

## 建议
{chr(10).join(f"- {r}" for r in report.recommendations)}

## 综合评分: {report.overall_score}/100 ({report.grade})
"""

    def generate_markdown_report(self, report: InterviewReport, template: str = "summary") -> str:
        """
        生成Markdown格式报告

        Args:
            report: 面试报告
            template: 模板类型

        Returns:
            Markdown格式报告
        """
        template_func = self.templates.get(template, self._generate_summary_template)
        return template_func(report)

    def generate_json_report(self, report: InterviewReport) -> Dict[str, Any]:
        """
        生成JSON格式报告

        Args:
            report: 面试报告

        Returns:
            JSON格式报告
        """
        return report.to_dict()
