"""
压力测试引擎

模拟高压面试场景，评估候选人在压力下的表现。
适用于高薪职位（P7+）的面试评估。
"""

import random
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Dict, List, Optional
from uuid import uuid4


class PressureType(Enum):
    """压力类型"""
    RAPID_FIRE = "rapid_fire"           # 连续追问
    INTERRUPT = "interrupt"             # 打断回答
    CHALLENGE = "challenge"             # 质疑观点
    TIME_PRESSURE = "time_pressure"     # 时间压力
    UNCERTAINTY = "uncertainty"         # 不确定性


class PressureLevel(Enum):
    """压力等级"""
    LOW = "low"                         # 轻度（1-2个压力点）
    MEDIUM = "medium"                   # 中度（3-4个压力点）
    HIGH = "high"                       # 重度（5+个压力点）


@dataclass
class PressureEvent:
    """压力事件"""
    id: str = field(default_factory=lambda: str(uuid4()))
    type: PressureType = PressureType.RAPID_FIRE
    content: str = ""
    trigger_condition: str = ""         # 触发条件
    expected_response: str = ""         # 期望回应
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class PressureMetrics:
    """压力指标"""
    total_pressure_events: int = 0
    rapid_fire_count: int = 0
    interrupt_count: int = 0
    challenge_count: int = 0
    time_pressure_count: int = 0
    
    # 候选人反应
    calm_responses: int = 0             # 冷静回应次数
    defensive_responses: int = 0        # 防御性回应次数
    confused_responses: int = 0         # 困惑回应次数
    
    # 压力下的表现
    pressure_score: float = 0.0         # 压力承受分数
    recovery_time: int = 0              # 恢复时间（秒）
    consistency_under_pressure: float = 0.0  # 压力下的一致性


@dataclass
class PressureTestConfig:
    """压力测试配置"""
    enabled: bool = False
    level: PressureLevel = PressureLevel.MEDIUM
    max_events_per_session: int = 5
    min_interval_between_events: int = 30  # 秒
    trigger_on_high_score: bool = True      # 高分时触发（测试上限）
    trigger_on_low_score: bool = True       # 低分时触发（测试下限）


