"""
服务注册中心 - 统一管理和访问所有核心服务
解决服务孤岛问题，提供统一的服务定位和生命周期管理
"""
import logging
from typing import Dict, Type, TypeVar, Optional, Any
from functools import wraps

logger = logging.getLogger("ServiceRegistry")

T = TypeVar('T')


class ServiceRegistry:
    """
    统一服务注册中心
    
    使用方法:
        # 注册服务
        registry.register(LLMService, llm_service_instance)
        
        # 获取服务
        llm = registry.get(LLMService)
        
        # 使用装饰器自动注册
        @registry.service
        class MyService:
            pass
    """
    
    _instance = None
    _services: Dict[Type, Any] = {}
    _factories: Dict[Type, callable] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._services = {}
            cls._instance._factories = {}
        return cls._instance
    
    def register(self, service_class: Type[T], instance: T) -> T:
        """注册服务实例"""
        self._services[service_class] = instance
        logger.debug(f"Registered service: {service_class.__name__}")
        return instance
    
    def register_factory(self, service_class: Type[T], factory: callable) -> None:
        """注册服务工厂（延迟初始化）"""
        self._factories[service_class] = factory
        logger.debug(f"Registered factory for: {service_class.__name__}")
    
    def get(self, service_class: Type[T]) -> Optional[T]:
        """获取服务实例"""
        # 直接返回已注册实例
        if service_class in self._services:
            return self._services[service_class]
        
        # 通过工厂延迟创建
        if service_class in self._factories:
            instance = self._factories[service_class]()
            self._services[service_class] = instance
            return instance
        
        logger.warning(f"Service not found: {service_class.__name__}")
        return None
    
    def has(self, service_class: Type[T]) -> bool:
        """检查服务是否已注册"""
        return service_class in self._services or service_class in self._factories
    
    def unregister(self, service_class: Type[T]) -> None:
        """注销服务"""
        self._services.pop(service_class, None)
        self._factories.pop(service_class, None)
        logger.debug(f"Unregistered service: {service_class.__name__}")
    
    def clear(self) -> None:
        """清空所有服务"""
        self._services.clear()
        self._factories.clear()
        logger.info("Cleared all services")
    
    def list_services(self) -> Dict[str, str]:
        """列出所有已注册服务"""
        return {
            cls.__name__: "instance" if cls in self._services else "factory"
            for cls in set(list(self._services.keys()) + list(self._factories.keys()))
        }
    
    def service(self, factory_func):
        """装饰器：将函数/类注册为服务"""
        self.register_factory(factory_func, factory_func)
        return factory_func


# 全局注册中心实例
registry = ServiceRegistry()


def get_service(service_class: Type[T]) -> Optional[T]:
    """便捷函数：获取服务"""
    return registry.get(service_class)


def register_service(service_class: Type[T], instance: T) -> T:
    """便捷函数：注册服务"""
    return registry.register(service_class, instance)


class ServiceMixin:
    """服务混入类 - 为服务类提供便捷的依赖获取能力"""
    
    @classmethod
    def get_instance(cls: Type[T]) -> Optional[T]:
        """获取服务实例（类方法）"""
        return registry.get(cls)
    
    @property
    def services(self) -> ServiceRegistry:
        """获取注册中心实例"""
        return registry


# 常用服务快捷访问
class Services:
    """常用服务快捷访问类"""
    
    @staticmethod
    def project_manager():
        from backend.core.project_manager import ProjectManager
        return registry.get(ProjectManager)
    
    @staticmethod
    def file_service():
        from backend.core.file_service import FileService
        return registry.get(FileService)
    
    @staticmethod
    def git_service():
        from backend.core.git_service import GitService
        return registry.get(GitService)
    
    @staticmethod
    def llm_service():
        from backend.core.llm import LLMService
        return registry.get(LLMService)
    
    @staticmethod
    def rag_service():
        from backend.core.rag_service import RAGService
        return registry.get(RAGService)
