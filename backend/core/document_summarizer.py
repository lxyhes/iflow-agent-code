"""
文档摘要生成器
为代码文件和文档生成智能摘要
"""

import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger("DocumentSummarizer")


class DocumentSummarizer:
    """文档摘要生成器"""
    
    def __init__(self):
        self.supported_languages = {
            '.py': self._summarize_python,
            '.js': self._summarize_javascript,
            '.jsx': self._summarize_javascript,
            '.ts': self._summarize_typescript,
            '.tsx': self._summarize_typescript,
            '.java': self._summarize_java,
            '.go': self._summarize_go,
            '.rs': self._summarize_rust,
            '.md': self._summarize_markdown,
            '.txt': self._summarize_text,
            '.rst': self._summarize_text,
        }
    
    def summarize(self, file_path: str, content: str) -> Dict[str, Any]:
        """
        生成文档摘要
        
        Args:
            file_path: 文件路径
            content: 文件内容
        
        Returns:
            摘要信息字典
        """
        ext = Path(file_path).suffix.lower()
        
        if ext not in self.supported_languages:
            return self._basic_summary(content, ext)
        
        try:
            summarizer = self.supported_languages[ext]
            return summarizer(content, file_path)
        except Exception as e:
            logger.error(f"Error summarizing {file_path}: {e}")
            return self._basic_summary(content, ext)
    
    def _basic_summary(self, content: str, ext: str) -> Dict[str, Any]:
        """基础摘要"""
        lines = content.split('\n')
        non_empty_lines = [l for l in lines if l.strip()]
        
        return {
            "language": ext[1:].upper(),
            "total_lines": len(lines),
            "code_lines": len(non_empty_lines),
            "estimated_size": len(content),
            "summary": f"包含 {len(non_empty_lines)} 行代码的 {ext[1:]} 文件"
        }
    
    def _summarize_python(self, content: str, file_path: str) -> Dict[str, Any]:
        """Python 文件摘要"""
        lines = content.split('\n')
        
        # 提取文档字符串
        docstring = self._extract_python_docstring(content)
        
        # 提取导入
        imports = self._extract_imports(content)
        
        # 提取类和函数
        classes = self._extract_classes(content, 'python')
        functions = self._extract_functions(content, 'python')
        
        # 生成摘要
        summary_parts = []
        if docstring:
            summary_parts.append(docstring)
        
        if classes:
            summary_parts.append(f"定义了 {len(classes)} 个类: {', '.join(classes[:5])}")
        
        if functions:
            summary_parts.append(f"包含 {len(functions)} 个函数: {', '.join(functions[:5])}")
        
        if imports:
            summary_parts.append(f"导入了 {len(imports)} 个模块")
        
        summary = " | ".join(summary_parts) if summary_parts else "Python 代码文件"
        
        return {
            "language": "Python",
            "total_lines": len(lines),
            "docstring": docstring,
            "imports": imports[:10],  # 限制数量
            "classes": classes,
            "functions": functions,
            "summary": summary
        }
    
    def _summarize_javascript(self, content: str, file_path: str) -> Dict[str, Any]:
        """JavaScript 文件摘要"""
        lines = content.split('\n')
        
        # 提取注释作为文档
        comments = self._extract_comments(content, ['//', '/*'])
        
        # 提取导入
        imports = self._extract_imports(content)
        
        # 提取类和函数
        classes = self._extract_classes(content, 'javascript')
        functions = self._extract_functions(content, 'javascript')
        
        # 检查是否是 React 组件
        is_react = 'react' in content.lower() or 'jsx' in file_path.lower()
        
        # 生成摘要
        summary_parts = []
        if is_react:
            summary_parts.append("React 组件")
        
        if classes:
            summary_parts.append(f"定义了 {len(classes)} 个类")
        
        if functions:
            summary_parts.append(f"包含 {len(functions)} 个函数")
        
        if imports:
            summary_parts.append(f"导入了 {len(imports)} 个模块")
        
        summary = " | ".join(summary_parts) if summary_parts else "JavaScript 代码文件"
        
        return {
            "language": "JavaScript",
            "total_lines": len(lines),
            "is_react": is_react,
            "imports": imports[:10],
            "classes": classes,
            "functions": functions,
            "summary": summary
        }
    
    def _summarize_typescript(self, content: str, file_path: str) -> Dict[str, Any]:
        """TypeScript 文件摘要"""
        summary = self._summarize_javascript(content, file_path)
        summary["language"] = "TypeScript"
        
        # 提取接口
        interfaces = self._extract_interfaces(content)
        summary["interfaces"] = interfaces
        
        if interfaces:
            summary["summary"] += f" | 定义了 {len(interfaces)} 个接口"
        
        return summary
    
    def _summarize_java(self, content: str, file_path: str) -> Dict[str, Any]:
        """Java 文件摘要"""
        lines = content.split('\n')
        
        # 提取类
        classes = self._extract_classes(content, 'java')
        
        # 提取方法
        methods = self._extract_functions(content, 'java')
        
        # 提取导入
        imports = self._extract_imports(content)
        
        # 生成摘要
        summary_parts = []
        if classes:
            summary_parts.append(f"定义了 {len(classes)} 个类")
        
        if methods:
            summary_parts.append(f"包含 {len(methods)} 个方法")
        
        if imports:
            summary_parts.append(f"导入了 {len(imports)} 个包")
        
        summary = " | ".join(summary_parts) if summary_parts else "Java 代码文件"
        
        return {
            "language": "Java",
            "total_lines": len(lines),
            "imports": imports[:10],
            "classes": classes,
            "methods": methods,
            "summary": summary
        }
    
    def _summarize_go(self, content: str, file_path: str) -> Dict[str, Any]:
        """Go 文件摘要"""
        lines = content.split('\n')
        
        # 提取包名
        package_match = re.search(r'package\s+(\w+)', content)
        package_name = package_match.group(1) if package_match else 'main'
        
        # 提取函数
        functions = self._extract_functions(content, 'go')
        
        # 提取结构体
        structs = self._extract_structs(content)
        
        # 生成摘要
        summary_parts = [f"包: {package_name}"]
        if structs:
            summary_parts.append(f"定义了 {len(structs)} 个结构体")
        
        if functions:
            summary_parts.append(f"包含 {len(functions)} 个函数")
        
        summary = " | ".join(summary_parts)
        
        return {
            "language": "Go",
            "total_lines": len(lines),
            "package": package_name,
            "structs": structs,
            "functions": functions,
            "summary": summary
        }
    
    def _summarize_rust(self, content: str, file_path: str) -> Dict[str, Any]:
        """Rust 文件摘要"""
        lines = content.split('\n')
        
        # 提取函数
        functions = self._extract_functions(content, 'rust')
        
        # 提取结构体
        structs = self._extract_structs(content)
        
        # 提取枚举
        enums = self._extract_enums(content)
        
        # 生成摘要
        summary_parts = []
        if structs:
            summary_parts.append(f"定义了 {len(structs)} 个结构体")
        
        if enums:
            summary_parts.append(f"定义了 {len(enums)} 个枚举")
        
        if functions:
            summary_parts.append(f"包含 {len(functions)} 个函数")
        
        summary = " | ".join(summary_parts) if summary_parts else "Rust 代码文件"
        
        return {
            "language": "Rust",
            "total_lines": len(lines),
            "structs": structs,
            "enums": enums,
            "functions": functions,
            "summary": summary
        }
    
    def _summarize_markdown(self, content: str, file_path: str) -> Dict[str, Any]:
        """Markdown 文档摘要"""
        lines = content.split('\n')
        
        # 提取标题
        headings = []
        for line in lines:
            if line.startswith('#'):
                level = len(line) - len(line.lstrip('#'))
                text = line.lstrip('#').strip()
                headings.append({'level': level, 'text': text})
        
        # 提取代码块数量
        code_blocks = len(re.findall(r'```', content)) // 2
        
        # 提取链接数量
        links = len(re.findall(r'\[([^\]]+)\]\([^)]+\)', content))
        
        # 生成摘要
        summary_parts = []
        if headings:
            summary_parts.append(f"包含 {len(headings)} 个标题")
        
        if code_blocks > 0:
            summary_parts.append(f"{code_blocks} 个代码块")
        
        if links > 0:
            summary_parts.append(f"{links} 个链接")
        
        summary = " | ".join(summary_parts) if summary_parts else "Markdown 文档"
        
        return {
            "language": "Markdown",
            "total_lines": len(lines),
            "headings": headings[:10],
            "code_blocks": code_blocks,
            "links": links,
            "summary": summary
        }
    
    def _summarize_text(self, content: str, file_path: str) -> Dict[str, Any]:
        """文本文件摘要"""
        lines = content.split('\n')
        non_empty_lines = [l for l in lines if l.strip()]
        words = content.split()
        
        # 提取前几行作为预览
        preview = '\n'.join(lines[:5])
        
        return {
            "language": "Text",
            "total_lines": len(lines),
            "non_empty_lines": len(non_empty_lines),
            "word_count": len(words),
            "char_count": len(content),
            "preview": preview,
            "summary": f"包含 {len(non_empty_lines)} 行，{len(words)} 个词的文本文件"
        }
    
    # 辅助方法
    def _extract_python_docstring(self, content: str) -> Optional[str]:
        """提取 Python 文档字符串"""
        match = re.search(r'"""([^"]|"(?!"))*"""', content, re.DOTALL)
        if match:
            return match.group(1).strip()
        match = re.search(r"'''([^']|(?!'))*'''", content, re.DOTALL)
        if match:
            return match.group(1).strip()
        return None
    
    def _extract_imports(self, content: str) -> List[str]:
        """提取导入语句"""
        imports = []
        patterns = [
            r'import\s+([^\n;]+)',
            r'from\s+(\w+)\s+import',
            r'require\([\'"]([^\'"]+)[\'"]\)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content)
            imports.extend(matches)
        
        return list(set(imports))  # 去重
    
    def _extract_classes(self, content: str, language: str) -> List[str]:
        """提取类定义"""
        classes = []
        
        if language == 'python':
            matches = re.findall(r'class\s+(\w+)', content)
            classes.extend(matches)
        elif language in ['javascript', 'typescript']:
            matches = re.findall(r'class\s+(\w+)', content)
            classes.extend(matches)
        elif language == 'java':
            matches = re.findall(r'(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)', content)
            classes.extend(matches)
        
        return list(set(classes))
    
    def _extract_functions(self, content: str, language: str) -> List[str]:
        """提取函数定义"""
        functions = []
        
        if language == 'python':
            matches = re.findall(r'def\s+(\w+)\s*\(', content)
            functions.extend(matches)
        elif language in ['javascript', 'typescript']:
            matches = re.findall(r'function\s+(\w+)\s*\(', content)
            functions.extend(matches)
            matches = re.findall(r'(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>', content)
            functions.extend(matches)
        elif language == 'java':
            matches = re.findall(r'(?:public|private|protected)?\s*(?:static|final)?\s*(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(', content)
            functions.extend(matches)
        elif language == 'go':
            matches = re.findall(r'func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(', content)
            functions.extend(matches)
        elif language == 'rust':
            matches = re.findall(r'(?:pub\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)\s*\(', content)
            functions.extend(matches)
        
        return list(set(functions))
    
    def _extract_interfaces(self, content: str) -> List[str]:
        """提取接口定义"""
        matches = re.findall(r'interface\s+(\w+)', content)
        return list(set(matches))
    
    def _extract_structs(self, content: str) -> List[str]:
        """提取结构体定义"""
        matches = re.findall(r'type\s+(\w+)\s+struct', content)
        return list(set(matches))
    
    def _extract_enums(self, content: str) -> List[str]:
        """提取枚举定义"""
        matches = re.findall(r'enum\s+(\w+)', content)
        return list(set(matches))
    
    def _extract_comments(self, content: str, markers: List[str]) -> List[str]:
        """提取注释"""
        comments = []
        
        for marker in markers:
            if marker == '//':
                matches = re.findall(r'//(.*)', content)
                comments.extend([m.strip() for m in matches if m.strip()])
            elif marker == '/*':
                matches = re.findall(r'/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*/', content)
                for match in matches:
                    if isinstance(match, tuple) and match[0]:
                        comments.append(match[0].strip())
        
        return comments


# 便捷函数
def summarize_document(file_path: str, content: str) -> Dict[str, Any]:
    """生成文档摘要"""
    summarizer = DocumentSummarizer()
    return summarizer.summarize(file_path, content)