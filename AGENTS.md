# iFlow Agent 项目文档

## 项目概述

iFlow Agent 是一个智能代码助手系统，为 Claude Code 和 Cursor CLI 提供桌面和移动端 Web UI。该系统允许用户从任何设备（桌面或移动端）查看和管理活跃项目及会话，实现跨平台的 AI 辅助开发体验。

### 核心功能

- **响应式设计** - 完美支持桌面、平板和移动设备
- **交互式聊天界面** - 与 Claude Code 或 Cursor CLI 的无缝通信
- **集成 Shell 终端** - 通过内置 Shell 功能直接访问 CLI
- **文件浏览器** - 带语法高亮和实时编辑的交互式文件树
- **Git 资源管理器** - 查看、暂存和提交更改，支持分支切换
- **会话管理** - 恢复对话、管理多个会话和跟踪历史
- **TaskMaster AI 集成**（可选）- AI 驱动的任务规划、PRD 解析和工作流自动化
- **模型兼容性** - 支持 Claude Sonnet 4、Opus 4.1 和 GPT-5
- **智能需求分析** - AI 驱动的需求解析和模块关联系统
- **代码审查服务** - 自动化代码质量检查和改进建议
- **CI/CD 生成器** - 自动生成 CI/CD 配置文件
- **项目模板服务** - 快速创建标准化项目结构
- **安全路径验证** - 防止路径遍历攻击的安全防护机制
- **模块化后端架构** - 基于 FastAPI 的模块化路由设计
- **RAG 检索增强** - 支持 TF-IDF 和 ChromaDB 两种模式

## 技术栈

### 后端（Python）
- **框架**: FastAPI + Uvicorn
- **AI 集成**: iFlow SDK（支持 GLM-4.7 等模型）
- **数据库**: SQLite（better-sqlite3）
- **认证**: JWT + bcrypt
- **文件处理**: aiofiles, python-multipart
- **其他依赖**:
  - pydantic（数据验证）
  - requests（HTTP 客户端）
  - uvicorn（ASGI 服务器）

### 前端（JavaScript/React）
- **框架**: React 18 + Vite
- **路由**: React Router DOM
- **状态管理**: React Context API
- **UI 组件**: Tailwind CSS + Lucide React
- **代码编辑器**: CodeMirror 6
- **终端模拟**: xterm.js
- **HTTP 客户端**: @tanstack/react-query
- **实时通信**: WebSocket
- **其他关键库**:
  - react-markdown（Markdown 渲染）
  - katex（数学公式）
  - mermaid（图表）
  - idb（IndexedDB）
  - class-variance-authority（样式变体）
  - reactflow（流程图可视化）
  - react-virtuoso（虚拟列表）

### 核心服务模块

后端包含以下核心服务模块（位于 `backend/core/`）：

#### AI 与智能服务
- `agent.py` - AI 代理核心
- `llm.py` - 大语言模型接口
- `iflow_client.py` - iFlow 客户端
- `iflow_sdk_client.py` - iFlow SDK 客户端
- `prompt_optimizer.py` - Prompt 优化器
- `prompt_manager_service.py` - Prompt 管理服务

#### 代码分析与审查
- `code_analyzer.py` - 代码分析器
- `code_review_service.py` - 代码审查服务
- `code_style_analyzer.py` - 代码风格分析器
- `code_completion_service.py` - 代码补全服务
- `code_dependency_analyzer.py` - 代码依赖分析器
- `refactor_suggester.py` - 重构建议器
- `test_generator.py` - 测试生成器
- `error_analyzer.py` - 错误分析器
- `auto_fixer.py` - 自动修复服务

#### 项目与文件管理
- `project_manager.py` - 项目管理器
- `project_developer_agent.py` - 项目开发代理
- `project_template_service.py` - 项目模板服务
- `project_templates.py` - 项目模板定义
- `file_service.py` - 文件系统服务
- `dependency_analyzer.py` - 依赖分析器
- `feature_locator_service.py` - 功能定位服务

#### Git 与版本控制
- `git_service.py` - Git 操作服务