class PressureTestEngine:
    """
    压力测试引擎
    
    管理面试过程中的压力测试，包括：
    - 连续追问
    - 打断回答
    - 质疑观点
    - 时间压力
    - 不确定性场景
    """
    
    def __init__(self, config: PressureTestConfig = None):
        self.config = config or PressureTestConfig()
        self.metrics = PressureMetrics()
        self.events_history: List[PressureEvent] = []
        self.last_event_time: Optional[datetime] = None
        self.event_count: int = 0
        
    def should_trigger_pressure(self, context: Dict[str, Any]) -> bool:
        """
        判断是否触发压力测试
        
        Args:
            context: 当前面试上下文
            
        Returns:
            是否触发
        """
        if not self.config.enabled:
            return False
            
        # 检查最大事件数
        if self.event_count >= self.config.max_events_per_session:
            return False
            
        # 检查间隔时间
        if self.last_event_time:
            elapsed = (datetime.now() - self.last_event_time).total_seconds()
            if elapsed < self.config.min_interval_between_events:
                return False
        
        # 根据分数触发
        recent_score = context.get("recent_score", 70)
        
        if self.config.trigger_on_high_score and recent_score >= 85:
            # 高分时测试上限
            return random.random() < 0.4
            
        if self.config.trigger_on_low_score and recent_score < 60:
            # 低分时测试下限
            return random.random() < 0.3
            
        # 正常随机触发
        trigger_probability = {
            PressureLevel.LOW: 0.15,
            PressureLevel.MEDIUM: 0.25,
            PressureLevel.HIGH: 0.40,
        }.get(self.config.level, 0.25)
        
        return random.random() < trigger_probability
    
    def generate_pressure_event(
        self, 
        question: str, 
        answer: str,
        context: Dict[str, Any]
    ) -> Optional[PressureEvent]:
        """
        生成压力事件
        
        Args:
            question: 当前问题
            answer: 候选人回答
            context: 面试上下文
            
        Returns:
            压力事件
        """
        if not self.should_trigger_pressure(context):
            return None
            
        # 根据上下文选择压力类型
        event_type = self._select_pressure_type(context)
        
        # 生成压力内容
        content = self._generate_pressure_content(event_type, question, answer)
        
        event = PressureEvent(
            type=event_type,
            content=content,
            trigger_condition=f"Score: {context.get('recent_score', 70)}",
            expected_response=self._get_expected_response(event_type),
        )
        
        # 更新状态
        self.events_history.append(event)
        self.last_event_time = datetime.now()
        self.event_count += 1
        self._update_metrics(event_type)
        
        return event
    
    def _select_pressure_type(self, context: Dict[str, Any]) -> PressureType:
        """选择压力类型"""
        # 根据面试阶段和上下文选择
        agent_type = context.get("agent_type", "")
        
        if agent_type == "technical":
            weights = {
                PressureType.RAPID_FIRE: 0.3,
                PressureType.CHALLENGE: 0.4,
                PressureType.INTERRUPT: 0.2,
                PressureType.TIME_PRESSURE: 0.1,
            }
        elif agent_type == "system_design":
            weights = {
                PressureType.CHALLENGE: 0.5,
                PressureType.RAPID_FIRE: 0.2,
                PressureType.INTERRUPT: 0.2,
                PressureType.UNCERTAINTY: 0.1,
            }
        elif agent_type == "behavioral":
            weights = {
                PressureType.INTERRUPT: 0.3,
                PressureType.CHALLENGE: 0.3,
                PressureType.UNCERTAINTY: 0.2,
                PressureType.RAPID_FIRE: 0.2,
            }
        else:
            weights = {
                PressureType.RAPID_FIRE: 0.25,
                PressureType.INTERRUPT: 0.25,
                PressureType.CHALLENGE: 0.25,
                PressureType.TIME_PRESSURE: 0.15,
                PressureType.UNCERTAINTY: 0.10,
            }
        
        types = list(weights.keys())
        probs = list(weights.values())
        
        return random.choices(types, weights=probs)[0]
    
    def _generate_pressure_content(
        self, 
        event_type: PressureType, 
        question: str, 
        answer: str
    ) -> str:
        """生成压力内容"""
        templates = {
            PressureType.RAPID_FIRE: [
                "等一下，你刚才说的和之前的不一致，能解释一下吗？",
                "这个答案太泛泛了，能具体一点吗？",
                "如果情况更紧急，你会怎么做？",
                "还有呢？继续。",
                "这个方案的成本太高了，有更经济的方案吗？",
            ],
            PressureType.INTERRUPT: [
                "抱歉打断一下，我想直接问核心问题...",
                "不好意思，时间有限，能直接回答重点吗？",
                "我注意到你没有提到关键点...",
                "等等，让我换个角度问...",
            ],
            PressureType.CHALLENGE: [
                "我不认同这个观点，能说服我吗？",
                "这个方案在XX场景下会失败，你怎么看？",
                "很多候选人都这么回答，你觉得你的答案有什么不同？",
                "如果我是你的上级，我不同意这个方案，你会怎么办？",
                "这个技术选型看起来有问题，能解释一下吗？",
            ],
            PressureType.TIME_PRESSURE: [
                "我们时间有限，请在一分钟内回答。",
                "快速回答：如果必须在A和B之间选择，你选哪个？",
                "给你30秒，总结一下你的核心观点。",
            ],
            PressureType.UNCERTAINTY: [
                "假设资源只有原来的一半，你会怎么调整方案？",
                "如果需求突然变了，你的设计还能适应吗？",
                "如果团队成员反对你的方案，你会怎么处理？",
            ],
        }
        
        return random.choice(templates.get(event_type, ["请继续。"]))
    
    def _get_expected_response(self, event_type: PressureType) -> str:
        """获取期望回应"""
        expectations = {
            PressureType.RAPID_FIRE: "保持冷静，逻辑清晰地快速回应",
            PressureType.INTERRUPT: "不被打断影响，能抓住重点继续",
            PressureType.CHALLENGE: "有理有据地辩护，或承认不足并改进",
            PressureType.TIME_PRESSURE: "在压力下保持简洁和重点",
            PressureType.UNCERTAINTY: "展示灵活性和应变能力",
        }
        return expectations.get(event_type, "专业应对")
    
    def _update_metrics(self, event_type: PressureType):
        """更新指标"""
        self.metrics.total_pressure_events += 1
        
        if event_type == PressureType.RAPID_FIRE:
            self.metrics.rapid_fire_count += 1
        elif event_type == PressureType.INTERRUPT:
            self.metrics.interrupt_count += 1
        elif event_type == PressureType.CHALLENGE:
            self.metrics.challenge_count += 1
        elif event_type == PressureType.TIME_PRESSURE:
            self.metrics.time_pressure_count += 1
    
    def analyze_response(
        self, 
        event: PressureEvent, 
        response: str,
        response_time: int
    ) -> Dict[str, Any]:
        """
        分析候选人对压力事件的回应
        
        Args:
            event: 压力事件
            response: 候选人回应
            response_time: 回应时间（秒）
            
        Returns:
            分析结果
        """
        analysis = {
            "calmness_score": 0,
            "confidence_score": 0,
            "adaptability_score": 0,
            "overall_reaction": "",
        }
        
        # 分析冷静程度
        if response_time < 5:
            analysis["calmness_score"] = 90  # 快速冷静回应
        elif response_time < 10:
            analysis["calmness_score"] = 75
        elif response_time < 20:
            analysis["calmness_score"] = 60
        else:
            analysis["calmness_score"] = 40  # 反应较慢
            
        # 分析自信程度（基于关键词）
        confidence_keywords = ["我认为", "我相信", "确定", "肯定", "一定"]
        hesitation_keywords = ["可能", "也许", "大概", "不确定", "不知道"]
        
        confidence_count = sum(1 for kw in confidence_keywords if kw in response)
        hesitation_count = sum(1 for kw in hesitation_keywords if kw in response)
        
        if confidence_count > hesitation_count:
            analysis["confidence_score"] = 80
            self.metrics.calm_responses += 1
        elif hesitation_count > 2:
            analysis["confidence_score"] = 40
            self.metrics.confused_responses += 1
        else:
            analysis["confidence_score"] = 60
            
        # 分析适应性
        if event.type == PressureType.CHALLENGE:
            if "同意" in response or "有道理" in response or "确实" in response:
                analysis["adaptability_score"] = 85  # 能接受挑战
            elif "但是" in response or "不过" in response:
                analysis["adaptability_score"] = 70  # 尝试辩护
            else:
                analysis["adaptability_score"] = 50
                self.metrics.defensive_responses += 1
        else:
            analysis["adaptability_score"] = analysis["calmness_score"]
        
        # 总体评价
        avg_score = (
            analysis["calmness_score"] + 
            analysis["confidence_score"] + 
            analysis["adaptability_score"]
        ) / 3
        
        if avg_score >= 80:
            analysis["overall_reaction"] = "excellent"
        elif avg_score >= 60:
            analysis["overall_reaction"] = "good"
        elif avg_score >= 40:
            analysis["overall_reaction"] = "fair"
        else:
            analysis["overall_reaction"] = "poor"
            
        return analysis
    
    def calculate_pressure_score(self) -> float:
        """
        计算压力承受分数
        
        Returns:
            0-100的分数
        """
        if self.metrics.total_pressure_events == 0:
            return 0
            
        # 基于反应计算分数
        total_reactions = (
            self.metrics.calm_responses + 
            self.metrics.defensive_responses + 
            self.metrics.confused_responses
        )
        
        if total_reactions == 0:
            return 50
            
        # 冷静回应权重最高
        calm_ratio = self.metrics.calm_responses / total_reactions
        defensive_ratio = self.metrics.defensive_responses / total_reactions
        confused_ratio = self.metrics.confused_responses / total_reactions
        
        score = (
            calm_ratio * 100 +
            defensive_ratio * 60 +
            confused_ratio * 30
        )
        
        return min(100, max(0, score))
    
    def get_report(self) -> Dict[str, Any]:
        """获取压力测试报告"""
        return {
            "enabled": self.config.enabled,
            "level": self.config.level.value,
            "total_events": self.metrics.total_pressure_events,
            "event_breakdown": {
                "rapid_fire": self.metrics.rapid_fire_count,
                "interrupt": self.metrics.interrupt_count,
                "challenge": self.metrics.challenge_count,
                "time_pressure": self.metrics.time_pressure_count,
            },
            "response_analysis": {
                "calm_responses": self.metrics.calm_responses,
                "defensive_responses": self.metrics.defensive_responses,
                "confused_responses": self.metrics.confused_responses,
            },
            "pressure_score": self.calculate_pressure_score(),
            "events_history": [
                {
                    "type": e.type.value,
                    "content": e.content,
                    "timestamp": e.timestamp.isoformat(),
                }
                for e in self.events_history
            ],
        }


# 压力测试问题生成器
class PressureQuestionGenerator:
    """生成压力测试专用问题"""
    
    @staticmethod
    def generate_rapid_fire_sequence(topic: str, count: int = 3) -> List[str]:
        """生成连续追问序列"""
        sequences = {
            "system_design": [
                f"{topic}的QPS是多少？",
                f"如果QPS增加10倍怎么办？",
                f"如果QPS增加100倍呢？",
            ],
            "technical": [
                f"{topic}的原理是什么？",
                f"底层是如何实现的？",
                f"源码中关键函数是哪个？",
            ],
            "behavioral": [
                "具体是什么时间？",
                "团队有多少人？",
                "最后结果如何？",
            ],
        }
        
        return sequences.get(topic, ["请详细说明。"] * count)[:count]
    
    @staticmethod
    def generate_challenge_question(strength: str) -> str:
        """生成质疑性问题"""
        challenges = [
            f"你说{strength}是你的优势，但我没看出来，能证明一下吗？",
            f"很多候选人都说自己擅长{strength}，你有什么独特之处？",
            f"如果{strength}在实际项目中不起作用，你会怎么办？",
        ]
        return random.choice(challenges)
