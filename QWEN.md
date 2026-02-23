# AI 工作台 (IFlow Agent) - 项目上下文文档

## 📋 项目概述

**AI 工作台** 是一个智能开发助手平台，为 Claude Code、Cursor CLI 和 iFlow CLI 提供桌面和移动端 Web UI。系统融合了 AI 对话、代码审查、智能面试、项目管理等 30+ 功能，帮助开发者提升开发效率。

### 核心特性
- 💬 **AI 对话与代码助手** - 支持多模型 AI 对话、代码补全、代码审查、错误分析
- 🎓 **智能面试系统** - 多智能体面试、面试高手模式、深度追问、压力面试、STAR 法则训练
- 📊 **项目管理** - 智能需求分析、TaskMaster 任务规划、项目模板、PRD 编辑
- 🔧 **开发工具** - Git 集成、文件浏览器、代码编辑器、Snippet 管理、Prompt 管理
- 🧠 **AI 能力扩展** - RAG 检索增强、OCR 识别、工作流编辑器、数据库查询
- 🤝 **协作集成** - GitHub 集成、MCP 工具、AI SDK 深度集成

---

## 🏗️ 技术架构

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端** | React + Vite | React 18, Vite 7.0.4 |
| **UI 框架** | Tailwind CSS + Lucide React | 3.4.0 + 0.515.0 |
| **代码编辑器** | CodeMirror 6 + @uiw/react-codemirror | 4.23.13 |
| **终端模拟** | xterm.js | 5.5.0 |
| **Python 后端** | FastAPI + Uvicorn | - |
| **Java 后端** | Spring Boot | 3.2.0 |
| **数据库** | SQLite + JPA/Hibernate | - |
| **AI 集成** | iFlow SDK, AgentScope, Spring AI Alibaba | 1.0.5, 1.0.8, 1.1.2.0 |
| **认证** | JWT + bcrypt | - |

### 项目结构

```
iflow-agent-code/
├── backend-python/           # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── dependencies.py  # 依赖注入
│   │   ├── utils.py         # 工具函数
│   │   └── routers/         # API 路由模块
│   ├── core/                # 核心服务模块 (80+ 服务)
│   │   ├── services/        # 业务服务
│   │   ├── providers/       # AI 提供商
│   │   ├── interview_agents/ # 面试智能体
│   │   ├── interview_engine/ # 面试引擎
│   │   └── integrations/    # 集成模块
│   └── requirements.txt     # Python 依赖
│
├── backend-java/            # Java Spring Boot 后端 (主后端)
│   ├── src/main/java/com/iflow/agent/
│   │   ├── controller/      # 控制器 (30+ 控制器)
│   │   ├── service/         # 服务层
│   │   │   ├── ai/         # AI 服务
│   │   │   ├── file/       # 文件服务
│   │   │   ├── interview/  # 面试服务
│   │   │   └── ...
│   │   ├── domain/          # 领域模型
│   │   ├── config/          # 配置类
│   │   └── dto/             # 数据传输对象
│   ├── src/main/resources/
│   │   └── application.yml  # Spring Boot 配置
│   ├── database/            # SQLite 数据库
│   └── pom.xml              # Maven 配置
│
├── frontend/                # React 前端
│   ├── src/
│   │   ├── components/      # React 组件 (100+ 组件)
│   │   ├── contexts/        # React Contexts
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── services/        # API 服务
│   │   └── utils/           # 工具函数
│   ├── server/              # Node.js 服务器
│   ├── package.json
│   └── vite.config.js
│
├── storage/                 # 数据存储目录
├── start.sh                 # 启动脚本 (Linux/macOS)
├── launch_all_fixed.bat     # 启动脚本 (Windows)
└── .env.example             # 环境变量示例
```

---

## 🚀 构建与运行

### 环境要求

- **Node.js**: v20+
- **Java**: 17+
- **Python**: 3.10+
- **Maven**: 3.6+
- **iFlow CLI**: 已安装 (可选)

### 快速启动

**Linux/macOS (推荐):**
```bash
./start.sh
```

**Windows:**
```bash
launch_all_fixed.bat
```

启动脚本会自动：
1. 清理占用端口 8090, 8080, 8000, 5173 的进程
2. 启动 iFlow CLI (端口 8090)
3. 启动 Java 后端 (端口 8080)
4. 启动 Python 后端 (端口 8000)
5. 启动 Node.js 服务器 (端口 3001)
6. 启动前端开发服务器 (端口 5173)

