"""
功能定位 API 服务
快速定位功能并解释业务流程
"""

from typing import List, Dict, Optional, Any


class FeatureLocatorService:
    """功能定位服务"""
    
    def __init__(self):
        """初始化功能定位服务"""
        # 功能注册表
        self.feature_registry = {
            "代码片段管理器": {
                "id": "snippet_manager",
                "description": "保存、管理和快速插入常用代码片段",
                "category": "开发效率",
                "location": "frontend/src/components/SnippetManager.jsx",
                "api_endpoints": [
                    "GET /api/snippets",
                    "POST /api/snippets",
                    "GET /api/snippets/{id}",
                    "PUT /api/snippets/{id}",
                    "DELETE /api/snippets/{id}"
                ],
                "business_flow": """
                1. 用户打开代码片段管理器
                2. 浏览或搜索代码片段
                3. 选择片段查看详情
                4. 点击插入按钮将代码插入到输入框
                5. 或者复制代码到剪贴板
                """,
                "usage_tips": [
                    "按分类组织代码片段",
                    "使用标签便于搜索",
                    "收藏常用片段快速访问"
                ]
            },
            "命令快捷方式": {
                "id": "command_shortcut",
                "description": "保存常用终端命令并快速执行",
                "category": "开发效率",
                "location": "frontend/src/components/CommandShortcut.jsx",
                "api_endpoints": [
                    "GET /api/command-shortcuts",
                    "POST /api/command-shortcuts",
                    "POST /api/command-shortcuts/{id}/execute"
                ],
                "business_flow": """
                1. 用户打开命令快捷方式面板
                2. 创建新的命令快捷方式
                3. 设置命令和工作目录
                4. 点击执行按钮运行命令
                5. 查看执行结果
                """,
                "usage_tips": [
                    "支持参数化命令",
                    "可以查看执行历史",
                    "支持后台运行命令"
                ]
            },
            "代码审查": {
                "id": "code_review",
                "description": "AI 辅助代码质量、风格、安全检查",
                "category": "代码质量",
                "location": "backend/core/code_review_service.py",
                "api_endpoints": [
                    "POST /api/code-review",
                    "POST /api/code-review/pr"
                ],
                "business_flow": """
                1. 用户选择要审查的代码
                2. 系统分析代码质量、风格、安全性
                3. 生成审查报告
                4. 提供改进建议
                5. 用户根据建议修改代码
                """,
                "usage_tips": [
                    "支持多种编程语言",
                    "可以检查安全漏洞",
                    "提供性能优化建议"
                ]
            },
            "RAG 检索增强": {
                "id": "rag_retrieval",
                "description": "基于文档的智能检索增强功能",
                "category": "AI 功能",
                "location": "backend/core/rag_service.py",
                "api_endpoints": [
                    "POST /api/rag/upload",
                    "POST /api/rag/search",
                    "GET /api/rag/documents"
                ],
                "business_flow": """
                1. 用户上传文档到 RAG 系统
                2. 系统将文档分块并建立索引
                3. 用户提问时检索相关文档
                4. 将检索结果提供给 AI
                5. AI 基于检索结果生成答案
                """,
                "usage_tips": [
                    "支持多种文档格式",
                    "自动分块和索引",
                    "支持来源追溯"
                ]
            },
            "提示词管理": {
                "id": "prompt_manager",
                "description": "管理和快速插入常用提示词",
                "category": "开发效率",
                "location": "backend/core/prompt_manager_service.py",
                "api_endpoints": [
                    "GET /api/prompts",
                    "POST /api/prompts",
                    "PUT /api/prompts/{id}",
                    "DELETE /api/prompts/{id}"
                ],
                "business_flow": """
                1. 用户打开提示词管理器
                2. 创建或编辑提示词
                3. 按分类和标签组织
                4. 选择提示词插入到输入框
                5. AI 使用提示词生成内容
                """,
                "usage_tips": [
                    "按项目类型分类提示词",
                    "使用标签便于搜索",
                    "收藏常用提示词"
                ]
            },
            "业务记忆": {
                "id": "business_memory",
                "description": "记录和推荐常用功能",
                "category": "用户体验",
                "location": "backend/core/business_memory_service.py",
                "api_endpoints": [
                    "GET /api/business-memory/features",
                    "POST /api/business-memory/usage",
                    "GET /api/business-memory/recommendations"
                ],
                "business_flow": """
                1. 系统自动记录功能使用
                2. 分析使用频率和模式
                3. 基于使用习惯推荐功能
                4. 用户可以收藏常用功能
                5. 提供使用统计和历史
                """,
                "usage_tips": [
                    "系统自动记录无需手动操作",
                    "基于使用频率智能推荐",
                    "可以查看使用历史"
                ]
            },
            "聊天搜索": {
                "id": "chat_search",
                "description": "搜索聊天消息和历史记录",
                "category": "用户体验",
                "location": "frontend/src/components/ChatSearch.jsx",
                "api_endpoints": [
                    "GET /api/chat/search"
                ],
                "business_flow": """
                1. 用户打开搜索面板
                2. 输入搜索关键词
                3. 选择搜索范围和筛选条件
                4. 查看搜索结果
                5. 点击结果跳转到对应消息
                """,
                "usage_tips": [
                    "支持快捷键 Ctrl/Cmd + K",
                    "可以搜索所有会话",
                    "支持收藏消息搜索"
                ]
            },
            "快速方案生成": {
                "id": "solution_generator",
                "description": "针对需求快速给出项目方案",
                "category": "项目管理",
                "location": "backend/core/solution_generator_service.py",
                "api_endpoints": [
                    "POST /api/solutions/generate",
                    "GET /api/solutions",
                    "GET /api/solutions/{id}"
                ],
                "business_flow": """
                1. 用户输入需求描述
                2. 系统分析需求类型和复杂度
                3. 选择合适的方案模板
                4. 生成详细的项目方案
                5. 用户可以保存和分享方案
                """,
                "usage_tips": [
                    "支持多种项目类型",
                    "自动估算时间和风险",
                    "生成详细的交付物清单"
                ]
            },
            "业务流程总结": {
                "id": "business_flow_summarizer",
                "description": "从 Git 历史总结业务流程",
                "category": "项目管理",
                "location": "backend/core/business_flow_summarizer.py",
                "api_endpoints": [
                    "GET /api/business-flow/summary",
                    "GET /api/business-flow/timeline"
                ],
                "business_flow": """
                1. 系统读取 Git 提交历史
                2. 分析提交类型和贡献者
                3. 识别功能演进里程碑
                4. 生成业务流程时间线
                5. 提供可视化的流程图
                """,
                "usage_tips": [
                    "自动分析无需手动整理",
                    "识别关键里程碑",
                    "生成时间线视图"
                ]
            },
            "项目健康度仪表盘": {
                "id": "project_health",
                "description": "展示项目代码质量、测试覆盖率等指标",
                "category": "代码质量",
                "location": "frontend/src/components/ProjectHealthDashboard.jsx",
                "api_endpoints": [
                    "GET /api/project-health/{project_name}"
                ],
                "business_flow": """
                1. 系统扫描项目代码
                2. 计算各种质量指标
                3. 生成健康度评分
                4. 展示详细的指标图表
                5. 提供改进建议
                """,
                "usage_tips": [
                    "定期检查项目健康度",
                    "关注关键指标变化",
                    "根据建议改进代码"
                ]
            }
        }
    
    def locate_feature(self, query: str) -> Dict[str, Any]:
        """
        定位功能
        
        Args:
            query: 查询关键词
            
        Returns:
            功能信息
        """
        query_lower = query.lower()
        
        # 搜索匹配的功能
        matches = []
        
        for feature_name, feature_info in self.feature_registry.items():
            # 检查功能名称
            if query_lower in feature_name.lower():
                matches.append({
                    "name": feature_name,
                    "info": feature_info,
                    "match_type": "name",
                    "relevance": 1.0
                })
                continue
            
            # 检查描述
            if query_lower in feature_info["description"].lower():
                matches.append({
                    "name": feature_name,
                    "info": feature_info,
                    "match_type": "description",
                    "relevance": 0.8
                })
                continue
            
            # 检查分类
            if query_lower in feature_info["category"].lower():
                matches.append({
                    "name": feature_name,
                    "info": feature_info,
                    "match_type": "category",
                    "relevance": 0.6
                })
                continue
        
        # 按相关性排序
        matches.sort(key=lambda x: x["relevance"], reverse=True)
        
        if matches:
            return {
                "found": True,
                "query": query,
                "matches": matches,
                "best_match": matches[0]
            }
        else:
            return {
                "found": False,
                "query": query,
                "suggestions": self._get_suggestions(query)
            }
    
    def _get_suggestions(self, query: str) -> List[str]:
        """
        获取建议
        
        Args:
            query: 查询关键词
            
        Returns:
            建议列表
        """
        suggestions = []
        
        # 返回所有功能名称作为建议
        for feature_name in self.feature_registry.keys():
            suggestions.append(feature_name)
        
        return suggestions[:10]
    
    def explain_business_flow(self, feature_name: str) -> Dict[str, Any]:
        """
        解释业务流程
        
        Args:
            feature_name: 功能名称
            
        Returns:
            业务流程说明
        """
        feature_info = self.feature_registry.get(feature_name)
        
        if not feature_info:
            return {
                "found": False,
                "message": f"未找到功能: {feature_name}"
            }
        
        return {
            "found": True,
            "feature_name": feature_name,
            "description": feature_info["description"],
            "category": feature_info["category"],
            "location": feature_info["location"],
            "api_endpoints": feature_info["api_endpoints"],
            "business_flow": feature_info["business_flow"],
            "usage_tips": feature_info["usage_tips"]
        }
    
    def list_all_features(self, category: str = None) -> List[Dict[str, Any]]:
        """
        列出所有功能
        
        Args:
            category: 按分类筛选（可选）
            
        Returns:
            功能列表
        """
        features = []
        
        for feature_name, feature_info in self.feature_registry.items():
            if category and feature_info["category"] != category:
                continue
            
            features.append({
                "name": feature_name,
                "id": feature_info["id"],
                "description": feature_info["description"],
                "category": feature_info["category"]
            })
        
        return features
    
    def get_categories(self) -> List[str]:
        """获取所有分类"""
        categories = set()
        
        for feature_info in self.feature_registry.values():
            categories.add(feature_info["category"])
        
        return sorted(list(categories))


# 全局实例
feature_locator_service = FeatureLocatorService()