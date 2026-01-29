# 多智能体面试系统集成指南

## 概述

多智能体面试系统已经集成到现有的 InterviewPreparation 组件中。用户现在可以在"模拟面试"标签页中使用多智能体面试功能。

## 集成方式

### 1. 自动集成

多智能体面试组件已经自动集成到 InterviewPreparation 组件中，无需额外配置。

### 2. 使用方式

1. 打开项目面试准备页面
2. 点击"模拟面试"标签
3. 点击"多智能体面试"按钮
4. 系统将自动创建候选人画像并开始多智能体面试

### 3. 候选人画像

系统会根据项目分析自动创建候选人画像：
- **姓名**: 项目名称
- **技能**: 项目技术栈中的编程语言
- **经验**: 默认3年
- **目标职位**: 软件工程师

## 文件结构

```
frontend/src/
├── components/
│   ├── InterviewPreparation.jsx      # 已集成多智能体面试
│   ├── MultiAgentInterview.jsx       # 多智能体面试组件
│   └── MultiAgentInterviewDemo.jsx   # 演示组件
├── hooks/
│   └── useMultiAgentInterview.js     # React Hook
└── services/
    └── interviewService.js           # API 服务

backend/
├── app/routers/
│   └── interview.py                  # API 路由
├── core/interview_agents/            # 智能体模块
├── core/interview_engine/            # 面试引擎
└── core/evaluation/                  # 评估系统
```

## 功能特性

### 1. 三种面试官智能体

- **技术面试官**: 评估编程、算法、系统设计
- **行为面试官**: 评估团队协作、沟通、领导力
- **HR面试官**: 评估职业规划、文化契合

### 2. 面试流程

1. 技术面试（约15-20分钟）
2. 行为面试（约10-15分钟）
3. HR面试（约5-10分钟）

### 3. 评估报告

面试完成后自动生成：
- 总体分数和等级
- 各维度雷达图
- 优势和劣势分析
- 录用建议

## API 接口

### REST API

- `POST /api/interview/sessions` - 创建会话
- `POST /api/interview/sessions/{id}/start` - 开始面试
- `POST /api/interview/sessions/{id}/answer` - 提交回答
- `POST /api/interview/sessions/{id}/complete` - 完成面试
- `GET /api/interview/sessions/{id}/result` - 获取结果

### WebSocket

- `WS /api/interview/ws/{session_id}` - 实时通信

## 配置选项

### 面试配置

```javascript
{
  total_rounds: 5,              // 总轮数
  max_duration: 3600,           // 最大时长（秒）
  agent_order: ['technical', 'behavioral', 'hr'],  // 智能体顺序
  enable_follow_up: true,       // 启用追问
  enable_stress_test: false,    // 启用压力测试
}
```

### 候选人画像

```javascript
{
  name: '候选人姓名',
  email: '邮箱',
  skills: ['Python', 'React'],
  experience_years: 5,
  target_position: '高级软件工程师',
  current_salary: '20k',
  expected_salary: '30k',
}
```

## 自定义扩展

### 1. 添加新的面试官类型

在 `backend/core/interview_agents/` 中创建新的智能体类：

```python
class SystemDesignInterviewerAgent(BaseInterviewerAgent):
    def __init__(self, agent, name="系统设计面试官"):
        super().__init__(
            agent=agent,
            interviewer_type=InterviewerType.SYSTEM_DESIGN,
            name=name,
            persona="系统架构专家",
        )
```

### 2. 修改智能体顺序

在前端配置中修改 `agent_order`：

```javascript
const config = {
  agent_order: ['technical', 'system_design', 'behavioral', 'hr'],
};
```

### 3. 自定义评估维度

在 `backend/core/evaluation/scoring_engine.py` 中修改：

```python
DEFAULT_DIMENSION_WEIGHTS = {
    'technical_depth': 1.2,
    'system_design': 1.1,
    # 添加新的维度
    'new_dimension': 1.0,
}
```

## 故障排除

### 1. WebSocket 连接失败

- 检查后端服务是否运行
- 检查网络连接
- 查看浏览器控制台错误信息

### 2. API 调用失败

- 检查身份验证 token
- 检查 API 基础 URL 配置
- 查看后端日志

### 3. 面试无法开始

- 检查候选人画像是否正确设置
- 检查智能体是否正确注册
- 查看浏览器控制台错误

## 性能优化

### 1. WebSocket 自动重连

系统已实现自动重连机制，最多重试5次。

### 2. 消息节流

使用 useCallback 避免不必要的重渲染。

### 3. 状态管理优化

使用函数式更新避免闭包问题。

## 安全考虑

### 1. 输入验证

前端和后端都有输入验证，防止注入攻击。

### 2. 身份验证

使用 JWT Token 进行身份验证。

### 3. 速率限制

可以添加速率限制防止滥用。

## 测试

### 单元测试

```bash
cd backend
pytest tests/test_interview.py
```

### 集成测试

```bash
cd frontend
npm test
```

## 部署

### 1. 环境变量

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

### 2. Nginx 配置

```nginx
location /api/interview/ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### 3. 启动服务

```bash
# 后端
cd backend
python -m uvicorn app.main:app --reload

# 前端
cd frontend
npm run dev
```

## 总结

多智能体面试系统已完全集成到现有面试模块中，用户可以通过简单的按钮切换使用。系统提供了完整的面试流程、评估报告和历史记录功能。
