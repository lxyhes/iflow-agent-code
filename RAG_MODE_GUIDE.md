# RAG 模式选择指南

## 问题

ChromaDB 默认会下载 79MB 的 ONNX 模型，速度很慢。

## 解决方案

现在支持两种 RAG 模式：

### 1. TF-IDF 模式（推荐，默认）
- ✅ **轻量级**：无需下载任何模型
- ✅ **快速**：立即可以使用
- ✅ **基于关键词**：适合精确匹配
- ⚠️ **语义理解**：不如 ChromaDB

### 2. ChromaDB 模式
- ✅ **语义检索**：更好的语义理解
- ✅ **准确性**：检索结果更准确
- ❌ **慢速**：需要下载 79MB 模型
- ❌ **首次使用**：需要等待下载

## 当前配置

在 `backend/server.py` 中，默认配置为：

```python
global_config = {
    "rag_mode": "tfidf"  # 使用 TF-IDF 模式
}
```

## 如何切换模式

### 切换到 ChromaDB 模式（更好的语义检索）

编辑 `backend/server.py`：

```python
global_config = {
    "rag_mode": "chromadb"  # 使用 ChromaDB 模式
}
```

然后重启后端服务。

### 切换到 TF-IDF 模式（快速启动）

编辑 `backend/server.py`：

```python
global_config = {
    "rag_mode": "tfidf"  # 使用 TF-IDF 模式
}
```

然后重启后端服务。

## 清除缓存

如果切换模式，建议清除 RAG 缓存：

```bash
# Windows PowerShell
cd E:\zhihui-soft\agent_project\storage\rag
Get-ChildItem | Remove-Item -Recurse -Force
```

注意：如果文件被占用，需要先停止后端服务。

## 推荐使用场景

### 使用 TF-IDF 模式：
- 🚀 快速测试和开发
- 💻 低配置环境
- 🎯 精确关键词搜索
- ⚡ 需要立即使用

### 使用 ChromaDB 模式：
- 🧠 需要语义理解
- 📊 大型项目
- 🔍 模糊搜索需求
- 💪 有充足时间下载模型

## 性能对比

| 特性 | TF-IDF | ChromaDB |
|------|--------|----------|
| 首次启动 | 即时 | 需下载 79MB |
| 索引速度 | 快 | 中等 |
| 检索速度 | 快 | 中等 |
| 语义理解 | 弱 | 强 |
| 准确性 | 中等 | 高 |
| 内存占用 | 低 | 高 |

## 当前状态

- **默认模式**: TF-IDF
- **依赖**: scikit-learn ✅
- **状态**: 可用

## 下次启动

重启后端服务后，将使用 TF-IDF 模式，无需等待下载模型。