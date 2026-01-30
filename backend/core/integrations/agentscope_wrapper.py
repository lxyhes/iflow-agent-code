"""
AgentScope 技能模块化封装适配器

实现 AgentScope 风格的技能定义、注册、组合和调用机制：
- 技能模块化封装
- 可复用 Agent 落地方案
- 全链路开发能力
"""

import json
import inspect
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Type, Union, get_type_hints
from functools import wraps
from abc import ABC, abstractmethod
import asyncio


@dataclass
class SkillParameter:
    """
    技能参数定义
    
    符合 AgentScope 规范的参数描述
    """
    name: str
    description: str
    type: Type = str
    required: bool = True
    default: Any = None
    enum: Optional[List[Any]] = None  # 枚举值
    example: Optional[Any] = None     # 示例值
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式（用于 API 文档）"""
        result = {
            "name": self.name,
            "description": self.description,
            "type": self.type.__name__,
            "required": self.required,
        }
        if self.default is not None:
            result["default"] = self.default
        if self.enum:
            result["enum"] = self.enum
        if self.example is not None:
            result["example"] = self.example
        return result


@dataclass
class SkillOutput:
    """
    技能输出定义
    
    描述技能的返回结果结构
    """
    description: str
    type: Type = str
    schema: Optional[Dict[str, Any]] = None  # JSON Schema
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "description": self.description,
            "type": self.type.__name__,
        }
        if self.schema:
            result["schema"] = self.schema
        return result


@dataclass
class SkillContext:
    """
    技能执行上下文
    
    传递执行环境信息，支持技能间的状态共享
    """
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    parent_trace: Optional[str] = None  # 父级追踪 ID
    
    def get(self, key: str, default: Any = None) -> Any:
        """获取上下文值"""
        return self.metadata.get(key, default)
    
    def set(self, key: str, value: Any):
        """设置上下文值"""
        self.metadata[key] = value


class AgentScopeSkill(ABC):
    """
    AgentScope 技能基类
    
    所有技能必须继承此类，实现标准化的技能接口
    
    示例：
        class CodeExecutionSkill(AgentScopeSkill):
            def __init__(self):
                super().__init__(
                    name="code_execution",
                    description="执行代码并返回结果",
                    parameters=[
                        SkillParameter("code", "要执行的代码", str, required=True),
                        SkillParameter("language", "编程语言", str, default="python"),
                    ],
                    output=SkillOutput("执行结果", str),
                )
            
            async def execute(self, code: str, language: str = "python", context: Optional[SkillContext] = None) -> str:
                # 实现代码执行逻辑
                return result
    """
    
    def __init__(
        self,
        name: str,
        description: str,
        parameters: Optional[List[SkillParameter]] = None,
        output: Optional[SkillOutput] = None,
        tags: Optional[List[str]] = None,
        version: str = "1.0.0",
        author: Optional[str] = None,
    ):
        self.name = name
        self.description = description
        self.parameters = parameters or []
        self.output = output or SkillOutput("执行结果")
        self.tags = tags or []
        self.version = version
        self.author = author
        self._execution_count = 0
        self._success_count = 0
    
    @abstractmethod
    async def execute(self, *args, **kwargs) -> Any:
        """
        执行技能
        
        子类必须实现此方法
        """
        pass
    
    def get_schema(self) -> Dict[str, Any]:
        """
        获取技能 JSON Schema
        
        用于 LLM 理解技能能力和参数
        """
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "author": self.author,
            "tags": self.tags,
            "parameters": {
                "type": "object",
                "properties": {
                    param.name: {
                        "type": param.type.__name__,
                        "description": param.description,
                        **({"enum": param.enum} if param.enum else {}),
                        **({"example": param.example} if param.example is not None else {}),
                    }
                    for param in self.parameters
                },
                "required": [
                    param.name for param in self.parameters if param.required
                ],
            },
            "returns": self.output.to_dict(),
        }
    
    async def run(self, context: Optional[SkillContext] = None, **kwargs) -> Any:
        """
        带追踪和错误处理的执行入口
        
        Args:
            context: 执行上下文
            **kwargs: 技能参数
            
        Returns:
            技能执行结果
        """
        self._execution_count += 1
        
        try:
            # 参数验证
            self._validate_params(kwargs)
            
            # 执行技能
            if asyncio.iscoroutinefunction(self.execute):
                result = await self.execute(**kwargs, context=context)
            else:
                result = self.execute(**kwargs, context=context)
            
            self._success_count += 1
            return result
            
        except Exception as e:
            error_msg = f"技能 '{self.name}' 执行失败: {str(e)}"
            # 可以在这里添加错误追踪
            raise SkillExecutionError(error_msg) from e
    
    def _validate_params(self, kwargs: Dict[str, Any]):
        """验证参数"""
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                raise ValueError(f"缺少必需参数: {param.name}")
            
            if param.name in kwargs and param.enum:
                if kwargs[param.name] not in param.enum:
                    raise ValueError(
                        f"参数 '{param.name}' 的值必须是 {param.enum} 之一"
                    )
    
    def get_stats(self) -> Dict[str, Any]:
        """获取技能使用统计"""
        return {
            "name": self.name,
            "execution_count": self._execution_count,
            "success_count": self._success_count,
            "success_rate": self._success_count / max(self._execution_count, 1),
        }


class SkillExecutionError(Exception):
    """技能执行错误"""
    pass


class CompositeSkill(AgentScopeSkill):
    """
    组合技能
    
    将多个技能组合成一个工作流，实现复杂任务
    
    示例：
        # 创建代码审查工作流
        review_workflow = CompositeSkill(
            name="code_review",
            description="完整的代码审查流程",
            steps=[
                skill_registry.get("static_analysis"),
                skill_registry.get("security_check"),
                skill_registry.get("style_review"),
            ],
            mode="sequential",  # 顺序执行
        )
    """
    
    def __init__(
        self,
        name: str,
        description: str,
        steps: List[AgentScopeSkill],
        mode: str = "sequential",  # sequential, parallel, conditional
        condition: Optional[Callable[[Any], bool]] = None,
        tags: Optional[List[str]] = None,
    ):
        super().__init__(name=name, description=description, tags=tags)
        self.steps = steps
        self.mode = mode
        self.condition = condition
        self._step_results: List[Any] = []
    
    async def execute(self, context: Optional[SkillContext] = None, **kwargs) -> Dict[str, Any]:
        """
        执行组合技能
        
        根据模式选择执行策略
        """
        if self.mode == "sequential":
            return await self._execute_sequential(context, **kwargs)
        elif self.mode == "parallel":
            return await self._execute_parallel(context, **kwargs)
        elif self.mode == "conditional":
            return await self._execute_conditional(context, **kwargs)
        else:
            raise ValueError(f"未知的执行模式: {self.mode}")
    
    async def _execute_sequential(
        self,
        context: Optional[SkillContext],
        **kwargs
    ) -> Dict[str, Any]:
        """顺序执行所有步骤"""
        results = {}
        shared_context = context or SkillContext()
        
        for i, step in enumerate(self.steps):
            # 将前面步骤的结果传递给后续步骤
            step_input = {**kwargs, **results}           
            result = await step.run(context=shared_context, **step_input)
            results[f"step_{i}_{step.name}"] = result
            
            # 更新共享上下文
            shared_context.set(f"last_result", result)
            shared_context.set(f"step_{i}_result", result)
        
        return {
            "mode": "sequential",
            "steps": len(self.steps),
            "results": results,
            "final_result": list(results.values())[-1] if results else None,
        }
    
    async def _execute_parallel(
        self,
        context: Optional[SkillContext],
        **kwargs
    ) -> Dict[str, Any]:
        """并行执行所有步骤"""
        import asyncio
        
        tasks = [
            step.run(context=context, **kwargs)
            for step in self.steps
        ]
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        results = {}
        for i, (step, result) in enumerate(zip(self.steps, results_list)):
            if isinstance(result, Exception):
                results[f"step_{i}_{step.name}"] = {"error": str(result)}
            else:
                results[f"step_{i}_{step.name}"] = result
        
        return {
            "mode": "parallel",
            "steps": len(self.steps),
            "results": results,
        }
    
    async def _execute_conditional(
        self,
        context: Optional[SkillContext],
        **kwargs
    ) -> Dict[str, Any]:
        """条件执行：根据条件选择执行路径"""
        if not self.condition:
            raise ValueError("条件模式需要设置 condition 函数")
        
        for step in self.steps:
            # 检查条件
            if self.condition(kwargs):
                result = await step.run(context=context, **kwargs)
                return {
                    "mode": "conditional",
                    "executed_step": step.name,
                    "result": result,
                }
        
        return {
            "mode": "conditional",
            "executed_step": None,
            "result": None,
            "message": "没有步骤满足条件",
        }


class AgentScopeSkillRegistry:
    """
    AgentScope 技能注册中心
    
    管理所有技能的注册、发现和组合
    
    特性：
    - 技能注册和注销
    - 按标签分类检索
    - 技能组合工作流
    - 使用统计追踪
    """
    
    def __init__(self):
        self._skills: Dict[str, AgentScopeSkill] = {}
        self._tags_index: Dict[str, List[str]] = {}  # tag -> skill_names
        self._categories: Dict[str, List[str]] = {}  # category -> skill_names
    
    def register(self, skill: AgentScopeSkill, category: Optional[str] = None) -> "AgentScopeSkillRegistry":
        """
        注册技能
        
        Args:
            skill: 技能实例
            category: 技能分类（可选）
            
        Returns:
            self，支持链式调用
        """
        self._skills[skill.name] = skill
        
        # 更新标签索引
        for tag in skill.tags:
            if tag not in self._tags_index:
                self._tags_index[tag] = []
            if skill.name not in self._tags_index[tag]:
                self._tags_index[tag].append(skill.name)
        
        # 更新分类索引
        if category:
            if category not in self._categories:
                self._categories[category] = []
            if skill.name not in self._categories[category]:
                self._categories[category].append(skill.name)
        
        return self
    
    def unregister(self, skill_name: str) -> bool:
        """注销技能"""
        if skill_name not in self._skills:
            return False
        
        skill = self._skills[skill_name]
        
        # 从标签索引中移除
        for tag in skill.tags:
            if tag in self._tags_index and skill_name in self._tags_index[tag]:
                self._tags_index[tag].remove(skill_name)
        
        # 从分类索引中移除
        for category, skills in self._categories.items():
            if skill_name in skills:
                skills.remove(skill_name)
        
        # 移除技能
        del self._skills[skill_name]
        return True
    
    def get(self, skill_name: str) -> Optional[AgentScopeSkill]:
        """获取技能"""
        return self._skills.get(skill_name)
    
    def list_skills(
        self,
        tag: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[str]:
        """
        列出技能
        
        Args:
            tag: 按标签过滤
            category: 按分类过滤
            
        Returns:
            技能名称列表
        """
        if tag:
            return self._tags_index.get(tag, [])
        elif category:
            return self._categories.get(category, [])
        else:
            return list(self._skills.keys())
    
    def search(self, query: str) -> List[AgentScopeSkill]:
        """
        搜索技能
        
        根据名称、描述或标签搜索
        """
        query = query.lower()
        results = []
        
        for skill in self._skills.values():
            if (query in skill.name.lower() or
                query in skill.description.lower() or
                any(query in tag.lower() for tag in skill.tags)):
                results.append(skill)
        
        return results
    
    def create_workflow(
        self,
        name: str,
        description: str,
        skill_names: List[str],
        mode: str = "sequential",
    ) -> CompositeSkill:
        """
        创建工作流
        
        将多个技能组合成一个工作流
        
        Args:
            name: 工作流名称
            description: 工作流描述
            skill_names: 技能名称列表
            mode: 执行模式
            
        Returns:
            组合技能实例
        """
        steps = []
        for skill_name in skill_names:
            skill = self.get(skill_name)
            if not skill:
                raise ValueError(f"技能 '{skill_name}' 不存在")
            steps.append(skill)
        
        return CompositeSkill(
            name=name,
            description=description,
            steps=steps,
            mode=mode,
            tags=["workflow"],
        )
    
    def get_all_schemas(self) -> List[Dict[str, Any]]:
        """获取所有技能的 Schema"""
        return [skill.get_schema() for skill in self._skills.values()]
    
    def get_stats(self) -> Dict[str, Any]:
        """获取注册中心统计信息"""
        return {
            "total_skills": len(self._skills),
            "total_tags": len(self._tags_index),
            "total_categories": len(self._categories),
            "skills_by_category": {
                cat: len(skills) for cat, skills in self._categories.items()
            },
            "skill_details": [
                skill.get_stats() for skill in self._skills.values()
            ],
        }


def skill(
    name: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[List[str]] = None,
    version: str = "1.0.0",
):
    """
    技能装饰器
    
    将函数转换为 AgentScope 技能
    
    示例：
        @skill(
            name="calculate",
            description="执行数学计算",
            tags=["math"],
        )
        async def calculate(expression: str, context: Optional[SkillContext] = None) -> str:
            result = eval(expression)
            return str(result)
    """
    def decorator(func: Callable) -> AgentScopeSkill:
        skill_name = name or func.__name__
        skill_desc = description or func.__doc__ or f"执行 {skill_name}"
        
        # 解析函数签名获取参数
        sig = inspect.signature(func)
        type_hints = get_type_hints(func)
        
        parameters = []
        for param_name, param in sig.parameters.items():
            if param_name == "context":
                continue  # 跳过上下文参数
            
            param_type = type_hints.get(param_name, str)
            default = param.default if param.default != inspect.Parameter.empty else None
            
            parameters.append(SkillParameter(
                name=param_name,
                description=f"参数 {param_name}",
                type=param_type,
                required=param.default == inspect.Parameter.empty,
                default=default,
            ))
        
        # 创建技能类
        class FunctionSkill(AgentScopeSkill):
            def __init__(self):
                super().__init__(
                    name=skill_name,
                    description=skill_desc,
                    parameters=parameters,
                    tags=tags or [],
                    version=version,
                )
                self._func = func
            
            async def execute(self, context: Optional[SkillContext] = None, **kwargs):
                if asyncio.iscoroutinefunction(self._func):
                    return await self._func(**kwargs, context=context)
                else:
                    return self._func(**kwargs, context=context)
        
        return FunctionSkill()
    
    return decorator


# 便捷函数：从现有 ToolSpec 创建技能
def from_toolspec(toolspec: Any) -> AgentScopeSkill:
    """
    从现有的 ToolSpec 创建 AgentScopeSkill
    
    用于兼容现有的工具系统
    """
    class ToolSpecSkill(AgentScopeSkill):
        def __init__(self, spec):
            # 解析 ToolSpec 的参数
            params = []
            if hasattr(spec, 'args_schema') and spec.args_schema:
                for param_name, param_info in spec.args_schema.items():
                    params.append(SkillParameter(
                        name=param_name,
                        description=param_info.get("description", param_name),
                        type=param_info.get("type", str),
                        required=param_info.get("required", True),
                    ))
            
            super().__init__(
                name=spec.name,
                description=spec.description,
                parameters=params,
                tags=[spec.tool_type] if hasattr(spec, 'tool_type') else [],
            )
            self._spec = spec
        
        async def execute(self, context: Optional[SkillContext] = None, **kwargs):
            if asyncio.iscoroutinefunction(self._spec.run):
                return await self._spec.run(**kwargs)
            else:
                return self._spec.run(**kwargs)
    
    return ToolSpecSkill(toolspec)
