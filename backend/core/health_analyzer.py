"""
项目健康度分析器
收集和分析项目的各种健康指标
"""

import os
import ast
import re
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from backend.core.code_analyzer import CodeAnalyzer, get_code_analyzer
from backend.core.code_style_analyzer import CodeStyleAnalyzer, get_code_style_analyzer
from backend.core.refactor_suggester import get_refactor_suggester

logger = logging.getLogger("HealthAnalyzer")


class HealthAnalyzer:
    """项目健康度分析器"""
    
    def __init__(self):
        self.code_analyzer = get_code_analyzer()
        self.code_style_analyzer = get_code_style_analyzer()
        self.refactor_suggester = get_refactor_suggester()
    
    def analyze_project_health(
        self,
        project_path: str,
        file_paths: List[str]
    ) -> Dict[str, Any]:
        """
        分析项目健康度
        
        Args:
            project_path: 项目路径
            file_paths: 文件路径列表
        
        Returns:
            健康度指标
        """
        try:
            metrics = {
                "overall_score": 0,
                "code_quality": 0,
                "test_coverage": 0,
                "documentation": 0,
                "security": 0,
                "performance": 0,
                "maintainability": 0,
                "details": {}
            }
            
            total_files = len(file_paths)
            if total_files == 0:
                return metrics
            
            # 收集各种指标
            code_issues = []
            total_lines = 0
            total_functions = 0
            total_classes = 0
            total_complexity = 0
            
            for file_path in file_paths:
                try:
                    full_path = os.path.join(project_path, file_path)
                    content = open(full_path, 'r', encoding='utf-8', errors='ignore').read()
                    
                    # 代码分析
                    code_analysis = self.code_analyzer.analyze(full_path, content)
                    total_lines += code_analysis.get("lines_of_code", 0)
                    total_functions += len(code_analysis.get("functions", []))
                    total_classes += len(code_analysis.get("classes", []))
                    
                    # 复杂度
                    for func in code_analysis.get("functions", []):
                        total_complexity += func.get("complexity", 0)
                    
                    # 重构建议
                    suggestions = self.refactor_suggester.analyze_file(full_path, content)
                    code_issues.extend(suggestions)
                
                except Exception as e:
                    logger.warning(f"Failed to analyze {file_path}: {e}")
            
            # 计算各项指标
            metrics["details"] = {
                "total_files": total_files,
                "total_lines": total_lines,
                "total_functions": total_functions,
                "total_classes": total_classes,
                "average_complexity": total_complexity / max(total_functions, 1),
                "total_issues": len(code_issues),
                "critical_issues": len([s for s in code_issues if s.severity == "critical"]),
                "high_issues": len([s for s in code_issues if s.severity == "high"]),
                "medium_issues": len([s for s in code_issues if s.severity == "medium"]),
                "low_issues": len([s for s in code_issues if s.severity == "low"])
            }
            
            # 计算分数 (0-100)
            metrics["code_quality"] = self._calculate_code_quality_score(code_issues, total_lines)
            metrics["maintainability"] = self._calculate_maintainability_score(metrics["details"])
            metrics["security"] = self._calculate_security_score(code_issues)
            metrics["performance"] = self._calculate_performance_score(code_issues)
            metrics["documentation"] = self._calculate_documentation_score(file_paths, project_path)
            metrics["test_coverage"] = self._estimate_test_coverage(file_paths, project_path)
            
            # 计算总分
            metrics["overall_score"] = (
                metrics["code_quality"] * 0.3 +
                metrics["maintainability"] * 0.25 +
                metrics["security"] * 0.2 +
                metrics["performance"] * 0.1 +
                metrics["documentation"] * 0.1 +
                metrics["test_coverage"] * 0.05
            )
            
            logger.info(f"Project health analysis completed: {metrics['overall_score']}")
            
            return metrics
        
        except Exception as e:
            logger.exception(f"分析项目健康度失败: {e}")
            return {"error": f"分析项目健康度失败: {str(e)}"}
    
    def _calculate_code_quality_score(self, issues: List, total_lines: int) -> int:
        """计算代码质量分数"""
        if total_lines == 0:
            return 100
        
        critical = len([s for s in issues if s.severity == "critical"])
        high = len([s for s in issues if s.severity == "high"])
        medium = len([s for s in issues if s.severity == "medium"])
        low = len([s for s in issues if s.severity == "low"])
        
        # 每行代码的扣分
        penalty = (critical * 10 + high * 5 + medium * 2 + low * 1) / total_lines
        
        score = max(0, 100 - penalty * 1000)
        return min(100, int(score))
    
    def _calculate_maintainability_score(self, details: Dict) -> int:
        """计算可维护性分数"""
        avg_complexity = details.get("average_complexity", 0)
        total_issues = details.get("total_issues", 0)
        total_functions = details.get("total_functions", 1)
        
        # 复杂度扣分
        complexity_penalty = max(0, (avg_complexity - 5) * 5)
        
        # 问题密度扣分
        issue_density = total_issues / max(total_functions, 1)
        issue_penalty = min(50, issue_density * 10)
        
        score = max(0, 100 - complexity_penalty - issue_penalty)
        return min(100, int(score))
    
    def _calculate_security_score(self, issues: List) -> int:
        """计算安全性分数"""
        security_issues = [s for s in issues if s.category == "security"]
        
        if len(security_issues) == 0:
            return 100
        
        critical = len([s for s in security_issues if s.severity == "critical"])
        high = len([s for s in security_issues if s.severity == "high"])
        
        # 安全问题扣分
        penalty = critical * 30 + high * 15
        
        score = max(0, 100 - penalty)
        return min(100, int(score))
    
    def _calculate_performance_score(self, issues: List) -> int:
        """计算性能分数"""
        performance_issues = [s for s in issues if s.category == "performance"]
        
        if len(performance_issues) == 0:
            return 100
        
        high = len([s for s in performance_issues if s.severity in ["critical", "high"]])
        medium = len([s for s in performance_issues if s.severity == "medium"])
        low = len([s for s in performance_issues if s.severity == "low"])
        
        # 性能问题扣分
        penalty = high * 10 + medium * 5 + low * 2
        
        score = max(0, 100 - penalty)
        return min(100, int(score))
    
    def _calculate_documentation_score(self, file_paths: List, project_path: str) -> int:
        """计算文档分数"""
        # 检查是否有 README
        has_readme = False
        for file in os.listdir(project_path):
            if file.lower() in ['readme.md', 'readme.txt', 'readme']:
                has_readme = True
                break
        
        # 检查代码注释率
        total_comment_lines = 0
        total_code_lines = 0
        
        for file_path in file_paths:
            try:
                full_path = os.path.join(project_path, file_path)
                content = open(full_path, 'r', encoding='utf-8', errors='ignore').read()
                
                lines = content.split('\n')
                for line in lines:
                    stripped = line.strip()
                    if stripped and not stripped.startswith('#') and not stripped.startswith('//'):
                        total_code_lines += 1
                    elif stripped and (stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('*')):
                        total_comment_lines += 1
            except:
                pass
        
        # 计算分数
        readme_score = 20 if has_readme else 0
        comment_ratio = total_comment_lines / max(total_code_lines, 1)
        comment_score = min(80, comment_ratio * 400)  # 目标 20% 注释率
        
        score = readme_score + comment_score
        return min(100, int(score))
    
    def _estimate_test_coverage(self, file_paths: List, project_path: str) -> int:
        """估算测试覆盖率"""
        # 查找测试文件
        test_files = []
        for file_path in file_paths:
            if 'test' in file_path.lower() or 'spec' in file_path.lower():
                test_files.append(file_path)
        
        if len(file_paths) == 0:
            return 0
        
        # 简单估算：测试文件占比
        coverage = len(test_files) / len(file_paths) * 200  # 放大系数
        return min(100, int(coverage))


# 全局实例
_health_analyzer = None


def get_health_analyzer() -> HealthAnalyzer:
    """获取健康度分析器实例"""
    global _health_analyzer
    if _health_analyzer is None:
        _health_analyzer = HealthAnalyzer()
    return _health_analyzer