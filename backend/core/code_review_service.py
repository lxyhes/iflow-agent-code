"""
代码审查服务 - AI 代码审查助手
支持代码质量检查、风格检查、安全漏洞检测
"""

import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from enum import Enum

logger = logging.getLogger("CodeReviewService")


class IssueSeverity(Enum):
    """问题严重程度"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IssueCategory(Enum):
    """问题类别"""
    QUALITY = "quality"  # 代码质量
    STYLE = "style"  # 代码风格
    SECURITY = "security"  # 安全问题
    PERFORMANCE = "performance"  # 性能问题
    BEST_PRACTICE = "best_practice"  # 最佳实践


class CodeIssue:
    """代码问题"""
    
    def __init__(
        self,
        issue_id: str,
        severity: IssueSeverity,
        category: IssueCategory,
        title: str,
        description: str,
        line: int,
        column: int = 0,
        suggestion: str = None,
        code_snippet: str = None
    ):
        self.id = issue_id
        self.severity = severity
        self.category = category
        self.title = title
        self.description = description
        self.line = line
        self.column = column
        self.suggestion = suggestion
        self.code_snippet = code_snippet
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "severity": self.severity.value,
            "category": self.category.value,
            "title": self.title,
            "description": self.description,
            "line": self.line,
            "column": self.column,
            "suggestion": self.suggestion,
            "code_snippet": self.code_snippet
        }


class CodeReviewService:
    """代码审查服务"""
    
    def __init__(self):
        self.supported_languages = {
            '.py': self._review_python,
            '.js': self._review_javascript,
            '.jsx': self._review_javascript,
            '.ts': self._review_typescript,
            '.tsx': self._review_typescript,
            '.java': self._review_java,
            '.go': self._review_go,
        }
        
        # 常见安全问题模式
        self.security_patterns = {
            'sql_injection': [
                r'execute\s*\(\s*["\']\s*SELECT.*WHERE.*=.*\+.*',
                r'query\s*\(\s*["\']\s*SELECT.*WHERE.*\{.*\}',
                r'sprintf\s*\(\s*["\']\s*SELECT.*%s.*',
            ],
            'xss': [
                r'innerHTML\s*=.*\+',
                r'document\.write\s*\(',
                r'eval\s*\(',
            ],
            'hardcoded_secrets': [
                r'(?:password|api_key|secret|token)\s*=\s*["\'][^"\']{8,}["\']',
                r'(?:password|api_key|secret|token)\s*:\s*["\'][^"\']{8,}["\']',
            ],
            'command_injection': [
                r'os\.system\s*\(\s*\+',
                r'subprocess\.call\s*\(\s*\+',
                r'exec\s*\(\s*\+',
            ],
        }
    
    def review_code(
        self,
        file_path: str,
        content: str,
        check_types: List[str] = None
    ) -> Dict[str, Any]:
        """
        审查代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            check_types: 检查类型列表 ['quality', 'style', 'security', 'performance', 'complexity', 'duplication']
        
        Returns:
            审查结果
        """
        if check_types is None:
            check_types = ['quality', 'style', 'security', 'performance', 'complexity', 'duplication']
        
        ext = Path(file_path).suffix.lower()
        
        if ext not in self.supported_languages:
            return {
                "error": f"不支持的语言: {ext}",
                "issues": [],
                "summary": {}
            }
        
        try:
            issues = []
            
            # 执行各种检查
            if 'security' in check_types:
                security_issues = self._check_security(content, file_path)
                issues.extend(security_issues)
            
            if 'quality' in check_types:
                quality_issues = self._check_quality(content, file_path, ext)
                issues.extend(quality_issues)
            
            if 'style' in check_types:
                style_issues = self._check_style(content, file_path, ext)
                issues.extend(style_issues)
            
            if 'performance' in check_types:
                perf_issues = self._check_performance(content, file_path, ext)
                issues.extend(perf_issues)
            
            if 'complexity' in check_types:
                complexity_issues = self._check_complexity(content, file_path, ext)
                issues.extend(complexity_issues)
            
            if 'duplication' in check_types:
                duplication_issues = self._check_duplication(content, file_path, ext)
                issues.extend(duplication_issues)
            
            # 语言特定检查
            language_issues = self.supported_languages[ext](content, file_path)
            issues.extend(language_issues)
            
            # 生成摘要
            summary = self._generate_summary(issues)
            
            return {
                "success": True,
                "issues": [issue.to_dict() for issue in issues],
                "summary": summary,
                "total_issues": len(issues),
                "metrics": self._calculate_metrics(content, ext)
            }
        
        except Exception as e:
            logger.error(f"Error reviewing code for {file_path}: {e}")
            return {
                "error": str(e),
                "issues": [],
                "summary": {}
            }
    
    def review_pr(
        self,
        project_path: str,
        changed_files: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        审查 Pull Request
        
        Args:
            project_path: 项目路径
            changed_files: 变更文件列表 [{'path': str, 'content': str, 'status': 'added|modified|deleted'}]
        
        Returns:
            PR 审查结果
        """
        all_issues = []
        file_summaries = []
        
        for file_info in changed_files:
            file_path = file_info.get('path')
            content = file_info.get('content', '')
            status = file_info.get('status', 'modified')
            
            if status == 'deleted':
                continue
            
            try:
                result = self.review_code(file_path, content)
                
                if result.get('issues'):
                    all_issues.extend(result['issues'])
                
                file_summaries.append({
                    "file": file_path,
                    "status": status,
                    "issues_count": len(result.get('issues', [])),
                    "summary": result.get('summary', {})
                })
            
            except Exception as e:
                logger.error(f"Error reviewing {file_path}: {e}")
        
        # 生成整体摘要
        overall_summary = self._generate_summary(all_issues)
        
        return {
            "success": True,
            "issues": all_issues,
            "summary": overall_summary,
            "file_summaries": file_summaries,
            "total_files": len(file_summaries),
            "total_issues": len(all_issues)
        }
    
    def _check_security(self, content: str, file_path: str) -> List[CodeIssue]:
        """检查安全问题"""
        issues = []
        lines = content.split('\n')
        
        for vuln_type, patterns in self.security_patterns.items():
            for pattern in patterns:
                for line_num, line in enumerate(lines, 1):
                    if re.search(pattern, line, re.IGNORECASE):
                        issue = CodeIssue(
                            issue_id=f"security_{vuln_type}_{line_num}",
                            severity=IssueSeverity.HIGH,
                            category=IssueCategory.SECURITY,
                            title=f"潜在的安全漏洞: {vuln_type}",
                            description=f"检测到可能的 {vuln_type} 漏洞",
                            line=line_num,
                            suggestion=self._get_security_suggestion(vuln_type),
                            code_snippet=line.strip()
                        )
                        issues.append(issue)
        
        return issues
    
    def _check_quality(self, content: str, file_path: str, ext: str) -> List[CodeIssue]:
        """检查代码质量"""
        issues = []
        lines = content.split('\n')
        
        # 检查过长的行
        max_line_length = 120
        for line_num, line in enumerate(lines, 1):
            if len(line) > max_line_length:
                issue = CodeIssue(
                    issue_id=f"quality_long_line_{line_num}",
                    severity=IssueSeverity.LOW,
                    category=IssueCategory.QUALITY,
                    title="行过长",
                    description=f"第 {line_num} 行长度为 {len(line)}，超过建议的 {max_line_length} 字符",
                    line=line_num,
                    suggestion="考虑将长行拆分为多行以提高可读性",
                    code_snippet=line.strip()
                )
                issues.append(issue)
        
        # 检查空函数
        empty_func_pattern = r'def\s+\w+\s*\([^)]*\)\s*:\s*$'
        for line_num, line in enumerate(lines, 1):
            if re.search(empty_func_pattern, line):
                issue = CodeIssue(
                    issue_id=f"quality_empty_function_{line_num}",
                    severity=IssueSeverity.MEDIUM,
                    category=IssueCategory.QUALITY,
                    title="空函数",
                    description="检测到空函数定义",
                    line=line_num,
                    suggestion="考虑添加函数实现或使用 pass/TODO 注释",
                    code_snippet=line.strip()
                )
                issues.append(issue)
        
        return issues
    
    def _check_style(self, content: str, file_path: str, ext: str) -> List[CodeIssue]:
        """检查代码风格"""
        issues = []
        lines = content.split('\n')
        
        # 检查尾随空格
        for line_num, line in enumerate(lines, 1):
            if line.endswith(' ') or line.endswith('\t'):
                issue = CodeIssue(
                    issue_id=f"style_trailing_whitespace_{line_num}",
                    severity=IssueSeverity.LOW,
                    category=IssueCategory.STYLE,
                    title="尾随空格",
                    description="检测到行尾有空格或制表符",
                    line=line_num,
                    suggestion="删除行尾的空白字符",
                    code_snippet=line.strip()
                )
                issues.append(issue)
        
        # 检查缺少文档字符串（Python）
        if ext == '.py':
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if not ast.get_docstring(node):
                        issue = CodeIssue(
                            issue_id=f"style_missing_docstring_{node.name}",
                            severity=IssueSeverity.MEDIUM,
                            category=IssueCategory.STYLE,
                            title="缺少文档字符串",
                            description=f"函数 {node.name} 缺少文档字符串",
                            line=node.lineno,
                            suggestion="为函数添加文档字符串以说明其用途、参数和返回值",
                            code_snippet=f"def {node.name}(...)"
                        )
                        issues.append(issue)
        
        return issues
    
    def _check_performance(self, content: str, file_path: str, ext: str) -> List[CodeIssue]:
        """检查性能问题"""
        issues = []
        
        # 检查循环中的数据库查询
        db_query_pattern = r'(?:query|execute|find|select|insert|update|delete)\s*\([^)]*\)'
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # 检查是否在循环中
            if re.search(r'\b(for|while)\s*\(', line):
                # 检查同一行或下一行是否有数据库查询
                if re.search(db_query_pattern, line, re.IGNORECASE):
                    issue = CodeIssue(
                        issue_id=f"performance_db_in_loop_{line_num}",
                        severity=IssueSeverity.HIGH,
                        category=IssueCategory.PERFORMANCE,
                        title="循环中的数据库查询",
                        description="检测到循环中可能包含数据库查询",
                        line=line_num,
                        suggestion="考虑使用批量查询或预加载来优化性能",
                        code_snippet=line.strip()
                    )
                    issues.append(issue)
        
        # 检查未使用的变量（Python）
        if ext == '.py':
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # 检查未使用的参数
                    args = node.args.args
                    for arg in args:
                        arg_name = arg.arg
                        if arg_name != 'self' and arg_name != 'cls':
                            # 检查是否在函数体中使用
                            used = False
                            for child in ast.walk(node):
                                if isinstance(child, ast.Name) and child.id == arg_name:
                                    used = True
                                    break
                            if not used:
                                issue = CodeIssue(
                                    issue_id=f"performance_unused_arg_{node.name}_{arg_name}",
                                    severity=IssueSeverity.LOW,
                                    category=IssueCategory.PERFORMANCE,
                                    title="未使用的参数",
                                    description=f"函数 {node.name} 的参数 {arg_name} 未被使用",
                                    line=node.lineno,
                                    suggestion="移除未使用的参数或使用下划线前缀 _arg_name",
                                    code_snippet=f"def {node.name}(...)"
                                )
                                issues.append(issue)
        
        # 检查不必要的重新渲染（React）
        if ext in ['.js', '.jsx', '.ts', '.tsx']:
            # 检查在 useEffect 中缺少依赖
            use_effect_pattern = r'useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{'
            for line_num, line in enumerate(lines, 1):
                if re.search(use_effect_pattern, line):
                    # 检查是否有依赖数组
                    if line_num < len(lines) - 5:
                        next_lines = ''.join(lines[line_num:min(line_num + 5, len(lines))])
                        if ']' not in next_lines or 'useEffect' not in next_lines:
                            issue = CodeIssue(
                                issue_id=f"performance_missing_deps_{line_num}",
                                severity=IssueSeverity.HIGH,
                                category=IssueCategory.PERFORMANCE,
                                title="useEffect 缺少依赖",
                                description="useEffect 缺少依赖数组，可能导致无限循环或不正确的行为",
                                line=line_num,
                                suggestion="添加正确的依赖数组到 useEffect",
                                code_snippet=line.strip()
                            )
                            issues.append(issue)
        
        # 检查大对象拷贝
        large_copy_pattern = r'(?:JSON\.parse\(\s*JSON\.stringify|Object\.assign|spread.*object)'
        for line_num, line in enumerate(lines, 1):
            if re.search(large_copy_pattern, line):
                issue = CodeIssue(
                    issue_id=f"performance_deep_copy_{line_num}",
                    severity=IssueSeverity.MEDIUM,
                    category=IssueCategory.PERFORMANCE,
                    title="深拷贝操作",
                    description="检测到可能的深拷贝操作，可能影响性能",
                    line=line_num,
                    suggestion="考虑使用浅拷贝或专门的深拷贝库",
                    code_snippet=line.strip()
                )
                issues.append(issue)
        
        return issues
    
    def _check_complexity(self, content: str, file_path: str, ext: str) -> List[CodeIssue]:
        """检查代码复杂度"""
        issues = []
        
        if ext == '.py':
            try:
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        # 计算圈复杂度
                        complexity = self._calculate_cyclomatic_complexity(node)
                        
                        if complexity > 10:
                            severity = IssueSeverity.HIGH if complexity > 20 else IssueSeverity.MEDIUM
                            issue = CodeIssue(
                                issue_id=f"complexity_high_{node.name}_{node.lineno}",
                                severity=severity,
                                category=IssueCategory.QUALITY,
                                title=f"函数复杂度过高 ({complexity})",
                                description=f"函数 {node.name} 的圈复杂度为 {complexity}，建议不超过 10",
                                line=node.lineno,
                                suggestion="考虑将函数拆分为更小的函数或使用策略模式",
                                code_snippet=f"def {node.name}(...)"
                            )
                            issues.append(issue)
                        
                        # 检查函数长度
                        func_lines = node.end_lineno - node.lineno if node.end_lineno else 0
                        if func_lines > 50:
                            issue = CodeIssue(
                                issue_id=f"complexity_long_function_{node.name}_{node.lineno}",
                                severity=IssueSeverity.MEDIUM,
                                category=IssueCategory.QUALITY,
                                title=f"函数过长 ({func_lines} 行)",
                                description=f"函数 {node.name} 有 {func_lines} 行，建议不超过 50 行",
                                line=node.lineno,
                                suggestion="考虑将函数拆分为更小的函数",
                                code_snippet=f"def {node.name}(...)"
                            )
                            issues.append(issue)
                        
                        # 检查参数数量
                        arg_count = len(node.args.args)
                        if arg_count > 5:
                            issue = CodeIssue(
                                issue_id=f"complexity_many_args_{node.name}_{node.lineno}",
                                severity=IssueSeverity.MEDIUM,
                                category=IssueCategory.QUALITY,
                                title=f"参数过多 ({arg_count} 个)",
                                description=f"函数 {node.name} 有 {arg_count} 个参数，建议不超过 5 个",
                                line=node.lineno,
                                suggestion="考虑使用参数对象或配置字典",
                                code_snippet=f"def {node.name}(...)"
                            )
                            issues.append(issue)
            
            except SyntaxError:
                pass
        
        return issues
    
    def _check_duplication(self, content: str, file_path: str, ext: str) -> List[CodeIssue]:
        """检查重复代码"""
        issues = []
        lines = content.split('\n')
        
        # 简单的行重复检测
        line_counts = {}
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if line and len(line) > 20:  # 忽略短行
                if line in line_counts:
                    line_counts[line].append(line_num)
                else:
                    line_counts[line] = [line_num]
        
        # 检查重复超过 3 次的行
        for line, line_nums in line_counts.items():
            if len(line_nums) > 3:
                issue = CodeIssue(
                    issue_id=f"duplication_repeated_line_{line_nums[0]}",
                    severity=IssueSeverity.LOW,
                    category=IssueCategory.QUALITY,
                    title=f"重复代码 (出现 {len(line_nums)} 次)",
                    description=f"检测到重复的代码行，出现在第 {', '.join(map(str, line_nums[:5]))} 行",
                    line=line_nums[0],
                    suggestion="考虑将重复的代码提取为函数或常量",
                    code_snippet=line[:50] + "..." if len(line) > 50 else line
                )
                issues.append(issue)
        
        return issues
    
    def _calculate_cyclomatic_complexity(self, node) -> int:
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
    
    def _calculate_metrics(self, content: str, ext: str) -> Dict[str, Any]:
        """计算代码指标"""
        lines = content.split('\n')
        
        metrics = {
            "total_lines": len(lines),
            "code_lines": 0,
            "comment_lines": 0,
            "blank_lines": 0,
            "avg_line_length": 0
        }
        
        total_length = 0
        for line in lines:
            stripped = line.strip()
            if not stripped:
                metrics["blank_lines"] += 1
            elif stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('/*'):
                metrics["comment_lines"] += 1
            else:
                metrics["code_lines"] += 1
            
            total_length += len(line)
        
        if lines:
            metrics["avg_line_length"] = total_length / len(lines)
        
        # 计算注释率
        if metrics["total_lines"] > 0:
            metrics["comment_ratio"] = metrics["comment_lines"] / metrics["total_lines"]
        else:
            metrics["comment_ratio"] = 0
        
        return metrics
    
    def _review_python(self, content: str, file_path: str) -> List[CodeIssue]:
        """Python 特定审查"""
        issues = []
        
        try:
            tree = ast.parse(content)
            
            # 检查异常处理
            for node in ast.walk(tree):
                if isinstance(node, ast.ExceptHandler):
                    if node.type is None:
                        issue = CodeIssue(
                            issue_id=f"python_bare_except_{node.lineno}",
                            severity=IssueSeverity.HIGH,
                            category=IssueCategory.BEST_PRACTICE,
                            title="裸 except 语句",
                            description="使用了裸 except 语句，可能捕获不应捕获的异常",
                            line=node.lineno,
                            suggestion="指定具体的异常类型，如 except ValueError:",
                            code_snippet="except:"
                        )
                        issues.append(issue)
        
        except SyntaxError:
            pass
        
        return issues
    
    def _review_javascript(self, content: str, file_path: str) -> List[CodeIssue]:
        """JavaScript 特定审查"""
        issues = []
        
        # 检查使用 var
        var_pattern = r'\bvar\s+\w+'
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if re.search(var_pattern, line):
                issue = CodeIssue(
                    issue_id=f"javascript_var_{line_num}",
                    severity=IssueSeverity.MEDIUM,
                    category=IssueCategory.BEST_PRACTICE,
                    title="使用 var",
                    description="建议使用 let 或 const 替代 var",
                    line=line_num,
                    suggestion="使用 let 或 const 来声明变量",
                    code_snippet=line.strip()
                )
                issues.append(issue)
        
        return issues
    
    def _review_typescript(self, content: str, file_path: str) -> List[CodeIssue]:
        """TypeScript 特定审查"""
        issues = []
        
        # TypeScript 和 JavaScript 类似，但需要检查类型
        return self._review_javascript(content, file_path)
    
    def _review_java(self, content: str, file_path: str) -> List[CodeIssue]:
        """Java 特定审查"""
        issues = []
        
        # 检查 System.out.println（生产代码中应使用日志）
        println_pattern = r'System\.out\.println'
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if re.search(println_pattern, line):
                issue = CodeIssue(
                    issue_id=f"java_system_out_{line_num}",
                    severity=IssueSeverity.MEDIUM,
                    category=IssueCategory.BEST_PRACTICE,
                    title="使用 System.out.println",
                    description="生产代码中应使用日志框架",
                    line=line_num,
                    suggestion="使用 Logger 或 SLF4J 进行日志记录",
                    code_snippet=line.strip()
                )
                issues.append(issue)
        
        return issues
    
    def _review_go(self, content: str, file_path: str) -> List[CodeIssue]:
        """Go 特定审查"""
        issues = []
        
        # 检查错误处理
        error_check_pattern = r'\w+\s*,\s*err\s*:=\s*\w+\('
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if re.search(error_check_pattern, line):
                # 检查下一行是否检查了错误
                if line_num < len(lines):
                    next_line = lines[line_num]
                    if 'err' not in next_line or 'if' not in next_line:
                        issue = CodeIssue(
                            issue_id=f"go_error_check_{line_num}",
                            severity=IssueSeverity.HIGH,
                            category=IssueCategory.BEST_PRACTICE,
                            title="缺少错误检查",
                            description="检测到可能未检查的错误",
                            line=line_num,
                            suggestion="检查返回的错误值",
                            code_snippet=line.strip()
                        )
                        issues.append(issue)
        
        return issues
    
    def _get_security_suggestion(self, vuln_type: str) -> str:
        """获取安全建议"""
        suggestions = {
            'sql_injection': "使用参数化查询或 ORM 来防止 SQL 注入",
            'xss': "对用户输入进行适当的转义和验证",
            'hardcoded_secrets': "使用环境变量或配置文件存储敏感信息",
            'command_injection': "避免直接拼接用户输入到命令中，使用参数化接口",
        }
        return suggestions.get(vuln_type, "请参考安全最佳实践")
    
    def _generate_summary(self, issues: List[CodeIssue]) -> Dict[str, Any]:
        """生成审查摘要"""
        summary = {
            "total": len(issues),
            "by_severity": {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "info": 0
            },
            "by_category": {
                "quality": 0,
                "style": 0,
                "security": 0,
                "performance": 0,
                "best_practice": 0
            }
        }
        
        for issue in issues:
            summary["by_severity"][issue.severity.value] += 1
            summary["by_category"][issue.category.value] += 1
        
        return summary


# 全局实例
_code_review_service = None


def get_code_review_service() -> CodeReviewService:
    """获取代码审查服务实例"""
    global _code_review_service
    if _code_review_service is None:
        _code_review_service = CodeReviewService()
    return _code_review_service
