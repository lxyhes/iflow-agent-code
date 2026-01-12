"""
项目开发优化 Agent
专门为项目开发场景优化的 AI Agent，提供更好的项目理解和开发体验
"""

import asyncio
import os
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime
from .agent import Agent
from .rag_service import get_rag_service
from .context_graph_service import ContextGraphService
from .gamification_service import get_gamification_service

logger = logging.getLogger("ProjectDeveloperAgent")


class ProjectDeveloperAgent:
    """
    项目开发 Agent - 专门为项目开发优化的 AI Agent
    
    特性：
    1. 自动理解项目结构
    2. 智能代码上下文检索
    3. 任务分解和执行计划
    4. 自动测试和修复
    5. 代码质量检查
    """
    
    def __init__(
        self,
        project_path: str,
        mode: str = "yolo",
        model: str = None,
        persona: str = "senior",
        mcp_servers: List[Dict[str, Any]] = None,
        auth_method_id: str = None,
        auth_method_info: Dict[str, Any] = None
    ):
        self.project_path = project_path
        self.mode = mode
        self.model = model
        self.persona = persona
        self.mcp_servers = mcp_servers
        self.auth_method_id = auth_method_id
        self.auth_method_info = auth_method_info
        
        # 初始化基础 Agent
        self.base_agent = Agent(
            name="ProjectDeveloper",
            cwd=project_path,
            mode=mode,
            model=model,
            mcp_servers=mcp_servers,
            persona=persona,
            auth_method_id=auth_method_id,
            auth_method_info=auth_method_info,
            use_sdk=True
        )
        
        # 初始化增强服务
        self.rag_service = None
        self.context_graph = None
        self.gamification = None
        
        # 项目上下文缓存
        self.project_context = {
            "structure": None,
            "dependencies": None,
            "recent_changes": None,
            "issues": []
        }
        
        # 开发模式配置
        self.dev_mode = {
            "auto_test": True,
            "auto_fix": True,
            "code_review": True,
            "documentation": True,
            "performance_optimization": True,
            "security_check": True
        }
        
        # 任务队列和状态
        self.task_queue = []
        self.current_task = None
        self.task_history = []
        
        # 学习和记忆
        self.learned_patterns = {
            "common_fixes": {},
            "user_preferences": {},
            "project_conventions": {}
        }
        
        # 性能监控
        self.performance_metrics = {
            "tasks_completed": 0,
            "bugs_fixed": 0,
            "features_developed": 0,
            "code_reviews": 0,
            "avg_response_time": 0
        }
        
        logger.info(f"ProjectDeveloperAgent initialized for {project_path}")
    
    async def initialize_services(self):
        """初始化增强服务"""
        try:
            # 初始化 RAG 服务
            self.rag_service = get_rag_service(self.project_path, use_chromadb=False)
            logger.info("RAG service initialized")
            
            # 初始化上下文图服务
            self.context_graph = ContextGraphService(self.project_path)
            logger.info("Context graph service initialized")
            
            # 初始化游戏化服务
            self.gamification = get_gamification_service("default_user")
            logger.info("Gamification service initialized")
            
            # 加载项目上下文
            await self._load_project_context()
            
        except Exception as e:
            logger.error(f"Failed to initialize services: {e}")
    
    async def _load_project_context(self):
        """加载项目上下文"""
        try:
            # 获取项目结构
            self.project_context["structure"] = await self.context_graph.get_project_structure()
            
            # 获取依赖关系
            self.project_context["dependencies"] = await self.context_graph.get_dependency_graph()
            
            logger.info("Project context loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load project context: {e}")
    
    async def chat_with_context(
        self,
        user_input: str,
        use_rag: bool = True,
        use_context_graph: bool = True,
        n_results: int = 5
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        带上下文的对话
        
        Args:
            user_input: 用户输入
            use_rag: 是否使用 RAG 检索
            use_context_graph: 是否使用上下文图
            n_results: RAG 检索结果数量
        
        Yields:
            消息字典
        """
        # 增强用户输入
        enhanced_input = await self._enhance_input_with_context(
            user_input,
            use_rag=use_rag,
            use_context_graph=use_context_graph,
            n_results=n_results
        )
        
        # 发送到基础 Agent
        async for message in self.base_agent.chat_stream(enhanced_input):
            yield message
    
    async def _enhance_input_with_context(
        self,
        user_input: str,
        use_rag: bool = True,
        use_context_graph: bool = True,
        n_results: int = 5
    ) -> str:
        """用项目上下文增强用户输入"""
        context_parts = []
        
        # 添加项目结构上下文
        if use_context_graph and self.project_context["structure"]:
            structure_summary = self._summarize_project_structure()
            if structure_summary:
                context_parts.append(f"## 项目结构\n{structure_summary}")
        
        # 添加 RAG 检索结果
        if use_rag and self.rag_service:
            try:
                rag_results = self.rag_service.retrieve(user_input, n_results=n_results)
                if rag_results:
                    context_parts.append("## 相关代码文档")
                    for i, result in enumerate(rag_results[:3], 1):
                        file_path = result.get("metadata", {}).get("file_path", "未知文件")
                        content = result.get("content", "")[:500]
                        context_parts.append(f"\n[{i}] {file_path}\n```\n{content}\n```")
            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}")
        
        # 组合上下文和用户输入
        if context_parts:
            enhanced_input = f"""你是一个专业的项目开发助手。以下是项目上下文信息：

{chr(10).join(context_parts)}

---

用户请求：
{user_input}

请基于以上项目上下文，提供准确的代码建议和解决方案。"""
        else:
            enhanced_input = user_input
        
        return enhanced_input
    
    def _summarize_project_structure(self) -> str:
        """总结项目结构"""
        if not self.project_context["structure"]:
            return ""
        
        structure = self.project_context["structure"]
        summary = []
        
        # 按类型分类
        files_by_type = {}
        for file_info in structure.get("files", []):
            ext = os.path.splitext(file_info["path"])[1].lower()
            if ext not in files_by_type:
                files_by_type[ext] = []
            files_by_type[ext].append(file_info["path"])
        
        # 生成摘要
        for ext, files in files_by_type.items():
            summary.append(f"- {ext}: {len(files)} 个文件")
        
        return "\n".join(summary)
    
    async def develop_feature(
        self,
        feature_description: str,
        create_tests: bool = True,
        auto_fix: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        开发新功能 - 完整的开发流程
        
        Args:
            feature_description: 功能描述
            create_tests: 是否创建测试
            auto_fix: 是否自动修复错误
        
        Yields:
            开发进度和结果
        """
        yield {
            "type": "status",
            "message": f"开始开发功能: {feature_description}",
            "stage": "planning"
        }
        
        # 1. 分析需求
        yield {
            "type": "status",
            "message": "分析功能需求...",
            "stage": "analysis"
        }
        
        analysis_prompt = f"""请分析以下功能需求，提供详细的实现计划：

功能描述：{feature_description}

请提供：
1. 功能拆解（分为多个子任务）
2. 需要修改的文件列表
3. 可能的技术难点
4. 建议的实现步骤

项目结构参考：
{self._summarize_project_structure()}"""
        
        plan = ""
        async for msg in self.base_agent.chat_stream(analysis_prompt):
            if isinstance(msg, dict) and msg.get("type") == "assistant":
                plan += msg.get("content", "")
            elif isinstance(msg, str):
                plan += msg
        
        yield {
            "type": "plan",
            "content": plan,
            "stage": "planned"
        }
        
        # 2. 实现代码
        yield {
            "type": "status",
            "message": "开始实现功能...",
            "stage": "implementation"
        }
        
        implementation_prompt = f"""基于以下计划，实现该功能：

功能描述：{feature_description}

实现计划：
{plan}

请：
1. 生成完整的代码
2. 确保代码质量和可维护性
3. 添加必要的注释和文档
4. 遵循项目现有的代码风格"""
        
        async for msg in self.base_agent.chat_stream(implementation_prompt):
            yield msg
        
        yield {
            "type": "status",
            "message": "功能开发完成",
            "stage": "completed"
        }
        
        # 3. 创建测试（如果启用）
        if create_tests:
            yield {
                "type": "status",
                "message": "生成测试代码...",
                "stage": "testing"
            }
            
            test_prompt = f"""为以下功能生成完整的单元测试：

功能描述：{feature_description}

实现计划：
{plan}

请生成：
1. 单元测试用例
2. 边界条件测试
3. 集成测试（如需要）"""
            
            async for msg in self.base_agent.chat_stream(test_prompt):
                yield msg
        
        # 更新游戏化统计
        if self.gamification:
            await self.gamification.update_stat("default_user", "features_developed", 1)
    
    async def debug_issue(
        self,
        error_message: str,
        stack_trace: str = None,
        context: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        调试问题 - 智能错误分析和修复
        
        Args:
            error_message: 错误消息
            stack_trace: 堆栈跟踪
            context: 额外上下文
        
        Yields:
            调试进度和结果
        """
        yield {
            "type": "status",
            "message": "分析错误...",
            "stage": "analysis"
        }
        
        # 构建调试提示
        debug_prompt = f"""请分析以下错误并提供修复方案：

错误消息：
{error_message}

"""
        
        if stack_trace:
            debug_prompt += f"堆栈跟踪：\n```\n{stack_trace}\n```\n"
        
        if context:
            debug_prompt += f"\n上下文信息：\n{json.dumps(context, indent=2, ensure_ascii=False)}\n"
        
        debug_prompt += f"""
项目结构：
{self._summarize_project_structure()}

请提供：
1. 错误原因分析
2. 具体的修复方案
3. 修复后的完整代码
4. 如何避免类似错误的建议"""
        
        async for msg in self.base_agent.chat_stream(debug_prompt):
            yield msg
        
        # 更新游戏化统计
        if self.gamification:
            await self.gamification.update_stat("default_user", "bugs_fixed", 1)
    
    async def code_review(
        self,
        file_path: str = None,
        code: str = None,
        review_type: str = "comprehensive"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        代码审查
        
        Args:
            file_path: 文件路径（可选）
            code: 代码内容（可选）
            review_type: 审查类型（comprehensive, security, performance, style）
        
        Yields:
            审查结果
        """
        yield {
            "type": "status",
            "message": "开始代码审查...",
            "stage": "reviewing"
        }
        
        review_prompts = {
            "comprehensive": "请进行全面的代码审查，包括：\n1. 代码质量\n2. 潜在的 bug\n3. 性能问题\n4. 安全隐患\n5. 代码风格\n6. 可维护性",
            "security": "请专注于安全方面的代码审查，包括：\n1. SQL 注入风险\n2. XSS 攻击风险\n3. 敏感信息泄露\n4. 权限检查\n5. 输入验证",
            "performance": "请专注于性能方面的代码审查，包括：\n1. 算法复杂度\n2. 内存使用\n3. 数据库查询优化\n4. 缓存策略\n5. 并发处理",
            "style": "请专注于代码风格的审查，包括：\n1. 命名规范\n2. 代码格式\n3. 注释质量\n4. 代码组织\n5. 最佳实践"
        }
        
        review_prompt = f"""{review_prompts.get(review_type, review_prompts['comprehensive'])}

"""
        
        if file_path:
            review_prompt += f"文件路径：{file_path}\n"
        
        if code:
            review_prompt += f"代码：\n```\n{code}\n```\n"
        
        async for msg in self.base_agent.chat_stream(review_prompt):
            yield msg
    
    async def get_project_health(self) -> Dict[str, Any]:
        """获取项目健康度报告"""
        health_report = {
            "timestamp": datetime.now().isoformat(),
            "project_path": self.project_path,
            "structure": {
                "total_files": 0,
                "file_types": {}
            },
            "dependencies": {},
            "issues": self.project_context.get("issues", []),
            "recommendations": []
        }
        
        # 统计文件类型
        structure = self.project_context.get("structure")
        if structure and isinstance(structure, dict):
            files = structure.get("files", [])
            health_report["structure"]["total_files"] = len(files)
            
            for file_info in files:
                if isinstance(file_info, dict):
                    file_path = file_info.get("path", "")
                    ext = os.path.splitext(file_path)[1].lower()
                    health_report["structure"]["file_types"][ext] = \
                        health_report["structure"]["file_types"].get(ext, 0) + 1
        
        return health_report
    
    async def refactor_code(
        self,
        file_path: str,
        refactor_type: str = "optimize",
        target: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        代码重构
        
        Args:
            file_path: 文件路径
            refactor_type: 重构类型（optimize, simplify, modernize, extract）
            target: 重构目标（可选）
        
        Yields:
            重构进度和结果
        """
        yield {
            "type": "status",
            "message": f"开始重构: {file_path}",
            "stage": "analysis"
        }
        
        refactor_prompts = {
            "optimize": "请优化以下代码的性能，包括：\n1. 减少不必要的计算\n2. 优化算法复杂度\n3. 减少内存使用\n4. 提高执行效率",
            "simplify": "请简化以下代码，包括：\n1. 减少代码复杂度\n2. 提高可读性\n3. 消除重复代码\n4. 使用更简洁的实现",
            "modernize": "请现代化以下代码，包括：\n1. 使用最新的语言特性\n2. 采用现代设计模式\n3. 更新过时的 API\n4. 符合当前最佳实践",
            "extract": "请提取以下代码中的可复用部分，包括：\n1. 提取通用函数\n2. 创建可复用的组件\n3. 定义清晰的接口\n4. 提高代码复用性"
        }
        
        # 读取文件内容
        try:
            full_path = os.path.join(self.project_path, file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                code = f.read()
        except Exception as e:
            yield {
                "type": "error",
                "message": f"读取文件失败: {str(e)}"
            }
            return
        
        refactor_prompt = f"""{refactor_prompts.get(refactor_type, refactor_prompts['optimize'])}

文件路径：{file_path}
"""
        
        if target:
            refactor_prompt += f"重构目标：{target}\n"
        
        refactor_prompt += f"\n代码：\n```\n{code}\n```\n\n请提供：\n1. 重构后的完整代码\n2. 重构说明和理由\n3. 改进点总结"
        
        async for msg in self.base_agent.chat_stream(refactor_prompt):
            yield msg
        
        # 更新性能指标
        self.performance_metrics["code_reviews"] += 1
    
    async def generate_documentation(
        self,
        target: str = "project",
        format: str = "markdown"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        生成文档
        
        Args:
            target: 文档目标（project, api, component, function）
            format: 文档格式（markdown, html, openapi）
        
        Yields:
            文档生成进度和结果
        """
        yield {
            "type": "status",
            "message": f"开始生成文档: {target}",
            "stage": "generating"
        }
        
        doc_prompts = {
            "project": """请为整个项目生成完整的文档，包括：
1. 项目概述
2. 技术栈说明
3. 项目结构
4. 安装和配置
5. 使用指南
6. 开发指南
7. API 文档（如有）
8. 贡献指南""",
            "api": """请为项目的 API 生成完整文档，包括：
1. API 概述
2. 端点列表
3. 请求/响应格式
4. 认证说明
5. 错误处理
6. 使用示例""",
            "component": """请为项目组件生成文档，包括：
1. 组件概述
2. Props 说明
3. 使用示例
4. 最佳实践
5. 常见问题""",
            "function": """请为项目函数生成文档，包括：
1. 函数概述
2. 参数说明
3. 返回值说明
4. 使用示例
5. 注意事项"""
        }
        
        doc_prompt = f"""{doc_prompts.get(target, doc_prompts['project'])}

项目结构：
{self._summarize_project_structure()}

请生成 {format} 格式的文档。"""
        
        async for msg in self.base_agent.chat_stream(doc_prompt):
            yield msg
    
    async def analyze_performance(
        self,
        file_path: str = None,
        code: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        性能分析
        
        Args:
            file_path: 文件路径（可选）
            code: 代码内容（可选）
        
        Yields:
            性能分析结果
        """
        yield {
            "type": "status",
            "message": "开始性能分析...",
            "stage": "analyzing"
        }
        
        analysis_prompt = """请对以下代码进行性能分析，包括：
1. 时间复杂度分析
2. 空间复杂度分析
3. 性能瓶颈识别
4. 优化建议
5. 性能测试建议

"""
        
        if file_path:
            analysis_prompt += f"文件路径：{file_path}\n"
        
        if code:
            analysis_prompt += f"代码：\n```\n{code}\n```\n"
        
        async for msg in self.base_agent.chat_stream(analysis_prompt):
            yield msg
    
    async def security_scan(
        self,
        file_path: str = None,
        code: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        安全扫描
        
        Args:
            file_path: 文件路径（可选）
            code: 代码内容（可选）
        
        Yields:
            安全扫描结果
        """
        yield {
            "type": "status",
            "message": "开始安全扫描...",
            "stage": "scanning"
        }
        
        scan_prompt = """请对以下代码进行安全扫描，包括：
1. SQL 注入风险
2. XSS 攻击风险
3. CSRF 攻击风险
4. 敏感信息泄露
5. 权限检查缺失
6. 输入验证不足
7. 不安全的加密
8. 依赖漏洞

"""
        
        if file_path:
            scan_prompt += f"文件路径：{file_path}\n"
        
        if code:
            scan_prompt += f"代码：\n```\n{code}\n```\n"
        
        scan_prompt += """
请提供：
1. 发现的安全问题列表（按严重程度排序）
2. 每个问题的详细说明
3. 修复建议和代码示例
4. 预防措施"""
        
        async for msg in self.base_agent.chat_stream(scan_prompt):
            yield msg
    
    async def intelligent_completion(
        self,
        file_path: str,
        line_number: int,
        context_lines: int = 10
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        智能代码补全
        
        Args:
            file_path: 文件路径
            line_number: 当前行号
            context_lines: 上下文行数
        
        Yields:
            补全建议
        """
        yield {
            "type": "status",
            "message": "生成智能补全建议...",
            "stage": "generating"
        }
        
        # 读取文件上下文
        try:
            full_path = os.path.join(self.project_path, file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            start_line = max(0, line_number - context_lines)
            end_line = min(len(lines), line_number + context_lines)
            context = ''.join(lines[start_line:end_line])
            
            # 获取文件类型
            ext = os.path.splitext(file_path)[1].lower()
            
        except Exception as e:
            yield {
                "type": "error",
                "message": f"读取文件失败: {str(e)}"
            }
            return
        
        completion_prompt = f"""请为以下代码提供智能补全建议：

文件类型：{ext}
当前行号：{line_number}

代码上下文：
```
{context}
```

请提供：
1. 最可能的补全建议（多个选项）
2. 每个建议的理由
3. 使用示例
4. 相关最佳实践"""
        
        async for msg in self.base_agent.chat_stream(completion_prompt):
            yield msg
    
    async def learn_from_context(self):
        """从项目上下文中学习"""
        try:
            # 学习项目约定
            if self.project_context.get("structure"):
                files = self.project_context["structure"].get("files", [])
                
                # 分析命名约定
                naming_patterns = {}
                for file_info in files:
                    file_name = os.path.basename(file_info["path"])
                    if '.' in file_name:
                        base_name = file_name.rsplit('.', 1)[0]
                        pattern = '_'.join(base_name.split('_')[:2])  # 取前两个词作为模式
                        if pattern not in naming_patterns:
                            naming_patterns[pattern] = 0
                        naming_patterns[pattern] += 1
                
                # 保存最常见的命名模式
                if naming_patterns:
                    most_common = max(naming_patterns.items(), key=lambda x: x[1])[0]
                    self.learned_patterns["project_conventions"]["naming_pattern"] = most_common
                    logger.info(f"Learned naming pattern: {most_common}")
            
            # 学习常见修复
            if self.task_history:
                recent_fixes = [t for t in self.task_history[-10:] if t.get("type") == "bug_fix"]
                if recent_fixes:
                    self.learned_patterns["common_fixes"] = recent_fixes
                    logger.info(f"Learned {len(recent_fixes)} common fixes")
        
        except Exception as e:
            logger.warning(f"Failed to learn from context: {e}")
    
    async def get_smart_suggestions(
        self,
        current_context: str,
        task_type: str = "general"
    ) -> List[Dict[str, Any]]:
        """
        获取智能建议
        
        Args:
            current_context: 当前上下文
            task_type: 任务类型
        
        Returns:
            建议列表
        """
        suggestions = []
        
        # 基于学习到的模式提供建议
        if task_type == "naming" and "naming_pattern" in self.learned_patterns["project_conventions"]:
            pattern = self.learned_patterns["project_conventions"]["naming_pattern"]
            suggestions.append({
                "type": "naming",
                "suggestion": f"建议使用项目命名模式: {pattern}",
                "confidence": 0.8
            })
        
        # 基于常见修复提供建议
        if "common_fixes" in self.learned_patterns and self.learned_patterns["common_fixes"]:
            for fix in self.learned_patterns["common_fixes"][:3]:
                suggestions.append({
                    "type": "fix",
                    "suggestion": fix.get("description", ""),
                    "confidence": 0.7
                })
        
        return suggestions
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """获取性能指标"""
        return {
            "tasks_completed": self.performance_metrics["tasks_completed"],
            "bugs_fixed": self.performance_metrics["bugs_fixed"],
            "features_developed": self.performance_metrics["features_developed"],
            "code_reviews": self.performance_metrics["code_reviews"],
            "avg_response_time": self.performance_metrics["avg_response_time"],
            "task_history": len(self.task_history)
        }
    
    def set_dev_mode(self, **kwargs):
        """设置开发模式配置"""
        for key, value in kwargs.items():
            if key in self.dev_mode:
                self.dev_mode[key] = value
                logger.info(f"Dev mode {key} set to {value}")
    
    def reset(self):
        """重置 Agent"""
        self.base_agent.reset()
        logger.info("ProjectDeveloperAgent reset")


# 便捷函数
def get_project_developer_agent(
    project_path: str,
    mode: str = "yolo",
    model: str = None,
    persona: str = "senior",
    mcp_servers: List[Dict[str, Any]] = None,
    auth_method_id: str = None,
    auth_method_info: Dict[str, Any] = None
) -> ProjectDeveloperAgent:
    """
    获取项目开发 Agent 实例
    
    Args:
        project_path: 项目路径
        mode: 模式
        model: 模型
        persona: 性格
        mcp_servers: MCP 服务器列表
        auth_method_id: 认证方法 ID
        auth_method_info: 认证方法信息
    
    Returns:
        ProjectDeveloperAgent 实例
    """
    return ProjectDeveloperAgent(
        project_path=project_path,
        mode=mode,
        model=model,
        persona=persona,
        mcp_servers=mcp_servers,
        auth_method_id=auth_method_id,
        auth_method_info=auth_method_info
    )