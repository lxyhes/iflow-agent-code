"""
性能监控服务 - 代码性能分析
支持性能分析、内存泄漏检测、渲染性能优化建议
"""

import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger("PerformanceMonitor")


class PerformanceMonitor:
    """性能监控服务"""
    
    def __init__(self):
        self.supported_languages = {
            '.py': self._analyze_python_performance,
            '.js': self._analyze_javascript_performance,
            '.jsx': self._analyze_javascript_performance,
            '.ts': self._analyze_typescript_performance,
            '.tsx': self._analyze_typescript_performance,
            '.java': self._analyze_java_performance,
            '.go': self._analyze_go_performance,
        }
    
    def analyze_performance(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> Dict[str, Any]:
        """
        分析项目性能
        
        Args:
            project_path: 项目路径
            file_paths: 文件路径列表
        
        Returns:
            性能分析结果
        """
        performance_metrics = {
            "overall_score": 0,
            "metrics": {
                "code_complexity": 0,
                "memory_usage": 0,
                "execution_time": 0,
                "rendering": 0
            },
            "issues": [],
            "recommendations": [],
            "file_analysis": []
        }
        
        total_score = 0
        file_count = 0
        
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
                
                analysis = self.supported_languages[ext](content, file_path)
                
                if analysis:
                    performance_metrics['file_analysis'].append({
                        "file": file_path,
                        "score": analysis.get('score', 0),
                        "issues": analysis.get('issues', []),
                        "metrics": analysis.get('metrics', {})
                    })
                    
                    performance_metrics['issues'].extend(analysis.get('issues', []))
                    performance_metrics['recommendations'].extend(analysis.get('recommendations', []))
                    
                    total_score += analysis.get('score', 100)
                    file_count += 1
            
            except Exception as e:
                logger.error(f"Error analyzing performance for {file_path}: {e}")
        
        if file_count > 0:
            performance_metrics['overall_score'] = total_score / file_count
        
        # 计算综合指标
        self._calculate_overall_metrics(performance_metrics)
        
        return performance_metrics
    
    def detect_memory_leaks(
        self,
        file_path: str,
        content: str
    ) -> List[Dict[str, Any]]:
        """
        检测潜在内存泄漏
        
        Args:
            file_path: 文件路径
            content: 文件内容
        
        Returns:
            内存泄漏问题列表
        """
        leaks = []
        ext = Path(file_path).suffix.lower()
        
        # JavaScript/TypeScript 内存泄漏模式
        if ext in ['.js', '.jsx', '.ts', '.tsx']:
            js_patterns = [
                {
                    'pattern': r'setInterval\s*\([^)]*\)',
                    'type': 'set_interval',
                    'severity': 'high',
                    'description': '未清理的 setInterval 可能导致内存泄漏',
                    'recommendation': '确保在组件卸载时使用 clearInterval 清理定时器'
                },
                {
                    'pattern': r'setTimeout\s*\([^)]*\)',
                    'type': 'set_timeout',
                    'severity': 'medium',
                    'description': '未清理的 setTimeout 可能导致内存泄漏',
                    'recommendation': '确保在组件卸载时使用 clearTimeout 清理定时器'
                },
                {
                    'pattern': r'addEventListener\s*\([^)]*\)',
                    'type': 'event_listener',
                    'severity': 'high',
                    'description': '未移除的事件监听器可能导致内存泄漏',
                    'recommendation': '确保在组件卸载时使用 removeEventListener 移除监听器'
                },
                {
                    'pattern': r'useEffect\s*\([^)]*\)\s*=>\s*{[^}]*setInterval',
                    'type': 'react_effect',
                    'severity': 'high',
                    'description': 'useEffect 中的定时器未清理',
                    'recommendation': '在 useEffect 返回清理函数，使用 clearInterval'
                }
            ]
            
            lines = content.split('\n')
            for pattern_info in js_patterns:
                pattern = pattern_info['pattern']
                for line_num, line in enumerate(lines, 1):
                    if re.search(pattern, line):
                        leaks.append({
                            "line": line_num,
                            "type": pattern_info['type'],
                            "severity": pattern_info['severity'],
                            "description": pattern_info['description'],
                            "recommendation": pattern_info['recommendation'],
                            "code_snippet": line.strip()
                        })
        
        # Python 内存泄漏模式
        elif ext == '.py':
            py_patterns = [
                {
                    'pattern': r'while\s+True:',
                    'type': 'infinite_loop',
                    'severity': 'high',
                    'description': '无限循环可能导致内存持续增长',
                    'recommendation': '添加适当的退出条件或使用超时机制'
                },
                {
                    'pattern': r'\.append\s*\([^)]*\)',
                    'type': 'unbounded_list',
                    'severity': 'medium',
                    'description': '列表可能无限增长',
                    'recommendation': '考虑使用固定大小的数据结构或定期清理'
                }
            ]
            
            lines = content.split('\n')
            for pattern_info in py_patterns:
                pattern = pattern_info['pattern']
                for line_num, line in enumerate(lines, 1):
                    if re.search(pattern, line):
                        leaks.append({
                            "line": line_num,
                            "type": pattern_info['type'],
                            "severity": pattern_info['severity'],
                            "description": pattern_info['description'],
                            "recommendation": pattern_info['recommendation'],
                            "code_snippet": line.strip()
                        })
        
        return leaks
    
    def analyze_rendering_performance(
        self,
        file_path: str,
        content: str
    ) -> Dict[str, Any]:
        """
        分析渲染性能（React/Vue）
        
        Args:
            file_path: 文件路径
            content: 文件内容
        
        Returns:
            渲染性能分析结果
        """
        ext = Path(file_path).suffix.lower()
        
        if ext not in ['.jsx', '.tsx', '.vue']:
            return {
                "score": 100,
                "issues": [],
                "recommendations": []
            }
        
        issues = []
        recommendations = []
        score = 100
        
        # React 渲染性能问题
        if ext in ['.jsx', '.tsx']:
            # 检查未使用 memo/useMemo/useCallback
            if 'useEffect' in content and 'useMemo' not in content and 'useCallback' not in content:
                issues.append({
                    "type": "missing_optimization",
                    "severity": "medium",
                    "description": "组件可能需要使用 useMemo 或 useCallback 优化",
                    "line": 1
                })
                recommendations.append("考虑使用 useMemo 和 useCallback 优化组件性能")
                score -= 10
            
            # 检查大型组件
            if content.count('function') > 10 or content.count('const') > 20:
                issues.append({
                    "type": "large_component",
                    "severity": "high",
                    "description": "组件过大，建议拆分为更小的组件",
                    "line": 1
                })
                recommendations.append("将大型组件拆分为多个小组件以提高可维护性和性能")
                score -= 15
            
            # 检查内联函数
            inline_func_pattern = r'onClick\s*=\s*{\(\)\s*=>'
            if len(re.findall(inline_func_pattern, content)) > 3:
                issues.append({
                    "type": "inline_functions",
                    "severity": "medium",
                    "description": "检测到多个内联函数，可能导致不必要的重新渲染",
                    "line": 1
                })
                recommendations.append("使用 useCallback 包装内联函数以避免不必要的重新渲染")
                score -= 10
        
        # Vue 渲染性能问题
        elif ext == '.vue':
            # 检查 v-for 缺少 key
            if 'v-for' in content and 'v-for' not in content:
                issues.append({
                    "type": "missing_key",
                    "severity": "high",
                    "description": "v-for 缺少 key 属性",
                    "line": 1
                })
                recommendations.append("为 v-for 添加唯一的 key 属性以提高渲染性能")
                score -= 15
        
        return {
            "score": max(0, score),
            "issues": issues,
            "recommendations": recommendations
        }
    
    def _analyze_python_performance(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Python 性能"""
        issues = []
        recommendations = []
        metrics = {
            "complexity": 0,
            "lines_of_code": len(content.split('\n')),
            "function_count": 0,
            "class_count": 0
        }
        
        try:
            tree = ast.parse(content)
            
            # 统计函数和类
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    metrics["function_count"] += 1
                    # 计算圈复杂度
                    complexity = self._calculate_cyclomatic_complexity(node)
                    if complexity > 10:
                        issues.append({
                            "type": "high_complexity",
                            "severity": "high",
                            "description": f"函数 {node.name} 的圈复杂度为 {complexity}，建议重构",
                            "line": node.lineno
                        })
                        recommendations.append(f"将函数 {node.name} 拆分为更小的函数以降低复杂度")
                        metrics["complexity"] += complexity
                
                elif isinstance(node, ast.ClassDef):
                    metrics["class_count"] += 1
            
            # 检查全局变量
            global_vars = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Global):
                    global_vars.extend(node.names)
            
            if len(global_vars) > 5:
                issues.append({
                    "type": "too_many_globals",
                    "severity": "medium",
                    "description": f"使用了 {len(global_vars)} 个全局变量",
                    "line": 1
                })
                recommendations.append("减少全局变量的使用，改用类或模块封装")
        
        except SyntaxError:
            pass
        
        # 计算分数
        score = 100
        score -= len(issues) * 10
        score -= metrics["complexity"] * 0.5
        
        return {
            "score": max(0, score),
            "issues": issues,
            "recommendations": recommendations,
            "metrics": metrics
        }
    
    def _analyze_javascript_performance(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 JavaScript 性能"""
        issues = []
        recommendations = []
        metrics = {
            "lines_of_code": len(content.split('\n')),
            "function_count": 0,
            "loop_count": 0
        }
        
        # 统计函数
        function_pattern = r'(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)'
        metrics["function_count"] = len(re.findall(function_pattern, content))
        
        # 检查循环
        loop_patterns = [
            r'\bfor\s*\(',
            r'\bwhile\s*\(',
            r'\.forEach\s*\(',
            r'\.map\s*\(',
            r'\.filter\s*\(',
            r'\.reduce\s*\('
        ]
        
        for pattern in loop_patterns:
            metrics["loop_count"] += len(re.findall(pattern, content))
        
        # 检查嵌套循环
        nested_loop_pattern = r'for\s*\([^)]*\)\s*{[^}]*for\s*\('
        if re.search(nested_loop_pattern, content):
            issues.append({
                "type": "nested_loops",
                "severity": "high",
                "description": "检测到嵌套循环，可能导致性能问题",
                "line": 1
            })
            recommendations.append("考虑使用更高效的算法或数据结构来避免嵌套循环")
        
        # 检查同步操作
        sync_patterns = [
            r'\.map\s*\(',
            r'\.forEach\s*\(',
            r'\.filter\s*\('
        ]
        
        for pattern in sync_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                issues.append({
                    "type": "sync_operation",
                    "severity": "medium",
                    "description": "同步操作可能阻塞主线程",
                    "line": content[:match.start()].count('\n') + 1
                })
                recommendations.append("考虑使用异步方法或 Web Workers 来处理耗时操作")
        
        # 计算分数
        score = 100
        score -= len(issues) * 10
        score -= metrics["loop_count"] * 2
        
        return {
            "score": max(0, score),
            "issues": issues,
            "recommendations": recommendations,
            "metrics": metrics
        }
    
    def _analyze_typescript_performance(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 TypeScript 性能"""
        # TypeScript 和 JavaScript 类似
        return self._analyze_javascript_performance(content, file_path)
    
    def _analyze_java_performance(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Java 性能"""
        issues = []
        recommendations = []
        metrics = {
            "lines_of_code": len(content.split('\n')),
            "method_count": 0,
            "class_count": 0
        }
        
        # 统计方法和类
        metrics["method_count"] = len(re.findall(r'\b(?:public|private|protected)?\s*(?:static\s+)?\w+\s+\w+\s*\([^)]*\)', content))
        metrics["class_count"] = len(re.findall(r'\bclass\s+\w+', content))
        
        # 检查字符串拼接
        string_concat_pattern = r'String\s+\w+\s*=\s*\w+\s*\+\s*\w+'
        if re.search(string_concat_pattern, content):
            issues.append({
                "type": "string_concatenation",
                "severity": "medium",
                "description": "使用 + 拼接字符串效率较低",
                "line": 1
            })
            recommendations.append("使用 StringBuilder 或 String.format 来提高字符串拼接性能")
        
        # 计算分数
        score = 100
        score -= len(issues) * 10
        
        return {
            "score": max(0, score),
            "issues": issues,
            "recommendations": recommendations,
            "metrics": metrics
        }
    
    def _analyze_go_performance(self, content: str, file_path: str) -> Dict[str, Any]:
        """分析 Go 性能"""
        issues = []
        recommendations = []
        metrics = {
            "lines_of_code": len(content.split('\n')),
            "function_count": 0,
            "goroutine_count": 0
        }
        
        # 统计函数和 goroutine
        metrics["function_count"] = len(re.findall(r'func\s+\w+', content))
        metrics["goroutine_count"] = len(re.findall(r'go\s+\w+\s*\(', content))
        
        # 检查 goroutine 泄漏
        if metrics["goroutine_count"] > 0:
            issues.append({
                "type": "goroutine_leak",
                "severity": "high",
                "description": f"使用了 {metrics['goroutine_count']} 个 goroutine，确保正确管理",
                "line": 1
            })
            recommendations.append("确保所有 goroutine 都能正确退出，避免 goroutine 泄漏")
        
        # 计算分数
        score = 100
        score -= len(issues) * 10
        
        return {
            "score": max(0, score),
            "issues": issues,
            "recommendations": recommendations,
            "metrics": metrics
        }
    
    def _calculate_cyclomatic_complexity(self, node: ast.FunctionDef) -> int:
        """计算圈复杂度"""
        complexity = 1
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _calculate_overall_metrics(self, performance_metrics: Dict[str, Any]):
        """计算综合指标"""
        if not performance_metrics['file_analysis']:
            return
        
        # 计算平均指标
        total_complexity = 0
        total_lines = 0
        total_functions = 0
        
        for file_analysis in performance_metrics['file_analysis']:
            metrics = file_analysis.get('metrics', {})
            total_complexity += metrics.get('complexity', 0)
            total_lines += metrics.get('lines_of_code', 0)
            total_functions += metrics.get('function_count', 0)
        
        file_count = len(performance_metrics['file_analysis'])
        
        if file_count > 0:
            performance_metrics['metrics']['code_complexity'] = total_complexity / file_count
            performance_metrics['metrics']['memory_usage'] = total_lines / file_count
            performance_metrics['metrics']['execution_time'] = total_functions / file_count


# 全局实例
_performance_monitor = None


def get_performance_monitor() -> PerformanceMonitor:
    """获取性能监控服务实例"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor
