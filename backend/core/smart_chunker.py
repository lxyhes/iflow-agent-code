"""
智能分块器 - 基于代码语义边界的智能分块策略
支持函数、类、代码块级别的语义分块
"""

import re
import ast
import logging
from typing import List, Dict, Any, Tuple
from pathlib import Path

logger = logging.getLogger("SmartChunker")


class SmartChunker:
    """智能分块器 - 基于代码语义的分块"""
    
    def __init__(
        self,
        max_chunk_size: int = 1000,
        min_chunk_size: int = 200,
        chunk_overlap: int = 100,
        preserve_structure: bool = True
    ):
        """
        初始化智能分块器
        
        Args:
            max_chunk_size: 最大块大小
            min_chunk_size: 最小块大小
            chunk_overlap: 块重叠大小
            preserve_structure: 是否保留代码结构
        """
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
        self.chunk_overlap = chunk_overlap
        self.preserve_structure = preserve_structure
        
        # 语言特定的分块策略
        self.chunk_strategies = {
            '.py': self._chunk_python,
            '.js': self._chunk_javascript,
            '.jsx': self._chunk_javascript,
            '.ts': self._chunk_typescript,
            '.tsx': self._chunk_typescript,
            '.java': self._chunk_java,
            '.go': self._chunk_go,
            '.rs': self._chunk_rust,
            '.md': self._chunk_markdown,
            '.txt': self._chunk_text,
            '.rst': self._chunk_text,
        }
    
    def chunk(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        智能分块
        
        Args:
            content: 文件内容
            file_path: 文件路径
            code_structure: 代码结构信息（可选）
        
        Returns:
            分块列表，每个块包含内容和元数据
        """
        ext = Path(file_path).suffix.lower()
        
        # 选择分块策略
        if ext in self.chunk_strategies:
            chunks = self.chunk_strategies[ext](content, file_path, code_structure)
        else:
            chunks = self._chunk_text(content, file_path, code_structure)
        
        # 后处理：合并过小的块
        chunks = self._merge_small_chunks(chunks)
        
        # 添加重叠
        chunks = self._add_overlap(chunks)
        
        logger.info(f"Chunked {file_path} into {len(chunks)} chunks")
        return chunks
    
    def _chunk_python(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Python 代码分块"""
        chunks = []
        lines = content.split('\n')
        
        try:
            tree = ast.parse(content)
            
            # 按函数和类分块
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    chunk_lines = lines[node.lineno - 1:node.end_lineno]
                    chunk_content = '\n'.join(chunk_lines)
                    
                    if len(chunk_content) > self.min_chunk_size:
                        chunks.append({
                            "content": chunk_content,
                            "metadata": {
                                "type": "function" if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) else "class",
                                "name": node.name,
                                "lineno": node.lineno,
                                "end_lineno": node.end_lineno,
                                "file_path": file_path
                            }
                        })
            
            # 如果没有找到函数或类，使用文本分块
            if not chunks:
                chunks = self._chunk_text(content, file_path, code_structure)
        
        except SyntaxError:
            # 如果语法错误，使用文本分块
            chunks = self._chunk_text(content, file_path, code_structure)
        
        return chunks
    
    def _chunk_javascript(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """JavaScript/JSX 代码分块"""
        chunks = []
        
        # 提取函数
        func_pattern = r'(function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*\})'
        for match in re.finditer(func_pattern, content, re.DOTALL):
            func_content = match.group(1)
            if len(func_content) > self.min_chunk_size:
                chunks.append({
                    "content": func_content,
                    "metadata": {
                        "type": "function",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        # 提取类
        class_pattern = r'(class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{[^}]*\})'
        for match in re.finditer(class_pattern, content, re.DOTALL):
            class_content = match.group(1)
            if len(class_content) > self.min_chunk_size:
                chunks.append({
                    "content": class_content,
                    "metadata": {
                        "type": "class",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        # 提取箭头函数
        arrow_func_pattern = r'((?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*\{[^}]*\})'
        for match in re.finditer(arrow_func_pattern, content, re.DOTALL):
            func_content = match.group(1)
            if len(func_content) > self.min_chunk_size:
                chunks.append({
                    "content": func_content,
                    "metadata": {
                        "type": "arrow_function",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        # 如果没有找到结构，使用文本分块
        if not chunks:
            chunks = self._chunk_text(content, file_path, code_structure)
        
        return chunks
    
    def _chunk_typescript(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """TypeScript/TSX 代码分块"""
        chunks = self._chunk_javascript(content, file_path, code_structure)
        
        # 提取接口
        interface_pattern = r'(interface\s+(\w+)(?:\s+extends\s+[^{]+)?\s*\{[^}]*\})'
        for match in re.finditer(interface_pattern, content, re.DOTALL):
            interface_content = match.group(1)
            if len(interface_content) > self.min_chunk_size:
                chunks.append({
                    "content": interface_content,
                    "metadata": {
                        "type": "interface",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        # 提取类型别名
        type_pattern = r'(type\s+(\w+)\s*=\s*[^;]+;)'
        for match in re.finditer(type_pattern, content):
            type_content = match.group(1)
            if len(type_content) > self.min_chunk_size:
                chunks.append({
                    "content": type_content,
                    "metadata": {
                        "type": "type",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        return chunks
    
    def _chunk_java(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Java 代码分块"""
        chunks = []
        
        # 提取类
        class_pattern = r'(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?\s*\{[^}]*\})'
        for match in re.finditer(class_pattern, content, re.DOTALL):
            class_content = match.group(0)
            if len(class_content) > self.min_chunk_size:
                chunks.append({
                    "content": class_content,
                    "metadata": {
                        "type": "class",
                        "name": match.group(1),
                        "file_path": file_path
                    }
                })
        
        # 提取方法
        method_pattern = r'(?:public|private|protected)?\s*(?:static|final|synchronized)?\s*(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\s*\{[^}]*\})'
        for match in re.finditer(method_pattern, content, re.DOTALL):
            method_content = match.group(0)
            if len(method_content) > self.min_chunk_size:
                chunks.append({
                    "content": method_content,
                    "metadata": {
                        "type": "method",
                        "name": match.group(1),
                        "file_path": file_path
                    }
                })
        
        if not chunks:
            chunks = self._chunk_text(content, file_path, code_structure)
        
        return chunks
    
    def _chunk_go(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Go 代码分块"""
        chunks = []
        
        # 提取函数
        func_pattern = r'(func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\([^)]*\)(?:\s*\([^)]*\))?\s*\{[^}]*\})'
        for match in re.finditer(func_pattern, content, re.DOTALL):
            func_content = match.group(0)
            if len(func_content) > self.min_chunk_size:
                chunks.append({
                    "content": func_content,
                    "metadata": {
                        "type": "function",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        # 提取结构体
        struct_pattern = r'(type\s+(\w+)\s+struct\s*\{[^}]*\})'
        for match in re.finditer(struct_pattern, content, re.DOTALL):
            struct_content = match.group(0)
            if len(struct_content) > self.min_chunk_size:
                chunks.append({
                    "content": struct_content,
                    "metadata": {
                        "type": "struct",
                        "name": match.group(2),
                        "file_path": file_path
                    }
                })
        
        if not chunks:
            chunks = self._chunk_text(content, file_path, code_structure)
        
        return chunks
    
    def _chunk_rust(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Rust 代码分块"""
        chunks = []
        
        # 提取函数
        func_pattern = r'(?:pub\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^{]+)?\s*\{[^}]*\})'
        for match in re.finditer(func_pattern, content, re.DOTALL):
            func_content = match.group(0)
            if len(func_content) > self.min_chunk_size:
                chunks.append({
                    "content": func_content,
                    "metadata": {
                        "type": "function",
                        "name": match.group(1),
                        "file_path": file_path
                    }
                })
        
        # 提取结构体
        struct_pattern = r'(?:pub\s+)?struct\s+(\w+)(?:\s*\{[^}]*\}|;)?'
        for match in re.finditer(struct_pattern, content):
            struct_content = match.group(0)
            if len(struct_content) > self.min_chunk_size:
                chunks.append({
                    "content": struct_content,
                    "metadata": {
                        "type": "struct",
                        "name": match.group(1),
                        "file_path": file_path
                    }
                })
        
        # 提取枚举
        enum_pattern = r'(?:pub\s+)?enum\s+(\w+)\s*\{[^}]*\}'
        for match in re.finditer(enum_pattern, content, re.DOTALL):
            enum_content = match.group(0)
            if len(enum_content) > self.min_chunk_size:
                chunks.append({
                    "content": enum_content,
                    "metadata": {
                        "type": "enum",
                        "name": match.group(1),
                        "file_path": file_path
                    }
                })
        
        if not chunks:
            chunks = self._chunk_text(content, file_path, code_structure)
        
        return chunks
    
    def _chunk_markdown(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Markdown 文档分块"""
        chunks = []
        
        # 按标题分块
        sections = re.split(r'\n(#{1,6}\s+.+)', content)
        
        current_section = ""
        current_title = "Introduction"
        
        for i, section in enumerate(sections):
            if i % 2 == 1:  # 标题
                if current_section.strip():
                    chunks.append({
                        "content": current_section.strip(),
                        "metadata": {
                            "type": "section",
                            "title": current_title,
                            "file_path": file_path
                        }
                    })
                current_title = section.strip()
                current_section = section + "\n"
            else:  # 内容
                current_section += section
        
        # 添加最后一个部分
        if current_section.strip():
            chunks.append({
                "content": current_section.strip(),
                "metadata": {
                    "type": "section",
                    "title": current_title,
                    "file_path": file_path
                }
            })
        
        # 如果分块太大，进一步分割
        final_chunks = []
        for chunk in chunks:
            if len(chunk["content"]) > self.max_chunk_size:
                sub_chunks = self._split_large_chunk(chunk["content"])
                for sub_chunk in sub_chunks:
                    final_chunks.append({
                        "content": sub_chunk,
                        "metadata": chunk["metadata"].copy()
                    })
            else:
                final_chunks.append(chunk)
        
        return final_chunks
    
    def _chunk_text(
        self,
        content: str,
        file_path: str,
        code_structure: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """通用文本分块"""
        chunks = []
        
        if len(content) <= self.max_chunk_size:
            chunks.append({
                "content": content,
                "metadata": {
                    "type": "text",
                    "file_path": file_path
                }
            })
        else:
            chunks = self._split_large_chunk(content)
            for i, chunk in enumerate(chunks):
                chunks[i] = {
                    "content": chunk,
                    "metadata": {
                        "type": "text",
                        "chunk_index": i,
                        "file_path": file_path
                    }
                }
        
        return chunks
    
    def _split_large_chunk(self, content: str) -> List[str]:
        """分割大块内容"""
        chunks = []
        sentences = re.split(r'(?<=[.!?。！？])\s+', content)
        
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > self.max_chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _merge_small_chunks(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """合并过小的块"""
        if not chunks:
            return chunks
        
        merged = []
        current_chunk = chunks[0]
        
        for chunk in chunks[1:]:
            # 如果当前块太小，尝试与下一个块合并
            if len(current_chunk["content"]) < self.min_chunk_size:
                # 只有当类型相同时才合并
                if current_chunk["metadata"].get("type") == chunk["metadata"].get("type"):
                    current_chunk["content"] += "\n\n" + chunk["content"]
                    continue
            
            merged.append(current_chunk)
            current_chunk = chunk
        
        if current_chunk:
            merged.append(current_chunk)
        
        return merged
    
    def _add_overlap(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """添加块重叠"""
        if self.chunk_overlap <= 0 or len(chunks) <= 1:
            return chunks
        
        overlapped = []
        
        for i, chunk in enumerate(chunks):
            content = chunk["content"]
            
            # 添加前一个块的重叠
            if i > 0:
                prev_content = chunks[i - 1]["content"]
                overlap_text = prev_content[-self.chunk_overlap:] if len(prev_content) > self.chunk_overlap else prev_content
                content = f"...{overlap_text}\n\n{content}"
            
            # 添加后一个块的重叠
            if i < len(chunks) - 1:
                next_content = chunks[i + 1]["content"]
                overlap_text = next_content[:self.chunk_overlap] if len(next_content) > self.chunk_overlap else next_content
                content = f"{content}\n\n{overlap_text}..."
            
            overlapped.append({
                "content": content,
                "metadata": chunk["metadata"]
            })
        
        return overlapped


# 便捷函数
def chunk_content(
    content: str,
    file_path: str,
    code_structure: Dict[str, Any] = None,
    max_chunk_size: int = 1000,
    min_chunk_size: int = 200,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """分块内容"""
    chunker = SmartChunker(max_chunk_size, min_chunk_size, chunk_overlap)
    return chunker.chunk(content, file_path, code_structure)
