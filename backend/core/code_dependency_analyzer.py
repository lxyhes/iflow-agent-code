"""
Code Dependency Analyzer - 分析代码依赖关系并生成可视化数据
"""

import ast
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class CodeDependencyAnalyzer:
    """代码依赖分析器 - 分析函数调用、类继承、模块导入等关系"""

    def __init__(self, project_path: str):
        """
        初始化代码依赖分析器

        Args:
            project_path: 项目根目录路径
        """
        self.project_path = Path(project_path)
        self.supported_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
        }

    def analyze_project_dependencies(self) -> Dict:
        """
        分析整个项目的依赖关系

        Returns:
            包含依赖关系图的字典
        """
        nodes = []
        edges = []

        # 收集所有源文件
        source_files = self._collect_source_files()

        # 分析每个文件的依赖
        for file_path in source_files:
            file_nodes, file_edges = self._analyze_file_dependencies(file_path)
            nodes.extend(file_nodes)
            edges.extend(file_edges)

        # 去重
        nodes = self._deduplicate_nodes(nodes)
        edges = self._deduplicate_edges(edges)

        return {
            'nodes': nodes,
            'edges': edges,
            'stats': {
                'total_files': len(source_files),
                'total_nodes': len(nodes),
                'total_edges': len(edges),
                'languages': self._count_languages(source_files)
            }
        }

    def analyze_module_dependencies(self, module_name: str) -> Dict:
        """
        分析特定模块的依赖关系

        Args:
            module_name: 模块名称

        Returns:
            包含模块依赖关系的字典
        """
        nodes = []
        edges = []

        # 查找模块文件
        module_files = self._find_module_files(module_name)

        for file_path in module_files:
            file_nodes, file_edges = self._analyze_file_dependencies(file_path, focus_module=module_name)
            nodes.extend(file_nodes)
            edges.extend(file_edges)

        return {
            'module': module_name,
            'nodes': nodes,
            'edges': edges
        }

    def _collect_source_files(self) -> List[Path]:
        """收集所有源代码文件"""
        source_files = []

        for ext in self.supported_extensions:
            source_files.extend(self.project_path.rglob(f'*{ext}'))

        return source_files

    def _find_module_files(self, module_name: str) -> List[Path]:
        """查找特定模块的文件"""
        module_files = []

        # 尝试多种可能的文件名
        possible_names = [
            f'{module_name}.py',
            f'{module_name}.js',
            f'{module_name}.jsx',
            f'{module_name}.ts',
            f'{module_name}.tsx',
            f'{module_name}/index.js',
            f'{module_name}/index.ts',
        ]

        for name in possible_names:
            for file_path in self.project_path.rglob(name):
                if file_path.suffix in self.supported_extensions:
                    module_files.append(file_path)

        return module_files

    def _analyze_file_dependencies(self, file_path: Path, focus_module: str = None) -> Tuple[List[Dict], List[Dict]]:
        """
        分析单个文件的依赖关系

        Args:
            file_path: 文件路径
            focus_module: 专注的模块名称（用于过滤）

        Returns:
            (节点列表, 边列表)
        """
        language = self.supported_extensions.get(file_path.suffix)

        if language == 'python':
            return self._analyze_python_file(file_path, focus_module)
        elif language in ['javascript', 'typescript']:
            return self._analyze_js_ts_file(file_path, focus_module)
        else:
            return [], []

    def _analyze_python_file(self, file_path: Path, focus_module: str = None) -> Tuple[List[Dict], List[Dict]]:
        """分析 Python 文件的依赖关系"""
        nodes = []
        edges = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            tree = ast.parse(content)

            # 添加文件节点
            file_node = {
                'id': str(file_path.relative_to(self.project_path)),
                'label': file_path.name,
                'type': 'file',
                'language': 'python',
                'path': str(file_path.relative_to(self.project_path))
            }
            nodes.append(file_node)

            # 分析导入
            imports = self._extract_python_imports(tree, file_path)
            for imp in imports:
                node = {
                    'id': imp['module'],
                    'label': imp['module'],
                    'type': 'module',
                    'language': 'python'
                }
                nodes.append(node)

                edge = {
                    'source': str(file_path.relative_to(self.project_path)),
                    'target': imp['module'],
                    'type': 'import',
                    'label': 'imports'
                }
                edges.append(edge)

            # 分析类定义
            classes = self._extract_python_classes(tree)
            for cls in classes:
                node = {
                    'id': f"{file_path.relative_to(self.project_path)}::{cls['name']}",
                    'label': cls['name'],
                    'type': 'class',
                    'language': 'python',
                    'parent': str(file_path.relative_to(self.project_path))
                }
                nodes.append(node)

                edge = {
                    'source': str(file_path.relative_to(self.project_path)),
                    'target': node['id'],
                    'type': 'contains',
                    'label': 'contains'
                }
                edges.append(edge)

                # 分析继承关系
                if cls['bases']:
                    for base in cls['bases']:
                        edge = {
                            'source': node['id'],
                            'target': base,
                            'type': 'extends',
                            'label': 'extends'
                        }
                        edges.append(edge)

            # 分析函数定义
            functions = self._extract_python_functions(tree)
            for func in functions:
                node = {
                    'id': f"{file_path.relative_to(self.project_path)}::{func['name']}()",
                    'label': f"{func['name']}()",
                    'type': 'function',
                    'language': 'python',
                    'parent': str(file_path.relative_to(self.project_path))
                }
                nodes.append(node)

                edge = {
                    'source': str(file_path.relative_to(self.project_path)),
                    'target': node['id'],
                    'type': 'contains',
                    'label': 'contains'
                }
                edges.append(edge)

                # 分析函数调用
                calls = self._extract_python_function_calls(func['node'])
                for call in calls:
                    edge = {
                        'source': node['id'],
                        'target': call,
                        'type': 'calls',
                        'label': 'calls'
                    }
                    edges.append(edge)

        except Exception as e:
            logger.error(f"分析 Python 文件失败 {file_path}: {e}")

        return nodes, edges

    def _analyze_js_ts_file(self, file_path: Path, focus_module: str = None) -> Tuple[List[Dict], List[Dict]]:
        """分析 JavaScript/TypeScript 文件的依赖关系"""
        nodes = []
        edges = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 添加文件节点
            file_node = {
                'id': str(file_path.relative_to(self.project_path)),
                'label': file_path.name,
                'type': 'file',
                'language': 'javascript' if file_path.suffix in ['.js', '.jsx'] else 'typescript',
                'path': str(file_path.relative_to(self.project_path))
            }
            nodes.append(file_node)

            # 分析导入（使用正则表达式）
            imports = self._extract_js_ts_imports(content, file_path)
            for imp in imports:
                if imp['type'] == 'module':
                    node = {
                        'id': imp['path'],
                        'label': imp['path'].split('/')[-1],
                        'type': 'module',
                        'language': 'javascript'
                    }
                    nodes.append(node)

                    edge = {
                        'source': str(file_path.relative_to(self.project_path)),
                        'target': imp['path'],
                        'type': 'import',
                        'label': 'imports'
                    }
                    edges.append(edge)

            # 分析函数定义
            functions = self._extract_js_ts_functions(content)
            for func in functions:
                node = {
                    'id': f"{file_path.relative_to(self.project_path)}::{func['name']}()",
                    'label': f"{func['name']}()",
                    'type': 'function',
                    'language': 'javascript' if file_path.suffix in ['.js', '.jsx'] else 'typescript',
                    'parent': str(file_path.relative_to(self.project_path))
                }
                nodes.append(node)

                edge = {
                    'source': str(file_path.relative_to(self.project_path)),
                    'target': node['id'],
                    'type': 'contains',
                    'label': 'contains'
                }
                edges.append(edge)

        except Exception as e:
            logger.error(f"分析 JS/TS 文件失败 {file_path}: {e}")

        return nodes, edges

    def _extract_python_imports(self, tree: ast.AST, file_path: Path) -> List[Dict]:
        """提取 Python 导入语句"""
        imports = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        'module': alias.name,
                        'alias': alias.asname
                    })
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                for alias in node.names:
                    imports.append({
                        'module': f"{module}.{alias.name}",
                        'alias': alias.asname
                    })

        return imports

    def _extract_python_classes(self, tree: ast.AST) -> List[Dict]:
        """提取 Python 类定义"""
        classes = []

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                bases = []
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        bases.append(base.id)
                    elif isinstance(base, ast.Attribute):
                        bases.append(ast.unparse(base))

                classes.append({
                    'name': node.name,
                    'bases': bases,
                    'node': node
                })

        return classes

    def _extract_python_functions(self, tree: ast.AST) -> List[Dict]:
        """提取 Python 函数定义"""
        functions = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    'name': node.name,
                    'node': node
                })

        return functions

    def _extract_python_function_calls(self, func_node: ast.FunctionDef) -> List[str]:
        """提取函数调用"""
        calls = []

        for node in ast.walk(func_node):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    calls.append(node.func.id)
                elif isinstance(node.func, ast.Attribute):
                    calls.append(ast.unparse(node.func))

        return calls

    def _extract_js_ts_imports(self, content: str, file_path: Path) -> List[Dict]:
        """提取 JS/TS 导入语句"""
        imports = []

        # 匹配 import 语句
        import_patterns = [
            r"import\s+(?:(\{[^}]+\})|(\w+)|\*\s+as\s+(\w+))\s+from\s+['\"]([^'\"]+)['\"]",
            r"import\s+['\"]([^'\"]+)['\"]",
            r"require\(['\"]([^'\"]+)['\"]\)"
        ]

        for pattern in import_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                path = match.group(4) or match.group(1)
                if path:
                    imports.append({
                        'type': 'module',
                        'path': path
                    })

        return imports

    def _extract_js_ts_functions(self, content: str) -> List[Dict]:
        """提取 JS/TS 函数定义"""
        functions = []

        # 匹配函数定义
        function_patterns = [
            r"function\s+(\w+)\s*\(",
            r"const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
            r"(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>",
            r"async\s+function\s+(\w+)\s*\("
        ]

        for pattern in function_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                functions.append({
                    'name': match.group(1)
                })

        return functions

    def _deduplicate_nodes(self, nodes: List[Dict]) -> List[Dict]:
        """去重节点"""
        seen = set()
        unique_nodes = []

        for node in nodes:
            node_key = (node['id'], node['type'])
            if node_key not in seen:
                seen.add(node_key)
                unique_nodes.append(node)

        return unique_nodes

    def _deduplicate_edges(self, edges: List[Dict]) -> List[Dict]:
        """去重边"""
        seen = set()
        unique_edges = []

        for edge in edges:
            edge_key = (edge['source'], edge['target'], edge['type'])
            if edge_key not in seen:
                seen.add(edge_key)
                unique_edges.append(edge)

        return unique_edges

    def _count_languages(self, files: List[Path]) -> Dict[str, int]:
        """统计各语言文件数量"""
        counts = defaultdict(int)

        for file_path in files:
            language = self.supported_extensions.get(file_path.suffix, 'unknown')
            counts[language] += 1

        return dict(counts)


# 全局实例缓存
_dependency_analyzer_cache = {}


def get_dependency_analyzer(project_path: str) -> CodeDependencyAnalyzer:
    """获取依赖分析器实例（带缓存）"""
    if project_path not in _dependency_analyzer_cache:
        _dependency_analyzer_cache[project_path] = CodeDependencyAnalyzer(project_path)
    return _dependency_analyzer_cache[project_path]