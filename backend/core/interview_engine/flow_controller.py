"""
流程控制器

管理面试流程的各个阶段和转换。
"""

from enum import Enum, auto
from typing import Any, Dict, List, Optional


class InterviewStage(Enum):
    """面试阶段"""
    PREPARATION = auto()      # 准备阶段
    WARM_UP = auto()          # 热身阶段
    TECHNICAL = auto()        # 技术面试
    BEHAVIORAL = auto()       # 行为面试
    HR = auto()               # HR面试
    SUMMARY = auto()          # 总结阶段
    COMPLETED = auto()        # 已完成


class FlowController:
    """
    流程控制器

    管理面试流程的阶段转换和节奏控制。
    """

    def __init__(
        self,
        stages: Optional[List[InterviewStage]] = None,
        stage_duration: Optional[Dict[InterviewStage, int]] = None,
    ):
        self.stages = stages or [
            InterviewStage.PREPARATION,
            InterviewStage.WARM_UP,
            InterviewStage.TECHNICAL,
            InterviewStage.BEHAVIORAL,
            InterviewStage.HR,
            InterviewStage.SUMMARY,
            InterviewStage.COMPLETED,
        ]
        self.stage_duration = stage_duration or {
            InterviewStage.PREPARATION: 0,
            InterviewStage.WARM_UP: 300,
            InterviewStage.TECHNICAL: 1800,
            InterviewStage.BEHAVIORAL: 1200,
            InterviewStage.HR: 600,
            InterviewStage.SUMMARY: 300,
            InterviewStage.COMPLETED: 0,
        }
        self.current_stage_index = 0
        self.stage_start_time = None
        self.stage_data: Dict[InterviewStage, Any] = {}

    def get_current_stage(self) -> InterviewStage:
        """获取当前阶段"""
        return self.stages[self.current_stage_index]

    def get_next_stage(self) -> Optional[InterviewStage]:
        """获取下一阶段"""
        if self.current_stage_index < len(self.stages) - 1:
            return self.stages[self.current_stage_index + 1]
        return None

    def advance_stage(self) -> InterviewStage:
        """进入下一阶段"""
        if self.current_stage_index < len(self.stages) - 1:
            self.current_stage_index += 1
        return self.get_current_stage()

    def can_advance(self) -> bool:
        """检查是否可以进入下一阶段"""
        return self.current_stage_index < len(self.stages) - 1

    def get_stage_duration(self, stage: Optional[InterviewStage] = None) -> int:
        """获取阶段时长（秒）"""
        if stage is None:
            stage = self.get_current_stage()
        return self.stage_duration.get(stage, 0)

    def set_stage_data(self, stage: InterviewStage, key: str, value: Any):
        """设置阶段数据"""
        if stage not in self.stage_data:
            self.stage_data[stage] = {}
        self.stage_data[stage][key] = value

    def get_stage_data(self, stage: InterviewStage, key: str, default: Any = None) -> Any:
        """获取阶段数据"""
        return self.stage_data.get(stage, {}).get(key, default)

    def get_flow_summary(self) -> Dict[str, Any]:
        """获取流程摘要"""
        return {
            "current_stage": self.get_current_stage().name,
            "next_stage": self.get_next_stage().name if self.get_next_stage() else None,
            "progress": f"{self.current_stage_index + 1}/{len(self.stages)}",
            "stages": [s.name for s in self.stages],
        }
