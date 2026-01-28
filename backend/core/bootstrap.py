"""
应用启动引导模块
统一初始化所有服务和依赖
"""
import os
import logging
from typing import Optional

from backend.core.service_registry import registry, ServiceRegistry
from backend.core.project_registry import ProjectRegistry, get_project_registry

logger = logging.getLogger("Bootstrap")


class ApplicationBootstrap:
    """
    应用启动引导器
    
    负责：
    1. 初始化配置
    2. 注册所有核心服务
    3. 建立服务间依赖关系
    4. 启动后台任务
    """
    
    _initialized = False
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def initialize(self, projects_file: Optional[str] = None) -> None:
        """初始化应用"""
        if self._initialized:
            logger.info("Application already initialized")
            return
        
        logger.info("=" * 50)
        logger.info("Starting Application Bootstrap...")
        logger.info("=" * 50)
        
        # 1. 初始化项目注册中心
        self._init_project_registry(projects_file)
        
        # 2. 注册核心服务
        self._register_core_services()
        
        # 3. 注册智能服务
        self._register_intelligent_services()
        
        # 4. 注册工具服务
        self._register_tool_services()
        
        self._initialized = True
        
        # 5. 输出状态报告
        self._print_status_report()
        
        logger.info("=" * 50)
        logger.info("Application Bootstrap Complete!")
        logger.info("=" * 50)
    
    def _init_project_registry(self, projects_file: Optional[str]) -> None:
        """初始化项目注册中心"""
        logger.info("[1/4] Initializing Project Registry...")
        project_registry = get_project_registry()
        project_registry.initialize(projects_file)
        registry.register(ProjectRegistry, project_registry)
        logger.info(f"  ✓ Project Registry initialized with {len(project_registry.list_projects())} projects")
    
    def _register_core_services(self) -> None:
        """注册核心基础服务"""
        logger.info("[2/4] Registering Core Services...")
        
        try:
            # FileService
            from backend.core.file_service import FileService
            file_service = FileService()
            registry.register(FileService, file_service)
            logger.info("  ✓ FileService")
        except Exception as e:
            logger.warning(f"  ✗ FileService: {e}")
        
        try:
            # GitService
            from backend.core.git_service import GitService
            git_service = GitService()
            registry.register(GitService, git_service)
            logger.info("  ✓ GitService")
        except Exception as e:
            logger.warning(f"  ✗ GitService: {e}")
        
        try:
            # LLMService
            from backend.core.llm import LLMService
            llm_service = LLMService()
            registry.register(LLMService, llm_service)
            logger.info("  ✓ LLMService")
        except Exception as e:
            logger.warning(f"  ✗ LLMService: {e}")
        
        try:
            # ProjectManager
            from backend.core.project_manager import ProjectManager
            project_manager = ProjectManager()
            registry.register(ProjectManager, project_manager)
            logger.info("  ✓ ProjectManager")
        except Exception as e:
            logger.warning(f"  ✗ ProjectManager: {e}")
    
    def _register_intelligent_services(self) -> None:
        """注册智能分析服务（延迟加载）"""
        logger.info("[3/4] Registering Intelligent Services (Lazy Loading)...")
        
        intelligent_services = [
            ("backend.core.rag_service", "RAGService"),
            ("backend.core.code_analyzer", "CodeAnalyzer"),
            ("backend.core.code_review_service", "CodeReviewService"),
            ("backend.core.smart_requirement_service", "SmartRequirementService"),
            ("backend.core.auto_fixer", "AutoFixer"),
            ("backend.core.code_completion_service", "CodeCompletionService"),
            ("backend.core.refactor_suggester", "RefactorSuggester"),
            ("backend.core.doc_generator", "DocGenerator"),
            ("backend.core.error_analyzer", "ErrorAnalyzer"),
            ("backend.core.test_generator", "TestGenerator"),
            ("backend.core.code_style_analyzer", "CodeStyleAnalyzer"),
            ("backend.core.dependency_analyzer", "DependencyAnalyzer"),
            ("backend.core.prompt_optimizer", "PromptOptimizer"),
            ("backend.core.task_master_service", "TaskMasterService"),
            ("backend.core.cicd_generator", "CICDGenerator"),
        ]
        
        registered = 0
        for module_path, class_name in intelligent_services:
            try:
                self._register_lazy_service(module_path, class_name)
                registered += 1
            except Exception as e:
                logger.debug(f"  ! {class_name} will be loaded on demand: {e}")
        
        logger.info(f"  ✓ {registered} intelligent services registered for lazy loading")
    
    def _register_tool_services(self) -> None:
        """注册工具服务"""
        logger.info("[4/4] Registering Tool Services...")
        
        try:
            from backend.core.shell_service import ShellService
            shell_service = ShellService()
            registry.register(ShellService, shell_service)
            logger.info("  ✓ ShellService")
        except Exception as e:
            logger.warning(f"  ✗ ShellService: {e}")
        
        try:
            from backend.core.snippets_service import SnippetService
            snippet_service = SnippetService()
            registry.register(SnippetService, snippet_service)
            logger.info("  ✓ SnippetService")
        except Exception as e:
            logger.warning(f"  ✗ SnippetService: {e}")
    
    def _register_lazy_service(self, module_path: str, class_name: str) -> None:
        """注册延迟加载的服务"""
        def factory():
            module = __import__(module_path, fromlist=[class_name])
            service_class = getattr(module, class_name)
            return service_class()
        
        # 动态获取类引用用于注册
        module = __import__(module_path, fromlist=[class_name])
        service_class = getattr(module, class_name)
        registry.register_factory(service_class, factory)
    
    def _print_status_report(self) -> None:
        """打印状态报告"""
        services = registry.list_services()
        logger.info(f"\nTotal Services Registered: {len(services)}")
        logger.info("Active Services:")
        for name, status in sorted(services.items()):
            logger.info(f"  - {name} ({status})")


# 全局引导实例
_bootstrap = ApplicationBootstrap()


def initialize_application(projects_file: Optional[str] = None) -> None:
    """便捷函数：初始化应用"""
    _bootstrap.initialize(projects_file)


def get_registry() -> ServiceRegistry:
    """获取服务注册中心"""
    return registry