#### 文档与内容
- `doc_generator.py` - 文档生成器
- `document_classifier.py` - 文档分类器
- `document_summarizer.py` - 文档摘要器
- `document_version_manager.py` - 文档版本管理器
- `smart_chunker.py` - 智能分块器

#### 任务与工作流
- `task_master_service.py` - 任务管理服务
- `smart_requirement_service.py` - 智能需求分析服务
- `cicd_generator.py` - CI/CD 配置生成器
- `solution_generator_service.py` - 解决方案生成服务
- `business_flow_summarizer.py` - 业务流程摘要器
- `business_memory_service.py` - 业务记忆服务
- `command_shortcut_service.py` - 命令快捷键服务

#### RAG 与检索
- `rag_service.py` - RAG（检索增强生成）服务
- `context_graph_service.py` - 上下文图服务
- `snippet_service.py` - 代码片段服务

#### 系统与工具
- `shell_service.py` - Shell 会话服务
- `async_command.py` - 异步命令执行
- `sandbox_service.py` - 沙箱服务
- `health_analyzer.py` - 健康分析器
- `performance_monitor.py` - 性能监控
- `report_generator.py` - 报告生成器
- `report_generator_enhanced.py` - 增强报告生成器
- `gamification_service.py` - 游戏化服务
- `auto_heal_service.py` - 自动修复服务

#### 安全与验证
- `path_validator.py` - 路径验证器（安全防护）
- `security.py` - 安全工具
- `exceptions.py` - 自定义异常

#### 其他
- `schema.py` - 数据模型定义
- `registry.py` - 注册表
- `retry.py` - 重试机制

## 项目结构

```
iflow-agent-code/
├── backend/                    # Python 后端
│   ├── server.py              # FastAPI 主服务器（遗留）
│   ├── requirements.txt       # Python 依赖
│   ├── app/                   # FastAPI 应用模块（新架构）
│   │   ├── main.py            # 应用入口
│   │   ├── dependencies.py    # 依赖注入
│   │   ├── utils.py           # 工具函数
│   │   └── routers/           # API 路由模块
│   │       └── files.py       # 文件路由（带认证）
│   ├── core/                  # 核心服务模块（40+ 服务）
│   ├── impl/                  # 实现模块
│   │   ├── reviewer.py        # 代码审查器实现
│   │   └── tools.py           # 工具集合
│   └── tests/                 # 后端测试
│       ├── test_auto_heal_service.py
│       ├── test_gamification_service.py
│       ├── test_path_validator.py
│       ├── test_smart_requirement.py
│       ├── test_file_content_endpoint.py
│       └── test_new_features.py
├── frontend/                  # React 前端
│   ├── src/
│   │   ├── App.jsx           # 主应用组件
│   │   ├── components/       # React 组件（80+ 组件）
│   │   │   ├── chat/         # 聊天相关组件
│   │   │   ├── markdown/     # Markdown 渲染组件
│   │   │   ├── messages/     # 消息相关组件
│   │   │   ├── settings/     # 设置相关组件
│   │   │   ├── sidebar/      # 侧边栏组件
│   │   │   ├── ui/           # UI 组件
│   │   │   └── visualizations/ # 可视化组件
│   │   ├── contexts/         # React Contexts
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── lib/              # 工具库
│   │   ├── services/         # API 服务
│   │   └── utils/            # 工具函数
│   ├── server/               # Node.js 服务器
│   │   ├── index.js          # Express 服务器
│   │   ├── cli.js            # CLI 入口
│   │   ├── routes/           # Express 路由
│   │   ├── middleware/       # 中间件
│   │   └── database/         # 数据库
│   ├── public/               # 静态资源
│   ├── package.json          # Node.js 依赖
│   └── vite.config.js        # Vite 配置
├── storage/                   # 数据存储目录
├── start.sh                   # 启动脚本（Linux/macOS）
├── launch_all_fixed.bat       # 启动脚本（Windows）
├── stop_all.bat               # 停止脚本（Windows）
├── run_cli.py                 # CLI 运行脚本
├── log_viewer.py              # 日志查看器
├── IMPLEMENTATION_PLAN.md     # 实施计划
├── system_design.md           # 系统设计文档
└── AGENTS.md                  # 本文档
```

## 构建和运行

### 环境要求

