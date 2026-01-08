"""
Code Style Analyzer - 分析用户编码风格和偏好
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Optional
import logging
import json

logger = logging.getLogger(__name__)


class CodeStyleAnalyzer:
    """代码风格分析器 - 学习用户的编码习惯"""

    def __init__(self, project_path: str):
        """
        初始化代码风格分析器

        Args:
            project_path: 项目根目录路径
        """
        self.project_path = Path(project_path)
        self.supported_extensions = {
            '.js', '.jsx', '.ts', '.tsx',  # JavaScript/TypeScript
            '.py',  # Python
            '.java',  # Java
            '.go',  # Go
            '.rs',  # Rust
            '.cpp', '.cc', '.cxx', '.h', '.hpp',  # C/C++
        }

    def analyze_project_style(self) -> Dict:
        """
        分析整个项目的代码风格

        Returns:
            包含代码风格信息的字典
        """
        style_profile = {
            'typescript': self._analyze_typescript_style(),
            'python': self._analyze_python_style(),
            'general': self._analyze_general_style(),
            'naming': self._analyze_naming_conventions(),
            'formatting': self._analyze_formatting()
        }

        return style_profile

    def _analyze_typescript_style(self) -> Dict:
        """分析 TypeScript/JavaScript 代码风格"""
        style = {
            'interface_vs_type': {'interface': 0, 'type': 0},
            'quote_style': {'single': 0, 'double': 0, 'backtick': 0},
            'semicolon_usage': 0,
            'arrow_functions': 0,
            'async_await': 0,
            'const_vs_let': {'const': 0, 'let': 0},
        }

        # 遍历 TypeScript/JavaScript 文件
        for file_path in self._find_files(['.ts', '.tsx', '.js', '.jsx']):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 统计 interface vs type
                style['interface_vs_type']['interface'] += len(re.findall(r'\binterface\s+\w+', content))
                style['interface_vs_type']['type'] += len(re.findall(r'\btype\s+\w+', content))

                # 统计引号风格
                style['quote_style']['single'] += len(re.findall(r"'[^']*'", content))
                style['quote_style']['double'] += len(re.findall(r'"[^"]*"', content))
                style['quote_style']['backtick'] += len(re.findall(r'`[^`]*`', content))

                # 统计分号使用
                style['semicolon_usage'] += len(re.findall(r';\s*$', content, re.MULTILINE))

                # 统计箭头函数
                style['arrow_functions'] += len(re.findall(r'\w+\s*=>\s*', content))

                # 统计 async/await
                style['async_await'] += len(re.findall(r'\basync\b', content))

                # 统计 const vs let
                style['const_vs_let']['const'] += len(re.findall(r'\bconst\s+', content))
                style['const_vs_let']['let'] += len(re.findall(r'\blet\s+', content))

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        return style

    def _analyze_python_style(self) -> Dict:
        """分析 Python 代码风格"""
        style = {
            'quote_style': {'single': 0, 'double': 0},
            'docstring_style': {'triple_double': 0, 'triple_single': 0},
            'type_hints': 0,
            'f_strings': 0,
            'list_comprehensions': 0,
            'class_naming': {'PascalCase': 0, 'snake_case': 0},
            'function_naming': {'snake_case': 0, 'camelCase': 0},
        }

        for file_path in self._find_files(['.py']):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 统计引号风格
                style['quote_style']['single'] += len(re.findall(r"'[^']*'", content))
                style['quote_style']['double'] += len(re.findall(r'"[^"]*"', content))

                # 统计文档字符串风格
                style['docstring_style']['triple_double'] += len(re.findall(r'"""[\s\S]*?"""', content))
                style['docstring_style']['triple_single'] += len(re.findall(r"'''[\s\S]*?'''", content))

                # 统计类型提示
                style['type_hints'] += len(re.findall(r':\s*\w+', content))

                # 统计 f-strings
                style['f_strings'] += len(re.findall(r'f["\']', content))

                # 统计列表推导式
                style['list_comprehensions'] += len(re.findall(r'\[[^\]]+\s+for\s+', content))

                # 统计类命名
                class_names = re.findall(r'class\s+(\w+)', content)
                for name in class_names:
                    if re.match(r'^[A-Z][a-zA-Z0-9]*$', name):
                        style['class_naming']['PascalCase'] += 1
                    else:
                        style['class_naming']['snake_case'] += 1

                # 统计函数命名
                func_names = re.findall(r'def\s+(\w+)', content)
                for name in func_names:
                    if re.match(r'^[a-z][a-z0-9_]*$', name):
                        style['function_naming']['snake_case'] += 1
                    else:
                        style['function_naming']['camelCase'] += 1

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        return style

    def _analyze_general_style(self) -> Dict:
        """分析通用代码风格"""
        style = {
            'indentation': 'unknown',
            'line_length': {'avg': 0, 'max': 0},
            'comment_ratio': 0,
            'blank_lines_ratio': 0,
        }

        total_lines = 0
        total_code_lines = 0
        total_comment_lines = 0
        total_blank_lines = 0
        max_line_length = 0
        total_line_length = 0

        for file_path in self._find_files(list(self.supported_extensions)):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                for line in lines:
                    total_lines += 1
                    line_length = len(line.rstrip())

                    if line_length > max_line_length:
                        max_line_length = line_length

                    total_line_length += line_length

                    # 判断行类型
                    stripped = line.strip()
                    if not stripped:
                        total_blank_lines += 1
                    elif stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('/*'):
                        total_comment_lines += 1
                    else:
                        total_code_lines += 1

                    # 检测缩进
                    if stripped and line.startswith(' '):
                        indent_size = len(line) - len(line.lstrip())
                        if indent_size == 2:
                            style['indentation'] = '2_spaces'
                        elif indent_size == 4:
                            style['indentation'] = '4_spaces'
                        elif indent_size == 8:
                            style['indentation'] = 'tabs'

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        if total_lines > 0:
            style['line_length']['avg'] = total_line_length // total_lines
            style['line_length']['max'] = max_line_length
            style['comment_ratio'] = total_comment_lines / total_lines
            style['blank_lines_ratio'] = total_blank_lines / total_lines

        return style

    def _analyze_naming_conventions(self) -> Dict:
        """分析命名约定"""
        conventions = {
            'variables': {'camelCase': 0, 'snake_case': 0, 'PascalCase': 0},
            'functions': {'camelCase': 0, 'snake_case': 0},
            'classes': {'PascalCase': 0, 'snake_case': 0},
            'constants': {'UPPER_CASE': 0, 'camelCase': 0},
        }

        for file_path in self._find_files(list(self.supported_extensions)):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 分析变量命名
                var_names = re.findall(r'(?:let|const|var)\s+(\w+)', content)
                for name in var_names:
                    if re.match(r'^[a-z][a-zA-Z0-9]*$', name):
                        conventions['variables']['camelCase'] += 1
                    elif re.match(r'^[a-z][a-z0-9_]*$', name):
                        conventions['variables']['snake_case'] += 1
                    elif re.match(r'^[A-Z][a-zA-Z0-9]*$', name):
                        conventions['variables']['PascalCase'] += 1

                # 分析函数命名
                func_names = re.findall(r'(?:function|def)\s+(\w+)', content)
                for name in func_names:
                    if re.match(r'^[a-z][a-zA-Z0-9]*$', name):
                        conventions['functions']['camelCase'] += 1
                    elif re.match(r'^[a-z][a-z0-9_]*$', name):
                        conventions['functions']['snake_case'] += 1

                # 分析类命名
                class_names = re.findall(r'class\s+(\w+)', content)
                for name in class_names:
                    if re.match(r'^[A-Z][a-zA-Z0-9]*$', name):
                        conventions['classes']['PascalCase'] += 1
                    else:
                        conventions['classes']['snake_case'] += 1

                # 分析常量命名
                const_names = re.findall(r'(?:const|final)\s+([A-Z_]+)', content)
                for name in const_names:
                    if re.match(r'^[A-Z_]+$', name):
                        conventions['constants']['UPPER_CASE'] += 1
                    else:
                        conventions['constants']['camelCase'] += 1

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        return conventions

    def _analyze_formatting(self) -> Dict:
        """分析格式化偏好"""
        formatting = {
            'trailing_commas': 0,
            'trailing_whitespace': 0,
            'empty_lines_between_functions': 0,
            'brackets_style': 'unknown',
        }

        for file_path in self._find_files(list(self.supported_extensions)):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                for i, line in enumerate(lines):
                    # 检测尾随逗号
                    if re.search(r',\s*$', line):
                        formatting['trailing_commas'] += 1

                    # 检测尾随空格
                    if line.rstrip() != line.rstrip('\n'):
                        formatting['trailing_whitespace'] += 1

                    # 检测函数间的空行
                    if i > 0 and re.match(r'^(def|function|class)\s+', line):
                        if lines[i-1].strip() == '':
                            formatting['empty_lines_between_functions'] += 1

                    # 检测括号风格
                    if re.search(r'\{\s*\n', line):
                        formatting['brackets_style'] = 'new_line'
                    elif re.search(r'\{.*\}', line):
                        formatting['brackets_style'] = 'same_line'

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        return formatting

    def _find_files(self, extensions: List[str]) -> List[Path]:
        """
        查找指定扩展名的文件

        Args:
            extensions: 文件扩展名列表

        Returns:
            文件路径列表
        """
        files = []
        try:
            for ext in extensions:
                files.extend(self.project_path.rglob(f'*{ext}'))
        except Exception as e:
            logger.error(f"查找文件失败: {e}")

        return files

    def get_style_summary(self) -> str:
        """
        获取代码风格摘要

        Returns:
            代码风格摘要字符串
        """
        style = self.analyze_project_style()

        summary = []

        # TypeScript 风格
        if style['typescript']['interface_vs_type']['interface'] > 0 or style['typescript']['interface_vs_type']['type'] > 0:
            total = style['typescript']['interface_vs_type']['interface'] + style['typescript']['interface_vs_type']['type']
            interface_ratio = style['typescript']['interface_vs_type']['interface'] / total if total > 0 else 0
            summary.append(f"TypeScript: 偏向使用 {'interface' if interface_ratio > 0.5 else 'type'}")

        # 引号风格
        if style['typescript']['quote_style']['single'] > 0 or style['typescript']['quote_style']['double'] > 0:
            total = style['typescript']['quote_style']['single'] + style['typescript']['quote_style']['double']
            single_ratio = style['typescript']['quote_style']['single'] / total if total > 0 else 0
            summary.append(f"引号: 偏向使用 {'单引号' if single_ratio > 0.5 else '双引号'}")

        # 缩进
        if style['general']['indentation'] != 'unknown':
            indent_map = {
                '2_spaces': '2空格',
                '4_spaces': '4空格',
                'tabs': '制表符'
            }
            summary.append(f"缩进: {indent_map.get(style['general']['indentation'], style['general']['indentation'])}")

        # 命名约定
        if style['naming']['functions']['camelCase'] > 0 or style['naming']['functions']['snake_case'] > 0:
            total = style['naming']['functions']['camelCase'] + style['naming']['functions']['snake_case']
            camel_ratio = style['naming']['functions']['camelCase'] / total if total > 0 else 0
            summary.append(f"函数命名: 偏向使用 {'camelCase' if camel_ratio > 0.5 else 'snake_case'}")

        return '\n'.join(summary) if summary else '未检测到明显的代码风格'


# 创建全局实例
_style_analyzer_cache = {}


def get_code_style_analyzer(project_path: str) -> CodeStyleAnalyzer:
    """
    获取代码风格分析器实例（带缓存）

    Args:
        project_path: 项目路径

    Returns:
        CodeStyleAnalyzer 实例
    """
    if project_path not in _style_analyzer_cache:
        _style_analyzer_cache[project_path] = CodeStyleAnalyzer(project_path)
    return _style_analyzer_cache[project_path]
