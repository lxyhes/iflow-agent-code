"""
Dependency Analyzer - 代码依赖分析模块
分析函数调用关系、类继承关系、模块依赖等
"""

import re
import ast
import os
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class FunctionInfo:
    """函数信息"""
    name: str
    file_path: str
    line_start: int
    line_end: int
    parameters: List[str] = field(default_factory=list)
    calls: Set[str] = field(default_factory=set)
    is_async: bool = False
    is_method: bool = False
    class_name: Optional[str] = None


@dataclass
class ClassInfo:
    """类信息"""
    name: str
    file_path: str
    line_start: int
    line_end: int
    bases: List[str] = field(default_factory=list)
    methods: Dict[str, FunctionInfo] = field(default_factory=dict)
    attributes: Set[str] = field(default_factory=set)


@dataclass
class ModuleInfo:
    """模块信息"""
    name: str
    file_path: str
    imports: Set[str] = field(default_factory=set)
    from_imports: Dict[str, Set[str]] = field(default_factory=dict)
    functions: Dict[str, FunctionInfo] = field(default_factory=dict)
    classes: Dict[str, ClassInfo] = field(default_factory=dict)
    exported: Set[str] = field(default_factory=set)


class DependencyAnalyzer:
    """代码依赖分析器"""

    def __init__(self, project_path: str):
        """
        初始化依赖分析器

        Args:
            project_path: 项目根目录路径
        """
        self.project_path = Path(project_path)
        self.modules: Dict[str, ModuleInfo] = {}
        self._supported_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx'}

    def analyze_project(self, include_dirs: List[str] = None) -> Dict:
        """
        分析整个项目

        Args:
            include_dirs: 包含的目录列表（相对路径）

        Returns:
            包含依赖关系的字典
        """
        logger.info(f"开始分析项目: {self.project_path}")

        # 扫描项目文件
        files = self._scan_project_files(include_dirs)

        # 分析每个文件
        for file_path in files:
            try:
                self._analyze_file(file_path)
            except Exception as e:
                logger.warning(f"分析文件失败 {file_path}: {e}")

        # 构建依赖图
        dependency_graph = self._build_dependency_graph()

        logger.info(f"项目分析完成: {len(self.modules)} 个模块")

        return {
            'modules': self._serialize_modules(),
            'dependency_graph': dependency_graph,
            'call_graph': self._build_call_graph(),
            'class_hierarchy': self._build_class_hierarchy()
        }

    def _scan_project_files(self, include_dirs: List[str] = None) -> List[Path]:
        """
        扫描项目文件

        Args:
            include_dirs: 包含的目录列表

        Returns:
            文件路径列表
        """
        files = []

        if include_dirs:
            for dir_name in include_dirs:
                dir_path = self.project_path / dir_name
                if dir_path.exists() and dir_path.is_dir():
                    files.extend([
                        f for f in dir_path.rglob('*')
                        if f.is_file() and f.suffix in self._supported_extensions
                    ])
        else:
            # 扫描整个项目
            files = [
                f for f in self.project_path.rglob('*')
                if f.is_file() and f.suffix in self._supported_extensions
            ]

        # 排除常见的忽略目录
        ignore_dirs = {'node_modules', '__pycache__', '.git', 'dist', 'build', 'venv', 'env'}
        files = [
            f for f in files
            if not any(ignore_dir in str(f) for ignore_dir in ignore_dirs)
        ]

        return files

    def _analyze_file(self, file_path: Path):
        """
        分析单个文件

        Args:
            file_path: 文件路径
        """
        suffix = file_path.suffix

        if suffix == '.py':
            self._analyze_python_file(file_path)
        elif suffix in {'.js', '.jsx', '.ts', '.tsx'}:
            self._analyze_js_file(file_path)

    def _analyze_python_file(self, file_path: Path):
        """
        分析 Python 文件

        Args:
            file_path: Python 文件路径
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            tree = ast.parse(content)

            # 创建模块信息
            module_name = self._get_module_name(file_path)
            module = ModuleInfo(
                name=module_name,
                file_path=str(file_path.relative_to(self.project_path))
            )

            # 分析导入
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        module.imports.add(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    module_name_import = node.module or ''
                    imports = set()
                    for alias in node.names:
                        imports.add(alias.name)
                    module.from_imports[module_name_import] = imports

            # 分析函数和类
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_info = self._analyze_function(node, file_path)
                    module.functions[func_info.name] = func_info

                elif isinstance(node, ast.ClassDef):
                    class_info = self._analyze_class(node, file_path)
                    module.classes[class_info.name] = class_info

            self.modules[module_name] = module

        except SyntaxError as e:
            logger.warning(f"Python 语法错误 {file_path}: {e}")
        except Exception as e:
            logger.error(f"分析 Python 文件失败 {file_path}: {e}")

    def _analyze_js_file(self, file_path: Path):
        """
        分析 JavaScript/TypeScript 文件

        Args:
            file_path: JS/TS 文件路径
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 创建模块信息
            module_name = self._get_module_name(file_path)
            module = ModuleInfo(
                name=module_name,
                file_path=str(file_path.relative_to(self.project_path))
            )

            # 简单的正则匹配分析（实际项目可能需要更复杂的解析器）
            # 分析 import 语句
            import_pattern = r'import\s+(?:\{([^}]+)\}|(\w+)|\*\s+as\s+(\w+))\s+from\s+[\'\"]([^\'\"]+)[\'\"]'
            for match in re.finditer(import_pattern, content):
                named_imports = match.group(1)
                default_import = match.group(2)
                wildcard_import = match.group(3)
                source = match.group(4)

                if named_imports:
                    imports = set(name.strip() for name in named_imports.split(','))
                    module.from_imports[source] = imports
                elif default_import:
                    module.imports.add(source)
                elif wildcard_import:
                    module.imports.add(source)

            # 分析函数定义
            function_pattern = r'(?:async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(?[^)]*\)?\s*=>|(\w+)\s*\([^)]*\)\s*{'
            for match in re.finditer(function_pattern, content):
                func_name = match.group(1) or match.group(2) or match.group(3)
                if func_name:
                    # 找到函数的行号
                    line_num = content[:match.start()].count('\n') + 1
                    func_info = FunctionInfo(
                        name=func_name,
                        file_path=str(file_path.relative_to(self.project_path)),
                        line_start=line_num,
                        line_end=line_num,
                        is_async='async' in match.group(0)
                    )
                    module.functions[func_name] = func_info

            # 分析类定义
            class_pattern = r'class\s+(\w+)(?:\s+extends\s+(\w+))?'
            for match in re.finditer(class_pattern, content):
                class_name = match.group(1)
                base_class = match.group(2)
                line_num = content[:match.start()].count('\n') + 1

                class_info = ClassInfo(
                    name=class_name,
                    file_path=str(file_path.relative_to(self.project_path)),
                    line_start=line_num,
                    line_end=line_num,
                    bases=[base_class] if base_class else []
                )
                module.classes[class_name] = class_info

            self.modules[module_name] = module

        except Exception as e:
            logger.error(f"分析 JS/TS 文件失败 {file_path}: {e}")

    def _analyze_function(self, node: ast.FunctionDef, file_path: Path) -> FunctionInfo:
        """
        分析函数

        Args:
            node: AST 函数节点
            file_path: 文件路径

        Returns:
            函数信息
        """
        # 提取参数
        parameters = []
        for arg in node.args.args:
            parameters.append(arg.arg)

        # 提取函数调用
        calls = set()
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    calls.add(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    calls.add(child.func.attr)

        return FunctionInfo(
            name=node.name,
            file_path=str(file_path.relative_to(self.project_path)),
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            parameters=parameters,
            calls=calls,
            is_async=isinstance(node, ast.AsyncFunctionDef),
            is_method=False
        )

    def _analyze_class(self, node: ast.ClassDef, file_path: Path) -> ClassInfo:
        """
        分析类

        Args:
            node: AST 类节点
            file_path: 文件路径

        Returns:
            类信息
        """
        # 提取基类
        bases = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                bases.append(base.id)
            elif isinstance(base, ast.Attribute):
                bases.append(base.attr)

        # 提取方法
        methods = {}
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                func_info = self._analyze_function(item, file_path)
                func_info.is_method = True
                func_info.class_name = node.name
                methods[func_info.name] = func_info

        # 提取属性
        attributes = set()
        for item in node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        attributes.add(target.id)

        return ClassInfo(
            name=node.name,
            file_path=str(file_path.relative_to(self.project_path)),
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            bases=bases,
            methods=methods,
            attributes=attributes
        )

    def _get_module_name(self, file_path: Path) -> str:
        """
        获取模块名称

        Args:
            file_path: 文件路径

        Returns:
            模块名称
        """
        relative_path = file_path.relative_to(self.project_path)
        parts = list(relative_path.parts)

        # 移除文件扩展名
        if parts:
            parts[-1] = os.path.splitext(parts[-1])[0]

        # 如果是 __init__.py，使用目录名
        if parts and parts[-1] == '__init__':
            parts.pop()

        return '.'.join(parts) if parts else 'root'

    def _build_dependency_graph(self) -> Dict:
        """
        构建模块依赖图

        Returns:
            依赖图字典
        """
        graph = {
            'nodes': [],
            'edges': []
        }

        # 添加节点
        for module_name, module in self.modules.items():
            graph['nodes'].append({
                'id': module_name,
                'label': module_name,
                'file_path': module.file_path,
                'type': 'module'
            })

        # 添加边
        for module_name, module in self.modules.items():
            for import_module in module.imports:
                if import_module in self.modules:
                    graph['edges'].append({
                        'source': module_name,
                        'target': import_module,
                        'type': 'import'
                    })

            for from_module, imports in module.from_imports.items():
                if from_module in self.modules:
                    graph['edges'].append({
                        'source': module_name,
                        'target': from_module,
                        'type': 'from_import',
                        'imports': list(imports)
                    })

        return graph

    def _build_call_graph(self) -> Dict:
        """
        构建函数调用图

        Returns:
            调用图字典
        """
        graph = {
            'nodes': [],
            'edges': []
        }

        # 添加节点
        for module_name, module in self.modules.items():
            for func_name, func_info in module.functions.items():
                node_id = f"{module_name}.{func_name}"
                graph['nodes'].append({
                    'id': node_id,
                    'label': func_name,
                    'module': module_name,
                    'file_path': func_info.file_path,
                    'line': func_info.line_start,
                    'type': 'function',
                    'is_async': func_info.is_async,
                    'is_method': func_info.is_method,
                    'class_name': func_info.class_name
                })

        # 添加边
        for module_name, module in self.modules.items():
            for func_name, func_info in module.functions.items():
                source_id = f"{module_name}.{func_name}"
                for called_func in func_info.calls:
                    # 查找被调用的函数
                    for target_module, target_module_info in self.modules.items():
                        if called_func in target_module_info.functions:
                            target_id = f"{target_module}.{called_func}"
                            graph['edges'].append({
                                'source': source_id,
                                'target': target_id,
                                'type': 'call'
                            })
                            break

        return graph

    def _build_class_hierarchy(self) -> Dict:
        """
        构建类继承层次结构

        Returns:
            类继承图字典
        """
        graph = {
            'nodes': [],
            'edges': []
        }

        # 添加节点
        for module_name, module in self.modules.items():
            for class_name, class_info in module.classes.items():
                node_id = f"{module_name}.{class_name}"
                graph['nodes'].append({
                    'id': node_id,
                    'label': class_name,
                    'module': module_name,
                    'file_path': class_info.file_path,
                    'line': class_info.line_start,
                    'type': 'class',
                    'methods': list(class_info.methods.keys()),
                    'attributes': list(class_info.attributes)
                })

        # 添加边（继承关系）
        for module_name, module in self.modules.items():
            for class_name, class_info in module.classes.items():
                source_id = f"{module_name}.{class_name}"
                for base_class in class_info.bases:
                    # 查找基类
                    for target_module, target_module_info in self.modules.items():
                        if base_class in target_module_info.classes:
                            target_id = f"{target_module}.{base_class}"
                            graph['edges'].append({
                                'source': source_id,
                                'target': target_id,
                                'type': 'inheritance'
                            })
                            break

        return graph

    def _serialize_modules(self) -> Dict:
        """
        序列化模块信息

        Returns:
            模块信息字典
        """
        return {
            module_name: {
                'file_path': module.file_path,
                'imports': list(module.imports),
                'from_imports': {k: list(v) for k, v in module.from_imports.items()},
                'functions': {
                    func_name: {
                        'line': func_info.line_start,
                        'parameters': func_info.parameters,
                        'calls': list(func_info.calls),
                        'is_async': func_info.is_async,
                        'is_method': func_info.is_method,
                        'class_name': func_info.class_name
                    }
                    for func_name, func_info in module.functions.items()
                },
                'classes': {
                    class_name: {
                        'line': class_info.line_start,
                        'bases': class_info.bases,
                        'methods': list(class_info.methods.keys()),
                        'attributes': list(class_info.attributes)
                    }
                    for class_name, class_info in module.classes.items()
                }
            }
            for module_name, module in self.modules.items()
        }


# 创建全局实例
_analyzer_cache = {}


def get_dependency_analyzer(project_path: str) -> DependencyAnalyzer:
    """
    获取依赖分析器实例（带缓存）

    Args:
        project_path: 项目路径

    Returns:
        DependencyAnalyzer 实例
    """
    if project_path not in _analyzer_cache:
        _analyzer_cache[project_path] = DependencyAnalyzer(project_path)
    return _analyzer_cache[project_path]