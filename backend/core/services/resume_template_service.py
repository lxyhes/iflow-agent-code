"""
简历模板服务模块

提供丰富的简历模板管理功能，包括内置优质模板和自定义模板支持。
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

from backend.core.database import get_db

logger = logging.getLogger(__name__)


class ResumeTemplateService:
    """简历模板服务类"""

    def __init__(self):
        self.db = get_db()
        self._init_tables()
        self._init_builtin_templates()

    def _init_tables(self):
        """初始化模板相关表"""
        # 简历模板表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT '通用',
                preview_image TEXT,
                is_builtin BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                layout_config TEXT,
                style_config TEXT,
                color_schemes TEXT,
                font_options TEXT,
                section_order TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # 模板使用记录表
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS resume_template_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id TEXT NOT NULL,
                resume_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                used_at TEXT NOT NULL,
                FOREIGN KEY (template_id) REFERENCES resume_templates(id)
            )
        """)

    def _init_builtin_templates(self):
        """初始化内置优质模板"""
        # 检查是否已初始化
        result = self.db.execute(
            "SELECT COUNT(*) as count FROM resume_templates WHERE is_builtin = 1"
        ).fetchone()
        
        if result and result["count"] > 0:
            return

        now = datetime.now().isoformat()
        
        builtin_templates = [
            {
                "id": "modern",
                "name": "现代简约",
                "description": "简洁现代的设计，清晰的层次结构，适合大多数行业和职位",
                "category": "通用",
                "preview_image": "/templates/modern.png",
                "layout_config": json.dumps({
                    "header_style": "center",
                    "section_spacing": "medium",
                    "page_margin": "normal",
                    "max_pages": 2
                }),
                "style_config": json.dumps({
                    "primary_color": "#2563eb",
                    "secondary_color": "#64748b",
                    "background_color": "#ffffff",
                    "text_color": "#1e293b",
                    "heading_style": "bold",
                    "bullet_style": "dot"
                }),
                "color_schemes": json.dumps([
                    {"name": "经典蓝", "primary": "#2563eb", "secondary": "#64748b"},
                    {"name": "专业黑", "primary": "#1e293b", "secondary": "#475569"},
                    {"name": "活力橙", "primary": "#ea580c", "secondary": "#78716c"}
                ]),
                "font_options": json.dumps([
                    {"name": "系统默认", "heading": "system-ui", "body": "system-ui"},
                    {"name": "优雅宋体", "heading": "SimSun", "body": "SimSun"},
                    {"name": "现代黑体", "heading": "SimHei", "body": "Microsoft YaHei"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "work_experience", 
                    "projects", "education", "skills"
                ])
            },
            {
                "id": "professional",
                "name": "专业商务",
                "description": "传统商务风格，稳重专业，适合金融、咨询、法律等传统行业",
                "category": "商务",
                "preview_image": "/templates/professional.png",
                "layout_config": json.dumps({
                    "header_style": "left",
                    "section_spacing": "compact",
                    "page_margin": "narrow",
                    "max_pages": 1
                }),
                "style_config": json.dumps({
                    "primary_color": "#1e3a5f",
                    "secondary_color": "#4a5568",
                    "background_color": "#ffffff",
                    "text_color": "#2d3748",
                    "heading_style": "uppercase",
                    "bullet_style": "dash"
                }),
                "color_schemes": json.dumps([
                    {"name": "深蓝", "primary": "#1e3a5f", "secondary": "#4a5568"},
                    {"name": "墨绿", "primary": "#064e3b", "secondary": "#065f46"},
                    {"name": "酒红", "primary": "#7f1d1d", "secondary": "#991b1b"}
                ]),
                "font_options": json.dumps([
                    {"name": "经典衬线", "heading": "Georgia", "body": "Times New Roman"},
                    {"name": "商务黑体", "heading": "Arial Black", "body": "Arial"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "work_experience", 
                    "education", "skills", "projects"
                ])
            },
            {
                "id": "creative",
                "name": "创意设计",
                "description": "富有创意的设计元素，独特的排版，适合设计、艺术、创意类职位",
                "category": "创意",
                "preview_image": "/templates/creative.png",
                "layout_config": json.dumps({
                    "header_style": "sidebar",
                    "section_spacing": "relaxed",
                    "page_margin": "wide",
                    "max_pages": 2
                }),
                "style_config": json.dumps({
                    "primary_color": "#7c3aed",
                    "secondary_color": "#a78bfa",
                    "background_color": "#faf5ff",
                    "text_color": "#4c1d95",
                    "heading_style": "creative",
                    "bullet_style": "arrow"
                }),
                "color_schemes": json.dumps([
                    {"name": "紫罗兰", "primary": "#7c3aed", "secondary": "#a78bfa"},
                    {"name": "珊瑚粉", "primary": "#ec4899", "secondary": "#f472b6"},
                    {"name": "青柠绿", "primary": "#65a30d", "secondary": "#84cc16"}
                ]),
                "font_options": json.dumps([
                    {"name": "创意手写", "heading": "Brush Script MT", "body": "Comic Sans MS"},
                    {"name": "现代几何", "heading": "Futura", "body": "Helvetica"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "projects", 
                    "work_experience", "skills", "education"
                ])
            },
            {
                "id": "technical",
                "name": "技术风格",
                "description": "清晰的技术风格，突出技能和项目，适合IT、工程、研发类职位",
                "category": "技术",
                "preview_image": "/templates/technical.png",
                "layout_config": json.dumps({
                    "header_style": "two_column",
                    "section_spacing": "medium",
                    "page_margin": "normal",
                    "max_pages": 2
                }),
                "style_config": json.dumps({
                    "primary_color": "#059669",
                    "secondary_color": "#10b981",
                    "background_color": "#f0fdf4",
                    "text_color": "#064e3b",
                    "heading_style": "monospace",
                    "bullet_style": "bracket"
                }),
                "color_schemes": json.dumps([
                    {"name": "科技绿", "primary": "#059669", "secondary": "#10b981"},
                    {"name": "极客黑", "primary": "#171717", "secondary": "#404040"},
                    {"name": "代码蓝", "primary": "#0369a1", "secondary": "#0ea5e9"}
                ]),
                "font_options": json.dumps([
                    {"name": "等宽代码", "heading": "Consolas", "body": "Monaco"},
                    {"name": "系统默认", "heading": "system-ui", "body": "system-ui"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "skills", "projects", 
                    "work_experience", "education", "summary"
                ])
            },
            {
                "id": "minimal",
                "name": "极简风格",
                "description": "极简主义设计，去除多余装饰，突出重点内容，适合追求简洁的求职者",
                "category": "通用",
                "preview_image": "/templates/minimal.png",
                "layout_config": json.dumps({
                    "header_style": "clean",
                    "section_spacing": "relaxed",
                    "page_margin": "wide",
                    "max_pages": 1
                }),
                "style_config": json.dumps({
                    "primary_color": "#000000",
                    "secondary_color": "#666666",
                    "background_color": "#ffffff",
                    "text_color": "#333333",
                    "heading_style": "light",
                    "bullet_style": "minimal"
                }),
                "color_schemes": json.dumps([
                    {"name": "纯黑白", "primary": "#000000", "secondary": "#666666"},
                    {"name": "深灰", "primary": "#374151", "secondary": "#6b7280"}
                ]),
                "font_options": json.dumps([
                    {"name": "轻盈无衬线", "heading": "Helvetica Light", "body": "Helvetica Neue"},
                    {"name": "系统默认", "heading": "system-ui", "body": "system-ui"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "work_experience", 
                    "education", "skills"
                ])
            },
            {
                "id": "elegant",
                "name": "优雅精致",
                "description": "优雅精致的设计风格，细节考究，适合高端职位和管理层",
                "category": "商务",
                "preview_image": "/templates/elegant.png",
                "layout_config": json.dumps({
                    "header_style": "banner",
                    "section_spacing": "medium",
                    "page_margin": "normal",
                    "max_pages": 2
                }),
                "style_config": json.dumps({
                    "primary_color": "#92400e",
                    "secondary_color": "#b45309",
                    "background_color": "#fffbeb",
                    "text_color": "#451a03",
                    "heading_style": "elegant",
                    "bullet_style": "ornament"
                }),
                "color_schemes": json.dumps([
                    {"name": "香槟金", "primary": "#92400e", "secondary": "#b45309"},
                    {"name": "皇家紫", "primary": "#581c87", "secondary": "#7c3aed"},
                    {"name": "深海蓝", "primary": "#1e3a8a", "secondary": "#3b82f6"}
                ]),
                "font_options": json.dumps([
                    {"name": "优雅衬线", "heading": "Playfair Display", "body": "Lora"},
                    {"name": "经典宋体", "heading": "SimSun", "body": "SimSun"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "work_experience", 
                    "education", "skills", "projects"
                ])
            },
            {
                "id": "fresh_graduate",
                "name": "应届生专属",
                "description": "专为应届生设计，突出教育背景和实习经历，弱化工作经验要求",
                "category": "学生",
                "preview_image": "/templates/fresh_graduate.png",
                "layout_config": json.dumps({
                    "header_style": "center",
                    "section_spacing": "medium",
                    "page_margin": "normal",
                    "max_pages": 1
                }),
                "style_config": json.dumps({
                    "primary_color": "#0891b2",
                    "secondary_color": "#22d3ee",
                    "background_color": "#ecfeff",
                    "text_color": "#164e63",
                    "heading_style": "friendly",
                    "bullet_style": "circle"
                }),
                "color_schemes": json.dumps([
                    {"name": "青春蓝", "primary": "#0891b2", "secondary": "#22d3ee"},
                    {"name": "活力绿", "primary": "#16a34a", "secondary": "#4ade80"},
                    {"name": "温暖橙", "primary": "#ea580c", "secondary": "#fb923c"}
                ]),
                "font_options": json.dumps([
                    {"name": "友好圆润", "heading": "Nunito", "body": "Open Sans"},
                    {"name": "系统默认", "heading": "system-ui", "body": "system-ui"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "education", "summary", 
                    "projects", "work_experience", "skills"
                ])
            },
            {
                "id": "executive",
                "name": "高管精英",
                "description": "专为高管和资深人士设计，突出领导力和战略思维，适合C-level职位",
                "category": "商务",
                "preview_image": "/templates/executive.png",
                "layout_config": json.dumps({
                    "header_style": "executive",
                    "section_spacing": "relaxed",
                    "page_margin": "normal",
                    "max_pages": 2
                }),
                "style_config": json.dumps({
                    "primary_color": "#1e1b4b",
                    "secondary_color": "#4338ca",
                    "background_color": "#ffffff",
                    "text_color": "#1e1b4b",
                    "heading_style": "executive",
                    "bullet_style": "square"
                }),
                "color_schemes": json.dumps([
                    {"name": "尊贵紫", "primary": "#1e1b4b", "secondary": "#4338ca"},
                    {"name": "权威黑", "primary": "#000000", "secondary": "#262626"},
                    {"name": "经典蓝", "primary": "#172554", "secondary": "#1e40af"}
                ]),
                "font_options": json.dumps([
                    {"name": "权威衬线", "heading": "Times New Roman", "body": "Georgia"},
                    {"name": "商务黑体", "heading": "Arial Black", "body": "Arial"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "work_experience", 
                    "education", "skills"
                ])
            },
            {
                "id": "academic",
                "name": "学术科研",
                "description": "适合学术和科研人员，突出论文发表、研究项目和学术成就",
                "category": "学术",
                "preview_image": "/templates/academic.png",
                "layout_config": json.dumps({
                    "header_style": "academic",
                    "section_spacing": "compact",
                    "page_margin": "normal",
                    "max_pages": 3
                }),
                "style_config": json.dumps({
                    "primary_color": "#7c2d12",
                    "secondary_color": "#9a3412",
                    "background_color": "#fff7ed",
                    "text_color": "#431407",
                    "heading_style": "academic",
                    "bullet_style": "number"
                }),
                "color_schemes": json.dumps([
                    {"name": "学术棕", "primary": "#7c2d12", "secondary": "#9a3412"},
                    {"name": "经典蓝", "primary": "#1e3a8a", "secondary": "#1e40af"}
                ]),
                "font_options": json.dumps([
                    {"name": "学术衬线", "heading": "Times New Roman", "body": "Times New Roman"},
                    {"name": "经典宋体", "heading": "SimSun", "body": "SimSun"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "education", "summary", 
                    "projects", "publications", "skills"
                ])
            },
            {
                "id": "startup",
                "name": "创业先锋",
                "description": "适合创业者和创业公司求职者，突出创新能力和多面手特质",
                "category": "创意",
                "preview_image": "/templates/startup.png",
                "layout_config": json.dumps({
                    "header_style": "dynamic",
                    "section_spacing": "medium",
                    "page_margin": "normal",
                    "max_pages": 1
                }),
                "style_config": json.dumps({
                    "primary_color": "#dc2626",
                    "secondary_color": "#f87171",
                    "background_color": "#fef2f2",
                    "text_color": "#7f1d1d",
                    "heading_style": "bold",
                    "bullet_style": "star"
                }),
                "color_schemes": json.dumps([
                    {"name": "创业红", "primary": "#dc2626", "secondary": "#f87171"},
                    {"name": "创新蓝", "primary": "#2563eb", "secondary": "#60a5fa"},
                    {"name": "活力橙", "primary": "#ea580c", "secondary": "#fb923c"}
                ]),
                "font_options": json.dumps([
                    {"name": "现代几何", "heading": "Montserrat", "body": "Open Sans"},
                    {"name": "系统默认", "heading": "system-ui", "body": "system-ui"}
                ]),
                "section_order": json.dumps([
                    "personal_info", "summary", "projects", 
                    "work_experience", "skills", "education"
                ])
            }
        ]

        for template in builtin_templates:
            self.db.execute("""
                INSERT INTO resume_templates 
                (id, name, description, category, preview_image, is_builtin, is_active,
                 layout_config, style_config, color_schemes, font_options, section_order,
                 created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?)
            """, (
                template["id"], template["name"], template["description"],
                template["category"], template["preview_image"],
                template["layout_config"], template["style_config"],
                template["color_schemes"], template["font_options"],
                template["section_order"], now, now
            ))

        logger.info(f"已初始化 {len(builtin_templates)} 个内置简历模板")

    def get_templates(self, category: str = None, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """获取模板列表"""
        query = "SELECT * FROM resume_templates WHERE 1=1"
        params = []
        
        if not include_inactive:
            query += " AND is_active = 1"
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        query += " ORDER BY is_builtin DESC, category, name"
        
        rows = self.db.execute(query, params)
        templates = []
        
        for row in rows:
            template = dict(row)
            # 解析JSON字段
            for field in ["layout_config", "style_config", "color_schemes", "font_options", "section_order"]:
                if template.get(field):
                    try:
                        template[field] = json.loads(template[field])
                    except:
                        template[field] = None
            templates.append(template)
        
        return templates

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """获取单个模板详情"""
        row = self.db.execute(
            "SELECT * FROM resume_templates WHERE id = ?",
            (template_id,)
        ).fetchone()
        
        if not row:
            return None
        
        template = dict(row)
        # 解析JSON字段
        for field in ["layout_config", "style_config", "color_schemes", "font_options", "section_order"]:
            if template.get(field):
                try:
                    template[field] = json.loads(template[field])
                except:
                    template[field] = None
        
        return template

    def get_categories(self) -> List[Dict[str, Any]]:
        """获取模板分类列表"""
        rows = self.db.execute("""
            SELECT category, COUNT(*) as count 
            FROM resume_templates 
            WHERE is_active = 1 
            GROUP BY category 
            ORDER BY count DESC
        """)
        
        return [{"name": row["category"], "count": row["count"]} for row in rows]

    def record_template_usage(self, template_id: str, resume_id: str, user_id: str):
        """记录模板使用"""
        self.db.execute("""
            INSERT INTO resume_template_usage (template_id, resume_id, user_id, used_at)
            VALUES (?, ?, ?, ?)
        """, (template_id, resume_id, user_id, datetime.now().isoformat()))

    def get_popular_templates(self, limit: int = 5) -> List[Dict[str, Any]]:
        """获取热门模板"""
        rows = self.db.execute("""
            SELECT t.*, COUNT(u.id) as usage_count
            FROM resume_templates t
            LEFT JOIN resume_template_usage u ON t.id = u.template_id
            WHERE t.is_active = 1
            GROUP BY t.id
            ORDER BY usage_count DESC, t.is_builtin DESC
            LIMIT ?
        """, (limit,))
        
        templates = []
        for row in rows:
            template = dict(row)
            for field in ["layout_config", "style_config", "color_schemes", "font_options", "section_order"]:
                if template.get(field):
                    try:
                        template[field] = json.loads(template[field])
                    except:
                        template[field] = None
            templates.append(template)
        
        return templates


# 全局服务实例
_template_service = None


def get_resume_template_service() -> ResumeTemplateService:
    """获取简历模板服务实例"""
    global _template_service
    if _template_service is None:
        _template_service = ResumeTemplateService()
    return _template_service
