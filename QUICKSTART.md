# 快速开始指南

本指南将帮助你快速设置 iFlow Agent 开发环境并开始开发。

## 📋 前置要求

在开始之前，请确保你的系统已安装以下软件：

- **Node.js** 20.0 或更高版本
- **Python** 3.10 或更高版本
- **Git** 2.39 或更高版本
- **npm** 或 **yarn**（与 Node.js 一起安装）

### 检查版本

```bash
node --version   # 应该显示 v20.x.x 或更高
python3 --version  # 应该显示 3.10.x 或更高
git --version    # 应该显示 2.39.x 或更高
npm --version    # 应该显示 10.x.x 或更高
```

## 🚀 快速安装

### 1. 克隆仓库

```bash
git clone https://github.com/lxyhes/iflow-agent-code.git
cd iflow-agent-code
```

### 2. 安装后端依赖

```bash
cd backend
pip3 install -r requirements.txt
cd ..
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

### 4. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，填写必要的配置
# 至少需要配置：
# - JWT_SECRET
# - IFLOW_SDK_API_KEY（如果使用 iFlow SDK）
```

## 🏃 运行项目

### 方式一：使用启动脚本（推荐）

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
2. 启动后端服务器（端口 8000）
3. 启动前端开发服务器（端口 5173）

### 方式二：手动启动

**启动后端：**
```bash
cd /Users/hb/Downloads/iflow-agent/iflow-agent-code
export PYTHONPATH="$PWD"
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**启动前端（新终端）：**
```bash
cd /Users/hb/Downloads/iflow-agent/iflow-agent-code/frontend
npm run dev
```

### 访问应用

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 🛠️ 开发工具设置

### 安装 Pre-commit 钩子

Pre-commit 钩子会在每次提交前自动检查代码质量：

```bash
# 安装 pre-commit
pip3 install pre-commit

# 安装钩子
pre-commit install

# 手动运行所有钩子
pre-commit run --all-files
```

### 配置代码编辑器

#### VS Code

创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["backend/tests/"],
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[javascript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.black-formatter",
    "ms-python.pylint",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

#### WebStorm / PyCharm

1. 安装插件：
   - Python Black Formatter
   - Pylint
   - ESLint
   - Prettier

2. 配置代码风格：
   - Python：使用 Black 格式化
   - JavaScript/React：使用 Prettier 格式化

## 🧪 运行测试

### 后端测试

```bash
cd backend

# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=. --cov-report=html

# 运行特定测试文件
pytest tests/test_user_service.py

# 运行特定测试用例
pytest -k "test_create_user"
```

### 前端测试

```bash
cd frontend

# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监听模式
npm test -- --watch
```

## 📝 代码规范

### 后端（Python）

```bash
cd backend

# 格式化代码
black .
isort .

# 检查代码质量
pylint core/
mypy core/
flake8 .
```

### 前端（JavaScript/React）

```bash
cd frontend

# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,md}"
```

## 🔧 常见开发任务

### 添加新的后端服务

1. 在 `backend/core/` 创建新的服务文件
2. 实现服务类和方法
3. 添加单元测试
4. 在 `backend/app/routers/` 创建路由文件（推荐）
5. 在 `backend/app/main.py` 中注册路由
6. 更新 API 文档

### 添加新的前端组件

1. 在 `frontend/src/components/` 创建新组件
2. 实现组件逻辑和样式
3. 添加单元测试
4. 在父组件中导入并使用
5. 更新组件文档

### 添加新的 API 端点

1. 在 `backend/app/routers/` 创建或编辑路由文件
2. 定义端点和参数验证
3. 实现业务逻辑
4. 添加单元测试和集成测试
5. 更新 API 文档

## 🐛 调试

### 后端调试

```bash
# 使用 pdb 调试
python3 -m pdb -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

# 使用 VS Code 调试
# 在 VS Code 中按 F5 或使用调试面板
```

### 前端调试

```bash
# Chrome DevTools
# 在浏览器中按 F12 打开开发者工具

# React Developer Tools
# 安装 Chrome 扩展：React Developer Tools
```

### 查看日志

```bash
# 后端日志
tail -f /tmp/backend.log

# 前端日志
tail -f /tmp/frontend.log

# 使用日志查看器
python3 log_viewer.py
```

## 🛑 停止服务

```bash
# 查找并终止进程
lsof -ti:8000 | xargs kill -9  # 停止后端
lsof -ti:5173 | xargs kill -9  # 停止前端
lsof -ti:8090 | xargs kill -9  # 停止 Node.js 服务器

# 或使用启动脚本提供的 PID
kill $BACKEND_PID $FRONTEND_PID
```

## 📚 学习资源

### 项目文档
- [架构设计](./system_design.md)
- [实施计划](./IMPLEMENTATION_PLAN.md)
- [企业规范计划](./ENTERPRISE_STANDARDS_PLAN.md)
- [贡献指南](./CONTRIBUTING.md)

### 代码规范
- [后端代码规范](./backend/CODING_STANDARDS.md)
- [前端代码规范](./frontend/CODING_STANDARDS.md)

### 技术文档
- [React 官方文档](https://react.dev/)
- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

## 💡 开发提示

1. **提交前检查**：确保所有测试通过，代码符合规范
2. **小步提交**：频繁提交，每次提交一个小的功能或修复
3. **写好提交信息**：遵循 Conventional Commits 规范
4. **及时更新文档**：代码变更时同步更新文档
5. **使用 Git 分支**：不要直接在 main 或 develop 分支开发

## ❓ 获取帮助

如果你遇到问题：

1. 查看 [README.md](./README.md)
2. 查看 [常见问题](./FAQ.md)（如果存在）
3. 搜索已有的 [GitHub Issues](https://github.com/lxyhes/iflow-agent-code/issues)
4. 创建新的 Issue 提问

## 🎉 开始开发

现在你已经准备好开始开发了！建议从以下任务开始：

1. 熟悉项目结构和代码规范
2. 阅读相关文档
3. 尝试修复一个简单的 Bug
4. 实现一个小功能
5. 参与 Code Review

祝你开发愉快！🚀

---

**最后更新**：2026-01-23
**维护者**：iFlow Agent Team