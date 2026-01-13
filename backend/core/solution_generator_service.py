"""
快速方案生成服务
针对需求快速给出项目方案
"""

import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path


class SolutionGeneratorService:
    """快速方案生成服务"""
    
    def __init__(self, storage_dir: str = None):
        """
        初始化方案生成服务
        
        Args:
            storage_dir: 存储目录路径
        """
        if storage_dir is None:
            project_root = Path(__file__).parent.parent.parent
            storage_dir = project_root / "storage" / "solutions"
        
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # 方案模板库
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, Any]:
        """加载方案模板"""
        return {
            "web_application": {
                "name": "Web 应用开发",
                "description": "标准的 Web 应用开发方案",
                "tech_stack": ["React", "Vue", "Node.js", "Python", "FastAPI"],
                "phases": [
                    "需求分析",
                    "技术选型",
                    "架构设计",
                    "前端开发",
                    "后端开发",
                    "数据库设计",
                    "测试",
                    "部署"
                ]
            },
            "mobile_app": {
                "name": "移动应用开发",
                "description": "移动应用开发方案",
                "tech_stack": ["React Native", "Flutter", "iOS", "Android"],
                "phases": [
                    "需求分析",
                    "UI/UX 设计",
                    "技术选型",
                    "功能开发",
                    "测试",
                    "发布"
                ]
            },
            "api_service": {
                "name": "API 服务开发",
                "description": "RESTful API 服务开发方案",
                "tech_stack": ["FastAPI", "Flask", "Django", "Node.js", "Express"],
                "phases": [
                    "需求分析",
                    "API 设计",
                    "数据库设计",
                    "接口开发",
                    "文档编写",
                    "测试",
                    "部署"
                ]
            },
            "data_analysis": {
                "name": "数据分析项目",
                "description": "数据分析项目方案",
                "tech_stack": ["Python", "Pandas", "NumPy", "Matplotlib", "Jupyter"],
                "phases": [
                    "数据收集",
                    "数据清洗",
                    "数据分析",
                    "可视化",
                    "报告生成"
                ]
            }
        }
    
    def analyze_requirement(self, requirement: str) -> Dict[str, Any]:
        """
        分析需求
        
        Args:
            requirement: 需求描述
            
        Returns:
            需求分析结果
        """
        requirement_lower = requirement.lower()
        
        # 识别关键词
        keywords = {
            "web": ["web", "网站", "网页", "前端", "浏览器"],
            "mobile": ["app", "应用", "移动", "手机", "ios", "android"],
            "api": ["api", "接口", "服务", "后端", "接口开发"],
            "data": ["数据", "分析", "统计", "报表", "可视化"]
        }
        
        matched_keywords = {}
        for category, words in keywords.items():
            matched = [word for word in words if word in requirement_lower]
            if matched:
                matched_keywords[category] = matched
        
        # 识别需求类型
        requirement_type = "general"
        if "web" in matched_keywords:
            requirement_type = "web_application"
        elif "mobile" in matched_keywords:
            requirement_type = "mobile_app"
        elif "api" in matched_keywords:
            requirement_type = "api_service"
        elif "data" in matched_keywords:
            requirement_type = "data_analysis"
        
        return {
            "requirement": requirement,
            "keywords": matched_keywords,
            "type": requirement_type,
            "complexity": self._estimate_complexity(requirement),
            "estimated_time": self._estimate_time(requirement_type)
        }
    
    def _estimate_complexity(self, requirement: str) -> str:
        """估算复杂度"""
        requirement_lower = requirement.lower()
        
        complexity_indicators = {
            "high": ["复杂", "大规模", "分布式", "微服务", "高并发", "实时"],
            "medium": ["中等", "标准", "常规"],
            "low": ["简单", "基础", "小型", "快速"]
        }
        
        for level, indicators in complexity_indicators.items():
            if any(indicator in requirement_lower for indicator in indicators):
                return level
        
        return "medium"
    
    def _estimate_time(self, requirement_type: str) -> str:
        """估算时间"""
        time_estimates = {
            "web_application": "2-4 周",
            "mobile_app": "4-8 周",
            "api_service": "1-3 周",
            "data_analysis": "1-2 周",
            "general": "2-6 周"
        }
        
        return time_estimates.get(requirement_type, "2-6 周")
    
    def generate_solution(
        self,
        requirement: str,
        template_type: str = None
    ) -> Dict[str, Any]:
        """
        生成方案
        
        Args:
            requirement: 需求描述
            template_type: 模板类型（可选）
            
        Returns:
            生成的方案
        """
        # 分析需求
        analysis = self.analyze_requirement(requirement)
        
        # 选择模板
        if not template_type:
            template_type = analysis["type"]
        
        template = self.templates.get(template_type, self.templates["web_application"])
        
        # 生成方案
        solution = {
            "id": f"solution_{datetime.now().timestamp()}",
            "requirement": requirement,
            "analysis": analysis,
            "template": template,
            "generated_at": datetime.now().isoformat(),
            "tech_stack": template["tech_stack"],
            "phases": template["phases"],
            "deliverables": self._generate_deliverables(template["phases"]),
            "risks": self._identify_risks(analysis),
            "next_steps": self._generate_next_steps(template["phases"])
        }
        
        return solution
    
    def _generate_deliverables(self, phases: List[str]) -> List[Dict[str, str]]:
        """生成交付物"""
        deliverables = []
        
        deliverable_map = {
            "需求分析": "需求文档、用户故事、原型图",
            "技术选型": "技术选型报告、架构图",
            "架构设计": "系统架构文档、数据库设计",
            "前端开发": "前端代码、组件库",
            "后端开发": "后端代码、API 文档",
            "数据库设计": "数据库 schema、迁移脚本",
            "UI/UX 设计": "UI 设计稿、交互原型",
            "功能开发": "功能代码、单元测试",
            "测试": "测试报告、测试用例",
            "文档编写": "技术文档、用户手册",
            "部署": "部署脚本、CI/CD 配置",
            "发布": "发布版本、发布说明",
            "数据收集": "数据集、数据采集脚本",
            "数据清洗": "清洗后的数据、清洗脚本",
            "数据分析": "分析报告、可视化图表",
            "可视化": "可视化图表、仪表板",
            "报告生成": "分析报告、PPT"
        }
        
        for phase in phases:
            deliverables.append({
                "phase": phase,
                "items": deliverable_map.get(phase, "相关文档和代码")
            })
        
        return deliverables
    
    def _identify_risks(self, analysis: Dict[str, Any]) -> List[str]:
        """识别风险"""
        risks = []
        complexity = analysis.get("complexity", "medium")
        
        if complexity == "high":
            risks.append("技术复杂度高，可能需要更多时间")
            risks.append("团队协作难度大")
            risks.append("需求变更风险较高")
        elif complexity == "medium":
            risks.append("需要合理安排开发时间")
            risks.append("注意需求变更管理")
        else:
            risks.append("需求理解偏差风险")
        
        return risks
    
    def _generate_next_steps(self, phases: List[str]) -> List[str]:
        """生成下一步行动"""
        if not phases:
            return []
        
        return [
            f"1. {phases[0]}：明确需求和目标",
            f"2. {phases[1] if len(phases) > 1 else '项目规划'}：制定详细计划",
            "3. 搭建开发环境",
            "4. 开始迭代开发",
            "5. 定期评审和调整"
        ]
    
    def save_solution(self, solution: Dict[str, Any]) -> str:
        """
        保存方案
        
        Args:
            solution: 方案信息
            
        Returns:
            方案 ID
        """
        solution_id = solution["id"]
        solution_file = self.storage_dir / f"{solution_id}.json"
        
        with open(solution_file, 'w', encoding='utf-8') as f:
            json.dump(solution, f, ensure_ascii=False, indent=2)
        
        return solution_id
    
    def get_solution(self, solution_id: str) -> Optional[Dict[str, Any]]:
        """
        获取方案
        
        Args:
            solution_id: 方案 ID
            
        Returns:
            方案信息
        """
        solution_file = self.storage_dir / f"{solution_id}.json"
        
        if solution_file.exists():
            with open(solution_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return None
    
    def list_solutions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        列出所有方案
        
        Args:
            limit: 返回数量限制
            
        Returns:
            方案列表
        """
        solutions = []
        
        for solution_file in sorted(self.storage_dir.glob("*.json"), reverse=True)[:limit]:
            with open(solution_file, 'r', encoding='utf-8') as f:
                solution = json.load(f)
                solutions.append({
                    "id": solution["id"],
                    "requirement": solution["requirement"],
                    "type": solution["analysis"]["type"],
                    "generated_at": solution["generated_at"]
                })
        
        return solutions
    
    def get_templates(self) -> Dict[str, Any]:
        """获取所有模板"""
        return self.templates


# 全局实例
solution_generator_service = SolutionGeneratorService()