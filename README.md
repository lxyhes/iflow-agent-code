# AI 工作台

> 智能代码助手系统，为 Claude Code 和 Cursor CLI 提供桌面和移动端 Web UI

[![CI/CD](https://github.com/lxyhes/iflow-agent-code/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/lxyhes/iflow-agent-code/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ 特性

- 🎨 **响应式设计** - 完美支持桌面、平板和移动设备
- 💬 **交互式聊天界面** - 与 Claude Code 或 Cursor CLI 的无缝通信
- 🖥️ **集成 Shell 终端** - 通过内置 Shell 功能直接访问 CLI
- 📁 **文件浏览器** - 带语法高亮和实时编辑的交互式文件树
- 🔀 **Git 资源管理器** - 查看、暂存和提交更改，支持分支切换
- 💾 **会话管理** - 恢复对话、管理多个会话和跟踪历史
- 🤖 **TaskMaster AI 集成** - AI 驱动的任务规划、PRD 解析和工作流自动化
- 🧠 **智能需求分析** - AI 驱动的需求解析和模块关联系统
- 🔍 **代码审查服务** - 自动化代码质量检查和改进建议
- 🚀 **CI/CD 生成器** - 自动生成 CI/CD 配置文件
- 📦 **项目模板服务** - 快速创建标准化项目结构
- 🔄 **离线支持** - Service Worker 提供离线访问能力
- 🛡️ **安全防护** - 路径验证、JWT 认证、CORS 限制

## 🚀 快速开始

### 环境要求

- **Node.js**: v20 或更高版本
- **Python**: 3.10 或更高版本
- **Claude Code CLI** 或 **Cursor CLI**（可选）

### 安装

1. **克隆仓库**
```bash
git clone https://github.com/lxyhes/iflow-agent-code.git
cd iflow-agent-code
```

2. **配置环境变量**
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，设置必要的环境变量
# 特别是 JWT_SECRET（生产环境必须修改）
```

3. **安装依赖**

**后端依赖：**
```bash
pip3 install -r backend/requirements.txt
```

**前端依赖：**
```bash
cd frontend
npm install
cd ..
```

### 启动服务

#### 方式一：使用启动脚本（推荐）

**Windows:**
```bash
launch_all_fixed.bat
```

**Linux/macOS:**
```bash
./start.sh
```

这将自动：
1. 清理现有进程（端口 8090, 8000, 3001, 5173）
2. 启动 AI 工作台 CLI（端口 8090）
3. 启动 Python 后端（端口 8000，热重载）
4. 启动 Node.js 服务器（端口 3001）
5. 启动前端开发服务器（端口 5173）

#### 停止服务

**Windows:**
```bash
stop_all.bat
```

**Linux/macOS:**
```bash
./stop_all.sh
```

#### 方式二：手动启动

**1. 启动 AI 工作台 CLI:**
```bash
iflow --experimental-acp --port 8090
```

**2. 启动 Python 后端:**
```bash
export PYTHONPATH="$PWD"
python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

**3. 启动 Node.js 服务器（新终端）:**
```bash
cd frontend
npm run server
```

**4. 启动前端（新终端）:**
```bash
cd frontend
npm run dev
```

### 访问应用

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 📖 使用指南

### 基础功能

#### 1. 项目管理

- 在侧边栏中查看所有项目
- 点击 "+" 按钮创建新项目
- 选择项目进入工作区

#### 2. AI 聊天

- 在聊天界面输入消息
- 选择 AI Persona（资深架构师、黑客、合作伙伴）
- 查看实时响应和工具调用

#### 3. 文件浏览

- 在文件树中浏览项目文件
- 点击文件查看内容
- 使用代码编辑器编辑文件

#### 4. Git 操作

- 查看 Git 状态和分支
- 暂存和提交更改
- 切换分支和合并

### 高级功能

#### TaskMaster AI

```javascript
// 在聊天中使用 TaskMaster
"帮我分析这个项目并创建任务列表"
"根据 PRD 生成开发计划"
```

#### 智能需求分析

```javascript
// 分析需求文档
"分析这个需求文档并生成模块关联图"
```

#### 代码审查

```javascript
// 请求代码审查
"审查这个文件的代码质量"
```

#### CI/CD 生成

```javascript
// 生成 CI/CD 配置
"为这个项目生成 GitHub Actions 配置"
```

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置以下变量：

```bash
# 应用配置
NODE_ENV=development
PYTHON_ENV=development

# 安全配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 服务器配置
PORT=5173
BACKEND_PORT=8000
NODE_SERVER_PORT=3001

# 日志配置
LOG_LEVEL=INFO

# CORS 配置
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

# AI 配置
IFLOW_PATH=iflow
DEFAULT_MODEL=GLM-4.7
RAG_MODE=tfidf

# 缓存配置
AGENT_CACHE_MAX_SIZE=100
RAG_CACHE_MAX_SIZE=50

# 文件配置
MAX_FILE_SIZE=104857600
```

### AI Persona

系统支持三种 AI Persona：

1. **资深架构师** - 强调代码质量和最佳实践
2. **黑客** - 快速迭代，优先功能实现
3. **合作伙伴** - 友好协作的结对编程风格

## 🧪 测试

### 后端测试

```bash
cd backend

# 运行所有测试
python3 -m pytest tests/ -v

# 运行测试并生成覆盖率报告
python3 -m pytest tests/ --cov=. --cov-report=html

# 运行特定测试
python3 -m pytest tests/test_integration.py -v
```

### 前端测试

```bash
cd frontend

# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行特定测试
npm test -- Button.test.jsx
```

### 代码质量检查

**后端：**
```bash
cd backend

# Black（代码格式）
black . --check

# Pylint（代码质量）
pylint core/ app/

# Flake8（PEP8 检查）
flake8 core/ app/
```

**前端：**
```bash
cd frontend

# ESLint（代码质量）
npm run lint

# Prettier（代码格式）
npm run format
```

## 📦 构建部署

### 构建前端

```bash
cd frontend
npm run build
```

构建产物将输出到 `frontend/dist/` 目录。

### 部署到生产环境

1. **设置环境变量**
```bash
export NODE_ENV=production
export PYTHON_ENV=production
export JWT_SECRET=<your-production-secret>
```

2. **启动服务**
```bash
# 使用 systemd 或其他进程管理器
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

3. **使用 Nginx 反向代理**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /stream {
        proxy_pass http://localhost:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }

    location /shell {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🛠️ 开发指南

### 项目结构

```
iflow-agent-code/
├── backend/                    # Python 后端
│   ├── app/                   # FastAPI 应用模块
│   ├── core/                  # 核心服务模块
│   ├── tests/                 # 后端测试
│   └── migrations/            # 数据库迁移
├── frontend/                  # React 前端
│   ├── src/
│   │   ├── components/       # React 组件
│   │   ├── contexts/         # React Contexts
│   │   ├── hooks/            # 自定义 Hooks
│   │   └── utils/            # 工具函数
│   └── public/               # 静态资源
└── storage/                   # 数据存储目录
```

### 添加新功能

#### 后端

1. 在 `backend/core/` 创建新服务文件
2. 在 `backend/app/routers/` 创建新路由
3. 在 `backend/tests/` 添加测试

#### 前端

1. 在 `frontend/src/components/` 创建新组件
2. 在 `frontend/src/utils/api.js` 添加 API 调用
3. 在 `frontend/src/components/__tests__/` 添加测试

### 代码规范

- **Python**: 遵循 PEP 8，使用 Black 格式化
- **JavaScript/React**: 使用 ESLint 和 Prettier
- **提交信息**: 遵循 Conventional Commits

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Claude Code](https://claude.ai/code) - AI 编程助手
- [Cursor](https://cursor.sh) - AI 代码编辑器
- [FastAPI](https://fastapi.tiangolo.com/) - 现代 Python Web 框架
- [React](https://react.dev/) - 用户界面库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具

## 📞 联系方式

- GitHub: https://github.com/lxyhes/iflow-agent-code
- Issues: https://github.com/lxyhes/iflow-agent-code/issues

## 🗺️ 路线图

- [ ] 完整的用户权限管理系统
- [ ] 审计日志功能
- [ ] 性能监控和告警
- [ ] 更多 AI 模型支持
- [ ] 插件系统
- [ ] 多语言支持

---

**注意**: 本项目仍在积极开发中，API 可能会有变化。建议在生产环境使用前进行充分测试。