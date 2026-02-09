# AI 工作台

> 智能开发助手平台 - AI 驱动的全能开发工作台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.12.0-green.svg)]()

## ✨ 项目简介

**AI 工作台** 是一个集成多种 AI 能力的智能开发助手平台，为开发者提供一站式的 AI 辅助开发体验。平台融合了 AI 对话、代码审查、智能面试、项目管理等 30+ 功能，帮助开发者提升 50% 以上的开发效率。

## 🎯 核心特性

### 💬 AI 对话与代码助手
- **智能对话** - 支持多模型 AI 对话（GLM-4.7、GPT-5 等）
- **代码补全** - AI 驱动的智能代码补全
- **代码审查** - 自动化代码质量检查和改进建议
- **错误分析** - 智能错误定位和自动修复
- **重构建议** - AI 辅助代码重构优化

### 🎓 智能面试系统
- **多智能体面试** - 技术、HR、行为、系统设计多维度面试
- **面试高手模式** - AI 生成高分回答策略
- **深度追问** - 智能生成深度技术追问
- **压力面试** - 模拟高压面试环境
- **面试复盘** - AI 驱动的面试分析和改进建议
- **STAR 法则训练** - 行为面试技巧训练
- **薪资谈判** - AI 辅助薪资谈判策略

### 📊 项目管理
- **智能需求分析** - AI 驱动的需求解析和模块关联
- **TaskMaster** - AI 任务规划和工作流自动化
- **项目模板** - 快速创建标准化项目结构
- **PRD 编辑** - 产品需求文档智能编辑
- **工作流编辑** - 可视化工作流设计

### 🔧 开发工具
- **Git 集成** - 完整的 Git 操作支持
- **文件浏览器** - 带语法高亮的交互式文件树
- **代码编辑器** - 集成 CodeMirror 6 编辑器
- **差异查看** - 可视化代码差异对比
- **Snippet 管理** - 代码片段管理
- **Prompt 管理** - AI 提示词管理

### 🧠 AI 能力扩展
- **RAG 检索增强** - 支持 TF-IDF 和 ChromaDB 两种模式
- **上下文图可视化** - 代码上下文关系图谱
- **思维导图** - AI 生成思维导图
- **OCR 识别** - 图片文字智能识别
- **数据库查询** - AI 辅助数据库查询
- **CI/CD 生成** - 自动生成 CI/CD 配置

### 🤝 协作与集成
- **协作面板** - 团队协作功能
- **GitHub 集成** - 无缝集成 GitHub
- **MCP 工具** - Model Context Protocol 工具支持
- **AI SDK** - 深度集成 AI 工作台 AI SDK

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + Vite
- **路由**: React Router DOM
- **状态管理**: React Context API
- **UI 组件**: Tailwind CSS + Lucide React
- **代码编辑器**: CodeMirror 6
- **终端模拟**: xterm.js
- **图表**: React Flow + Mermaid

### 后端（Python）
- **框架**: FastAPI + Uvicorn
- **AI 集成**: AI SDK
- **数据库**: SQLite
- **认证**: JWT + bcrypt

### 后端（Java）
- **框架**: Spring Boot 3.2.0
- **AI 集成**: AI SDK
- **数据库**: SQLite + JPA
- **WebSocket**: Spring WebSocket

## 🚀 快速开始

### 环境要求
- **Node.js**: v20 或更高版本
- **Python**: 3.10 或更高版本
- **Java**: 17 或更高版本

### 安装

1. **克隆仓库**
```bash
git clone https://github.com/lxyhes/iflow-agent-code.git
cd iflow-agent-code
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，设置必要的环境变量
```

3. **安装依赖**

**前端依赖：**
```bash
cd frontend
npm install
cd ..
```

**Python 后端依赖：**
```bash
pip3 install -r backend/requirements.txt
```

**Java 后端依赖：**
```bash
cd backend-java
mvn install
cd ..
```

### 启动服务

**使用启动脚本（推荐）：**

Linux/macOS:
```bash
./start.sh
```

Windows:
```bash
launch_all_fixed.bat
```

**手动启动：**

1. 启动 AI CLI（端口 8090）
2. 启动 Python 后端（端口 8000）
3. 启动 Java 后端（端口 8080）
4. 启动前端（端口 5173）

### 访问应用
- **前端界面**: http://localhost:5173
- **Python 后端**: http://localhost:8000
- **Java 后端**: http://localhost:8080
- **API 文档**: http://localhost:8000/docs

## 📸 项目截图

### 主界面
![主界面](docs/screenshots/main-interface.png)

### AI 对话
![AI 对话](docs/screenshots/ai-chat.png)

### 智能面试
![智能面试](docs/screenshots/interview.png)

### 代码审查
![代码审查](docs/screenshots/code-review.png)

## 🤝 贡献指南

欢迎贡献代码！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📮 联系方式

- **GitHub**: https://github.com/lxyhes/iflow-agent-code
- **Issues**: https://github.com/lxyhes/iflow-agent-code/issues

---

**AI 工作台** - 让 AI 成为你的开发伙伴 🚀