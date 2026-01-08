import re
import os
from typing import Optional, Tuple
from backend.core.exceptions import SecurityError, ValidationError

DANGEROUS_PATTERNS = [
    r'rm\s+-rf',
    r'>\s*/dev/null',
    r';\s*rm',
    r'&&\s*rm',
    r'\|\|\s*rm',
    r'\$_\(\s*',
    r'`[^`]+`',
    r'\$(?!\w+\s*\()',
    r'\$\{[^}]+\}',
    r'eval\s*\(',
    r'exec\s*\(',
    r'chmod\s+777',
    r'chmod\s+-R\s+777',
    r'wget\s+',
    r'curl\s+.*\|\s*sh',
    r'nc\s+-',
    r'ncat\s+',
    r'telnet\s+',
    r'ss\s+',
    r'lsof\s+',
    r'cat\s+/etc/passwd',
    r'cat\s+/etc/shadow',
    r'\.\./',
    r'\x00',
]

ALLOWED_COMMANDS = [
    'ls', 'cat', 'grep', 'find', 'cd', 'pwd', 'git', 'echo', 'head', 'tail',
    'wc', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'chmod', 'chown', 'diff',
    'sed', 'awk', 'sort', 'uniq', 'tr', 'cut', 'paste', 'date', 'whoami',
    'ps', 'kill', 'jobs', 'fg', 'bg', 'export', 'source', 'alias', 'unalias',
    'env', 'set', 'unset', 'history', 'exit', 'clear', 'less', 'more', 'nl',
    'tree', 'du', 'df', 'top', 'free', 'arch', 'uname', 'hostname', 'id'
]

INPUT_MAX_LENGTH = 10000

MAX_DEPTH = 10

COMMAND_PATTERN = re.compile(r'^[\w\s\-_./,=:+@%]+$')
FILE_PATH_PATTERN = re.compile(r'^[\w\s\-_./\\,:@%]+$')


class SecurityManager:
    @staticmethod
    def validate_input(user_input: str, field: str = "input") -> Tuple[bool, str]:
        if not user_input:
            return True, ""

        if len(user_input) > INPUT_MAX_LENGTH:
            raise ValidationError(
                message=f"输入长度超过限制，最大允许 {INPUT_MAX_LENGTH} 个字符",
                field=field,
                details={"input_length": len(user_input), "max_length": INPUT_MAX_LENGTH}
            )

        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                threat_type = "dangerous_pattern"
                raise SecurityError(
                    message="检测到危险内容，请检查输入",
                    threat_type=threat_type,
                    details={"matched_pattern": pattern, "field": field}
                )

        return True, ""

    @staticmethod
    def validate_command(command: str) -> Tuple[bool, str]:
        if not command:
            return True, ""

        parts = command.strip().split()
        if not parts:
            return True, ""

        base_command = parts[0]

        if base_command not in ALLOWED_COMMANDS:
            raise SecurityError(
                message=f"命令 '{base_command}' 不在允许列表中",
                threat_type="unauthorized_command",
                details={"command": base_command, "allowed_commands": ALLOWED_COMMANDS}
            )

        for i, part in enumerate(parts[1:], 1):
            if part.startswith('-') and len(part) > 1:
                continue
            if re.search(r'[;&|]', part):
                raise SecurityError(
                    message="命令中包含不允许的分隔符",
                    threat_type="command_injection",
                    details={"part": part}
                )

        return True, ""

    @staticmethod
    def validate_file_path(path: str, base_dir: str = None) -> Tuple[bool, str]:
        if not path:
            return True, ""

        if not FILE_PATH_PATTERN.match(path):
            raise ValidationError(
                message="文件路径包含无效字符",
                field="file_path",
                details={"path": path}
            )

        if '..' in path.split('/'):
            raise SecurityError(
                message="检测到路径遍历尝试",
                threat_type="path_traversal",
                details={"path": path}
            )

        if '\x00' in path:
            raise SecurityError(
                message="检测到空字节注入",
                threat_type="null_byte_injection",
                details={"path": path}
            )

        if base_dir:
            resolved_path = os.path.realpath(os.path.join(base_dir, path))
            real_base_dir = os.path.realpath(base_dir)
            if not resolved_path.startswith(real_base_dir):
                raise SecurityError(
                    message="文件路径超出允许范围",
                    threat_type="path_traversal",
                    details={"path": path, "base_dir": base_dir}
                )

        return True, ""

    @staticmethod
    def sanitize_output(output: str) -> str:
        if not output:
            return ""

        output = output.replace('\x00', '')

        return output

    @staticmethod
    def check_rate_limit(key: str, limit: int = 100, window: int = 60) -> Tuple[bool, int]:
        pass

    @staticmethod
    def create_safe_environment() -> dict:
        safe_env = {
            'PATH': '/usr/bin:/bin:/usr/sbin:/sbin',
            'HOME': os.path.expanduser('~'),
            'LANG': 'C.UTF-8',
            'LC_ALL': 'C.UTF-8',
        }
        dangerous_vars = [
            'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES',
            'BASH_ENV', 'ENV', 'BASHOPTS', 'CDPATH', 'GLOBIGNORE',
            'BASH_CMDS', 'EXECIGNORE', 'FIGNORE', 'HOSTFILE', 'IGNOREEOF',
            'MAIL', 'MAILPATH', 'POSIXLY_CORRECT', 'TIMEFORMAT',
            'TMOUT', 'TMPDIR', 'LOGNAME', 'USER', 'USERNAME'
        ]
        for var in dangerous_vars:
            safe_env[var] = ''
        return safe_env


