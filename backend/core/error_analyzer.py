"""
Error Analyzer - 自动错误分析和修复建议
"""

import re
import os
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ErrorAnalyzer:
    """错误分析器 - 分析错误栈并提供修复建议"""

    # 常见错误模式
    ERROR_PATTERNS = {
        'undefined_is_not_a_function': r"TypeError:\s*(undefined|null)\s+is\s+not\s+a\s+function",
        'cannot_read_property': r"TypeError:\s*Cannot\s+read\s+property\s+'(\w+)'",
        'module_not_found': r"ModuleNotFoundError:\s*No\s+module\s+named\s+'([^']+)'",
        'import_error': r"ImportError:\s*(.+)",
        'syntax_error': r"SyntaxError:\s*(.+)",
        'name_error': r"NameError:\s*name\s+'(\w+)'",
        'attribute_error': r"AttributeError:\s*'(\w+)'",
        'key_error': r"KeyError:\s*'([^']+)'",
        'index_error': r"IndexError:\s*(.+)",
        'value_error': r"ValueError:\s*(.+)",
        'permission_denied': r"PermissionError:\s*\[Errno\s+13\]",
        'file_not_found': r"FileNotFoundError:\s*\[Errno\s+2\]",
        'connection_refused': r"ConnectionRefusedError:\s*\[Errno\s+111\]",
        'timeout_error': r"TimeoutError",
    }

    # 错误修复建议模板
    FIX_TEMPLATES = {
        'undefined_is_not_a_function': {
            'description': '尝试调用未定义的函数',
            'fix': '检查变量是否已正确初始化，或函数是否已定义。在使用前添加空值检查：\n```javascript\nif (variable && typeof variable.functionName === "function") {{\n  variable.functionName();\n}}\n```',
            'severity': 'high'
        },
        'cannot_read_property': {
            'description': '尝试读取未定义对象的属性',
            'fix': '添加可选链操作符或空值检查：\n```javascript\n// 使用可选链\nconst value = object?.property;\n\n// 或添加检查\nif (object && object.property) {{\n  console.log(object.property);\n}}\n```',
            'severity': 'high'
        },
        'module_not_found': {
            'description': 'Python 模块未找到',
            'fix': '安装缺少的模块：\n```bash\npip install {module_name}\n```\n或检查导入路径是否正确。',
            'severity': 'medium'
        },
        'import_error': {
            'description': '导入错误',
            'fix': '检查模块是否已安装，或导入路径是否正确。可能需要：\n```bash\npip install {module}\n```',
            'severity': 'medium'
        },
        'syntax_error': {
            'description': '语法错误',
            'fix': '检查代码语法，常见问题：\n1. 缺少冒号、括号或引号\n2. 缩进不正确\n3. 拼写错误\n\n请检查第 {line} 行附近的代码。',
            'severity': 'high'
        },
        'name_error': {
            'description': '变量未定义',
            'fix': '变量 `{variable}` 未定义。请检查：\n1. 变量名拼写是否正确\n2. 变量是否在使用前已定义\n3. 作用域是否正确',
            'severity': 'high'
        },
        'attribute_error': {
            'description': '对象没有该属性',
            'fix': '对象 `{object}` 没有属性 `{attr}`。请检查：\n1. 对象类型是否正确\n2. 属性名拼写是否正确\n3. 属性是否已定义',
            'severity': 'high'
        },
        'key_error': {
            'description': '字典键不存在',
            'fix': '字典键 `{key}` 不存在。建议：\n```python\n# 使用 get 方法避免错误\nvalue = my_dict.get("{key}", default_value)\n\n# 或检查键是否存在\nif "{key}" in my_dict:\n    value = my_dict["{key}"]\n```',
            'severity': 'medium'
        },
        'index_error': {
            'description': '列表索引越界',
            'fix': '列表索引超出范围。建议：\n```python\n# 检查索引范围\nif 0 <= index < len(my_list):\n    value = my_list[index]\n\n# 或使用 try-except\ntry:\n    value = my_list[index]\nexcept IndexError:\n    value = default_value\n```',
            'severity': 'medium'
        },
        'permission_denied': {
            'description': '权限被拒绝',
            'fix': '没有文件或目录的访问权限。建议：\n1. 检查文件权限\n2. 使用管理员权限运行\n3. 检查文件是否被其他程序占用',
            'severity': 'high'
        },
        'file_not_found': {
            'description': '文件未找到',
            'fix': '文件不存在。建议：\n1. 检查文件路径是否正确\n2. 检查文件是否已创建\n3. 使用绝对路径而非相对路径',
            'severity': 'high'
        },
        'connection_refused': {
            'description': '连接被拒绝',
            'fix': '无法连接到服务。建议：\n1. 检查服务是否正在运行\n2. 检查端口是否正确\n3. 检查防火墙设置',
            'severity': 'high'
        },
        'timeout_error': {
            'description': '操作超时',
            'fix': '操作超时。建议：\n1. 增加超时时间\n2. 检查网络连接\n3. 优化代码性能',
            'severity': 'medium'
        },
    }

    def __init__(self, project_path: str):
        """
        初始化错误分析器

        Args:
            project_path: 项目根目录路径
        """
        self.project_path = Path(project_path)

    def parse_error_output(self, error_output: str) -> Dict:
        """
        解析错误输出，提取关键信息

        Args:
            error_output: 错误输出文本

        Returns:
            包含错误信息的字典
        """
        error_info = {
            'type': None,
            'message': '',
            'file': None,
            'line': None,
            'column': None,
            'stack_trace': []
        }

        lines = error_output.strip().split('\n')

        # 提取错误类型和消息
        for line in lines:
            if any(pattern in line for pattern in ['Error:', 'Exception:', 'Traceback']):
                error_info['message'] = line.strip()
                break

        # 提取文件路径和行号
        for line in lines:
            # 匹配常见的错误行格式
            file_match = re.search(r'File\s+"([^"]+)",\s*line\s*(\d+)', line)
            if file_match:
                error_info['file'] = file_match.group(1)
                error_info['line'] = int(file_match.group(2))
                break

        # 提取栈跟踪
        in_traceback = False
        for line in lines:
            if 'Traceback' in line or 'at' in line:
                in_traceback = True
            if in_traceback:
                error_info['stack_trace'].append(line.strip())

        return error_info

    def identify_error_type(self, error_output: str) -> Optional[str]:
        """
        识别错误类型

        Args:
            error_output: 错误输出文本

        Returns:
            错误类型键名，如果无法识别则返回 None
        """
        for error_type, pattern in self.ERROR_PATTERNS.items():
            if re.search(pattern, error_output, re.IGNORECASE):
                return error_type
        return None

    def analyze_error(self, error_output: str, project_path: str = None) -> Dict:
        """
        分析错误并提供修复建议

        Args:
            error_output: 错误输出文本
            project_path: 项目路径（可选）

        Returns:
            包含分析结果的字典
        """
        logger.info(f"分析错误: {error_output[:100]}...")

        # 解析错误信息
        error_info = self.parse_error_output(error_output)

        # 识别错误类型
        error_type = self.identify_error_type(error_output)

        result = {
            'error_info': error_info,
            'error_type': error_type,
            'suggested_fix': None,
            'severity': 'medium',
            'can_auto_fix': False,
            'fix_code': None
        }

        if error_type and error_type in self.FIX_TEMPLATES:
            template = self.FIX_TEMPLATES[error_type]
            result['suggested_fix'] = template['description']
            result['severity'] = template['severity']

            # 格式化修复建议
            fix_code = template['fix']

            # 替换占位符
            if error_info['file']:
                fix_code = fix_code.replace('{file}', error_info['file'])
            if error_info['line']:
                fix_code = fix_code.replace('{line}', str(error_info['line']))

            # 从错误消息中提取变量名等
            if error_type == 'cannot_read_property':
                match = re.search(self.ERROR_PATTERNS[error_type], error_output)
                if match:
                    fix_code = fix_code.replace('{property}', match.group(1))

            if error_type == 'name_error':
                match = re.search(self.ERROR_PATTERNS[error_type], error_output)
                if match:
                    fix_code = fix_code.replace('{variable}', match.group(1))

            if error_type == 'attribute_error':
                match = re.search(self.ERROR_PATTERNS[error_type], error_output)
                if match:
                    fix_code = fix_code.replace('{attr}', match.group(1))

            if error_type == 'key_error':
                match = re.search(self.ERROR_PATTERNS[error_type], error_output)
                if match:
                    fix_code = fix_code.replace('{key}', match.group(1))

            result['fix_code'] = fix_code

            # 判断是否可以自动修复
            result['can_auto_fix'] = self._can_auto_fix(error_type, error_info)

        return result

    def _can_auto_fix(self, error_type: str, error_info: Dict) -> bool:
        """
        判断是否可以自动修复

        Args:
            error_type: 错误类型
            error_info: 错误信息

        Returns:
            是否可以自动修复
        """
        # 目前只对简单的错误提供自动修复建议
        auto_fixable_types = [
            'module_not_found',
            'import_error',
        ]

        return error_type in auto_fixable_types

    def get_error_context(self, file_path: str, line_number: int, context_lines: int = 3) -> str:
        """
        获取错误代码上下文

        Args:
            file_path: 文件路径
            line_number: 行号
            context_lines: 上下文行数

        Returns:
            代码上下文字符串
        """
        try:
            full_path = self.project_path / file_path if not os.path.isabs(file_path) else Path(file_path)

            if not full_path.exists():
                return f"文件不存在: {file_path}"

            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            start_line = max(0, line_number - context_lines - 1)
            end_line = min(len(lines), line_number + context_lines)

            context = []
            for i in range(start_line, end_line):
                prefix = ">>> " if i == line_number - 1 else "    "
                context.append(f"{prefix}{i + 1:4d}: {lines[i].rstrip()}")

            return '\n'.join(context)

        except Exception as e:
            logger.error(f"读取文件上下文失败: {e}")
            return f"无法读取文件上下文: {str(e)}"

    def generate_auto_fix(self, error_output: str, project_path: str = None) -> Optional[Dict]:
        """
        生成自动修复方案

        Args:
            error_output: 错误输出
            project_path: 项目路径

        Returns:
            修复方案字典，如果无法自动修复则返回 None
        """
        analysis = self.analyze_error(error_output, project_path)

        if not analysis['can_auto_fix']:
            return None

        fix_plan = {
            'type': analysis['error_type'],
            'description': analysis['suggested_fix'],
            'steps': [],
            'commands': []
        }

        # 根据错误类型生成修复步骤
        if analysis['error_type'] == 'module_not_found':
            match = re.search(self.ERROR_PATTERNS['module_not_found'], error_output)
            if match:
                module_name = match.group(1)
                fix_plan['steps'] = [
                    f"安装缺少的模块: {module_name}",
                    "运行以下命令:",
                ]
                fix_plan['commands'] = [
                    f"pip install {module_name}"
                ]

        elif analysis['error_type'] == 'import_error':
            match = re.search(self.ERROR_PATTERNS['import_error'], error_output)
            if match:
                module = match.group(1)
                fix_plan['steps'] = [
                    f"解决导入错误: {module}",
                    "尝试安装缺少的依赖:",
                ]
                # 尝试从导入语句中提取模块名
                module_name = module.split()[0] if ' ' in module else module
                fix_plan['commands'] = [
                    f"pip install {module_name}"
                ]

        return fix_plan if fix_plan['steps'] else None


# 创建全局实例
_error_analyzer_cache = {}


def get_error_analyzer(project_path: str) -> ErrorAnalyzer:
    """
    获取错误分析器实例（带缓存）

    Args:
        project_path: 项目路径

    Returns:
        ErrorAnalyzer 实例
    """
    if project_path not in _error_analyzer_cache:
        _error_analyzer_cache[project_path] = ErrorAnalyzer(project_path)
    return _error_analyzer_cache[project_path]