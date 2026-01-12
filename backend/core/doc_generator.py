"""
文档生成器 - 智能文档生成服务
支持 API 文档、README、代码注释等
"""

import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger("DocGenerator")


class DocGenerator:
    """文档生成器"""
    
    def __init__(self):
        self.supported_languages = {
            '.py': self._generate_python_docs,
            '.js': self._generate_javascript_docs,
            '.jsx': self._generate_javascript_docs,
            '.ts': self._generate_typescript_docs,
            '.tsx': self._generate_typescript_docs,
            '.java': self._generate_java_docs,
            '.go': self._generate_go_docs,
        }
    
    def generate_api_docs(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> Dict[str, Any]:
        """
        生成 API 文档
        
        Args:
            project_path: 项目路径
            file_paths: 文件路径列表
        
        Returns:
            API 文档
        """
        api_docs = {
            "title": "API 文档",
            "version": "1.0.0",
            "endpoints": [],
            "models": [],
            "metadata": {
                "total_files": len(file_paths),
                "generated_at": str(Path(__file__).stat().st_mtime)
            }
        }
        
        for file_path in file_paths:
            try:
                full_path = Path(project_path) / file_path
                if not full_path.exists():
                    continue
                
                ext = full_path.suffix.lower()
                if ext not in self.supported_languages:
                    continue
                
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                docs = self.supported_languages[ext](content, file_path, 'api')
                
                if docs.get('endpoints'):
                    api_docs['endpoints'].extend(docs['endpoints'])
                
                if docs.get('models'):
                    api_docs['models'].extend(docs['models'])
            
            except Exception as e:
                logger.error(f"Error generating API docs for {file_path}: {e}")
        
        return api_docs
    
    def generate_readme(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> Dict[str, Any]:
        """
        生成 README 文档
        
        Args:
            project_path: 项目路径
            file_paths: 文件路径列表
        
        Returns:
            README 文档
        """
        readme = {
            "title": f"{Path(project_path).name} 项目",
            "description": "",
            "features": [],
            "installation": "",
            "usage": "",
            "structure": [],
            "metadata": {
                "total_files": len(file_paths)
            }
        }
        
        # 分析项目结构
        structure = self._analyze_project_structure(project_path, file_paths)
        readme['structure'] = structure
        
        # 提取主要功能
        features = self._extract_features(project_path, file_paths)
        readme['features'] = features
        
        # 生成安装说明
        readme['installation'] = self._generate_installation_guide(project_path)
        
        # 生成使用说明
        readme['usage'] = self._generate_usage_guide(project_path, file_paths)
        
        return readme
    
    def generate_code_comments(
        self,
        file_path: str,
        content: str
    ) -> Dict[str, Any]:
        """
        生成代码注释
        
        Args:
            file_path: 文件路径
            content: 文件内容
        
        Returns:
            注释建议
        """
        ext = Path(file_path).suffix.lower()
        
        if ext not in self.supported_languages:
            return {
                "error": f"不支持的语言: {ext}",
                "suggestions": []
            }
        
        try:
            docs = self.supported_languages[ext](content, file_path, 'comments')
            return docs
        except Exception as e:
            logger.error(f"Error generating comments for {file_path}: {e}")
            return {
                "error": str(e),
                "suggestions": []
            }
    
    def _analyze_project_structure(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> List[Dict[str, Any]]:
        """分析项目结构"""
        structure = []
        
        for file_path in file_paths:
            path_obj = Path(file_path)
            structure.append({
                "path": file_path,
                "name": path_obj.name,
                "type": "file" if path_obj.is_file() else "directory",
                "extension": path_obj.suffix
            })
        
        return structure
    
    def _extract_features(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> List[str]:
        """提取项目主要功能"""
        features = []
        
        # 检查是否有特定文件
        package_json = Path(project_path) / 'package.json'
        if package_json.exists():
            features.append("Node.js 项目")
        
        requirements_txt = Path(project_path) / 'requirements.txt'
        if requirements_txt.exists():
            features.append("Python 项目")
        
        # 检查文件类型
        has_frontend = any(f.endswith(('.js', '.jsx', '.ts', '.tsx', '.vue')) for f in file_paths)
        if has_frontend:
            features.append("前端应用")
        
        has_backend = any(f.endswith(('.py', '.java', '.go', '.rs')) for f in file_paths)
        if has_backend:
            features.append("后端服务")
        
        has_tests = any('test' in f.lower() or 'spec' in f.lower() for f in file_paths)
        if has_tests:
            features.append("包含测试")
        
        return features
    
    def _generate_installation_guide(self, project_path: str) -> str:
        """生成安装说明"""
        guide = []
        
        package_json = Path(project_path) / 'package.json'
        if package_json.exists():
            guide.append("```bash")
            guide.append("npm install")
            guide.append("```")
        
        requirements_txt = Path(project_path) / 'requirements.txt'
        if requirements_txt.exists():
            guide.append("```bash")
            guide.append("pip install -r requirements.txt")
            guide.append("```")
        
        return '\n'.join(guide) if guide else "暂无安装说明"
    
    def _generate_usage_guide(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> str:
        """生成使用说明"""
        guide = []
        
        # 查找主入口文件
        main_files = ['index.js', 'main.js', 'app.js', 'index.py', 'main.py', 'app.py']
        for main_file in main_files:
            if main_file in file_paths:
                guide.append(f"主入口文件: {main_file}")
                break
        
        return '\n'.join(guide) if guide else "暂无使用说明"
    
    def _generate_python_docs(
        self,
        content: str,
        file_path: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """生成 Python 文档"""
        result = {
            "endpoints": [],
            "models": [],
            "suggestions": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if doc_type == 'api' and isinstance(node, ast.FunctionDef):
                    # 提取 API 端点
                    endpoint = self._extract_python_endpoint(node, file_path)
                    if endpoint:
                        result['endpoints'].append(endpoint)
                
                elif doc_type == 'comments' and isinstance(node, ast.FunctionDef):
                    # 生成函数注释
                    if not ast.get_docstring(node):
                        suggestion = {
                            "type": "function",
                            "name": node.name,
                            "line": node.lineno,
                            "suggestion": self._generate_function_comment(node)
                        }
                        result['suggestions'].append(suggestion)
        
        except SyntaxError:
            pass
        
        return result
    
    def _extract_python_endpoint(self, node: ast.FunctionDef, file_path: str) -> Optional[Dict[str, Any]]:
        """提取 Python API 端点"""
        # 检查是否有装饰器（如 @app.route, @app.get 等）
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Call):
                if hasattr(decorator.func, 'id') and decorator.func.id in ['route', 'get', 'post', 'put', 'delete']:
                    return {
                        "name": node.name,
                        "method": decorator.func.id.upper(),
                        "path": getattr(decorator.args[0], 's', '') if decorator.args else '',
                        "file": file_path,
                        "line": node.lineno
                    }
        return None
    
    def _generate_function_comment(self, node: ast.FunctionDef) -> str:
        """生成函数注释"""
        args = [arg.arg for arg in node.args.args]
        returns = "None"
        
        # 检查返回类型
        if node.returns:
            returns = ast.unparse(node.returns)
        
        comment = f'"""\n{node.name}('
        comment += ', '.join(args)
        comment += f')\n\nArgs:\n'
        for arg in args:
            comment += f'    {arg}: 参数描述\n'
        comment += f'\nReturns:\n    {returns}: 返回值描述\n"""'
        
        return comment
    
    def _generate_javascript_docs(
        self,
        content: str,
        file_path: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """生成 JavaScript 文档"""
        result = {
            "endpoints": [],
            "models": [],
            "suggestions": []
        }
        
        # 提取函数
        function_pattern = r'(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+))'
        
        for match in re.finditer(function_pattern, content):
            func_name = match.group(1) or match.group(2) or match.group(3)
            if func_name:
                if doc_type == 'comments':
                    suggestion = {
                        "type": "function",
                        "name": func_name,
                        "line": content[:match.start()].count('\n') + 1,
                        "suggestion": f"/**\n * {func_name} 函数描述\n * @param {func_name} - 参数描述\n * @returns 返回值描述\n */"
                    }
                    result['suggestions'].append(suggestion)
        
        return result
    
    def _generate_typescript_docs(
        self,
        content: str,
        file_path: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """生成 TypeScript 文档"""
        # TypeScript 和 JavaScript 类似，但需要处理类型
        return self._generate_javascript_docs(content, file_path, doc_type)
    
    def _generate_java_docs(
        self,
        content: str,
        file_path: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """生成 Java 文档"""
        result = {
            "endpoints": [],
            "models": [],
            "suggestions": []
        }
        
        # 提取方法
        method_pattern = r'(?:public|private|protected)?\s*(?:static\s+)?(?:\w+)\s+(\w+)\s*\([^)]*\)'
        
        for match in re.finditer(method_pattern, content):
            method_name = match.group(1)
            if doc_type == 'comments':
                suggestion = {
                    "type": "method",
                    "name": method_name,
                    "line": content[:match.start()].count('\n') + 1,
                    "suggestion": f"/**\n * {method_name} 方法描述\n * @param 参数描述\n * @return 返回值描述\n */"
                }
                result['suggestions'].append(suggestion)
        
        return result
    
    def _generate_go_docs(
        self,
        content: str,
        file_path: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """生成 Go 文档"""
        result = {
            "endpoints": [],
            "models": [],
            "suggestions": []
        }
        
        # 提取函数
        func_pattern = r'func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?(\w+)\s*\([^)]*\)'
        
        for match in re.finditer(func_pattern, content):
            func_name = match.group(1)
            if doc_type == 'comments':
                suggestion = {
                    "type": "function",
                    "name": func_name,
                    "line": content[:match.start()].count('\n') + 1,
                    "suggestion": f"// {func_name} 函数描述\n// 参数: 参数描述\n// 返回: 返回值描述"
                }
                result['suggestions'].append(suggestion)
        
        return result


# 全局实例
_doc_generator = None


def get_doc_generator() -> DocGenerator:
    """获取文档生成器实例"""
    global _doc_generator
    if _doc_generator is None:
        _doc_generator = DocGenerator()
    return _doc_generator