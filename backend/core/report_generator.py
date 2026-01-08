"""
Report Generator - 智能日报/周报生成器
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
import subprocess

logger = logging.getLogger(__name__)


class ReportGenerator:
    """报告生成器 - 自动生成日报和周报"""

    def __init__(self, project_path: str):
        """
        初始化报告生成器

        Args:
            project_path: 项目根目录路径
        """
        self.project_path = Path(project_path)

    def generate_daily_report(self, date: Optional[str] = None) -> Dict:
        """
        生成日报

        Args:
            date: 日期字符串 (YYYY-MM-DD)，默认为今天

        Returns:
            包含日报内容的字典
        """
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        # 收集数据
        data = {
            'date': date,
            'commits': self._get_git_commits(date),
            'code_changes': self._analyze_code_changes(date),
            'bug_fixes': self._count_bug_fixes(date),
            'features': self._identify_new_features(date),
            'chat_history': self._get_chat_summary(date)
        }

        # 生成报告
        report = {
            'date': date,
            'summary': self._generate_summary(data),
            'details': data,
            'metrics': self._calculate_metrics(data)
        }

        return report

    def generate_weekly_report(self, start_date: Optional[str] = None) -> Dict:
        """
        生成周报

        Args:
            start_date: 开始日期字符串 (YYYY-MM-DD)，默认为本周一

        Returns:
            包含周报内容的字典
        """
        if start_date is None:
            # 获取本周一
            today = datetime.now()
            start_date = (today - timedelta(days=today.weekday())).strftime('%Y-%m-%d')

        # 收集一周的数据
        daily_reports = []
        current_date = datetime.strptime(start_date, '%Y-%m-%d')

        for i in range(7):  # 一周7天
            date_str = current_date.strftime('%Y-%m-%d')
            daily_report = self.generate_daily_report(date_str)
            daily_reports.append(daily_report)
            current_date += timedelta(days=1)

        # 汇总周报
        weekly_report = {
            'start_date': start_date,
            'end_date': (current_date - timedelta(days=1)).strftime('%Y-%m-%d'),
            'daily_reports': daily_reports,
            'summary': self._generate_weekly_summary(daily_reports),
            'metrics': self._calculate_weekly_metrics(daily_reports)
        }

        return weekly_report

    def _get_git_commits(self, date: str) -> List[Dict]:
        """获取指定日期的 Git 提交"""
        commits = []

        try:
            # 获取指定日期的提交
            result = subprocess.run(
                ['git', 'log', '--since', f'{date} 00:00:00', '--until', f'{date} 23:59:59',
                 '--pretty=format:%H|%an|%ae|%ad|%s', '--date=iso'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        parts = line.split('|')
                        if len(parts) >= 5:
                            commits.append({
                                'hash': parts[0],
                                'author': parts[1],
                                'email': parts[2],
                                'date': parts[3],
                                'message': parts[4]
                            })
        except Exception as e:
            logger.warning(f"获取 Git 提交失败: {e}")

        return commits

    def _analyze_code_changes(self, date: str) -> Dict:
        """分析代码变更"""
        changes = {
            'lines_added': 0,
            'lines_deleted': 0,
            'files_changed': [],
            'file_types': {}
        }

        try:
            # 获取代码统计
            result = subprocess.run(
                ['git', 'log', '--since', f'{date} 00:00:00', '--until', f'{date} 23:59:59',
                 '--pretty=format:', '--numstat'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                files_changed = set()
                for line in result.stdout.strip().split('\n'):
                    if line:
                        parts = line.split('\t')
                        if len(parts) >= 3:
                            added = int(parts[0]) if parts[0] != '-' else 0
                            deleted = int(parts[1]) if parts[1] != '-' else 0
                            file_path = parts[2]

                            changes['lines_added'] += added
                            changes['lines_deleted'] += deleted
                            files_changed.add(file_path)

                            # 统计文件类型
                            file_ext = Path(file_path).suffix
                            if file_ext:
                                changes['file_types'][file_ext] = changes['file_types'].get(file_ext, 0) + 1

                changes['files_changed'] = list(files_changed)
        except Exception as e:
            logger.warning(f"分析代码变更失败: {e}")

        return changes

    def _count_bug_fixes(self, date: str) -> int:
        """统计 Bug 修复数量"""
        bug_fixes = 0

        try:
            commits = self._get_git_commits(date)
            bug_keywords = ['fix', 'bug', 'issue', 'error', 'crash', 'patch', 'hotfix']

            for commit in commits:
                message = commit['message'].lower()
                if any(keyword in message for keyword in bug_keywords):
                    bug_fixes += 1
        except Exception as e:
            logger.warning(f"统计 Bug 修复失败: {e}")

        return bug_fixes

    def _identify_new_features(self, date: str) -> List[str]:
        """识别新功能"""
        features = []

        try:
            commits = self._get_git_commits(date)
            feature_keywords = ['feat', 'feature', 'add', 'new', 'implement', 'create']

            for commit in commits:
                message = commit['message'].lower()
                if any(keyword in message for keyword in feature_keywords):
                    features.append(commit['message'])
        except Exception as e:
            logger.warning(f"识别新功能失败: {e}")

        return features

    def _get_chat_summary(self, date: str) -> List[str]:
        """获取聊天记录摘要"""
        # 这里可以从数据库或日志文件中读取聊天记录
        # 暂时返回空列表
        return []

    def _generate_summary(self, data: Dict) -> str:
        """生成日报摘要"""
        summary_parts = []

        # 提交信息
        commit_count = len(data['commits'])
        if commit_count > 0:
            summary_parts.append(f"提交了 {commit_count} 次代码")

        # 代码变更
        lines_changed = data['code_changes']['lines_added'] + data['code_changes']['lines_deleted']
        if lines_changed > 0:
            summary_parts.append(f"修改了 {lines_changed} 行代码")

        # Bug 修复
        if data['bug_fixes'] > 0:
            summary_parts.append(f"修复了 {data['bug_fixes']} 个 Bug")

        # 新功能
        if data['features']:
            summary_parts.append(f"新增了 {len(data['features'])} 个功能")

        if summary_parts:
            return "，".join(summary_parts) + "。"
        else:
            return "今日无代码活动。"

    def _generate_weekly_summary(self, daily_reports: List[Dict]) -> str:
        """生成周报摘要"""
        total_commits = sum(len(report['details']['commits']) for report in daily_reports)
        total_lines = sum(
            report['details']['code_changes']['lines_added'] + report['details']['code_changes']['lines_deleted']
            for report in daily_reports
        )
        total_bugs = sum(report['details']['bug_fixes'] for report in daily_reports)
        total_features = sum(len(report['details']['features']) for report in daily_reports)

        summary_parts = []

        if total_commits > 0:
            summary_parts.append(f"本周共提交 {total_commits} 次")

        if total_lines > 0:
            summary_parts.append(f"修改 {total_lines} 行代码")

        if total_bugs > 0:
            summary_parts.append(f"修复 {total_bugs} 个 Bug")

        if total_features > 0:
            summary_parts.append(f"新增 {total_features} 个功能")

        if summary_parts:
            return "，".join(summary_parts) + "。"
        else:
            return "本周无代码活动。"

    def _calculate_metrics(self, data: Dict) -> Dict:
        """计算指标"""
        return {
            'commit_count': len(data['commits']),
            'lines_changed': data['code_changes']['lines_added'] + data['code_changes']['lines_deleted'],
            'files_changed': len(data['code_changes']['files_changed']),
            'bug_fixes': data['bug_fixes'],
            'new_features': len(data['features']),
            'productivity_score': self._calculate_productivity_score(data)
        }

    def _calculate_weekly_metrics(self, daily_reports: List[Dict]) -> Dict:
        """计算周指标"""
        total_metrics = {
            'commit_count': 0,
            'lines_changed': 0,
            'files_changed': 0,
            'bug_fixes': 0,
            'new_features': 0,
            'daily_activity': []
        }

        for report in daily_reports:
            metrics = report['metrics']
            total_metrics['commit_count'] += metrics['commit_count']
            total_metrics['lines_changed'] += metrics['lines_changed']
            total_metrics['files_changed'] += metrics['files_changed']
            total_metrics['bug_fixes'] += metrics['bug_fixes']
            total_metrics['new_features'] += metrics['new_features']
            total_metrics['daily_activity'].append({
                'date': report['date'],
                'commits': metrics['commit_count'],
                'lines': metrics['lines_changed']
            })

        return total_metrics

    def _calculate_productivity_score(self, data: Dict) -> float:
        """计算生产力分数 (0-100)"""
        score = 0

        # 提交分数 (0-30分)
        commit_count = len(data['commits'])
        if commit_count > 0:
            score += min(commit_count * 5, 30)

        # 代码变更分数 (0-40分)
        lines_changed = data['code_changes']['lines_added'] + data['code_changes']['lines_deleted']
        if lines_changed > 0:
            score += min(lines_changed / 10, 40)

        # Bug 修复分数 (0-20分)
        score += min(data['bug_fixes'] * 10, 20)

        # 新功能分数 (0-10分)
        score += min(len(data['features']) * 5, 10)

        return min(score, 100)


# 创建全局实例
_report_generator_cache = {}


def get_report_generator(project_path: str) -> ReportGenerator:
    """
    获取报告生成器实例（带缓存）

    Args:
        project_path: 项目路径

    Returns:
        ReportGenerator 实例
    """
    if project_path not in _report_generator_cache:
        _report_generator_cache[project_path] = ReportGenerator(project_path)
    return _report_generator_cache[project_path]
