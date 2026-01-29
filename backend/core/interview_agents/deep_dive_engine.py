"""
深度追问引擎

基于候选人回答的内容和深度，智能生成追问问题。
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class AnswerDepth(Enum):
    """回答深度等级"""
    SURFACE = 1  # 表面层次，只提到概念
    BASIC = 2    # 基础层次，有简单解释
    INTERMEDIATE = 3  # 中等层次，有具体例子
    ADVANCED = 4  # 高级层次，有深入分析
    EXPERT = 5    # 专家层次，有创新见解


@dataclass
class AnswerAnalysis:
    """回答分析结果"""
    depth: AnswerDepth
    key_points: List[str]  # 提到的关键点
    missing_aspects: List[str]  # 缺失的方面
    vague_areas: List[str]  # 模糊的区域
    strengths: List[str]  # 亮点
    weaknesses: List[str]  # 不足
    follow_up_suggestions: List[str]  # 追问建议


class DeepDiveEngine:
    """
    深度追问引擎

    分析候选人回答的深度和质量，生成针对性的追问。
    """

    def __init__(self):
        self.depth_indicators = self._load_depth_indicators()
        self.follow_up_templates = self._load_follow_up_templates()

    def _load_depth_indicators(self) -> Dict[AnswerDepth, List[str]]:
        """加载深度指标"""
        return {
            AnswerDepth.SURFACE: [
                "知道", "了解", "听说过", "用过",
                "就是", "应该是", "好像是",
            ],
            AnswerDepth.BASIC: [
                "基本原理", "一般", "通常", "基本上",
                "简单来说", "主要是",
            ],
            AnswerDepth.INTERMEDIATE: [
                "例如", "比如", "具体", "实际",
                "项目中", "实践中", "经验",
            ],
            AnswerDepth.ADVANCED: [
                "原理", "机制", "优化", "性能",
                "深入", "底层", "源码", "设计",
            ],
            AnswerDepth.EXPERT: [
                "创新", "改进", "重构", "架构",
                "最佳实践", "权衡", "方案对比",
            ],
        }

    def _load_follow_up_templates(self) -> Dict[str, List[str]]:
        """加载追问模板"""
        return {
            "depth": [
                "你提到{point}，能详细解释一下其工作原理吗？",
                "关于{point}，你在实际项目中是如何应用的？",
                "请深入说明一下{point}的实现细节",
            ],
            "example": [
                "能否举一个具体的例子来说明{point}？",
                "在实际场景中，{point}是如何发挥作用的？",
                "请分享一个你使用{point}解决实际问题的案例",
            ],
            "comparison": [
                "{point}和{alternative}有什么区别？各自的适用场景是什么？",
                "为什么选择{point}而不是{alternative}？",
                "请对比一下{point}和{alternative}的优缺点",
            ],
            "optimization": [
                "如果{scenario}，你会如何优化{point}？",
                "{point}在{scenario}场景下有什么性能瓶颈？如何解决？",
                "请设计一个{point}的高性能方案",
            ],
            "principle": [
                "{point}的设计思想是什么？",
                "为什么{point}要这样设计？",
                "从架构角度看，{point}解决了什么问题？",
            ],
        }

    def analyze_answer(
        self,
        question: str,
        answer: str,
        question_category: str = "technical",
    ) -> AnswerAnalysis:
        """
        分析候选人回答

        Args:
            question: 面试问题
            answer: 候选人回答
            question_category: 问题类别

        Returns:
            回答分析结果
        """
        # 分析回答深度
        depth = self._analyze_depth(answer)

        # 提取关键点
        key_points = self._extract_key_points(answer)

        # 识别缺失方面
        missing_aspects = self._identify_missing_aspects(
            question, answer, question_category
        )

        # 识别模糊区域
        vague_areas = self._identify_vague_areas(answer)

        # 识别亮点和不足
        strengths, weaknesses = self._analyze_quality(answer, depth)

        # 生成追问建议
        follow_up_suggestions = self._generate_follow_up_suggestions(
            key_points, missing_aspects, vague_areas, depth, question_category
        )

        return AnswerAnalysis(
            depth=depth,
            key_points=key_points,
            missing_aspects=missing_aspects,
            vague_areas=vague_areas,
            strengths=strengths,
            weaknesses=weaknesses,
            follow_up_suggestions=follow_up_suggestions,
        )

    def _analyze_depth(self, answer: str) -> AnswerDepth:
        """分析回答深度"""
        answer_lower = answer.lower()

        # 统计各深度指标出现次数
        depth_scores = {}
        for depth, indicators in self.depth_indicators.items():
            score = sum(1 for indicator in indicators if indicator in answer_lower)
            depth_scores[depth] = score

        # 找出最高深度
        max_depth = max(depth_scores.items(), key=lambda x: x[1])

        # 如果没有任何深度指标，根据回答长度判断
        if max_depth[1] == 0:
            if len(answer) < 50:
                return AnswerDepth.SURFACE
            elif len(answer) < 150:
                return AnswerDepth.BASIC
            else:
                return AnswerDepth.INTERMEDIATE

        return max_depth[0]

    def _extract_key_points(self, answer: str) -> List[str]:
        """提取回答中的关键点"""
        key_points = []

        # 提取技术术语（大写字母组合或特定模式）
        tech_patterns = [
            r'\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b',  # CamelCase
            r'\b[A-Z]{2,}\b',  # 全大写缩写
            r'\b[a-z]+_[a-z_]+\b',  # snake_case
        ]

        for pattern in tech_patterns:
            matches = re.findall(pattern, answer)
            key_points.extend(matches)

        # 提取引用的框架/工具（在书名号或特定词汇后）
        framework_patterns = [
            r'使用[过]?([\w\s]+?)(?:，|。|；|\s|$)',
            r'([\w\s]+?)的?(?:原理|机制|特性)',
        ]

        for pattern in framework_patterns:
            matches = re.findall(pattern, answer)
            key_points.extend([m.strip() for m in matches if len(m.strip()) > 1])

        # 去重并返回
        return list(set(key_points))[:5]  # 最多返回5个关键点

    def _identify_missing_aspects(
        self, question: str, answer: str, category: str
    ) -> List[str]:
        """识别回答中缺失的重要方面"""
        missing = []
        answer_lower = answer.lower()

        # 根据问题类别检查应有的内容
        aspect_checks = {
            "technical": {
                "原理": ["原理", "机制", "怎么", "如何工作"],
                "应用": ["项目", "实际", "应用", "使用"],
                "优缺点": ["优点", "缺点", "优势", "劣势", "对比"],
                "优化": ["优化", "性能", "改进", "提升"],
            },
            "behavioral": {
                "情境": ["当时", "背景", "情况", "场景"],
                "任务": ["负责", "任务", "目标", "需要"],
                "行动": ["我", "做了", "采取", "行动"],
                "结果": ["结果", "成果", "效果", "总结"],
            },
            "system_design": {
                "架构": ["架构", "设计", "模块", "组件"],
                "扩展性": ["扩展", "扩容", "增长", "规模"],
                "可靠性": ["容错", "备份", "高可用", "可靠"],
                "性能": ["性能", "优化", "瓶颈", "QPS"],
            },
        }

        checks = aspect_checks.get(category, aspect_checks["technical"])

        for aspect, keywords in checks.items():
            if not any(kw in answer_lower for kw in keywords):
                missing.append(aspect)

        return missing

    def _identify_vague_areas(self, answer: str) -> List[str]:
        """识别回答中的模糊区域"""
        vague_indicators = [
            "等等", "之类的", "什么的", "大概",
            "可能", "也许", "应该", "差不多",
            "记不清了", "不太清楚", "不太了解",
        ]

        vague_areas = []
        sentences = re.split(r'[。！？\n]', answer)

        for sentence in sentences:
            for indicator in vague_indicators:
                if indicator in sentence:
                    # 提取包含模糊词的短语
                    vague_areas.append(sentence.strip()[:50])
                    break

        return vague_areas[:3]  # 最多返回3个

    def _analyze_quality(
        self, answer: str, depth: AnswerDepth
    ) -> Tuple[List[str], List[str]]:
        """分析回答质量，返回亮点和不足"""
        strengths = []
        weaknesses = []

        # 根据深度判断
        if depth.value >= AnswerDepth.ADVANCED.value:
            strengths.append("回答有深度，涉及原理和机制")
        elif depth.value <= AnswerDepth.BASIC.value:
            weaknesses.append("回答较为浅显，缺乏深入分析")

        # 根据结构判断
        if len(answer) > 200:
            if "首先" in answer or "第一" in answer:
                strengths.append("回答结构清晰，有条理")
            else:
                strengths.append("回答内容充实")
        elif len(answer) < 100:
            weaknesses.append("回答过于简短，内容不够充实")

        # 检查是否有具体例子
        if "比如" in answer or "例如" in answer or "项目" in answer:
            strengths.append("结合实际案例，有实践经验")
        else:
            weaknesses.append("缺乏具体案例支撑")

        # 检查是否有数据支撑
        if re.search(r'\d+', answer):
            strengths.append("使用数据支撑观点")

        return strengths, weaknesses

    def _generate_follow_up_suggestions(
        self,
        key_points: List[str],
        missing_aspects: List[str],
        vague_areas: List[str],
        depth: AnswerDepth,
        category: str,
    ) -> List[str]:
        """生成追问建议"""
        suggestions = []

        # 基于缺失方面生成追问
        if missing_aspects:
            if "原理" in missing_aspects and key_points:
                suggestions.append(
                    f"你提到了{key_points[0]}，能详细解释一下其工作原理吗？"
                )
            if "应用" in missing_aspects and key_points:
                suggestions.append(
                    f"关于{key_points[0]}，你在实际项目中是如何应用的？"
                )
            if "优缺点" in missing_aspects and key_points:
                suggestions.append(
                    f"{key_points[0]}有什么优缺点？适用场景是什么？"
                )

        # 基于模糊区域生成追问
        for vague in vague_areas[:1]:  # 只取第一个模糊区域
            # 提取模糊区域的关键词
            keywords = re.findall(r'[\w\s]+', vague)
            if keywords:
                suggestions.append(
                    f"你提到'{keywords[0]}'，能详细说明一下吗？"
                )

        # 基于深度生成追问
        if depth.value <= AnswerDepth.BASIC.value and key_points:
            suggestions.append(
                f"请深入说明一下{key_points[0]}的实现细节"
            )

        # 基于类别生成特定追问
        if category == "technical" and key_points:
            suggestions.append(
                f"如果让你优化{key_points[0]}，你会从哪些方面入手？"
            )
        elif category == "behavioral":
            suggestions.append(
                "如果重新来过，你会怎么做 differently？"
            )
        elif category == "system_design":
            suggestions.append(
                "这个方案在极端情况下会有什么问题？"
            )

        return suggestions[:3]  # 最多返回3个追问建议

    def generate_deep_dive_question(
        self,
        analysis: AnswerAnalysis,
        original_question: str,
        used_follow_ups: List[str] = None,
    ) -> Optional[str]:
        """
        生成深度追问问题

        Args:
            analysis: 回答分析结果
            original_question: 原问题
            used_follow_ups: 已使用的追问（避免重复）

        Returns:
            追问问题，如果不需要追问则返回None
        """
        if used_follow_ups is None:
            used_follow_ups = []

        # 如果回答已经很深入，不需要追问
        if analysis.depth.value >= AnswerDepth.ADVANCED.value and not analysis.vague_areas:
            return None

        # 从追问建议中选择最合适的
        for suggestion in analysis.follow_up_suggestions:
            if suggestion not in used_follow_ups:
                return suggestion

        # 如果没有合适的建议，基于关键点生成
        if analysis.key_points:
            point = analysis.key_points[0]
            templates = self.follow_up_templates["depth"]
            import random
            return random.choice(templates).format(point=point)

        return None

    def should_continue_deep_dive(
        self,
        analysis: AnswerAnalysis,
        follow_up_count: int,
        max_follow_ups: int = 2,
    ) -> bool:
        """
        判断是否应继续深度追问

        Args:
            analysis: 回答分析
            follow_up_count: 已追问次数
            max_follow_ups: 最大追问次数

        Returns:
            是否继续追问
        """
        # 已达到最大追问次数
        if follow_up_count >= max_follow_ups:
            return False

        # 回答已经很深入
        if analysis.depth.value >= AnswerDepth.ADVANCED.value:
            return False

        # 没有更多可追问的点
        if not analysis.missing_aspects and not analysis.vague_areas:
            return False

        return True
