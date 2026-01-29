# iFlow 认证配置说明

## 问题背景

iFlow SDK 需要使用 API Key 进行认证。API Key 有效期为 7 天，过期后需要重置。

## 当前配置

项目已自动从 `~/.iflow/iflow_accounts.json` 读取 API Key 进行认证。

## 自动配置

系统会自动按以下顺序查找 API Key：

1. 环境变量 `IFLOW_API_KEY`
2. 环境变量 `IFLOW_SDK_API_KEY`
3. iFlow 配置文件 `~/.iflow/iflow_accounts.json`

## 手动配置 API Key

如果自动配置失败，可以手动设置：

### 方法 1: 创建 .env 文件

```bash
# 在项目根目录创建 .env 文件
echo "IFLOW_API_KEY=your-api-key" > .env
```

### 方法 2: 访问心流开放平台重置 API Key

1. 访问 https://platform.iflow.cn/docs/api-key-management
2. 登录您的账号
3. 重置 API Key
4. 更新 `.env` 文件

### 方法 3: 使用 iFlow CLI 登录（推荐）

```bash
# 交互式登录
iflow /auth
```

## 重启后端服务

修改配置后需要重启后端服务：

```bash
# 停止现有服务
pkill -f "uvicorn.*server:app"

# 使用环境变量启动
IFLOW_API_KEY="your-api-key" python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

# 或者使用 .env 文件
export $(grep -v '^#' .env | xargs) && python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

## 故障排除

### 错误: "API Token 已过期"

**解决方案**:
1. 访问 https://platform.iflow.cn/docs/api-key-management 重置 API Key
2. 更新 `.env` 文件
3. 重启后端服务

### 错误: "Authentication failed: Invalid params"

**检查步骤**:
1. 检查 API Key 是否正确设置: `echo $IFLOW_API_KEY`
2. 检查 iFlow 配置文件: `cat ~/.iflow/iflow_accounts.json`
3. 检查后端日志: `tail -f /tmp/backend.log`
4. 确认 API Key 未过期

### 错误: "认证失败"

**检查步骤**:
1. 确认 iFlow CLI 已安装: `iflow --version`
2. 尝试重新登录: `iflow /auth`
3. 检查网络连接
4. 查看后端日志获取详细信息

## 相关文件

- `backend/core/iflow_sdk_client.py` - SDK 客户端配置（自动读取 API Key）
- `backend/core/agent.py` - Agent 封装
- `.env` - 环境变量配置
- `~/.iflow/iflow_accounts.json` - iFlow 账户配置
