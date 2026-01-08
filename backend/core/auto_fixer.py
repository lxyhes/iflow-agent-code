"""
Auto Fixer - 自动错误修复循环
"""

import asyncio
import logging
from typing import Dict, List, Optional, Callable
from pathlib import Path
import re
from datetime import datetime

from .error_analyzer import get_error_analyzer
from .agent import Agent
from .shell_service import ShellSession
from .file_service import file_service

logger = logging.getLogger(__name__)


class AutoFixer:
    """自动修复器 - 检测错误并自动修复"""

    def __init__(self, project_path: str, agent: Agent = None, max_attempts: int = 3):
        """
        初始化自动修复器

        Args:
            project_path: 项目路径
            agent: AI Agent 实例（用于生成修复方案）
            max_attempts: 最大修复尝试次数
        """
        self.project_path = Path(project_path)
        self.agent = agent
        self.max_attempts = max_attempts
        self.error_analyzer = get_error_analyzer(str(project_path))
        self.fix_history: List[Dict] = []
        self.is_running = False

    async def detect_and_fix(self, error_output: str, context: Dict = None) -> Dict:
        """
        检测错误并尝试自动修复

        Args:
            error_output: 错误输出
            context: 上下文信息（如运行命令、文件等）

        Returns:
            修复结果字典
        """
        logger.info(f"检测到错误，开始自动修复流程...")

        # 1. 分析错误
        analysis = self.error_analyzer.analyze_error(error_output, str(self.project_path))

        result = {
            'error_detected': True,
            'error_type': analysis['error_type'],
            'error_message': analysis['error_info'].get('message', ''),
            'fix_attempted': False,
            'fix_successful': False,
            'fix_details': None,
            'timestamp': datetime.now().isoformat()
        }

        if not analysis['error_type']:
            logger.warning("无法识别错误类型")
            result['error_detected'] = True
            result['error_type'] = 'unknown'
            return result

        logger.info(f"错误类型: {analysis['error_type']}")

        # 2. 尝试自动修复
        fix_result = await self._attempt_fix(analysis, context)

        result['fix_attempted'] = fix_result['attempted']
        result['fix_successful'] = fix_result['successful']
        result['fix_details'] = fix_result.get('details')

        # 3. 记录修复历史
        self.fix_history.append(result)

        return result

    async def _attempt_fix(self, analysis: Dict, context: Dict = None) -> Dict:
        """
        尝试修复错误

        Args:
            analysis: 错误分析结果
            context: 上下文信息

        Returns:
            修复结果
        """
        error_type = analysis['error_type']
        error_info = analysis['error_info']

        logger.info(f"尝试修复错误类型: {error_type}")

        # 根据错误类型选择修复策略
        if error_type in ['module_not_found', 'import_error']:
            return await self._fix_missing_module(analysis, context)
        elif error_type in ['syntax_error', 'name_error', 'attribute_error']:
            return await self._fix_code_error(analysis, context)
        elif error_type in ['file_not_found', 'permission_denied']:
            return await self._fix_file_error(analysis, context)
        else:
            # 使用 AI 生成修复方案
            return await self._fix_with_ai(analysis, context)

    async def _fix_missing_module(self, analysis: Dict, context: Dict = None) -> Dict:
        """
        修复缺少的模块

        Args:
            analysis: 错误分析结果
            context: 上下文信息

        Returns:
            修复结果
        """
        error_output = analysis.get('error_info', {}).get('message', '')
        match = re.search(r"No module named '([^']+)'|ModuleNotFoundError: ([^\s]+)", error_output)

        if not match:
            return {
                'attempted': False,
                'successful': False,
                'error': '无法提取模块名'
            }

        module_name = match.group(1) or match.group(2)
        logger.info(f"安装缺少的模块: {module_name}")

        try:
            # 尝试安装模块
            import subprocess
            result = subprocess.run(
                ["pip", "install", module_name],
                cwd=str(self.project_path),
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                logger.info(f"成功安装模块: {module_name}")
                return {
                    'attempted': True,
                    'successful': True,
                    'details': {
                        'action': 'install_module',
                        'module': module_name,
                        'output': result.stdout
                    }
                }
            else:
                logger.error(f"安装模块失败: {result.stderr}")
                return {
                    'attempted': True,
                    'successful': False,
                    'error': result.stderr
                }

        except Exception as e:
            logger.error(f"安装模块时出错: {e}")
            return {
                'attempted': True,
                'successful': False,
                'error': str(e)
            }

    async def _fix_code_error(self, analysis: Dict, context: Dict = None) -> Dict:
        """
        修复代码错误（使用 AI）

        Args:
            analysis: 错误分析结果
            context: 上下文信息

        Returns:
            修复结果
        """
        if not self.agent:
            return {
                'attempted': False,
                'successful': False,
                'error': '没有可用的 AI Agent'
            }

        error_info = analysis['error_info']
        file_path = error_info.get('file')
        line_number = error_info.get('line')

        if not file_path or not line_number:
            return {
                'attempted': False,
                'successful': False,
                'error': '缺少文件或行号信息'
            }

        logger.info(f"使用 AI 修复代码错误: {file_path}:{line_number}")

        try:
            # 读取错误代码上下文
            context_code = self.error_analyzer.get_error_context(
                file_path,
                line_number,
                context_lines=5
            )

            # 构造 AI 提示
            prompt = f"""我遇到了一个代码错误，请帮我修复。

错误信息:
{analysis['error_info'].get('message', '')}

错误类型: {analysis['error_type']}

文件: {file_path}
行号: {line_number}

代码上下文:
```
{context_code}
```

请提供修复后的代码（只提供第 {line_number} 行的修复版本，不要解释）。
"""

            # 让 AI 生成修复方案
            response = await self.agent.chat(prompt)

            # 提取修复后的代码
            fixed_code = self._extract_fixed_code(response)

            if fixed_code:
                # 应用修复
                await self._apply_code_fix(file_path, line_number, fixed_code)

                return {
                    'attempted': True,
                    'successful': True,
                    'details': {
                        'action': 'fix_code',
                        'file': file_path,
                        'line': line_number,
                        'original_code': context_code,
                        'fixed_code': fixed_code
                    }
                }
            else:
                return {
                    'attempted': True,
                    'successful': False,
                    'error': 'AI 无法生成有效的修复代码'
                }

        except Exception as e:
            logger.error(f"AI 修复代码时出错: {e}")
            return {
                'attempted': True,
                'successful': False,
                'error': str(e)
            }

    async def _fix_file_error(self, analysis: Dict, context: Dict = None) -> Dict:
        """
        修复文件错误

        Args:
            analysis: 错误分析结果
            context: 上下文信息

        Returns:
            修复结果
        """
        error_type = analysis['error_type']
        error_info = analysis['error_info']

        if error_type == 'file_not_found':
            file_path = error_info.get('file')
            if file_path:
                logger.info(f"创建缺失的文件: {file_path}")
                try:
                    full_path = self.project_path / file_path
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    full_path.touch()

                    return {
                        'attempted': True,
                        'successful': True,
                        'details': {
                            'action': 'create_file',
                            'file': file_path
                        }
                    }
                except Exception as e:
                    return {
                        'attempted': True,
                        'successful': False,
                        'error': str(e)
                    }

        elif error_type == 'permission_denied':
            # 权限错误无法自动修复
            return {
                'attempted': False,
                'successful': False,
                'error': '权限错误需要手动处理'
            }

        return {
            'attempted': False,
            'successful': False,
            'error': '无法自动修复此文件错误'
        }

    async def _fix_with_ai(self, analysis: Dict, context: Dict = None) -> Dict:
        """
        使用 AI 生成修复方案

        Args:
            analysis: 错误分析结果
            context: 上下文信息

        Returns:
            修复结果
        """
        if not self.agent:
            return {
                'attempted': False,
                'successful': False,
                'error': '没有可用的 AI Agent'
            }

        logger.info("使用 AI 生成修复方案")

        try:
            # 构造 AI 提示
            error_message = analysis['error_info'].get('message', '')
            error_type = analysis['error_type'] or 'unknown'

            prompt = f"""我遇到了一个错误，请帮我分析和提供修复建议。

错误类型: {error_type}
错误信息: {error_message}

请提供：
1. 错误原因分析
2. 修复步骤
3. 如果需要修改代码，请提供修复后的代码

请用中文回答，简洁明了。
"""

            response = await self.agent.chat(prompt)

            return {
                'attempted': True,
                'successful': True,
                'details': {
                    'action': 'ai_suggestion',
                    'suggestion': response
                }
            }

        except Exception as e:
            logger.error(f"AI 生成修复方案时出错: {e}")
            return {
                'attempted': True,
                'successful': False,
                'error': str(e)
            }

    def _extract_fixed_code(self, response: str) -> Optional[str]:
        """
        从 AI 响应中提取修复后的代码

        Args:
            response: AI 响应

        Returns:
            修复后的代码，如果无法提取则返回 None
        """
        # 尝试提取代码块
        code_match = re.search(r'```(?:python|javascript|typescript|jsx|tsx)?\n(.*?)\n```', response, re.DOTALL)
        if code_match:
            return code_match.group(1).strip()

        # 如果没有代码块，尝试提取单行代码
        lines = response.strip().split('\n')
        for line in lines:
            if line.strip() and not line.startswith('#') and not line.startswith('//'):
                return line.strip()

        return None

    async def _apply_code_fix(self, file_path: str, line_number: int, fixed_code: str):
        """
        应用代码修复

        Args:
            file_path: 文件路径
            line_number: 行号
            fixed_code: 修复后的代码
        """
        try:
            full_path = self.project_path / file_path

            # 读取文件
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            # 替换指定行
            if 0 < line_number <= len(lines):
                lines[line_number - 1] = fixed_code + '\n'

                # 写回文件
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)

                logger.info(f"成功应用修复到 {file_path}:{line_number}")
            else:
                logger.error(f"行号 {line_number} 超出文件范围")

        except Exception as e:
            logger.error(f"应用代码修复时出错: {e}")
            raise

    def get_fix_history(self) -> List[Dict]:
        """
        获取修复历史

        Returns:
            修复历史列表
        """
        return self.fix_history

    def clear_history(self):
        """清空修复历史"""
        self.fix_history.clear()


# 创建全局实例
_auto_fixer_cache = {}


def get_auto_fixer(project_path: str, agent: Agent = None) -> AutoFixer:
    """
    获取自动修复器实例（带缓存）

    Args:
        project_path: 项目路径
        agent: AI Agent 实例

    Returns:
        AutoFixer 实例
    """
    if project_path not in _auto_fixer_cache:
        _auto_fixer_cache[project_path] = AutoFixer(project_path, agent)
    else:
        # 更新 agent
        if agent:
            _auto_fixer_cache[project_path].agent = agent
    return _auto_fixer_cache[project_path]