- **Node.js**: v20 或更高版本
- **Python**: 3.10 或更高版本
- **Claude Code CLI** 或 **Cursor CLI**（可选）

### 快速启动

#### 方式一：使用启动脚本（推荐）

**Linux/macOS:**
```bash
./start.sh
```

**Windows:**
```bash
launch_all_fixed.bat
```

这将自动：
1. 清理现有进程（端口 8090, 8000, 5173）
2. 启动后端服务器（端口 8000，使用新的模块化入口）
3. 启动前端开发服务器（端口 5173）

#### 方式二：手动启动

**启动后端（使用新的模块化入口）：**
```bash
cd /Users/hb/Downloads/iflow-agent/iflow-agent-code
export PYTHONPATH="$PWD"
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**启动前端（新终端）：**
```bash
cd /Users/hb/Downloads/iflow-agent/iflow-agent-code/frontend
npm install  # 首次运行需要安装依赖
npm run dev
```

### 访问应用

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs（FastAPI 自动生成）

### 停止服务

```bash
# 查找并终止进程
lsof -ti:8000 | xargs kill -9  # 停止后端
lsof -ti:5173 | xargs kill -9  # 停止前端
lsof -ti:8090 | xargs kill -9  # 停止 Node.js 服务器（如果运行）
```

或使用启动脚本提供的 PID：
```bash
kill $BACKEND_PID $FRONTEND_PID
```

### 查看日志

```bash
# 后端日志
tail -f /tmp/backend.log

