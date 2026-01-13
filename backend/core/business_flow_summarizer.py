"""
业务流程总结服务
从 Git 历史总结业务流程
"""

import json
import subprocess
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
import re


class BusinessFlowSummarizer:
    """业务流程总结服务"""
    
    def __init__(self, project_path: str = None):
        """
        初始化业务流程总结服务
        
        Args:
            project_path: 项目路径
        """
        if project_path is None:
            project_root = Path(__file__).parent.parent.parent
            project_path = project_root
        
        self.project_path = Path(project_path)
        self.storage_dir = self.project_path / "storage" / "business_flow"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
    
    def _run_git_command(self, command: List[str]) -> str:
        """
        运行 Git 命令
        
        Args:
            command: Git 命令列表
            
        Returns:
            命令输出
        """
        try:
            result = subprocess.run(
                command,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            print(f"Git command failed: {e}")
            return ""
    
    def get_git_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        获取 Git 历史记录
        
        Args:
            limit: 返回数量限制
            
        Returns:
            Git 历史记录列表
        """
        # 获取提交历史
        commits = self._run_git_command([
            "git", "log", f"-{limit}", "--pretty=format:%H|%an|%ae|%ad|%s", "--date=iso"
        ])
        
        history = []
        
        for line in commits.strip().split('\n'):
            if not line:
                continue
            
            parts = line.split('|', 4)
            if len(parts) == 5:
                commit_hash, author, email, date, message = parts
                
                # 获取提交详情
                files_changed = self._run_git_command([
                    "git", "show", "--name-only", "--pretty=format:", commit_hash
                ]).strip().split('\n')
                
                # 过滤空行
                files_changed = [f for f in files_changed if f]
                
                history.append({
                    "hash": commit_hash,
                    "author": author,
                    "email": email,
                    "date": date,
                    "message": message,
                    "files_changed": files_changed
                })
        
        return history
    
    def analyze_commits(self, commits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        分析提交记录
        
        Args:
            commits: 提交记录列表
            
        Returns:
            分析结果
        """
        analysis = {
            "total_commits": len(commits),
            "contributors": {},
            "commit_types": {},
            "feature_evolution": [],
            "milestones": []
        }
        
        # 分析提交者
        for commit in commits:
            author = commit["author"]
            if author not in analysis["contributors"]:
                analysis["contributors"][author] = 0
            analysis["contributors"][author] += 1
        
        # 分析提交类型
        commit_type_pattern = r'^(\w+):'
        for commit in commits:
            match = re.match(commit_type_pattern, commit["message"])
            if match:
                commit_type = match.group(1).lower()
                if commit_type not in analysis["commit_types"]:
                    analysis["commit_types"][commit_type] = 0
                analysis["commit_types"][commit_type] += 1
        
        # 识别功能演进
        feature_keywords = {
            "RAG": ["rag", "检索", "文档"],
            "AI Agent": ["agent", "ai", "智能"],
            "代码分析": ["分析", "analyzer", "dependency"],
            "UI/UX": ["ui", "ux", "界面", "组件"],
            "API": ["api", "接口", "endpoint"],
            "性能": ["性能", "优化", "performance"],
            "测试": ["test", "测试"],
            "部署": ["deploy", "部署", "ci/cd"]
        }
        
        for commit in commits:
            message_lower = commit["message"].lower()
            for feature, keywords in feature_keywords.items():
                if any(keyword in message_lower for keyword in keywords):
                    analysis["feature_evolution"].append({
                        "feature": feature,
                        "commit": commit["hash"],
                        "date": commit["date"],
                        "message": commit["message"]
                    })
                    break
        
        # 识别里程碑
        milestone_keywords = ["initial", "release", "v1.0", "major", "complete"]
        for commit in commits:
            message_lower = commit["message"].lower()
            if any(keyword in message_lower for keyword in milestone_keywords):
                analysis["milestones"].append({
                    "commit": commit["hash"],
                    "date": commit["date"],
                    "message": commit["message"]
                })
        
        return analysis
    
    def generate_business_flow(self, limit: int = 50) -> Dict[str, Any]:
        """
        生成业务流程
        
        Args:
            limit: 分析的提交数量限制
            
        Returns:
            业务流程信息
        """
        # 获取 Git 历史
        commits = self.get_git_history(limit)
        
        # 分析提交
        analysis = self.analyze_commits(commits)
        
        # 生成业务流程
        business_flow = {
            "summary": {
                "total_commits": analysis["total_commits"],
                "total_contributors": len(analysis["contributors"]),
                "date_range": {
                    "start": commits[-1]["date"] if commits else None,
                    "end": commits[0]["date"] if commits else None
                }
            },
            "contributors": analysis["contributors"],
            "commit_types": analysis["commit_types"],
            "feature_evolution": analysis["feature_evolution"],
            "milestones": analysis["milestones"],
            "timeline": self._generate_timeline(commits),
            "generated_at": datetime.now().isoformat()
        }
        
        return business_flow
    
    def _generate_timeline(self, commits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        生成时间线
        
        Args:
            commits: 提交记录列表
            
        Returns:
            时间线
        """
        timeline = []
        
        # 按月份分组
        monthly_commits = {}
        
        for commit in commits:
            date = datetime.fromisoformat(commit["date"].replace(' ', 'T'))
            month_key = date.strftime("%Y-%m")
            
            if month_key not in monthly_commits:
                monthly_commits[month_key] = []
            
            monthly_commits[month_key].append(commit)
        
        # 生成时间线
        for month in sorted(monthly_commits.keys()):
            month_commits = monthly_commits[month]
            
            # 提取主要活动
            activities = []
            for commit in month_commits[:5]:  # 每月最多显示 5 个主要活动
                activities.append({
                    "date": commit["date"],
                    "message": commit["message"],
                    "author": commit["author"]
                })
            
            timeline.append({
                "month": month,
                "commits_count": len(month_commits),
                "activities": activities
            })
        
        return timeline
    
    def save_business_flow(self, business_flow: Dict[str, Any]) -> str:
        """
        保存业务流程
        
        Args:
            business_flow: 业务流程信息
            
        Returns:
            保存的文件路径
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = self.storage_dir / f"business_flow_{timestamp}.json"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(business_flow, f, ensure_ascii=False, indent=2)
        
        return str(file_path)
    
    def get_business_flow(self, file_path: str = None) -> Optional[Dict[str, Any]]:
        """
        获取业务流程
        
        Args:
            file_path: 文件路径（可选，如果不提供则获取最新的）
            
        Returns:
            业务流程信息
        """
        if not file_path:
            # 获取最新的文件
            files = sorted(self.storage_dir.glob("business_flow_*.json"), reverse=True)
            if not files:
                return None
            file_path = files[0]
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)


# 全局实例
business_flow_summarizer = BusinessFlowSummarizer()
