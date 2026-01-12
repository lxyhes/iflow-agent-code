"""
上下文图服务 (Context Graph Service)
生成代码依赖关系图和调用关系图
"""

import ast
import re
import logging
from typing import Dict, List, Any, Set, Optional
from pathlib import Path
import json

logger = logging.getLogger("ContextGraphService")


class ContextGraphService:
    """上下文图服务"""
    
    def __init__(self):
        self.graph_cache = {}
    
    def analyze_project_context(
        self,
        project_path: str,
        max_depth: int = 3
    ) -> Dict[str, Any]:
        """
        分析项目上下文，生成依赖关系图
        
        Args:
            project_path: 项目路径
            max_depth: 最大分析深度
        
        Returns:
            上下文图数据（节点和边）
        """
        cache_key = f"{project_path}_{max_depth}"
        
        if cache_key in self.graph_cache:
            return self.graph_cache[cache_key]
        
        nodes = []
        edges = []
        node_id_map = {}
        
        # 扫描项目文件
        files = self._scan_project_files(project_path)
        
        # 为每个文件创建节点
        for file_path in files:
            file_node_id = self._generate_node_id(file_path)
            node_id_map[file_path] = file_node_id
            
            nodes.append({
                "id": file_node_id,
                "type": "file",
                "label": Path(file_path).name,
                "fullPath": file_path,
                "data": {
                    "fileType": Path(file_path).suffix,
                    "size": self._get_file_size(file_path)
                }
            })
        
        # 分析文件之间的依赖关系
        for file_path in files:
            dependencies = self._analyze_file_dependencies(file_path)
            
            for dep in dependencies:
                if dep in node_id_map:
                    edges.append({
                        "id": f"{node_id_map[file_path]}-{node_id_map[dep]}",
                        "source": node_id_map[file_path],
                        "target": node_id_map[dep],
                        "type": "import",
                        "label": "imports"
                    })
        
        # 分析函数调用关系（Python）
        python_files = [f for f in files if f.endswith('.py')]
        for file_path in python_files:
            call_graph = self._analyze_function_calls(file_path)
            
            for caller, callee in call_graph:
                caller_id = f"{node_id_map[file_path]}-{caller}"
                callee_id = f"{node_id_map[file_path]}-{callee}"
                
                # 创建函数节点（如果不存在）
                if not any(n["id"] == caller_id for n in nodes):
                    nodes.append({
                        "id": caller_id,
                        "type": "function",
                        "label": caller,
                        "parentId": node_id_map[file_path],
                        "data": {
                            "language": "python"
                        }
                    })
                
                if not any(n["id"] == callee_id for n in nodes):
                    nodes.append({
                        "id": callee_id,
                        "type": "function",
                        "label": callee,
                        "parentId": node_id_map[file_path],
                        "data": {
                            "language": "python"
                        }
                    })
                
                edges.append({
                    "id": f"{caller_id}-{callee_id}",
                    "source": caller_id,
                    "target": callee_id,
                    "type": "call",
                    "label": "calls"
                })
        
        graph = {
            "nodes": nodes,
            "edges": edges,
            "metadata": {
                "totalFiles": len(files),
                "totalNodes": len(nodes),
                "totalEdges": len(edges),
                "maxDepth": max_depth
            }
        }
        
        self.graph_cache[cache_key] = graph
        return graph
    
    def _scan_project_files(self, project_path: str) -> List[str]:
        """扫描项目文件"""
        supported_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs'}
        ignore_dirs = {'node_modules', '__pycache__', '.git', 'dist', 'build', 'target', 'venv', 'env'}
        
        files = []
        
        for root, dirs, filenames in os.walk(project_path):
            # 过滤忽略的目录
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for filename in filenames:
                file_path = os.path.join(root, filename)
                ext = os.path.splitext(filename)[1].lower()
                
                if ext in supported_extensions:
                    files.append(file_path)
        
        return files
    
    def _analyze_file_dependencies(self, file_path: str) -> List[str]:
        """分析文件依赖"""
        dependencies = []
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            if ext == '.py':
                dependencies = self._extract_python_imports(content, file_path)
            elif ext in ['.js', '.jsx', '.ts', '.tsx']:
                dependencies = self._extract_js_imports(content, file_path)
            elif ext == '.java':
                dependencies = self._extract_java_imports(content, file_path)
        
        except Exception as e:
            logger.error(f"Error analyzing dependencies for {file_path}: {e}")
        
        return dependencies
    
    def _extract_python_imports(self, content: str, file_path: str) -> List[str]:
        """提取 Python 导入"""
        imports = []
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module)
        except:
            pass
        
        return imports
    
    def _extract_js_imports(self, content: str, file_path: str) -> List[str]:
        """提取 JavaScript 导入"""
        imports = []
        
        # 提取 import 语句
        import_pattern = r'import\s+(?:\{[^}]*\}|\*)\s+from\s+[\'"]([^\'"]+)[\'"]|import\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\)'
        
        for match in re.finditer(import_pattern, content):
            import_path = match.group(1) or match.group(2) or match.group(3)
            if import_path:
                imports.append(import_path)
        
        return imports
    
    def _extract_java_imports(self, content: str, file_path: str) -> List[str]:
        """提取 Java 导入"""
        imports = []
        
        import_pattern = r'import\s+(?:static\s+)?([^;]+);'
        
        for match in re.finditer(import_pattern, content):
            imports.append(match.group(1).strip())
        
        return imports
    
    def _analyze_function_calls(self, file_path: str) -> List[tuple]:
        """分析函数调用关系（Python）"""
        calls = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            # 收集所有函数定义
            functions = {}
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions[node.name] = node
            
            # 分析函数调用
            for func_name, func_node in functions.items():
                for node in ast.walk(func_node):
                    if isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Name):
                            callee = node.func.id
                            if callee in functions:
                                calls.append((func_name, callee))
                        elif isinstance(node.func, ast.Attribute):
                            if isinstance(node.func.value, ast.Name):
                                callee = node.func.attr
                                if callee in functions:
                                    calls.append((func_name, callee))
        
        except:
            pass
        
        return calls
    
    def _generate_node_id(self, file_path: str) -> str:
        """生成节点 ID"""
        return file_path.replace('/', '-').replace('\\', '-').replace('.', '-')
    
    def _get_file_size(self, file_path: str) -> int:
        """获取文件大小"""
        try:
            return os.path.getsize(file_path)
        except:
            return 0
    
    def clear_cache(self):
        """清除缓存"""
        self.graph_cache.clear()


# 全局实例
_context_graph_service = None


def get_context_graph_service() -> ContextGraphService:
    """获取上下文图服务实例"""
    global _context_graph_service
    if _context_graph_service is None:
        _context_graph_service = ContextGraphService()
    return _context_graph_service


# 添加缺失的导入
import os