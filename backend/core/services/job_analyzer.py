"""
招聘信息分析服务

使用LLM解析爬取的招聘网页内容，提取结构化信息。
"""

import json
import logging
from typing import Dict, Any, List
import asyncio
import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.core.services.llm_adapter import get_llm_service

logger = logging.getLogger(__name__)


class JobAnalyzer:
    """招聘信息分析器"""

    def __init__(self):
        self.llm = get_llm_service()

    async def analyze_job_content(self, page_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        分析招聘网页内容

        Args:
            page_data: 爬取的页面数据，包含title, text, structured等

        Returns:
            结构化的职位信息
        """
        # 首先尝试使用结构化数据
        structured = page_data.get('structured', {})
        site_type = page_data.get('site_type', 'unknown')

        # 如果结构化数据完整，直接使用
        if self._is_structured_complete(structured):
            logger.info(f"使用结构化数据，来源: {site_type}")
            return self._format_result(structured)

        # 否则使用LLM解析
        logger.info(f"使用LLM解析，来源: {site_type}")
        return await self._analyze_with_llm(page_data)

    def _is_structured_complete(self, structured: Dict[str, Any]) -> bool:
        """检查结构化数据是否完整"""
        required_fields = ['job_title', 'company', 'description']
        return all(structured.get(field) for field in required_fields)

    async def _analyze_with_llm(self, page_data: Dict[str, Any]) -> Dict[str, Any]:
        """使用LLM解析页面内容"""
        text_content = page_data.get('text', '')[:8000]  # 限制长度
        page_title = page_data.get('title', '')

        prompt = f"""请从以下招聘网页内容中提取结构化信息。

页面标题: {page_title}

页面内容:
{text_content}

请提取以下信息并以JSON格式返回:
{{
    "job_title": "职位名称",
    "company": "公司名称",
    "location": "工作地点",
    "salary": "薪资范围",
    "experience": "经验要求",
    "education": "学历要求",
    "skills": ["技能1", "技能2", ...],
    "responsibilities": ["职责1", "职责2", ...],
    "requirements": ["要求1", "要求2", ...],
    "benefits": ["福利1", "福利2", ...]
}}

注意:
1. 如果某项信息不存在，返回空字符串或空数组
2. skills应该是技术技能列表，如Python、Java、React等
3. responsibilities是岗位职责列表
4. requirements是任职要求列表
5. 只返回JSON，不要其他内容"""

        # 重试机制
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await self.llm.complete(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                )

                # 解析JSON响应
                content = response.get('content', '')
                
                # 检查是否包含错误
                if content.startswith('Error:'):
                    logger.error(f"LLM返回错误: {content}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1 * (attempt + 1))  # 指数退避
                        continue
                    return self._create_empty_result()
                
                # 提取JSON部分
                json_start = content.find('{')
                json_end = content.rfind('}') + 1

                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    result = json.loads(json_str)
                    return self._format_result(result)
                else:
                    logger.warning("LLM返回的内容不包含JSON")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1 * (attempt + 1))
                        continue
                    return self._create_empty_result()

            except json.JSONDecodeError as e:
                logger.error(f"JSON解析失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                    continue
                return self._create_empty_result()
            except Exception as e:
                logger.error(f"LLM解析失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                    continue
                return self._create_empty_result()

        return self._create_empty_result()

    def _format_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """格式化结果"""
        return {
            'job_title': data.get('job_title', ''),
            'company': data.get('company', ''),
            'location': data.get('location', ''),
            'salary': data.get('salary', ''),
            'experience': data.get('experience', ''),
            'education': data.get('education', ''),
            'skills': data.get('skills', []),
            'responsibilities': data.get('responsibilities', []),
            'requirements': data.get('requirements', []),
            'benefits': data.get('benefits', []),
        }

    def _create_empty_result(self) -> Dict[str, Any]:
        """创建空结果"""
        return {
            'job_title': '',
            'company': '',
            'location': '',
            'salary': '',
            'experience': '',
            'education': '',
            'skills': [],
            'responsibilities': [],
            'requirements': [],
            'benefits': [],
        }

    async def extract_skills(self, text: str) -> List[str]:
        """
        从文本中提取技能关键词

        Args:
            text: 输入文本

        Returns:
            技能列表
        """
        prompt = f"""请从以下文本中提取所有技术技能关键词。

文本内容:
{text[:2000]}

请返回技能列表，格式为JSON数组:
["技能1", "技能2", "技能3", ...]

注意:
1. 只包含技术技能，如编程语言、框架、工具等
2. 不要包含软技能如"沟通能力"、"团队合作"等
3. 只返回JSON数组，不要其他内容"""

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await self.llm.complete(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                )

                content = response.get('content', '')
                
                if content.startswith('Error:'):
                    logger.error(f"LLM返回错误: {content}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1 * (attempt + 1))
                        continue
                    return []
                
                # 提取JSON数组
                json_start = content.find('[')
                json_end = content.rfind(']') + 1

                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    skills = json.loads(json_str)
                    return skills if isinstance(skills, list) else []
                else:
                    return []

            except Exception as e:
                logger.error(f"提取技能失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                    continue
                return []

        return []

    async def generate_interview_questions(
        self,
        job_analysis: Dict[str, Any],
        num_questions: int = 5
    ) -> List[Dict[str, Any]]:
        """
        基于职位分析生成面试问题

        Args:
            job_analysis: 职位分析结果
            num_questions: 问题数量

        Returns:
            面试问题列表
        """
        job_title = job_analysis.get('job_title', '')
        skills = job_analysis.get('skills', [])
        responsibilities = job_analysis.get('responsibilities', [])
        requirements = job_analysis.get('requirements', [])

        # 如果信息不足，返回空列表
        if not job_title or not skills:
            logger.warning("职位信息不足，无法生成面试问题")
            return []

        prompt = f"""基于以下职位信息生成{num_questions}个面试问题。

职位: {job_title}

技能要求: {', '.join(skills)}

岗位职责:
{chr(10).join(f"- {r}" for r in responsibilities[:5])}

任职要求:
{chr(10).join(f"- {r}" for r in requirements[:5])}

请生成面试问题，格式为JSON数组:
[
    {{
        "type": "technical" | "behavioral" | "system_design" | "experience",
        "question": "问题内容",
        "expected_points": ["期望回答要点1", "期望回答要点2", ...],
        "difficulty": "easy" | "medium" | "hard"
    }},
    ...
]

要求:
1. 问题应该针对该职位的技能要求
2. 包含技术问题、行为问题和经验问题
3. 难度分布合理（简单:中等:困难 = 2:2:1）
4. 只返回JSON数组，不要其他内容"""

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await self.llm.complete(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                )

                content = response.get('content', '')
                
                if content.startswith('Error:'):
                    logger.error(f"LLM返回错误: {content}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1 * (attempt + 1))
                        continue
                    return []
                
                # 提取JSON数组
                json_start = content.find('[')
                json_end = content.rfind(']') + 1

                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    questions = json.loads(json_str)
                    return questions if isinstance(questions, list) else []
                else:
                    logger.warning("LLM返回的内容不包含JSON数组")
                    return []

            except json.JSONDecodeError as e:
                logger.error(f"JSON解析失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                    continue
                return []
            except Exception as e:
                logger.error(f"生成面试问题失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                    continue
                return []

        return []


# 便捷函数
async def analyze_job_page(page_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    便捷函数：分析招聘网页

    Args:
        page_data: 页面数据

    Returns:
        分析结果
    """
    analyzer = JobAnalyzer()
    return await analyzer.analyze_job_content(page_data)
