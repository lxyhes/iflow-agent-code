# 跨平台启动指南

本文档说明如何在 Windows、macOS 和 Linux 上启动 iFlow Agent 项目。

## 目录

- [环境要求](#环境要求)
- [快速启动](#快速启动)
- [停止服务](#停止服务)
- [查看日志](#查看日志)
- [常见问题](#常见问题)

## 环境要求

### 必需软件

- **Node.js**: v20 或更高版本
- **Python**: 3.10 或更高版本
- **Git**: 用于版本控制

### 可选软件

- **iFlow CLI**: 0.2.24+（用于 AI 功能）
- **Claude Code CLI**: 可选
- **Cursor CLI**: 可选

## 快速启动

### Windows

#### 启动所有服务

双击运行 `launch_all_fixed.bat` 文件，或在命令行中执行：

```cmd
launch_all_fixed.bat
```

#### 停止所有服务

双击运行 `stop_all.bat` 文件，或在命令行中执行：

```cmd
stop_all.bat
```

### macOS / Linux

#### 启动所有服务

在终端中执行：

```bash
chmod +x start.sh stop_all.sh
./start.sh
```

#### 停止所有服务

在终端中执行：

```bash
./stop_all.sh
```

## 服务端口

启动后，以下服务将在相应端口运行：

| 服务 | 端口 | 说明 |
|------|------|------|
| iFlow CLI | 8090 | AI 命令行接口 |
| Python 后端 | 8000 | FastAPI 后端服务 |
| Node.js 服务器 | 3001 | 认证/设置服务 |
| 前端 | 5173 | React 开发服务器 |

## 访问应用

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 查看日志

### Windows

日志文件位于临时目录：
- 后端日志: `%TEMP%\backend.log`
- 前端日志: `%TEMP%\frontend.log`
- Node.js 服务器日志: `%TEMP%\node_server.log`
- iFlow CLI 日志: `%TEMP%\iflow.log`

使用记事本或其他文本编辑器查看日志文件。

### macOS / Linux

使用 `tail` 命令实时查看日志：

```bash
# 查看后端日志
tail -f /tmp/backend.log

# 查看前端日志
tail -f /tmp/frontend.log

# 查看 Node.js 服务器日志
tail -f /tmp/node_server.log

# 查看 iFlow CLI 日志
tail -f /tmp/iflow.log
```

## 手动启动（高级用户）

### 启动 iFlow CLI

```bash
iflow --experimental-acp --port 8090
```

### 启动 Python 后端

```bash
export PYTHONPATH="$PWD"
python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

### 启动 Node.js 服务器

```bash
cd frontend
npm run server
```

### 启动前端

```bash
cd frontend
npm run dev
```

## 常见问题

### 端口被占用

如果看到端口被占用的错误，请先停止所有服务：

**Windows:**
```cmd
stop_all.bat
```

**macOS / Linux:**
```bash
./stop_all.sh
```

### 依赖安装失败

**后端依赖:**
```bash
pip3 install -r backend/requirements.txt
```

**前端依赖:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Python 版本不兼容

确保使用 Python 3.10 或更高版本：

```bash
python3 --version
```

### Node.js 版本不兼容

确保使用 Node.js v20 或更高版本：

```bash
node --version
npm --version
```

### macOS 权限问题

如果脚本无法执行，请添加执行权限：

```bash
chmod +x start.sh stop_all.sh
```

### Windows PowerShell 执行策略

如果 PowerShell 阻止脚本执行，请运行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 开发模式

### 热重载

- Python 后端使用 `--reload` 参数，代码更改会自动重启
- 前端使用 Vite 的热模块替换（HMR），代码更改会自动刷新

### 调试

**Python 后端:**
- 使用 VS Code 的 Python 调试器
- 或在代码中添加断点

**前端:**
- 使用浏览器开发者工具
- 或使用 VS Code 的 JavaScript 调试器

## 生产环境部署

### 前端构建

```bash
cd frontend
npm run build
```

构建后的文件在 `frontend/dist` 目录。

### 后端部署

使用生产级 ASGI 服务器：

```bash
pip install gunicorn
gunicorn backend.server:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 获取帮助

如果遇到问题：

1. 查看本文档的常见问题部分
2. 检查日志文件中的错误信息
3. 在 GitHub 上提交 Issue: https://github.com/lxyhes/iflow-agent-code/issues