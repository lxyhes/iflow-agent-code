"""
算法分析技能

分析代码的时间复杂度、空间复杂度，并提供优化建议
"""

import re
from typing import Optional, Dict, Any, List
from ...integrations.agentscope_wrapper import (
    AgentScopeSkill,
    SkillParameter,
    SkillOutput,
    SkillContext,
)


class AlgorithmAnalysisSkill(AgentScopeSkill):
    """
    算法分析技能
    
    自动分析代码的算法复杂度，识别瓶颈，提供优化建议
    """
    
    def __init__(self):
        super().__init__(
            name="algorithm_analysis",
            description="分析代码的时间复杂度、空间复杂度，并提供优化建议",
            parameters=[
                SkillParameter(
                    name="code",
                    description="要分析的代码",
                    type=str,
                    required=True,
                ),
                SkillParameter(
                    name="language",
                    description="编程语言",
                    type=str,
                    required=False,
                    default="python",
                ),
                SkillParameter(
                    name="detailed",
                    description="是否返回详细分析",
                    type=bool,
                    required=False,
                    default=True,
                ),
            ],
            output=SkillOutput(
                description="算法分析结果，包含复杂度、瓶颈、优化建议等",
                type=dict,
            ),
            tags=["technical", "algorithm", "complexity", "analysis"],
            version="1.0.0",
        )
        
        # 复杂度模式识别规则
        self.complexity_patterns = {
            "O(1)": [
                r'\w+\[\w+\]',  # 数组/字典访问
            ],
            "O(log n)": [
                r'while\s*\w+\s*[=<>]+\s*\w+',  # 二分查找模式
                r'//\s*2',  # 折半操作
            ],
            "O(n)": [
                r'for\s+\w+\s+in\s+\w+',  # 单层循环
                r'while\s+\w+',  # while 循环
                r'\.map\(',  # map 操作
                r'\.filter\(',  # filter 操作
            ],
            "O(n log n)": [
                r'sorted\(',  # 排序
                r'\.sort\(',  # 排序
                r'heapq',  # 堆操作
            ],
            "O(n²)": [
                r'for\s+\w+.*:\s*\n.*for\s+\w+',  # 嵌套循环
            ],
            "O(2^n)": [
                r'def\s+\w+.*\(.*\):.*\n.*\1\(',  # 递归调用自身
            ],
        }
    
    async def execute(
        self,
        code: str,
        language: str = "python",
        detailed: bool = True,
        context: Optional[SkillContext] = None,
    ) -> Dict[str, Any]:
        """
        分析算法复杂度
        
        Args:
            code: 要分析的代码
            language: 编程语言
            detailed: 是否返回详细分析
            context: 执行上下文
            
        Returns:
            分析结果字典
        """
        # 基础分析
        time_complexity = self._analyze_time_complexity(code)
        space_complexity = self._analyze_space_complexity(code)
        
        result = {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "language": language,
        }
        
        if detailed:
            # 详细分析
            result["breakdown"] = self._analyze_breakdown(code)
            result["bottlenecks"] = self._identify_bottlenecks(code)
            result["optimizations"] = self._suggest_optimizations(code, time_complexity)
            result["patterns"] = self._identify_patterns(code)
        
        return result
    
    def _analyze_time_complexity(self, code: str) -> Dict[str, Any]:
        """分析时间复杂度"""
        # 基于模式匹配的分析
        detected_complexities = []
        
        for complexity, patterns in self.complexity_patterns.items():
            for pattern in patterns:
                if re.search(pattern, code, re.MULTILINE):
                    detected_complexities.append(complexity)
                    break
        
        # 确定主导复杂度
        complexity_hierarchy = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2^n)"]
        dominant = "O(1)"
        for c in complexity_hierarchy:
            if c in detected_complexities:
                dominant = c
        
        return {
            "dominant": dominant,
            "detected": list(set(detected_complexities)),
            "explanation": self._explain_complexity(dominant),
        }
    
    def _analyze_space_complexity(self, code: str) -> Dict[str, Any]:
        """分析空间复杂度"""
        # 检测空间使用模式
        space_indicators = {
            "O(1)": [],
            "O(n)": [
                r'\w+\s*=\s*\[.*for.*in',  # 列表推导式
                r'\.append\(',  # 动态扩容
                r'dict\(',  # 字典
            ],
            "O(n²)": [
                r'\[\[.*for.*in.*for.*in',  # 二维列表
            ],
        }
        
        detected = []
        for complexity, patterns in space_indicators.items():
            for pattern in patterns:
                if re.search(pattern, code):
                    detected.append(complexity)
                    break
        
        dominant = "O(1)" if not detected else max(detected, key=lambda x: len(x))
        
        return {
            "dominant": dominant,
            "detected": list(set(detected)),
            "explanation": self._explain_space_complexity(dominant),
        }
    
    def _analyze_breakdown(self, code: str) -> List[Dict[str, Any]]:
        """详细分解代码各部分的复杂度"""
        breakdown = []
        
        # 分析循环
        loops = re.finditer(r'(for|while)\s+(.+?):', code)
        for loop in loops:
            line = code[:loop.start()].count('\n') + 1
            breakdown.append({
                "type": "loop",
                "line": line,
                "code": loop.group(0),
                "complexity": "O(n)",
                "note": "线性遍历",
            })
        
        # 分析递归
        recursion = re.finditer(r'def\s+(\w+).*:\s*\n.*\1\(', code, re.MULTILINE)
        for rec in recursion:
            line = code[:rec.start()].count('\n') + 1
            breakdown.append({
                "type": "recursion",
                "line": line,
                "code": rec.group(0)[:50] + "...",
                "complexity": "O(2^n) 或 O(n!)",
                "note": "递归调用，需要进一步分析",
            })
        
        return breakdown
    
    def _identify_bottlenecks(self, code: str) -> List[Dict[str, Any]]:
        """识别性能瓶颈"""
        bottlenecks = []
        
        # 检测嵌套循环
        nested_loops = re.finditer(
            r'(for|while)\s+(.+?):[^}]*?(for|while)\s+(.+?):',
            code,
            re.MULTILINE | re.DOTALL
        )
        for match in nested_loops:
            bottlenecks.append({
                "type": "nested_loop",
                "severity": "high",
                "description": "嵌套循环可能导致 O(n²) 复杂度",
                "suggestion": "考虑使用哈希表优化内层循环",
            })
        
        # 检测重复计算
        if re.search(r'def\s+\w+.*:\s*\n.*\w+\(\).*\n.*\w+\(\)', code, re.MULTILINE):
            bottlenecks.append({
                "type": "redundant_computation",
                "severity": "medium",
                "description": "可能存在重复计算",
                "suggestion": "考虑使用记忆化或动态规划",
            })
        
        return bottlenecks
    
    def _suggest_optimizations(self, code: str, current_complexity: Dict) -> List[Dict[str, Any]]:
        """提供优化建议"""
        suggestions = []
        
        complexity = current_complexity.get("dominant", "O(1)")
        
        if complexity in ["O(n²)", "O(2^n)"]:
            suggestions.append({
                "priority": "high",
                "technique": "dynamic_programming",
                "description": "使用动态规划降低时间复杂度",
                "example": "将递归改为迭代，使用备忘录存储中间结果",
            })
            
            suggestions.append({
                "priority": "high",
                "technique": "hash_table",
                "description": "使用哈希表优化查找操作",
                "example": "用 set/dict 替代 list 的查找，从 O(n) 降到 O(1)",
            })
        
        if "O(n log n)" in current_complexity.get("detected", []):
            suggestions.append({
                "priority": "medium",
                "technique": "early_termination",
                "description": "添加提前终止条件",
                "example": "找到答案后立即返回，避免不必要的遍历",
            })
        
        # 通用建议
        suggestions.append({
            "priority": "low",
            "technique": "space_time_tradeoff",
            "description": "考虑空间换时间策略",
            "example": "预计算常用结果，减少运行时计算",
        })
        
        return suggestions
    
    def _identify_patterns(self, code: str) -> List[Dict[str, Any]]:
        """识别算法模式"""
        patterns = []
        
        # 检测双指针
        if re.search(r'left.*right|i.*j|start.*end', code, re.IGNORECASE):
            patterns.append({
                "name": "two_pointers",
                "description": "双指针技巧",
                "use_case": "适用于有序数组、链表操作",
            })
        
        # 检测滑动窗口
        if re.search(r'window|slide|substring', code, re.IGNORECASE):
            patterns.append({
                "name": "sliding_window",
                "description": "滑动窗口",
                "use_case": "适用于子数组/子串问题",
            })
        
        # 检测二分查找
        if re.search(r'mid|middle|//\s*2|>>\s*1', code):
            patterns.append({
                "name": "binary_search",
                "description": "二分查找",
                "use_case": "适用于有序数据查找",
            })
        
        return patterns
    
    def _explain_complexity(self, complexity: str) -> str:
        """解释时间复杂度含义"""
        explanations = {
            "O(1)": "常数时间，执行时间不随输入规模变化",
            "O(log n)": "对数时间，通常出现在二分查找等算法中",
            "O(n)": "线性时间，执行时间与输入规模成正比",
            "O(n log n)": "线性对数时间，常见于高效排序算法",
            "O(n²)": "平方时间，嵌套循环导致，大数据量时性能较差",
            "O(2^n)": "指数时间，递归算法常见，仅适用于小规模数据",
        }
        return explanations.get(complexity, "未知复杂度")
    
    def _explain_space_complexity(self, complexity: str) -> str:
        """解释空间复杂度含义"""
        explanations = {
            "O(1)": "常数空间，不使用额外数据结构",
            "O(n)": "线性空间，使用数组或哈希表存储数据",
            "O(n²)": "平方空间，使用二维数组或矩阵",
        }
        return explanations.get(complexity, "未知复杂度")
