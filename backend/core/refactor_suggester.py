"""
智能代码重构建议服务
基于代码分析提供智能重构建议和优化方案
"""

import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from backend.core.code_analyzer import CodeAnalyzer, get_code_analyzer
from backend.core.code_style_analyzer import CodeStyleAnalyzer, get_code_style_analyzer

logger = logging.getLogger("RefactorSuggester")


class RefactorSuggestion:
    """重构建议"""
    
    def __init__(
        self,
        suggestion_type: str,
        title: str,
        description: str,
        severity: str,  # low, medium, high, critical
        file_path: str,
        line_number: int,
        code_snippet: str,
        suggested_fix: str,
        category: str  # performance, readability, maintainability, security, best-practice
    ):
        self.suggestion_type = suggestion_type
        self.title = title
        self.description = description
        self.severity = severity
        self.file_path = file_path
        self.line_number = line_number
        self.code_snippet = code_snippet
        self.suggested_fix = suggested_fix
        self.category = category
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.suggestion_type,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "code_snippet": self.code_snippet,
            "suggested_fix": self.suggested_fix,
            "category": self.category
        }


class RefactorSuggester:
    """智能代码重构建议服务"""
    
    def __init__(self):
        self.code_analyzer = get_code_analyzer()
        self.code_style_analyzer = get_code_style_analyzer()
    
    def analyze_file(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """
        分析文件并生成重构建议
        
        Args:
            file_path: 文件路径
            content: 文件内容
        
        Returns:
            重构建议列表
        """
        suggestions = []
        
        try:
            # 代码结构分析
            code_analysis = self.code_analyzer.analyze(file_path, content)
            
            # 代码风格分析
            style_analysis = self.code_style_analyzer.analyze(content)
            
            # 生成各种重构建议
            suggestions.extend(self._check_function_length(file_path, content, code_analysis))
            suggestions.extend(self._check_complexity(file_path, content, code_analysis))
            suggestions.extend(self._check_duplicate_code(file_path, content))
            suggestions.extend(self._check_unused_variables(file_path, content, code_analysis))
            suggestions.extend(self._check_magic_numbers(file_path, content))
            suggestions.extend(self._check_long_parameter_list(file_path, content, code_analysis))
            suggestions.extend(self._check_deep_nesting(file_path, content))
            suggestions.extend(self._check_large_classes(file_path, content, code_analysis))
            suggestions.extend(self._check_code_smells(file_path, content))
            suggestions.extend(self._check_performance_issues(file_path, content))
            suggestions.extend(self._check_security_issues(file_path, content))
            
            logger.info(f"Generated {len(suggestions)} refactor suggestions for {file_path}")
            
        except Exception as e:
            logger.exception(f"Error analyzing file {file_path}: {e}")
        
        return suggestions
    
    def _check_function_length(
        self,
        file_path: str,
        content: str,
        code_analysis: Dict[str, Any]
    ) -> List[RefactorSuggestion]:
        """检查函数长度"""
        suggestions = []
        max_function_length = 50
        
        functions = code_analysis.get("functions", [])
        
        for func in functions:
            if "length" in func and func["length"] > max_function_length:
                suggestions.append(RefactorSuggestion(
                    suggestion_type="long_function",
                    title=f"函数过长: {func.get('name', 'anonymous')}",
                    description=f"函数 '{func.get('name', 'anonymous')}' 有 {func['length']} 行代码，超过了推荐的 {max_function_length} 行。考虑将其拆分为更小的函数。",
                    severity="medium",
                    file_path=file_path,
                    line_number=func.get("line_number", 0),
                    code_snippet=func.get("snippet", ""),
                    suggested_fix=f"将函数 '{func.get('name', 'anonymous')}' 拆分为多个较小的函数，每个函数只做一件事。",
                    category="maintainability"
                ))
        
        return suggestions
    
    def _check_complexity(
        self,
        file_path: str,
        content: str,
        code_analysis: Dict[str, Any]
    ) -> List[RefactorSuggestion]:
        """检查圈复杂度"""
        suggestions = []
        max_complexity = 10
        
        functions = code_analysis.get("functions", [])
        
        for func in functions:
            if "complexity" in func and func["complexity"] > max_complexity:
                suggestions.append(RefactorSuggestion(
                    suggestion_type="high_complexity",
                    title=f"高复杂度函数: {func.get('name', 'anonymous')}",
                    description=f"函数 '{func.get('name', 'anonymous')}' 的圈复杂度为 {func['complexity']}，超过了推荐的 {max_complexity}。高复杂度会导致代码难以理解和维护。",
                    severity="high",
                    file_path=file_path,
                    line_number=func.get("line_number", 0),
                    code_snippet=func.get("snippet", ""),
                    suggested_fix=f"简化函数 '{func.get('name', 'anonymous')}' 的逻辑，使用早期返回、提取方法或策略模式来降低复杂度。",
                    category="maintainability"
                ))
        
        return suggestions
    
    def _check_duplicate_code(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """检查重复代码"""
        suggestions = []
        lines = content.split('\n')
        
        # 简单的重复代码检测
        code_blocks = {}
        for i, line in enumerate(lines):
            if len(line.strip()) > 10:  # 忽略短行
                if line.strip() in code_blocks:
                    code_blocks[line.strip()].append(i)
                else:
                    code_blocks[line.strip()] = [i]
        
        # 找出重复的代码块
        for code, line_numbers in code_blocks.items():
            if len(line_numbers) > 2:  # 重复超过2次
                suggestions.append(RefactorSuggestion(
                    suggestion_type="duplicate_code",
                    title="重复代码",
                    description=f"代码片段在文件中重复出现 {len(line_numbers)} 次。重复代码会增加维护成本。",
                    severity="medium",
                    file_path=file_path,
                    line_number=line_numbers[0],
                    code_snippet=code,
                    suggested_fix="提取重复代码为独立的函数或常量。",
                    category="maintainability"
                ))
        
        return suggestions
    
    def _check_unused_variables(
        self,
        file_path: str,
        content: str,
        code_analysis: Dict[str, Any]
    ) -> List[RefactorSuggestion]:
        """检查未使用的变量"""
        suggestions = []
        
        variables = code_analysis.get("variables", [])
        
        for var in variables:
            if not var.get("used", True):
                suggestions.append(RefactorSuggestion(
                    suggestion_type="unused_variable",
                    title=f"未使用的变量: {var.get('name', 'unknown')}",
                    description=f"变量 '{var.get('name', 'unknown')}' 被定义但从未使用。",
                    severity="low",
                    file_path=file_path,
                    line_number=var.get("line_number", 0),
                    code_snippet=var.get("snippet", ""),
                    suggested_fix=f"删除未使用的变量 '{var.get('name', 'unknown')}'。",
                    category="readability"
                ))
        
        return suggestions
    
    def _check_magic_numbers(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """检查魔法数字"""
        suggestions = []
        
        # 匹配数字（不是简单的 0, 1, -1）
        magic_number_pattern = r'\b(?!0|1|-1)\d{2,}\b'
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            matches = re.finditer(magic_number_pattern, line)
            for match in matches:
                suggestions.append(RefactorSuggestion(
                    suggestion_type="magic_number",
                    title="魔法数字",
                    description=f"使用了魔法数字 '{match.group()}'。魔法数字降低了代码的可读性和可维护性。",
                    severity="low",
                    file_path=file_path,
                    line_number=i + 1,
                    code_snippet=line.strip(),
                    suggested_fix=f"将魔法数字 '{match.group()}' 替换为有意义的常量。",
                    category="readability"
                ))
        
        return suggestions
    
    def _check_long_parameter_list(
        self,
        file_path: str,
        content: str,
        code_analysis: Dict[str, Any]
    ) -> List[RefactorSuggestion]:
        """检查过长的参数列表"""
        suggestions = []
        max_params = 5
        
        functions = code_analysis.get("functions", [])
        
        for func in functions:
            param_count = len(func.get("parameters", []))
            if param_count > max_params:
                suggestions.append(RefactorSuggestion(
                    suggestion_type="long_parameter_list",
                    title=f"参数列表过长: {func.get('name', 'anonymous')}",
                    description=f"函数 '{func.get('name', 'anonymous')}' 有 {param_count} 个参数，超过了推荐的 {max_params} 个。",
                    severity="medium",
                    file_path=file_path,
                    line_number=func.get("line_number", 0),
                    code_snippet=func.get("snippet", ""),
                    suggested_fix=f"考虑使用参数对象或拆分函数来减少参数数量。",
                    category="maintainability"
                ))
        
        return suggestions
    
    def _check_deep_nesting(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """检查过深的嵌套"""
        suggestions = []
        max_nesting = 4
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            # 计算缩进级别
            indent = len(line) - len(line.lstrip())
            if indent > max_nesting * 4:  # 假设每个缩进是4个空格
                nesting_level = indent // 4
                suggestions.append(RefactorSuggestion(
                    suggestion_type="deep_nesting",
                    title="过深的嵌套",
                    description=f"代码嵌套层级达到 {nesting_level}，超过了推荐的 {max_nesting} 层。深嵌套会降低代码可读性。",
                    severity="medium",
                    file_path=file_path,
                    line_number=i + 1,
                    code_snippet=line.strip(),
                    suggested_fix="使用早期返回、提取方法或卫语句来减少嵌套层级。",
                    category="readability"
                ))
        
        return suggestions
    
    def _check_large_classes(
        self,
        file_path: str,
        content: str,
        code_analysis: Dict[str, Any]
    ) -> List[RefactorSuggestion]:
        """检查过大的类"""
        suggestions = []
        max_class_size = 300
        
        classes = code_analysis.get("classes", [])
        
        for cls in classes:
            if "length" in cls and cls["length"] > max_class_size:
                suggestions.append(RefactorSuggestion(
                    suggestion_type="large_class",
                    title=f"过大的类: {cls.get('name', 'anonymous')}",
                    description=f"类 '{cls.get('name', 'anonymous')}' 有 {cls['length']} 行代码，超过了推荐的 {max_class_size} 行。过大的类违反了单一职责原则。",
                    severity="high",
                    file_path=file_path,
                    line_number=cls.get("line_number", 0),
                    code_snippet=cls.get("snippet", ""),
                    suggested_fix=f"将类 '{cls.get('name', 'anonymous')}' 拆分为多个更小的类，每个类只负责一个职责。",
                    category="maintainability"
                ))
        
        return suggestions
    
    def _check_code_smells(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """检查代码异味"""
        suggestions = []
        
        # 检查 God Object
        if content.count('class ') > 5:
            suggestions.append(RefactorSuggestion(
                suggestion_type="god_object",
                title="可能的 God Object",
                description="文件中定义了过多的类，可能存在 God Object 问题。",
                severity="medium",
                file_path=file_path,
                line_number=1,
                code_snippet="",
                suggested_fix="考虑将职责分离到不同的类中。",
                category="maintainability"
            ))
        
        # 检查 Feature Envy
        if content.count('self.') > 20:
            suggestions.append(RefactorSuggestion(
                suggestion_type="feature_envy",
                title="可能的 Feature Envy",
                description="方法频繁访问其他对象的属性，可能存在 Feature Envy 问题。",
                severity="low",
                file_path=file_path,
                line_number=1,
                code_snippet="",
                suggested_fix="考虑将这些方法移动到它们频繁访问的对象中。",
                category="maintainability"
            ))
        
        return suggestions
    
    def _check_performance_issues(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """检查性能问题"""
        suggestions = []
        
        # 检查循环中的数据库查询
        if re.search(r'for\s+\w+\s+in.*:\s+.*\.query\(', content, re.MULTILINE):
            suggestions.append(RefactorSuggestion(
                suggestion_type="n_plus_one_query",
                title="可能的 N+1 查询问题",
                description="循环中可能存在数据库查询，会导致 N+1 查询问题，严重影响性能。",
                severity="high",
                file_path=file_path,
                line_number=1,
                code_snippet="",
                suggested_fix="使用批量查询或预加载来优化数据库访问。",
                category="performance"
            ))
        
        # 检查不必要的字符串拼接
        if content.count('+') > 10 and 'join' not in content:
            suggestions.append(RefactorSuggestion(
                suggestion_type="inefficient_string_concat",
                title="低效的字符串拼接",
                description="使用了大量的字符串拼接操作，建议使用 join() 方法。",
                severity="low",
                file_path=file_path,
                line_number=1,
                code_snippet="",
                suggested_fix="使用 ''.join(list) 来替代字符串拼接。",
                category="performance"
            ))
        
        return suggestions
    
    def _check_security_issues(
        self,
        file_path: str,
        content: str
    ) -> List[RefactorSuggestion]:
        """检查安全问题"""
        suggestions = []
        
        # 检查硬编码的密钥
        if re.search(r'(password|secret|api_key|token)\s*=\s*["\'].*["\']', content, re.IGNORECASE):
            suggestions.append(RefactorSuggestion(
                suggestion_type="hardcoded_secret",
                title="硬编码的敏感信息",
                description="代码中可能包含硬编码的密码、密钥或其他敏感信息。",
                severity="critical",
                file_path=file_path,
                line_number=1,
                code_snippet="",
                suggested_fix="将敏感信息移到环境变量或配置文件中。",
                category="security"
            ))
        
        # 检查 SQL 注入风险
        if re.search(r'execute\s*\(\s*["\'].*%.*["\']\s*\)', content):
            suggestions.append(RefactorSuggestion(
                suggestion_type="sql_injection",
                title="可能的 SQL 注入风险",
                description="使用了字符串拼接构建 SQL 查询，存在 SQL 注入风险。",
                severity="critical",
                file_path=file_path,
                line_number=1,
                code_snippet="",
                suggested_fix="使用参数化查询或 ORM 来防止 SQL 注入。",
                category="security"
            ))
        
        return suggestions


# 全局实例
_refactor_suggester = None


def get_refactor_suggester() -> RefactorSuggester:
    """获取重构建议服务实例"""
    global _refactor_suggester
    if _refactor_suggester is None:
        _refactor_suggester = RefactorSuggester()
    return _refactor_suggester