class InputSanitizer:
    WHITESPACE_PATTERN = re.compile(r'\s+')
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    URL_PATTERN = re.compile(r'^https?://[^\s]+$')

    @staticmethod
    def sanitize_text(text: str, max_length: int = None) -> str:
        if not text:
            return ""

        text = text.strip()

        if max_length and len(text) > max_length:
            text = text[:max_length]

        return text

    @staticmethod
    def sanitize_html(html: str) -> str:
        if not html:
            return ""

        replacements = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
        }
        for char, entity in replacements.items():
            html = html.replace(char, entity)
        return html

    @staticmethod
    def sanitize_markdown(md: str) -> str:
        if not md:
            return ""

        lines = md.split('\n')
        sanitized_lines = []
        for line in lines:
            if line.startswith('```'):
                continue
            if 'javascript:' in line.lower():
                line = line.lower().replace('javascript:', '')
            if line.strip().startswith('[') and '](' in line:
                link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
                for match in link_pattern.finditer(line):
                    url = match.group(2)
                    if not url.startswith(('http://', 'https://', 'mailto:', '#')):
                        line = line.replace(match.group(0), f'[{match.group(1)}]()')
            sanitized_lines.append(line)

        return '\n'.join(sanitized_lines)

    @staticmethod
    def sanitize_json(json_str: str) -> str:
        if not json_str:
            return ""

        import json as json_module
        try:
            data = json_module.loads(json_str)
            return json_module.dumps(data, ensure_ascii=False)
        except (json_module.JSONDecodeError, TypeError):
            return ""

    @staticmethod
    def extract_safe_urls(text: str) -> list:
        if not text:
            return []

        urls = []
        for match in re.finditer(r'https?://[^\s<>"]+', text):
            url = match.group(0)
            url = url.rstrip('.,;:!?')
            if not self.is_safe_url(url):
                continue
            urls.append(url)

        return urls

    @staticmethod
    def is_safe_url(url: str) -> bool:
        if not url.startswith(('http://', 'https://')):
            return False

        forbidden_domains = [
            'localhost', '127.0.0.1', '0.0.0.0',
            '169.254.169.254',
        ]
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if parsed.hostname in forbidden_domains:
                return False
            return True
        except Exception:
            return False


class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests = {}

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        import time
        now = time.time()

        if key not in self._requests:
            self._requests[key] = []

        self._requests[key] = [
            t for t in self._requests[key]
            if t > now - self.window_seconds
        ]

        if len(self._requests[key]) >= self.max_requests:
            wait_time = int(self._requests[key][0] - (now - self.window_seconds))
            return False, max(0, wait_time)

        self._requests[key].append(now)
        return True, 0

    def get_remaining(self, key: str) -> int:
        import time
        now = time.time()

        if key not in self._requests:
            return self.max_requests

        count = len([
            t for t in self._requests[key]
            if t > now - self.window_seconds
        ])
        return max(0, self.max_requests - count)

    def reset(self, key: str):
        if key in self._requests:
            del self._requests[key]


DEFAULT_RATE_LIMITER = RateLimiter(max_requests=100, window_seconds=60)
API_RATE_LIMITER = RateLimiter(max_requests=30, window_seconds=60)
CHAT_RATE_LIMITER = RateLimiter(max_requests=10, window_seconds=10)
