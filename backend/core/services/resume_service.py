"""
简历服务核心模块

提供简历管理、AI优化、职位匹配等功能的核心服务。
"""

import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

import sys
import os

project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.core.database import get_db, init_tables
from backend.core.services.llm_adapter import get_llm_service

logger = logging.getLogger(__name__)


class ResumeService:
    """简历服务类"""

    def __init__(self):
        self.db = get_db()
        self.llm = get_llm_service()
        self._init_tables()

    def _init_tables(self):
        """初始化简历相关表"""
        # 简历主表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resumes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                target_position TEXT,
                template TEXT DEFAULT 'modern',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # 个人信息表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_personal_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id TEXT NOT NULL,
                full_name TEXT,
                email TEXT,
                phone TEXT,
                location TEXT,
                summary TEXT,
                avatar TEXT,
                FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
            )
        """)

        # 工作经历表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_work_experience (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id TEXT NOT NULL,
                company TEXT NOT NULL,
                position TEXT NOT NULL,
                start_date TEXT,
                end_date TEXT,
                is_current BOOLEAN DEFAULT 0,
                description TEXT,
                achievements TEXT,
                FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
            )
        """)

        # 教育经历表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_education (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id TEXT NOT NULL,
                school TEXT NOT NULL,
                degree TEXT,
                major TEXT,
                start_date TEXT,
                end_date TEXT,
                FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
            )
        """)

        # 技能表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id TEXT NOT NULL,
                name TEXT NOT NULL,
                level INTEGER DEFAULT 3,
                category TEXT,
                FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
            )
        """)

        # 项目经历表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                technologies TEXT,
                role TEXT,
                achievements TEXT,
                start_date TEXT,
                end_date TEXT,
                FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
            )
        """)

    def create_resume(
        self,
        user_id: str,
        name: str,
        target_position: str = None,
        template: str = "modern",
    ) -> Dict[str, Any]:
        """创建新简历"""
        resume_id = str(uuid4())
        now = datetime.now().isoformat()

        self.db.execute(
            """INSERT INTO resumes (id, user_id, name, target_position, template, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (resume_id, user_id, name, target_position, template, now, now),
        )

        return {
            "id": resume_id,
            "user_id": user_id,
            "name": name,
            "target_position": target_position,
            "template": template,
            "created_at": now,
            "updated_at": now,
        }

    def get_resumes(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户的所有简历"""
        rows = self.db.execute(
            "SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )

        return [dict(row) for row in rows]

    def get_resume(self, resume_id: str) -> Optional[Dict[str, Any]]:
        """获取单个简历详情"""
        row = self.db.execute(
            "SELECT * FROM resumes WHERE id = ?", (resume_id,)
        ).fetchone()

        if not row:
            return None

        resume = dict(row)

        # 获取个人信息
        personal = self.db.execute(
            "SELECT * FROM resume_personal_info WHERE resume_id = ?", (resume_id,)
        ).fetchone()
        resume["personal_info"] = dict(personal) if personal else {}

        # 获取工作经历
        work_rows = self.db.execute(
            "SELECT * FROM resume_work_experience WHERE resume_id = ? ORDER BY start_date DESC",
            (resume_id,),
        )
        resume["work_experience"] = [dict(row) for row in work_rows]

        # 获取教育经历
        edu_rows = self.db.execute(
            "SELECT * FROM resume_education WHERE resume_id = ? ORDER BY start_date DESC",
            (resume_id,),
        )
        resume["education"] = [dict(row) for row in edu_rows]

        # 获取技能
        skill_rows = self.db.execute(
            "SELECT * FROM resume_skills WHERE resume_id = ? ORDER BY category, name",
            (resume_id,),
        )
        resume["skills"] = [dict(row) for row in skill_rows]

        # 获取项目经历
        project_rows = self.db.execute(
            "SELECT * FROM resume_projects WHERE resume_id = ? ORDER BY start_date DESC",
            (resume_id,),
        )
        resume["projects"] = [dict(row) for row in project_rows]

        return resume

    def update_resume(self, resume_id: str, updates: Dict[str, Any]) -> bool:
        """更新简历基本信息"""
        allowed_fields = ["name", "target_position", "template"]
        update_fields = {k: v for k, v in updates.items() if k in allowed_fields}

        if not update_fields:
            return False

        update_fields["updated_at"] = datetime.now().isoformat()

        set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
        values = list(update_fields.values()) + [resume_id]

        self.db.execute(f"UPDATE resumes SET {set_clause} WHERE id = ?", values)

        return True

    def delete_resume(self, resume_id: str) -> bool:
        """删除简历"""
        self.db.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
        return True

    def update_personal_info(self, resume_id: str, info: Dict[str, Any]) -> bool:
        """更新个人信息"""
        existing = self.db.execute(
            "SELECT id FROM resume_personal_info WHERE resume_id = ?", (resume_id,)
        ).fetchone()

        if existing:
            # 更新
            allowed_fields = [
                "full_name",
                "email",
                "phone",
                "location",
                "summary",
                "avatar",
            ]
            update_fields = {k: v for k, v in info.items() if k in allowed_fields}

            if update_fields:
                set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
                values = list(update_fields.values()) + [resume_id]

                self.db.execute(
                    f"UPDATE resume_personal_info SET {set_clause} WHERE resume_id = ?",
                    values,
                )
        else:
            # 创建
            self.db.execute(
                """INSERT INTO resume_personal_info (resume_id, full_name, email, phone, location, summary, avatar)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    resume_id,
                    info.get("full_name"),
                    info.get("email"),
                    info.get("phone"),
                    info.get("location"),
                    info.get("summary"),
                    info.get("avatar"),
                ),
            )

        self._update_resume_timestamp(resume_id)
        return True

    def add_work_experience(self, resume_id: str, experience: Dict[str, Any]) -> int:
        """添加工作经历"""
        achievements = (
            json.dumps(experience.get("achievements", []))
            if experience.get("achievements")
            else None
        )

        cursor = self.db.execute(
            """INSERT INTO resume_work_experience 
               (resume_id, company, position, start_date, end_date, is_current, description, achievements)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                resume_id,
                experience["company"],
                experience["position"],
                experience.get("start_date"),
                experience.get("end_date"),
                experience.get("is_current", False),
                experience.get("description"),
                achievements,
            ),
        )

        self._update_resume_timestamp(resume_id)
        return cursor.lastrowid

    def update_work_experience(self, exp_id: int, experience: Dict[str, Any]) -> bool:
        """更新工作经历"""
        if "achievements" in experience:
            experience["achievements"] = json.dumps(experience["achievements"])

        allowed_fields = [
            "company",
            "position",
            "start_date",
            "end_date",
            "is_current",
            "description",
            "achievements",
        ]
        update_fields = {k: v for k, v in experience.items() if k in allowed_fields}

        if not update_fields:
            return False

        set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
        values = list(update_fields.values()) + [exp_id]

        self.db.execute(
            f"UPDATE resume_work_experience SET {set_clause} WHERE id = ?", values
        )

        # 获取 resume_id 以更新时间戳
        row = self.db.execute(
            "SELECT resume_id FROM resume_work_experience WHERE id = ?", (exp_id,)
        ).fetchone()
        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def delete_work_experience(self, exp_id: int) -> bool:
        """删除工作经历"""
        row = self.db.execute(
            "SELECT resume_id FROM resume_work_experience WHERE id = ?", (exp_id,)
        ).fetchone()

        self.db.execute("DELETE FROM resume_work_experience WHERE id = ?", (exp_id,))

        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def add_education(self, resume_id: str, education: Dict[str, Any]) -> int:
        """添加教育经历"""
        cursor = self.db.execute(
            """INSERT INTO resume_education 
               (resume_id, school, degree, major, start_date, end_date)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                resume_id,
                education["school"],
                education.get("degree"),
                education.get("major"),
                education.get("start_date"),
                education.get("end_date"),
            ),
        )

        self._update_resume_timestamp(resume_id)
        return cursor.lastrowid

    def update_education(self, edu_id: int, education: Dict[str, Any]) -> bool:
        """更新教育经历"""
        allowed_fields = ["school", "degree", "major", "start_date", "end_date"]
        update_fields = {k: v for k, v in education.items() if k in allowed_fields}

        if not update_fields:
            return False

        set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
        values = list(update_fields.values()) + [edu_id]

        self.db.execute(
            f"UPDATE resume_education SET {set_clause} WHERE id = ?", values
        )

        row = self.db.execute(
            "SELECT resume_id FROM resume_education WHERE id = ?", (edu_id,)
        ).fetchone()
        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def delete_education(self, edu_id: int) -> bool:
        """删除教育经历"""
        row = self.db.execute(
            "SELECT resume_id FROM resume_education WHERE id = ?", (edu_id,)
        ).fetchone()

        self.db.execute("DELETE FROM resume_education WHERE id = ?", (edu_id,))

        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def add_skill(self, resume_id: str, skill: Dict[str, Any]) -> int:
        """添加技能"""
        cursor = self.db.execute(
            """INSERT INTO resume_skills (resume_id, name, level, category)
               VALUES (?, ?, ?, ?)""",
            (
                resume_id,
                skill["name"],
                skill.get("level", 3),
                skill.get("category", "技术"),
            ),
        )

        self._update_resume_timestamp(resume_id)
        return cursor.lastrowid

    def update_skill(self, skill_id: int, skill: Dict[str, Any]) -> bool:
        """更新技能"""
        allowed_fields = ["name", "level", "category"]
        update_fields = {k: v for k, v in skill.items() if k in allowed_fields}

        if not update_fields:
            return False

        set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
        values = list(update_fields.values()) + [skill_id]

        self.db.execute(f"UPDATE resume_skills SET {set_clause} WHERE id = ?", values)

        row = self.db.execute(
            "SELECT resume_id FROM resume_skills WHERE id = ?", (skill_id,)
        ).fetchone()
        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def delete_skill(self, skill_id: int) -> bool:
        """删除技能"""
        row = self.db.execute(
            "SELECT resume_id FROM resume_skills WHERE id = ?", (skill_id,)
        ).fetchone()

        self.db.execute("DELETE FROM resume_skills WHERE id = ?", (skill_id,))

        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def add_project(self, resume_id: str, project: Dict[str, Any]) -> int:
        """添加项目经历"""
        technologies = (
            json.dumps(project.get("technologies", []))
            if project.get("technologies")
            else None
        )
        achievements = (
            json.dumps(project.get("achievements", []))
            if project.get("achievements")
            else None
        )

        cursor = self.db.execute(
            """INSERT INTO resume_projects 
               (resume_id, name, description, technologies, role, achievements, start_date, end_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                resume_id,
                project["name"],
                project.get("description"),
                technologies,
                project.get("role"),
                achievements,
                project.get("start_date"),
                project.get("end_date"),
            ),
        )

        self._update_resume_timestamp(resume_id)
        return cursor.lastrowid

    def update_project(self, project_id: int, project: Dict[str, Any]) -> bool:
        """更新项目经历"""
        if "technologies" in project:
            project["technologies"] = json.dumps(project["technologies"])
        if "achievements" in project:
            project["achievements"] = json.dumps(project["achievements"])

        allowed_fields = [
            "name",
            "description",
            "technologies",
            "role",
            "achievements",
            "start_date",
            "end_date",
        ]
        update_fields = {k: v for k, v in project.items() if k in allowed_fields}

        if not update_fields:
            return False

        set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
        values = list(update_fields.values()) + [project_id]

        self.db.execute(f"UPDATE resume_projects SET {set_clause} WHERE id = ?", values)

        row = self.db.execute(
            "SELECT resume_id FROM resume_projects WHERE id = ?", (project_id,)
        ).fetchone()
        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def delete_project(self, project_id: int) -> bool:
        """删除项目经历"""
        row = self.db.execute(
            "SELECT resume_id FROM resume_projects WHERE id = ?", (project_id,)
        ).fetchone()

        self.db.execute("DELETE FROM resume_projects WHERE id = ?", (project_id,))

        if row:
            self._update_resume_timestamp(row["resume_id"])

        return True

    def _update_resume_timestamp(self, resume_id: str):
        """更新简历时间戳"""
        self.db.execute(
            "UPDATE resumes SET updated_at = ? WHERE id = ?",
            (datetime.now().isoformat(), resume_id),
        )

    async def optimize_resume(
        self, resume_id: str, job_description: str = None
    ) -> Dict[str, Any]:
        """AI优化简历"""
        resume = self.get_resume(resume_id)
        if not resume:
            return {"error": "简历不存在"}

        # 构建简历文本
        resume_text = self._build_resume_text(resume)

        # 构建提示词
        prompt = f"""请作为一名专业的HR和简历优化专家，对以下简历进行优化。

原始简历内容：
{resume_text}

"""
        if job_description:
            prompt += f"""目标职位描述：
{job_description}

请根据目标职位的要求，对简历进行针对性优化。
"""

        prompt += """
请提供以下优化建议（以JSON格式返回）：
{
  "summary_improvements": "个人简介的改进建议",
  "experience_improvements": [
    {
      "company": "公司名称",
      "suggestions": "该段工作经历的优化建议"
    }
  ],
  "skills_to_add": ["建议添加的技能"],
  "skills_to_emphasize": ["需要重点突出的技能"],
  "keywords_to_include": ["应该包含的关键词"],
  "overall_score": 85,
  "suggestions": ["总体优化建议列表"]
}
"""

        try:
            response = await self.llm.generate(prompt)

            # 尝试解析JSON
            try:
                result = json.loads(response)
                return result
            except:
                return {"raw_response": response, "error": "无法解析AI响应为JSON格式"}
        except Exception as e:
            logger.error(f"AI优化简历失败: {e}")
            return {"error": f"AI优化失败: {str(e)}"}

    async def match_job(self, resume_id: str, job_description: str) -> Dict[str, Any]:
        """简历与职位匹配分析"""
        resume = self.get_resume(resume_id)
        if not resume:
            return {"error": "简历不存在"}

        # 提取简历技能
        resume_skills = [s["name"].lower() for s in resume.get("skills", [])]
        resume_text = self._build_resume_text(resume)

        prompt = f"""请分析以下简历与目标职位的匹配度。

简历内容：
{resume_text}

目标职位描述：
{job_description}

请提供详细的匹配分析（以JSON格式返回）：
{{
  "match_score": 75,
  "matching_skills": ["匹配的技能列表"],
  "missing_skills": ["缺失的关键技能"],
  "skill_gaps": [
    {{
      "skill": "技能名称",
      "importance": "high/medium/low",
      "suggestion": "如何弥补该技能差距"
    }}
  ],
  "experience_match": {{
    "score": 80,
    "analysis": "工作经历匹配度分析",
    "suggestions": "工作经历改进建议"
  }},
  "overall_assessment": "总体评估和建议",
  "interview_readiness": 70,
  "priority_actions": ["优先采取的行动建议"]
}}
"""

        try:
            response = await self.llm.generate(prompt)

            try:
                result = json.loads(response)
                return result
            except:
                return {"raw_response": response, "error": "无法解析AI响应为JSON格式"}
        except Exception as e:
            logger.error(f"职位匹配分析失败: {e}")
            return {"error": f"匹配分析失败: {str(e)}"}

    async def generate_cover_letter(
        self, resume_id: str, company: str, position: str, job_description: str = None
    ) -> str:
        """生成求职信"""
        resume = self.get_resume(resume_id)
        if not resume:
            return "错误：简历不存在"

        resume_text = self._build_resume_text(resume)

        prompt = f"""请根据以下简历内容，为目标职位生成一封专业的求职信。

简历内容：
{resume_text}

目标公司：{company}
目标职位：{position}

"""
        if job_description:
            prompt += f"""职位描述：
{job_description}

"""

        prompt += """
要求：
1. 求职信应该专业、简洁、有说服力
2. 突出与目标职位最相关的经验和技能
3. 展示对公司的了解和热情
4. 控制在400-500字左右
5. 使用正式的商务信函格式

请直接返回求职信内容。
"""

        try:
            response = await self.llm.generate(prompt)
            return response
        except Exception as e:
            logger.error(f"生成求职信失败: {e}")
            return f"生成求职信失败: {str(e)}"

    def _build_resume_text(self, resume: Dict[str, Any]) -> str:
        """将简历构建为文本格式"""
        text = []

        # 个人信息
        personal = resume.get("personal_info", {})
        if personal:
            text.append(f"姓名: {personal.get('full_name', '')}")
            text.append(f"邮箱: {personal.get('email', '')}")
            text.append(f"电话: {personal.get('phone', '')}")
            text.append(f"所在地: {personal.get('location', '')}")
            if personal.get("summary"):
                text.append(f"\n个人简介:\n{personal['summary']}")

        # 工作经历
        work_exp = resume.get("work_experience", [])
        if work_exp:
            text.append("\n工作经历:")
            for exp in work_exp:
                text.append(f"\n{exp.get('company', '')} - {exp.get('position', '')}")
                text.append(
                    f"时间: {exp.get('start_date', '')} 至 {exp.get('end_date', '至今')}"
                )
                if exp.get("description"):
                    text.append(f"描述: {exp['description']}")
                if exp.get("achievements"):
                    try:
                        achievements = json.loads(exp["achievements"])
                        text.append("主要成就:")
                        for ach in achievements:
                            text.append(f"  - {ach}")
                    except:
                        pass

        # 教育经历
        education = resume.get("education", [])
        if education:
            text.append("\n教育经历:")
            for edu in education:
                text.append(f"\n{edu.get('school', '')}")
                text.append(f"学位: {edu.get('degree', '')} - {edu.get('major', '')}")
                text.append(
                    f"时间: {edu.get('start_date', '')} 至 {edu.get('end_date', '')}"
                )

        # 技能
        skills = resume.get("skills", [])
        if skills:
            text.append("\n技能:")
            for skill in skills:
                level = "★" * skill.get("level", 3)
                text.append(
                    f"  - {skill.get('name', '')} ({skill.get('category', '技术')}) - {level}"
                )

        # 项目经历
        projects = resume.get("projects", [])
        if projects:
            text.append("\n项目经历:")
            for proj in projects:
                text.append(f"\n{proj.get('name', '')}")
                if proj.get("role"):
                    text.append(f"角色: {proj['role']}")
                if proj.get("technologies"):
                    try:
                        techs = json.loads(proj["technologies"])
                        text.append(f"技术栈: {', '.join(techs)}")
                    except:
                        pass
                if proj.get("description"):
                    text.append(f"描述: {proj['description']}")

        return "\n".join(text)


# 全局服务实例
_resume_service = None


def get_resume_service() -> ResumeService:
    """获取简历服务实例"""
    global _resume_service
    if _resume_service is None:
        _resume_service = ResumeService()
    return _resume_service
