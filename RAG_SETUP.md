# RAG 功能设置指南

## 当前状态

根据测试结果，您的系统已配置如下：

- ✅ **chromadb**: 已安装 (v0.4.22)
- ✅ **scikit-learn**: 已安装 (v1.6.1)
- ❌ **sentence-transformers**: 未安装（可选）

## RAG 功能已可用！

您的系统已经可以使用 RAG 功能了。当前配置：

- 使用 **ChromaDB** 作为向量数据库
- 使用 **TF-IDF** 作为轻量级检索备选方案
- 不生成语义嵌入（需要 sentence-transformers）

## 可选：安装 sentence-transformers

如果您想要更好的语义检索效果，可以安装 sentence-transformers：

```bash
pip install sentence-transformers
```

安装后，RAG 将使用语义嵌入进行更准确的检索。

## 使用说明

### 1. 启动后端服务

确保后端服务正在运行：

```bash
cd agent_project
python backend/server.py
```

或使用热部署模式：

```bash
cd agent_project
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 在前端使用 RAG

1. 打开前端应用：http://localhost:5173
2. 点击侧边栏的 "RAG" 标签
3. 点击 "索引项目文档（增量）" 按钮开始索引
4. 索引完成后，可以在搜索框中输入查询
5. AI 对话时会自动使用 RAG 检索相关文档

### 3. 索引模式

- **增量索引**：只索引变更的文件，速度快
- **强制重新索引**：重新索引所有文件，适合首次使用或数据损坏时

## 功能特性

### 已实现的功能

1. **智能索引**
   - 基于文件哈希的增量更新
   - 支持多种编程语言（Python、JavaScript、TypeScript、Java、Go、Rust）
   - 自动提取代码结构（函数、类、导入）
   - 生成文档摘要

2. **混合检索**
   - BM25 关键词检索（TF-IDF）
   - 语义检索（需要 sentence-transformers）
   - 结果融合和重排序

3. **AI 对话集成**
   - 智能判断是否需要 RAG 检索
   - 自动提供相关文档上下文
   - 低相关性结果过滤

4. **轻量级备选方案**
   - 当 ChromaDB 不可用时自动降级到 TF-IDF
   - 无需大型嵌入模型即可使用

## 故障排除

### 问题：索引失败，提示缺少依赖

**解决方案**：
```bash
pip install chromadb
# 或
pip install scikit-learn
```

### 问题：前端显示 "解析 RAG 进度数据失败"

**解决方案**：这通常是网络问题，请检查：
1. 后端服务是否正常运行
2. 防火墙是否阻止了连接
3. 浏览器控制台是否有其他错误

### 问题：检索结果不准确

**解决方案**：
1. 安装 sentence-transformers 获得更好的语义检索
2. 尝试使用更具体的查询词
3. 检查是否已正确索引项目文件

## 性能优化建议

1. **首次索引**：使用 "强制重新索引" 建立完整索引
2. **日常更新**：使用 "增量索引" 只更新变更文件
3. **大项目**：考虑分批索引或增加服务器内存
4. **检索速度**：使用 TF-IDF 模式（已安装 scikit-learn）比 ChromaDB 更快

## 技术细节

### 存储位置

RAG 索引数据存储在：
```
agent_project/storage/rag/{project_hash}/
```

### 支持的文件类型

- 代码文件：.py, .js, .ts, .jsx, .tsx, .java, .go, .rs
- 文档文件：.md, .txt, .rst
- 配置文件：.json, .yaml, .yml

### 忽略的目录

- node_modules
- __pycache__
- .git
- .vscode
- dist
- build
- target
- venv
- env

## 获取帮助

如果遇到问题，请查看：
1. 后端日志：查看控制台输出
2. 浏览器控制台：按 F12 查看错误信息
3. 运行测试脚本：`python test_rag.py` 检查依赖状态

## 更新日志

### 2026-01-12
- ✅ 添加依赖检查和轻量级备选方案
- ✅ 实现真正的增量索引
- ✅ 添加混合检索功能
- ✅ 增强 AI 对话集成
- ✅ 添加文档摘要功能
- ✅ 修复 SSE 流解析问题