### 手动启动

**Java 后端 (主后端):**
```bash
cd backend-java
mvn spring-boot:run
```

**Python 后端:**
```bash
export PYTHONPATH="$PWD"
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5173 |
| Java 后端 API | http://localhost:8080 |
| Python 后端 API | http://localhost:8000 |
| Java API 文档 | http://localhost:8080/actuator/health |
| Python API 文档 | http://localhost:8000/docs |

### 停止服务

```bash
lsof -ti:8080 | xargs kill -9  # Java 后端
lsof -ti:8000 | xargs kill -9  # Python 后端
lsof -ti:5173 | xargs kill -9  # 前端
```

---

## 📝 开发约定

### 代码规范

#### Java (后端)
- 遵循 Google Java Style Guide
- 使用 Lombok 注解 (`@Data`, `@RequiredArgsConstructor`, `@Slf4j`)
- 使用 Spring Boot 注解 (`@Service`, `@Controller`, `@RestController`)
- **重要：所有 AI 调用必须通过 `UnifiedAIService` 进行**
- 响应式编程使用 Project Reactor (`Mono`, `Flux`)

#### Python (后端)
- 遵循 PEP 8 规范
- 使用类型注解 (Type Hints)
- 异步操作使用 `async/await`
- 使用 FastAPI 依赖注入系统

#### JavaScript/React (前端)
- 使用 ESLint 进行代码检查
- 组件使用函数式组件 + Hooks
- 使用 `class-variance-authority` 管理样式变体
- 使用 `clsx` 和 `tailwind-merge` 合并类名

### 字段命名规范 ⚠️

**前后端必须统一使用驼峰命名 (camelCase)**

| 后端字段 | 前端字段 | ❌ 错误示例 |
|---------|---------|------------|
| `fullName` | `fullName` | `full_name` |
| `startDate` | `startDate` | `start_date` |
| `isCurrent` | `isCurrent` | `is_current` |

**严禁混用命名规范**，这是导致数据丢失的常见原因。

### API 设计
- RESTful API 风格
- 所有 API 路径以 `/api/` 开头
- 流式响应使用 `text/event-stream` 格式
- WebSocket 用于实时通信 (聊天、Shell)

---

## 🔌 核心 API 端点

### AI 相关
- `GET /stream` - 流式聊天接口 (SSE)
- `POST /api/ai/chat` - AI 聊天
- `POST /api/ai/unified` - 统一 AI 调用
- `POST /api/interview-ai/master-answer` - 面试高分回答
- `POST /api/interview-ai/star-analysis` - STAR 法则分析

### 项目管理
- `GET /api/projects` - 获取项目列表
- `GET /api/projects/{name}/files` - 获取文件树
- `GET /api/projects/{name}/file` - 读取文件
- `PUT /api/projects/{name}/file` - 保存文件

### Git 操作
- `GET /api/git/status` - Git 状态
- `POST /api/git/commit` - 提交更改
- `POST /api/git/checkout` - 切换分支
- `GET /api/git/diff` - 代码差异

### 智能需求分析
- `POST /api/smart-requirements/analyze` - 分析需求
- `POST /api/smart-requirements/optimize` - 优化需求

### 简历管理
- `GET /api/resume` - 获取简历列表
- `POST /api/resume` - 创建简历
- `POST /api/resume/{id}/analyze` - 分析简历
- `POST /api/resume/{id}/optimize` - 优化简历

### 面试系统
- `POST /api/interview/sessions` - 创建面试会话
- `POST /api/interview/sessions/{id}/answer` - 提交回答
- `GET /api/interview/sessions/{id}/feedback` - 获取反馈

### 工作流
- `GET /api/workflows` - 获取工作流列表
- `POST /api/workflows` - 创建工作流
- `POST /api/workflows/{id}/execute` - 执行工作流

### WebSocket
- `WS /shell` - Shell 终端
- `WS /api/interview/ws` - 面试 WebSocket

---

## 🔧 配置说明

### 环境变量 (.env)

```bash
# 服务器配置
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0

# JWT 认证
JWT_SECRET=your-secret-key-change-this-in-production

