"""
代码分析器 - 使用 AST 解析器提取详细的代码结构信息
支持 Python、JavaScript、TypeScript 等多种语言
"""

import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger("CodeAnalyzer")


class CodeAnalyzer:
    """代码分析器 - 提取代码结构、依赖关系、调用图等信息"""
    
    def __init__(self):
        self.supported_languages = {
            '.py': self._analyze_python,
            '.js': self._analyze_javascript,
            '.jsx': self._analyze_javascript,
            '.ts': self._analyze_typescript,
            '.tsx': self._analyze_typescript,
            '.java': self._analyze_java,
            '.go': self._analyze_go,
            '.rs': self._analyze_rust,
        }
    
    def analyze(self, file_path: str, content: str) -> Dict[str, Any]:
        """
        分析代码文件
        
        Args:
            file_path: 文件路径
            content: 文件内容
        
        Returns:
            代码结构信息字典
        """
        ext = Path(file_path).suffix.lower()
        
        if ext not in self.supported_languages:
            return self._basic_analysis(content, ext)
        
        try:
            analyzer = self.supported_languages[ext]
            return analyzer(content, file_path)
        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {e}")
            return self._basic_analysis(content, ext)
    
    def _basic_analysis(self, content: str, ext: str) -> Dict[str, Any]:
        """基础分析 - 提取导入和简单的结构信息"""
        return {
            "language": ext[1:].upper(),
            "imports": self._extract_imports_basic(content),
            "exports": self._extract_exports_basic(content),
            "functions": [],
            "classes": [],
            "variables": [],
            "comments": [],
            "complexity": 0,
            "lines_of_code": len([l for l in content.split('\n') if l.strip()]),
            "lines_of_comments": len([l for l in content.split('\n') if l.strip().startswith(('#', '//', '/*', '*'))])
        }
    
    def _analyze_python(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Python 代码"""
        try:
            tree = ast.parse(content)
        except SyntaxError:
            logger.warning(f"Failed to parse Python file: {file_path}")
            return self._basic_analysis(content, '.py')
        
        result = {
            "language": "Python",
            "imports": [],
            "functions": [],
            "classes": [],
            "variables": [],
            "decorators": [],
            "comments": [],
            "complexity": 0,
            "lines_of_code": 0,
            "lines_of_comments": 0,
            "call_graph": {},
            "inheritance": []
        }
        
        # 遍历 AST
        for node in ast.walk(tree):
            # 导入
            if isinstance(node, ast.Import):
                for alias in node.names:
                    result["imports"].append({
                        "name": alias.name,
                        "alias": alias.asname,
                        "type": "module"
                    })
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    result["imports"].append({
                        "name": alias.name,
                        "alias": alias.asname,
                        "from": module,
                        "type": "from"
                    })
            
            # 函数定义
            elif isinstance(node, ast.FunctionDef):
                func_info = {
                    "name": node.name,
                    "lineno": node.lineno,
                    "end_lineno": node.end_lineno,
                    "args": [arg.arg for arg in node.args.args],
                    "returns": ast.unparse(node.returns) if node.returns else None,
                    "decorators": [ast.unparse(d) for d in node.decorator_list],
                    "docstring": ast.get_docstring(node),
                    "is_async": isinstance(node, ast.AsyncFunctionDef),
                    "calls": self._extract_function_calls(node)
                }
                result["functions"].append(func_info)
                result["complexity"] += self._calculate_complexity(node)
            
            # 类定义
            elif isinstance(node, ast.ClassDef):
                class_info = {
                    "name": node.name,
                    "lineno": node.lineno,
                    "end_lineno": node.end_lineno,
                    "bases": [ast.unparse(base) for base in node.bases],
                    "decorators": [ast.unparse(d) for d in node.decorator_list],
                    "docstring": ast.get_docstring(node),
                    "methods": [],
                    "attributes": []
                }
                
                # 提取继承关系
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        result["inheritance"].append({
                            "child": node.name,
                            "parent": base.id
                        })
                
                # 提取方法和属性
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        class_info["methods"].append({
                            "name": item.name,
                            "args": [arg.arg for arg in item.args.args],
                            "is_static": any(ast.unparse(d) == "staticmethod" for d in item.decorator_list),
                            "is_classmethod": any(ast.unparse(d) == "classmethod" for d in item.decorator_list)
                        })
                    elif isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name):
                                class_info["attributes"].append(target.id)
                
                result["classes"].append(class_info)
            
            # 变量定义
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        result["variables"].append({
                            "name": target.id,
                            "lineno": node.lineno,
                            "type": "variable"
                        })
        
        # 构建调用图
        result["call_graph"] = self._build_call_graph(result["functions"])
        
        # 计算 LOC
        lines = content.split('\n')
        result["lines_of_code"] = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
        result["lines_of_comments"] = len([l for l in lines if l.strip().startswith('#')])
        
        return result
    
    def _analyze_javascript(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 JavaScript 代码"""
        result = {
            "language": "JavaScript",
            "imports": [],
            "exports": [],
            "functions": [],
            "classes": [],
            "variables": [],
            "comments": [],
            "complexity": 0,
            "lines_of_code": 0,
            "lines_of_comments": 0,
            "call_graph": {},
            "inheritance": []
        }
        
        # 提取导入
        import_pattern = r'import\s+(?:(?:\{[^}]*\}|\*)\s+as\s+\w+|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]|import\s+[\'"]([^\'"]+)[\'"]'
        for match in re.finditer(import_pattern, content):
            result["imports"].append({
                "name": match.group(1) or match.group(2),
                "type": "import"
            })
        
        # 提取 require
        require_pattern = r'require\([\'"]([^\'"]+)[\'"]\)'
        for match in re.finditer(require_pattern, content):
            result["imports"].append({
                "name": match.group(1),
                "type": "require"
            })
        
        # 提取函数
        function_pattern = r'(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|(\w+)\s*\([^)]*\)\s*=>)'
        for match in re.finditer(function_pattern, content):
            func_name = match.group(1) or match.group(2) or match.group(3)
            if func_name:
                result["functions"].append({
                    "name": func_name,
                    "type": "function"
                })
        
        # 提取类
        class_pattern = r'class\s+(\w+)(?:\s+extends\s+(\w+))?'
        for match in re.finditer(class_pattern, content):
            class_name = match.group(1)
            parent_class = match.group(2)
            result["classes"].append({
                "name": class_name,
                "extends": parent_class
            })
            if parent_class:
                result["inheritance"].append({
                    "child": class_name,
                    "parent": parent_class
                })
        
        # 提取导出
        export_pattern = r'export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)'
        for match in re.finditer(export_pattern, content):
            result["exports"].append(match.group(1))
        
        # 计算 LOC
        lines = content.split('\n')
        result["lines_of_code"] = len([l for l in lines if l.strip() and not l.strip().startswith(('//', '/*', '*'))])
        result["lines_of_comments"] = len([l for l in lines if l.strip().startswith(('//', '/*', '*'))])
        
        return result
    
    def _analyze_typescript(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 TypeScript 代码"""
        result = self._analyze_javascript(content, file_path)
        result["language"] = "TypeScript"
        
        # TypeScript 特有的类型导入
        type_import_pattern = r'import\s+type\s+\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]'
        for match in re.finditer(type_import_pattern, content):
            types = [t.strip() for t in match.group(1).split(',')]
            for type_name in types:
                result["imports"].append({
                    "name": type_name,
                    "from": match.group(2),
                    "type": "type"
                })
        
        # 提取接口
        interface_pattern = r'interface\s+(\w+)(?:\s+extends\s+([^{]+))?'
        for match in re.finditer(interface_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "type": "interface",
                "extends": match.group(2).strip() if match.group(2) else None
            })
        
        # 提取类型别名
        type_alias_pattern = r'type\s+(\w+)\s*='
        for match in re.finditer(type_alias_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "type": "type"
            })
        
        return result
    
    def _analyze_java(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Java 代码"""
        result = {
            "language": "Java",
            "imports": [],
            "functions": [],
            "classes": [],
            "variables": [],
            "complexity": 0,
            "lines_of_code": 0,
            "lines_of_comments": 0
        }
        
        # 提取导入
        import_pattern = r'import\s+(?:static\s+)?([^;]+);'
        for match in re.finditer(import_pattern, content):
            result["imports"].append({
                "name": match.group(1).strip(),
                "type": "import"
            })
        
        # 提取类
        class_pattern = r'(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?'
        for match in re.finditer(class_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "extends": match.group(2),
                "implements": [i.strip() for i in match.group(3).split(',')] if match.group(3) else []
            })
        
        # 提取方法
        method_pattern = r'(?:public|private|protected)?\s*(?:static|final|synchronized)?\s*(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?'
        for match in re.finditer(method_pattern, content):
            result["functions"].append({
                "name": match.group(1),
                "type": "method"
            })
        
        # 计算 LOC
        lines = content.split('\n')
        result["lines_of_code"] = len([l for l in lines if l.strip() and not l.strip().startswith(('//', '/*', '*'))])
        result["lines_of_comments"] = len([l for l in lines if l.strip().startswith(('//', '/*', '*'))])
        
        return result
    
    def _analyze_go(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Go 代码"""
        result = {
            "language": "Go",
            "imports": [],
            "functions": [],
            "classes": [],
            "variables": [],
            "complexity": 0,
            "lines_of_code": 0,
            "lines_of_comments": 0
        }
        
        # 提取导入
        import_block = re.search(r'import\s*\((.*?)\)', content, re.DOTALL)
        if import_block:
            imports = re.findall(r'"([^"]+)"', import_block.group(1))
            for imp in imports:
                result["imports"].append({"name": imp, "type": "import"})
        else:
            import_pattern = r'import\s+"([^"]+)"'
            for match in re.finditer(import_pattern, content):
                result["imports"].append({"name": match.group(1), "type": "import"})
        
        # 提取函数
        func_pattern = r'func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\([^)]*\)'
        for match in re.finditer(func_pattern, content):
            result["functions"].append({
                "name": match.group(1),
                "type": "function"
            })
        
        # 提取结构体
        struct_pattern = r'type\s+(\w+)\s+struct'
        for match in re.finditer(struct_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "type": "struct"
            })
        
        # 计算 LOC
        lines = content.split('\n')
        result["lines_of_code"] = len([l for l in lines if l.strip() and not l.strip().startswith('//')])
        result["lines_of_comments"] = len([l for l in lines if l.strip().startswith('//')])
        
        return result
    
    def _analyze_rust(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Rust 代码"""
        result = {
            "language": "Rust",
            "imports": [],
            "functions": [],
            "classes": [],
            "variables": [],
            "complexity": 0,
            "lines_of_code": 0,
            "lines_of_comments": 0
        }
        
        # 提取 use 语句
        use_pattern = r'use\s+([^;]+);'
        for match in re.finditer(use_pattern, content):
            result["imports"].append({
                "name": match.group(1).strip(),
                "type": "use"
            })
        
        # 提取函数
        func_pattern = r'(?:pub\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)\s*\([^)]*\)'
        for match in re.finditer(func_pattern, content):
            result["functions"].append({
                "name": match.group(1),
                "type": "function"
            })
        
        # 提取结构体
        struct_pattern = r'(?:pub\s+)?struct\s+(\w+)'
        for match in re.finditer(struct_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "type": "struct"
            })
        
        # 提取枚举
        enum_pattern = r'(?:pub\s+)?enum\s+(\w+)'
        for match in re.finditer(enum_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "type": "enum"
            })
        
        # 提取 trait
        trait_pattern = r'(?:pub\s+)?trait\s+(\w+)'
        for match in re.finditer(trait_pattern, content):
            result["classes"].append({
                "name": match.group(1),
                "type": "trait"
            })
        
        # 计算 LOC
        lines = content.split('\n')
        result["lines_of_code"] = len([l for l in lines if l.strip() and not l.strip().startswith('//')])
        result["lines_of_comments"] = len([l for l in lines if l.strip().startswith('//')])
        
        return result
    
    def _extract_imports_basic(self, content: str) -> List[Dict[str, str]]:
        """基础导入提取"""
        imports = []
        patterns = [
            r'import\s+(?:\{[^}]*\}|\*)\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'import\s+[\'"]([^\'"]+)[\'"]',
            r'require\([\'"]([^\'"]+)[\'"]\)',
            r'from\s+(\w+)\s+import',
            r'import\s+(\w+)',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                imports.append({"name": match.group(1), "type": "import"})
        
        return imports
    
    def _extract_exports_basic(self, content: str) -> List[str]:
        """基础导出提取"""
        exports = []
        pattern = r'export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)'
        for match in re.finditer(pattern, content):
            exports.append(match.group(1))
        return exports
    
    def _extract_function_calls(self, node: ast.AST) -> List[str]:
        """提取函数调用"""
        calls = []
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    calls.append(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    calls.append(ast.unparse(child.func))
        return calls
    
    def _calculate_complexity(self, node: ast.FunctionDef) -> int:
        """计算圈复杂度"""
        complexity = 1  # 基础复杂度
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _build_call_graph(self, functions: List[Dict]) -> Dict[str, List[str]]:
        """构建调用图"""
        call_graph = {}
        for func in functions:
            call_graph[func["name"]] = func.get("calls", [])
        return call_graph


# 便捷函数
def analyze_code(file_path: str, content: str) -> Dict[str, Any]:
    """分析代码文件"""
    analyzer = CodeAnalyzer()
    return analyzer.analyze(file_path, content)
