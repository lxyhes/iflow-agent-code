"""
知识点检索技能

检索技术知识点、最佳实践、常见面试题等
"""

from typing import Optional, Dict, Any, List
from ...integrations.agentscope_wrapper import (
    AgentScopeSkill,
    SkillParameter,
    SkillOutput,
    SkillContext,
)


class KnowledgeRetrievalSkill(AgentScopeSkill):
    """
    知识点检索技能
    
    检索技术知识点、算法原理、最佳实践等
    """
    
    def __init__(self):
        super().__init__(
            name="knowledge_retrieval",
            description="检索技术知识点、算法原理、最佳实践等",
            parameters=[
                SkillParameter(
                    name="query",
                    description="检索查询",
                    type=str,
                    required=True,
                    example="快速排序的时间复杂度",
                ),
                SkillParameter(
                    name="category",
                    description="知识分类",
                    type=str,
                    required=False,
                    default=None,
                    enum=["algorithm", "data_structure", "system_design", "database", "network"],
                ),
                SkillParameter(
                    name="limit",
                    description="返回结果数量",
                    type=int,
                    required=False,
                    default=3,
                ),
            ],
            output=SkillOutput(
                description="检索结果，包含相关知识点",
                type=list,
            ),
            tags=["technical", "knowledge", "retrieval", "reference"],
            version="1.0.0",
        )
        
        # 内置知识库（简化版）
        self._knowledge_base = self._init_knowledge_base()
    
    def _init_knowledge_base(self) -> Dict[str, List[Dict]]:
        """初始化知识库"""
        return {
            "algorithm": [
                {
                    "title": "快速排序",
                    "content": "快速排序是一种分治算法，平均时间复杂度 O(n log n)，最坏情况 O(n²)",
                    "tags": ["sorting", "divide_and_conquer"],
                    "complexity": {"time": "O(n log n)", "space": "O(log n)"},
                },
                {
                    "title": "归并排序",
                    "content": "归并排序是稳定排序，时间复杂度始终为 O(n log n)",
                    "tags": ["sorting", "stable", "divide_and_conquer"],
                    "complexity": {"time": "O(n log n)", "space": "O(n)"},
                },
                {
                    "title": "二分查找",
                    "content": "在有序数组中查找元素，时间复杂度 O(log n)",
                    "tags": ["search", "binary"],
                    "complexity": {"time": "O(log n)", "space": "O(1)"},
                },
                {
                    "title": "动态规划",
                    "content": "通过存储子问题解来避免重复计算，适用于最优子结构问题",
                    "tags": ["optimization", "memoization"],
                    "complexity": {"time": "因问题而异", "space": "因问题而异"},
                },
                {
                    "title": "深度优先搜索 (DFS)",
                    "content": "沿着树的深度遍历，使用栈或递归实现",
                    "tags": ["graph", "tree", "traversal"],
                    "complexity": {"time": "O(V + E)", "space": "O(V)"},
                },
                {
                    "title": "广度优先搜索 (BFS)",
                    "content": "沿着树的宽度遍历，使用队列实现，适合找最短路径",
                    "tags": ["graph", "tree", "traversal", "shortest_path"],
                    "complexity": {"time": "O(V + E)", "space": "O(V)"},
                },
            ],
            "data_structure": [
                {
                    "title": "哈希表",
                    "content": "提供 O(1) 的平均查找时间，通过哈希函数映射键到值",
                    "tags": ["hash", "dictionary", "map"],
                    "complexity": {"access": "O(1)", "insert": "O(1)", "delete": "O(1)"},
                },
                {
                    "title": "二叉搜索树",
                    "content": "左子树所有节点小于根，右子树所有节点大于根",
                    "tags": ["tree", "binary", "search"],
                    "complexity": {"access": "O(log n)", "insert": "O(log n)", "delete": "O(log n)"},
                },
                {
                    "title": "堆",
                    "content": "完全二叉树，父节点大于（小于）子节点，用于优先队列",
                    "tags": ["heap", "priority_queue", "tree"],
                    "complexity": {"insert": "O(log n)", "extract_min": "O(log n)", "peek": "O(1)"},
                },
                {
                    "title": "红黑树",
                    "content": "自平衡二叉搜索树，保证 O(log n) 的操作时间",
                    "tags": ["tree", "balanced", "self_balancing"],
                    "complexity": {"access": "O(log n)", "insert": "O(log n)", "delete": "O(log n)"},
                },
            ],
            "system_design": [
                {
                    "title": "负载均衡",
                    "content": "将请求分发到多个服务器，提高系统可用性和性能",
                    "tags": ["scalability", "availability"],
                    "methods": ["轮询", "加权轮询", "最少连接", "IP哈希"],
                },
                {
                    "title": "缓存策略",
                    "content": "使用缓存减少数据库访问，提高响应速度",
                    "tags": ["performance", "cache"],
                    "strategies": ["LRU", "LFU", "FIFO", "TTL"],
                },
                {
                    "title": "数据库分片",
                    "content": "将数据分布到多个数据库实例，支持水平扩展",
                    "tags": ["database", "sharding", "scalability"],
                    "methods": ["水平分片", "垂直分片"],
                },
            ],
            "database": [
                {
                    "title": "数据库索引",
                    "content": "加速数据检索的数据结构，B+树是常见实现",
                    "tags": ["index", "performance"],
                    "types": ["B-Tree", "Hash", "Bitmap", "Full-text"],
                },
                {
                    "title": "事务 ACID",
                    "content": "原子性、一致性、隔离性、持久性，保证数据完整性",
                    "tags": ["transaction", "consistency"],
                },
                {
                    "title": "SQL 优化",
                    "content": "通过索引、查询重写、执行计划分析优化 SQL 性能",
                    "tags": ["performance", "optimization"],
                },
            ],
            "network": [
                {
                    "title": "TCP 三次握手",
                    "content": "建立 TCP 连接的过程：SYN -> SYN-ACK -> ACK",
                    "tags": ["tcp", "connection"],
                },
                {
                    "title": "HTTP 状态码",
                    "content": "2xx 成功，3xx 重定向，4xx 客户端错误，5xx 服务器错误",
                    "tags": ["http", "status_code"],
                },
                {
                    "title": "RESTful API",
                    "content": "基于 HTTP 的 API 设计风格，使用 URL 表示资源",
                    "tags": ["api", "rest", "http"],
                    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                },
            ],
        }
    
    async def execute(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 3,
        context: Optional[SkillContext] = None,
    ) -> List[Dict[str, Any]]:
        """
        检索知识点
        
        Args:
            query: 检索查询
            category: 知识分类
            limit: 返回结果数量
            context: 执行上下文
            
        Returns:
            检索结果列表
        """
        results = []
        query_lower = query.lower()
        
        # 确定检索范围
        categories_to_search = [category] if category else list(self._knowledge_base.keys())
        
        for cat in categories_to_search:
            if cat not in self._knowledge_base:
                continue
            
            for item in self._knowledge_base[cat]:
                # 计算相关性分数
                score = self._calculate_relevance(query_lower, item)
                
                if score > 0:
                    results.append({
                        "category": cat,
                        "relevance_score": score,
                        **item,
                    })
        
        # 按相关性排序
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return results[:limit]
    
    def _calculate_relevance(self, query: str, item: Dict) -> float:
        """计算查询与知识项的相关性分数"""
        score = 0.0
        
        # 标题匹配
        title = item.get("title", "").lower()
        if query in title:
            score += 3.0
        
        # 内容匹配
        content = item.get("content", "").lower()
        if query in content:
            score += 2.0
        
        # 标签匹配
        tags = [t.lower() for t in item.get("tags", [])]
        for tag in tags:
            if query in tag or tag in query:
                score += 1.5
        
        # 关键词匹配
        keywords = query.split()
        for keyword in keywords:
            if len(keyword) > 2:  # 忽略短词
                if keyword in title:
                    score += 1.0
                if keyword in content:
                    score += 0.5
        
        return score
