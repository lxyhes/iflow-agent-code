"""
智能日报/周报生成器 (Enhanced Report Generator)
基于代码变更、Git 提交、会话记录自动生成报告
"""

import re
import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger("EnhancedReportGenerator")


class EnhancedReportGenerator:
    """增强的报告生成器"""
    
    def __init__(self):
        self.activity_cache = {}
    
    async def generate_daily_report(
        self,
        project_path: str,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        生成日报
        
        Args:
            project_path: 项目路径
            date: 日期字符串 (YYYY-MM-DD)，默认为今天
        
        Returns:
            日报内容
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        
        target_date = datetime.strptime(date, "%Y-%m-%d")
        
        report = {
            "type": "daily",
            "date": date,
            "project_path": project_path,
            "summary": "",
            "sections": {
                "code_changes": [],
                "commits": [],
                "bug_fixes": [],
                "new_features": [],
                "sessions": [],
                "metrics": {}
            },
            "total_lines_changed": 0,
            "total_files_changed": 0
        }
        
        # 获取 Git 提交记录
        try:
            import subprocess
            result = subprocess.run(
                ["git", "log", f"--since={date} 00:00:00", f"--until={date} 23:59:59", "--pretty=format:%h|%s|%an|%ad", "--date=iso"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                commits = []
                for line in result.stdout.strip().split('\n'):
                    if line:
                        parts = line.split('|')
                        if len(parts) >= 4:
                            commits.append({
                                "hash": parts[0],
                                "message": parts[1],
                                "author": parts[2],
                                "date": parts[3]
                            })
                
                report["sections"]["commits"] = commits
                report["total_files_changed"] = len(commits)
        except Exception as e:
            logger.error(f"Failed to get git commits: {e}")
        
        # 分析提交消息，分类工作内容
        for commit in report["sections"]["commits"]:
            message = commit["message"].lower()
            
            if any(keyword in message for keyword in ["fix", "bug", "修复", "错误"]):
                report["sections"]["bug_fixes"].append(commit)
            elif any(keyword in message for keyword in ["feat", "add", "new", "新增", "添加"]):
                report["sections"]["new_features"].append(commit)
            else:
                report["sections"]["code_changes"].append(commit)
        
        # 获取代码变更统计
        try:
            result = subprocess.run(
                ["git", "diff", "--stat", f"{date} 00:00:00", f"{date} 23:59:59"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # 解析变更统计
                stat_match = re.search(r'(\d+) files? changed.*(\d+) insertions.*(\d+) deletions', result.stdout)
                if stat_match:
                    report["total_lines_changed"] = int(stat_match.group(2)) + int(stat_match.group(3))
                    report["total_files_changed"] = int(stat_match.group(1))
        except Exception as e:
            logger.error(f"Failed to get git diff stat: {e}")
        
        # 获取会话记录
        try:
            from backend.core.project_manager import project_manager
            sessions = project_manager.get_sessions(project_path, limit=10)
            
            # 筛选当天的会话
            target_date_str = date
            today_sessions = [
                s for s in sessions 
                if s.get("createdAt", "").startswith(target_date_str)
            ]
            
            report["sections"]["sessions"] = today_sessions
        except Exception as e:
            logger.error(f"Failed to get sessions: {e}")
        
        # 生成摘要
        report["summary"] = self._generate_daily_summary(report)
        
        # 生成指标
        report["sections"]["metrics"] = {
            "commits_count": len(report["sections"]["commits"]),
            "bug_fixes_count": len(report["sections"]["bug_fixes"]),
            "new_features_count": len(report["sections"]["new_features"]),
            "sessions_count": len(report["sections"]["sessions"]),
            "lines_changed": report["total_lines_changed"],
            "files_changed": report["total_files_changed"]
        }
        
        return report
    
    async def generate_weekly_report(
        self,
        project_path: str,
        start_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        生成周报
        
        Args:
            project_path: 项目路径
            start_date: 开始日期字符串 (YYYY-MM-DD)，默认为本周一
        
        Returns:
            周报内容
        """
        if start_date is None:
            # 获取本周一
            today = datetime.now()
            start_date = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
        
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = start_dt + timedelta(days=6)
        end_date = end_dt.strftime("%Y-%m-%d")
        
        report = {
            "type": "weekly",
            "start_date": start_date,
            "end_date": end_date,
            "project_path": project_path,
            "summary": "",
            "sections": {
                "daily_summaries": [],
                "highlights": [],
                "commits": [],
                "bug_fixes": [],
                "new_features": [],
                "sessions": [],
                "metrics": {}
            },
            "total_lines_changed": 0,
            "total_files_changed": 0
        }
        
        # 获取本周每天的日报
        current_date = start_dt
        while current_date <= end_dt:
            date_str = current_date.strftime("%Y-%m-%d")
            daily_report = await self.generate_daily_report(project_path, date_str)
            
            if daily_report["sections"]["commits"]:
                report["sections"]["daily_summaries"].append({
                    "date": date_str,
                    "commits_count": len(daily_report["sections"]["commits"]),
                    "lines_changed": daily_report["total_lines_changed"]
                })
            
            # 合并数据
            report["sections"]["commits"].extend(daily_report["sections"]["commits"])
            report["sections"]["bug_fixes"].extend(daily_report["sections"]["bug_fixes"])
            report["sections"]["new_features"].extend(daily_report["sections"]["new_features"])
            report["sections"]["sessions"].extend(daily_report["sections"]["sessions"])
            report["total_lines_changed"] += daily_report["total_lines_changed"]
            report["total_files_changed"] += daily_report["total_files_changed"]
            
            current_date += timedelta(days=1)
        
        # 生成周报亮点
        report["sections"]["highlights"] = self._generate_weekly_highlights(report)
        
        # 生成摘要
        report["summary"] = self._generate_weekly_summary(report)
        
        # 生成指标
        report["sections"]["metrics"] = {
            "commits_count": len(report["sections"]["commits"]),
            "bug_fixes_count": len(report["sections"]["bug_fixes"]),
            "new_features_count": len(report["sections"]["new_features"]),
            "sessions_count": len(report["sections"]["sessions"]),
            "lines_changed": report["total_lines_changed"],
            "files_changed": report["total_files_changed"],
            "active_days": len(report["sections"]["daily_summaries"])
        }
        
        return report
    
    def _generate_daily_summary(self, report: Dict[str, Any]) -> str:
        """生成日报摘要"""
        metrics = report["sections"]["metrics"]
        
        parts = []
        
        if metrics["commits_count"] > 0:
            parts.append(f"提交了 {metrics['commits_count']} 次代码")
        
        if metrics["bug_fixes_count"] > 0:
            parts.append(f"修复了 {metrics['bug_fixes_count']} 个 Bug")
        
        if metrics["new_features_count"] > 0:
            parts.append(f"新增了 {metrics['new_features_count']} 个功能")
        
        if metrics["lines_changed"] > 0:
            parts.append(f"代码变动 {metrics['lines_changed']} 行")
        
        if metrics["sessions_count"] > 0:
            parts.append(f"进行了 {metrics['sessions_count']} 次会话")
        
        if not parts:
            return "今日暂无代码提交记录"
        
        return "，".join(parts) + "。"
    
    def _generate_weekly_summary(self, report: Dict[str, Any]) -> str:
        """生成周报摘要"""
        metrics = report["sections"]["metrics"]
        
        parts = []
        
        if metrics["commits_count"] > 0:
            parts.append(f"本周共提交 {metrics['commits_count']} 次代码")
        
        if metrics["bug_fixes_count"] > 0:
            parts.append(f"修复 {metrics['bug_fixes_count']} 个 Bug")
        
        if metrics["new_features_count"] > 0:
            parts.append(f"新增 {metrics['new_features_count']} 个功能")
        
        if metrics["lines_changed"] > 0:
            parts.append(f"代码变动 {metrics['lines_changed']} 行")
        
        if metrics["active_days"] > 0:
            parts.append(f"活跃 {metrics['active_days']} 天")
        
        if not parts:
            return "本周暂无代码提交记录"
        
        return "，".join(parts) + "。"
    
    def _generate_weekly_highlights(self, report: Dict[str, Any]) -> List[str]:
        """生成周报亮点"""
        highlights = []
        
        # 最多提交的一天
        if report["sections"]["daily_summaries"]:
            max_day = max(report["sections"]["daily_summaries"], key=lambda x: x["commits_count"])
            if max_day["commits_count"] > 0:
                highlights.append(f"🔥 {max_day['date']} 是最活跃的一天，提交了 {max_day['commits_count']} 次代码")
        
        # 代码变动最大的一天
        if report["sections"]["daily_summaries"]:
            max_lines_day = max(report["sections"]["daily_summaries"], key=lambda x: x["lines_changed"])
            if max_lines_day["lines_changed"] > 0:
                highlights.append(f"📝 {max_lines_day['date']} 代码变动最大，共 {max_lines_day['lines_changed']} 行")
        
        # Bug 修复数量
        bug_count = len(report["sections"]["bug_fixes"])
        if bug_count > 0:
            highlights.append(f"🐛 本周修复了 {bug_count} 个 Bug")
        
        # 新功能数量
        feature_count = len(report["sections"]["new_features"])
        if feature_count > 0:
            highlights.append(f"✨ 本周新增了 {feature_count} 个功能")
        
        # 会话数量
        session_count = len(report["sections"]["sessions"])
        if session_count > 0:
            highlights.append(f"💬 本周进行了 {session_count} 次会话")
        
        return highlights
    
    def format_report_as_text(self, report: Dict[str, Any]) -> str:
        """将报告格式化为纯文本"""
        lines = []
        
        if report["type"] == "daily":
            lines.append(f"📅 日报 - {report['date']}")
            lines.append("=" * 50)
            lines.append(f"摘要: {report['summary']}")
            lines.append("")
            
            if report["sections"]["commits"]:
                lines.append("📝 代码提交:")
                for commit in report["sections"]["commits"]:
                    lines.append(f"  • {commit['hash']}: {commit['message']}")
                lines.append("")
            
            if report["sections"]["bug_fixes"]:
                lines.append("🐛 Bug 修复:")
                for fix in report["sections"]["bug_fixes"]:
                    lines.append(f"  • {fix['hash']}: {fix['message']}")
                lines.append("")
            
            if report["sections"]["new_features"]:
                lines.append("✨ 新功能:")
                for feature in report["sections"]["new_features"]:
                    lines.append(f"  • {feature['hash']}: {feature['message']}")
                lines.append("")
            
            lines.append("📊 统计:")
            metrics = report["sections"]["metrics"]
            lines.append(f"  • 提交次数: {metrics['commits_count']}")
            lines.append(f"  • Bug 修复: {metrics['bug_fixes_count']}")
            lines.append(f"  • 新功能: {metrics['new_features_count']}")
            lines.append(f"  • 代码变动: {metrics['lines_changed']} 行")
            lines.append(f"  • 会话次数: {metrics['sessions_count']}")
        
        elif report["type"] == "weekly":
            lines.append(f"📅 周报 - {report['start_date']} 至 {report['end_date']}")
            lines.append("=" * 50)
            lines.append(f"摘要: {report['summary']}")
            lines.append("")
            
            if report["sections"]["highlights"]:
                lines.append("🌟 本周亮点:")
                for highlight in report["sections"]["highlights"]:
                    lines.append(f"  {highlight}")
                lines.append("")
            
            if report["sections"]["daily_summaries"]:
                lines.append("📊 每日活跃度:")
                for summary in report["sections"]["daily_summaries"]:
                    lines.append(f"  • {summary['date']}: {summary['commits_count']} 次提交, {summary['lines_changed']} 行变动")
                lines.append("")
            
            lines.append("📊 统计:")
            metrics = report["sections"]["metrics"]
            lines.append(f"  • 提交次数: {metrics['commits_count']}")
            lines.append(f"  • Bug 修复: {metrics['bug_fixes_count']}")
            lines.append(f"  • 新功能: {metrics['new_features_count']}")
            lines.append(f"  • 代码变动: {metrics['lines_changed']} 行")
            lines.append(f"  • 会话次数: {metrics['sessions_count']}")
            lines.append(f"  • 活跃天数: {metrics['active_days']}")
        
        return "\n".join(lines)


# 全局实例
_enhanced_report_generator = None


def get_enhanced_report_generator() -> EnhancedReportGenerator:
    """获取增强报告生成器实例"""
    global _enhanced_report_generator
    if _enhanced_report_generator is None:
        _enhanced_report_generator = EnhancedReportGenerator()
    return _enhanced_report_generator