# 前端日志
tail -f /tmp/frontend.log
```

或使用日志查看器：
```bash
python3 log_viewer.py
```

## 开发约定

### 代码风格

#### Python（后端）
- 遵循 PEP 8 规范
- 使用类型提示（Type Hints）
- 函数和类使用文档字符串
- 异常处理使用自定义异常类（`backend/core/exceptions.py`）
- 路径操作必须通过 `PathValidator` 验证（安全防护）
- 新的 API 端点应放在 `backend/app/routers/` 中

#### JavaScript/React（前端）
- 使用 ESLint 进行代码检查
- 使用 Tailwind CSS 进行样式
- 组件使用函数式组件 + Hooks
- 使用 `class-variance-authority` 管理样式变体
- 使用 `clsx` 和 `tailwind-merge` 合并类名

### API 设计

- RESTful API 风格
- 使用 Pydantic 模型进行请求/响应验证
- WebSocket 用于实时通信（聊天、Shell）
- 所有 API 路径以 `/api/` 开头
- 流式响应使用 `text/event-stream` 格式
- 新架构支持 JWT 认证（`backend/app/routers/files.py`）

### 安全性

- **路径验证**: 所有文件系统操作必须通过 `PathValidator` 验证
- **认证**: 使用 JWT 进行用户认证（新路由）
- **CORS**: 配置允许的跨域请求
- **输入验证**: 所有用户输入必须经过验证
- **敏感信息**: 不在日志中记录敏感数据
- **项目注册表**: 使用 `project_registry` 防止路径遍历攻击

### 测试

#### 后端测试
```bash
cd backend
python3 -m pytest tests/
```

测试文件位于 `backend/tests/`，包括：
- `test_auto_heal_service.py` - 自动修复服务测试
- `test_gamification_service.py` - 游戏化服务测试
- `test_path_validator.py` - 路径验证器测试
- `test_smart_requirement.py` - 智能需求分析测试
- `test_file_content_endpoint.py` - 文件内容端点测试
- `test_new_features.py` - 新功能测试

#### 前端测试
```bash
cd frontend
npm test
```

### Git 工作流

- 使用分支进行功能开发
- 提交信息遵循 Conventional Commits 规范
- 主分支：`main`
- 提交前运行代码检查和测试

## 核心 API 端点

### 认证与配置
- `GET /api/auth/status` - 获取认证状态
- `GET /api/config` - 获取全局配置
- `POST /api/config` - 更新全局配置
- `GET /api/iflow/mcp-servers` - 获取 iFlow MCP 服务器配置
- `POST /api/iflow/sync-mcp-servers` - 同步 iFlow MCP 服务器

### 项目管理
- `GET /api/projects` - 获取项目列表
- `GET /api/validate-path` - 验证路径状态
- `GET /api/projects/{project_name}/files` - 获取项目文件树
- `GET /api/projects/{project_name}/file` - 读取文件内容
- `GET /api/projects/{project_name}/files/content` - 读取文件内容（流式）
- `PUT /api/projects/{project_name}/file` - 保存文件

### 会话管理
- `GET /api/projects/{project_name}/sessions` - 获取会话列表
- `GET /api/projects/{project_name}/sessions/{session_id}/messages` - 获取会话消息
- `PUT /api/projects/{project_name}/sessions/{session_id}` - 更新会话摘要
- `GET /api/projects/{project_name}/sessions/{session_id}/token-usage` - 获取 token 使用情况

### AI 聊天
- `GET /stream` - 流式聊天接口（SSE）
- `POST /api/review` - 代码审查
- `POST /api/solutions` - 生成解决方案

### Git 操作
- `GET /api/git/status` - 获取 Git 状态
- `GET /api/git/branches` - 获取分支列表
- `GET /api/git/remote-status` - 获取远程状态
- `GET /api/git/diff` - 获取文件差异
- `GET /api/git/commits` - 获取提交历史
- `GET /api/git/commit-diff` - 获取提交差异
- `GET /api/git/file-with-diff` - 获取带差异的文件内容
- `POST /api/git/checkout` - 切换分支
- `POST /api/git/create-branch` - 创建新分支
- `POST /api/git/commit` - 提交更改

### 智能需求分析
- `POST /api/smart-requirements/analyze` - 分析需求

### CI/CD
- `POST /api/cicd/generate` - 生成 CI/CD 配置

### TaskMaster
- `GET /api/taskmaster/tasks` - 获取任务列表
- `POST /api/taskmaster/tasks` - 创建任务

### Shell
- `WS /shell` - WebSocket Shell 终端

### 用户设置
- `GET /api/user/onboarding-status` - 获取入门状态
- `POST /api/user/complete-onboarding` - 完成入门流程

## AI Persona 系统

系统支持三种 AI Persona，影响 AI 的响应风格：

1. **Senior（资深架构师）**
   - 强调代码质量和最佳实践
   - 优先考虑可维护性和可扩展性
   - 提供详细的架构建议

2. **Hacker（黑客）**
   - 快速迭代，优先功能实现
   - 最小化样板代码
   - 实用主义导向

3. **Partner（合作伙伴）**（默认）
   - 友好协作的结对编程风格
   - 鼓励和支持用户
   - 使用"我们"语言

## 配置说明

### 全局配置（`global_config`）
```python
{
    "mode": "yolo",              # 运行模式
    "model": "GLM-4.7",          # AI 模型
    "mcp_servers": [],           # MCP 服务器列表
    "iflow_path": "iflow",       # iFlow CLI 路径
    "rag_mode": "tfidf"          # RAG 模式（"chromadb" 或 "tfidf"）
}
```

### 环境变量
- `PYTHONPATH` - Python 模块路径
- `PORT` - 前端端口（默认 5173）
- `BACKEND_PORT` - 后端端口（默认 8000）

### Vite 代理配置
前端通过 Vite 代理将 API 请求路由到正确后端：
- `/api/auth`, `/api/settings`, `/api/user` → Node.js 服务器（3001）
- `/api/*`（其他）→ Python FastAPI（8000）
- `/stream` → Python FastAPI（8000）
- `/shell` → Python FastAPI WebSocket（8000）

## 前端组件架构

### 核心组件
- `App.jsx` - 主应用组件
- `ChatInterface.jsx` - 聊天界面
- `FileTree.jsx` - 文件树
- `GitPanel.jsx` - Git 面板
- `Shell.jsx` - Shell 终端
- `Sidebar.jsx` - 侧边栏
- `MainContent.jsx` - 主内容区

### 功能组件
- `SmartRequirementAnalysis.jsx` - 智能需求分析
- `CICDGenerator.jsx` - CI/CD 生成器
- `CodeReviewPanel.jsx` - 代码审查面板
- `TaskMasterSetupWizard.jsx` - TaskMaster 向导
- `ProjectCreationWizard.jsx` - 项目创建向导
- `ProjectTemplateGenerator.jsx` - 项目模板生成器
- `BusinessFlowSummarizer.jsx` - 业务流程摘要
- `RAGPanel.jsx` - RAG 面板
- `AutoFixPanel.jsx` - 自动修复面板
- `ContextGraphViewer.jsx` - 上下文图查看器
- `MindMapViewer.jsx` - 思维导图查看器

### UI 组件
- `CommandPalette.jsx` - 命令面板
- `GlobalStatusBar.jsx` - 全局状态栏
- `FileBrowser.jsx` - 文件浏览器
- `FileViewer.jsx` - 文件查看器
- `CodeEditor.jsx` - 代码编辑器
- `DiffViewer.jsx` - 差异查看器
- `Settings.jsx` - 设置页面
- `AIPersonaSelector.jsx` - AI Persona 选择器
- `IFlowModelSelector.jsx` - iFlow 模型选择器
- `IFlowModeSelector.jsx` - iFlow 模式选择器

## 实施计划

项目正在进行模块化重构，详见 `IMPLEMENTATION_PLAN.md`：

### Stage 1: 安全加固与架构重构 ✅（已完成）
- 为文件 API 端点添加 JWT 认证
- 重构后端入口到 `backend/app/main.py`
- 保持遗留端点兼容性

### Stage 2: CI/CD 流水线（未开始）
- 添加 GitHub Actions 进行自动化测试和代码检查
- 确保 PR 触发测试
- 后端测试在 CI 中通过

### Stage 3: 完整后端模块化（未开始）
- 拆分 `server.py` 中的剩余路由（Git、Analysis、RAG）
- 清空或移除 `server.py`

## 常见问题

### 1. 端口被占用
```bash
# 查找占用端口的进程
lsof -ti:8000  # 后端
lsof -ti:5173  # 前端
lsof -ti:8090  # Node.js 服务器

# 终止进程
kill -9 <PID>
```

### 2. 依赖安装失败
```bash
# 后端
pip3 install -r backend/requirements.txt

# 前端
cd frontend
npm install
```

### 3. 数据库问题
SQLite 数据库位于 `storage/` 目录，如需重置：
```bash
rm -f storage/*.db
```

### 4. 权限问题
确保项目目录有正确的读写权限：
```bash
chmod -R 755 /Users/hb/Downloads/iflow-agent/iflow-agent-code
```

### 5. 后端启动失败
- 检查 Python 版本是否为 3.10+
- 确认 `PYTHONPATH` 已正确设置
- 查看后端日志：`tail -f /tmp/backend.log`

### 6. 前端启动失败
- 检查 Node.js 版本是否为 v20+
- 删除 `node_modules` 和 `package-lock.json` 后重新安装
- 查看前端日志：`tail -f /tmp/frontend.log`

## 扩展开发

### 添加新的后端服务

1. 在 `backend/core/` 创建新服务文件
2. 实现服务类和方法
3. 在 `backend/app/routers/` 创建新路由文件（推荐）或在 `backend/server.py` 中注册（遗留）
4. 在 `backend/tests/` 添加测试

### 添加新的前端组件

1. 在 `frontend/src/components/` 创建新组件
2. 在 `frontend/src/App.jsx` 或父组件中导入
3. 添加相应的 API 调用（`frontend/src/utils/api.js`）
4. 使用 Tailwind CSS 进行样式设计

### 集成新的 AI 模型

1. 在 `backend/core/agent.py` 中添加模型配置
2. 在 `backend/core/llm.py` 中实现模型接口
3. 更新 `global_config` 添加模型选项
4. 在前端设置页面添加模型选择器

### 添加新的 API 路由（新架构）

1. 在 `backend/app/routers/` 创建新路由文件
2. 定义路由和端点
3. 在 `backend/app/main.py` 中注册路由
4. 添加认证（如需要）

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

提交信息遵循 Conventional Commits：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

## 许可证

MIT License - 详见 LICENSE 文件

## 联系方式

- GitHub: https://github.com/lxyhes/iflow-agent-code
- Issues: https://github.com/lxyhes/iflow-agent-code/issues

---

**最后更新**: 2026-01-19
**维护者**: iFlow Agent Team
**版本**: 1.12.0