# iFlow 配置
IFLOW_API_KEY=your-iflow-api-key
IFLOW_API_BASE_URL=https://api.iflow.cn/v1

# AI 模型
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7

# RAG 配置
RAG_MODE=tfidf

# OCR 配置
OCR_ENGINE=paddleocr
```

### Java 后端配置 (application.yml)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:sqlite:./database/agent.db

iflow:
  enabled: true
  sdk:
    url: ws://localhost:8090/acp
    timeout-seconds: 120

llm:
  provider: iflow
  default-model: glm-4
  default-temperature: 0.7

cors:
  origins: "http://localhost:5173,http://localhost:3001"
```

### 前端代理配置 (vite.config.js)

前端通过 Vite 代理路由 API 请求：
- `/api/auth`, `/api/settings`, `/api/user` → Node.js (3001)
- `/api/*` (其他) → Java Spring Boot (8080)
- `/stream`, `/shell` → Java Spring Boot (8080)

---

## 🧪 测试

### Java 后端
```bash
cd backend-java
mvn test
```

### Python 后端
```bash
cd backend-python
pytest
```

### 前端
```bash
cd frontend
npm test
```

---

## 📦 核心服务模块

### Java 后端服务

| 服务 | 说明 |
|------|------|
| `UnifiedAIService` | 统一 AI 服务层 (所有 AI 调用必须通过此服务) |
| `IFlowService` | iFlow 服务封装 |
| `SmartRequirementService` | 智能需求分析服务 |
| `InterviewService` | 面试服务 |
| `OCRService` | OCR 文字识别服务 |
| `RAGService` | RAG 检索增强服务 |
| `FileService` | 文件系统服务 |
| `WorkflowService` | 工作流服务 |

### Python 后端核心服务

| 服务 | 说明 |
|------|------|
| `code_analyzer.py` | 代码分析器 |
| `code_review_service.py` | 代码审查服务 |
| `smart_requirement_service.py` | 智能需求分析 |
| `rag_service.py` | RAG 服务 |
| `interview_engine/` | 面试引擎 |
| `workflow_service.py` | 工作流服务 |
| `path_validator.py` | 路径验证器 |
| `auto_heal_service.py` | 自动愈合服务 |

---

## 🎨 AI Persona 系统

系统支持三种 AI Persona，影响 AI 的响应风格：

1. **Senior (资深架构师)** - 强调代码质量和最佳实践
2. **Hacker (黑客)** - 快速迭代，优先功能实现
3. **Partner (合作伙伴，默认)** - 友好协作的结对编程风格

---

## ⚠️ 常见问题

### 端口被占用
```bash
lsof -ti:8080 | xargs kill -9  # Java
lsof -ti:8000 | xargs kill -9  # Python
lsof -ti:5173 | xargs kill -9  # Frontend
```

### 依赖安装失败
```bash
# Java
cd backend-java && mvn clean install

# Python
pip3 install -r backend-python/requirements.txt

# Frontend
cd frontend && rm -rf node_modules package-lock.json && npm install
```

### AI 调用失败
- 检查 iFlow CLI 是否运行：`iflow --experimental-acp --port 8090`
- 检查 `application.yml` 中的 iFlow 配置
- 查看后端日志：`tail -f backend-java/logs/application.log`

### 字段命名不一致导致数据丢失
- 前后端必须统一使用驼峰命名 (camelCase)
- 禁止使用下划线命名 (snake_case)
- 参见文档中的字段命名规范章节

---

## 📚 重要文档

| 文档 | 说明 |
|------|------|
| `README.md` / `README_ZH.md` | 项目说明 |
| `AGENTS.md` | 完整项目文档 (1000+ 行) |
| `IMPLEMENTATION_PLAN.md` | 实施计划 |
| `system_design.md` | 系统设计文档 |
| `start.sh` / `launch_all_fixed.bat` | 启动脚本 |
| `.env.example` | 环境变量示例 |

---

## 🔐 安全性

- **路径验证**: 所有文件系统操作必须通过 `PathValidator` 验证
- **认证**: JWT 进行用户认证
- **CORS**: 配置允许的跨域请求
- **项目注册表**: 使用 `project_registry` 防止路径遍历攻击
- **SQL 注入防护**: 使用 JPA/Hibernate ORM 框架
- **XSS 防护**: React 自动转义输出

---

*最后更新：2026 年 2 月 23 日*
