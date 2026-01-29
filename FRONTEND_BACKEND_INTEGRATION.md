# 前后端交互实现文档

## 概述

本文档详细说明多智能体面试系统的前后端交互实现，包括 API 接口、WebSocket 通信、错误处理和身份验证等关键环节。

## 架构设计

### 前端架构

```
frontend/src/
├── services/
│   └── interviewService.js      # API 服务层
├── hooks/
│   └── useMultiAgentInterview.js # React Hook 状态管理
└── components/
    ├── MultiAgentInterview.jsx   # 面试主组件
    └── MultiAgentInterviewDemo.jsx # 演示组件
```

### 后端架构

```
backend/
├── app/routers/
│   └── interview.py             # FastAPI 路由
├── core/interview_agents/       # 智能体模块
├── core/interview_engine/       # 面试引擎
└── core/evaluation/             # 评估系统
```

## API 接口

### REST API

#### 1. 会话管理

**创建会话**
```http
POST /api/interview/sessions
Content-Type: application/json
Authorization: Bearer {token}

{
  "candidate_profile": {
    "name": "张三",
    "email": "zhangsan@example.com",
    "skills": ["Python", "React"],
    "experience_years": 5,
    "target_position": "高级软件工程师"
  },
  "config": {
    "total_rounds": 5,
    "agent_order": ["technical", "behavioral", "hr"]
  },
  "job_position_id": "optional"
}
```

**响应**
```json
{
  "session_id": "uuid",
  "status": "created",
  "message": "面试会话创建成功",
  "data": {
    "candidate_name": "张三",
    "session_status": "ready"
  }
}
```

#### 2. 面试控制

**开始面试**
```http
POST /api/interview/sessions/{session_id}/start
Authorization: Bearer {token}
```

**提交回答**
```http
POST /api/interview/sessions/{session_id}/answer
Content-Type: application/json
Authorization: Bearer {token}

{
  "answer": "我的回答是...",
  "duration": 120
}
```

**暂停/恢复/完成/取消**
```http
POST /api/interview/sessions/{session_id}/pause
POST /api/interview/sessions/{session_id}/resume
POST /api/interview/sessions/{session_id}/complete
POST /api/interview/sessions/{session_id}/cancel
```

#### 3. 结果获取

**获取面试结果**
```http
GET /api/interview/sessions/{session_id}/result
Authorization: Bearer {token}
```

**导出报告**
```http
GET /api/interview/sessions/{session_id}/export?format=json|markdown
Authorization: Bearer {token}
```

### WebSocket API

**连接**
```javascript
ws://localhost:3000/api/interview/ws/{session_id}
```

**客户端发送消息**

```javascript
// 开始面试
{ "action": "start" }

// 提交回答
{ 
  "action": "answer",
  "answer": "我的回答",
  "duration": 120
}

// 暂停/恢复/完成
{ "action": "pause" }
{ "action": "resume" }
{ "action": "complete" }

// 获取状态
{ "action": "get_status" }
```

**服务端推送消息**

```javascript
// 智能体切换
{
  "type": "agent_switch",
  "agent_type": "technical",
  "agent_name": "技术面试官",
  "persona": "资深技术专家..."
}

// 问题
{
  "type": "question",
  "content": "请介绍一下你的项目经验"
}

// 流式内容
{
  "type": "stream",
  "content": "片段内容"
}

// 评估结果
{
  "type": "evaluation",
  "agent_type": "technical",
  "agent_name": "技术面试官",
  "score": 85,
  "feedback": "回答很好...",
  "strengths": ["技术扎实"],
  "weaknesses": ["可以更深入"]
}

// 面试完成
{
  "type": "completed",
  "result": { ... }
}

// 错误
{
  "type": "error",
  "message": "错误信息"
}
```

## 前端实现

### 1. API 服务层 (interviewService.js)

```javascript
// 会话服务
interviewSessionService.createSession(profile, config, jobPositionId)
interviewSessionService.getSession(sessionId)
interviewSessionService.listSessions(filters)
interviewSessionService.deleteSession(sessionId)

// 控制服务
interviewControlService.startInterview(sessionId)
interviewControlService.submitAnswer(sessionId, answer, duration)
interviewControlService.pauseInterview(sessionId)
interviewControlService.resumeInterview(sessionId)
interviewControlService.completeInterview(sessionId)
interviewControlService.cancelInterview(sessionId)

// 结果服务
interviewResultService.getResult(sessionId)
interviewResultService.exportReport(sessionId, format)

// WebSocket 类
const ws = new InterviewWebSocket(sessionId, onMessage, onError, onClose)
ws.connect()
ws.sendAnswer(answer, duration)
ws.startInterview()
ws.pauseInterview()
ws.resumeInterview()
ws.completeInterview()
ws.disconnect()
```

### 2. React Hook (useMultiAgentInterview.js)

```javascript
const interview = useMultiAgentInterview({
  onMessage: (data) => {},      // 收到消息回调
  onEvaluation: (data) => {},  // 收到评估回调
  onAgentSwitch: (data) => {}, // 智能体切换回调
  onComplete: (result) => {},  // 面试完成回调
  onError: (error) => {},      // 错误回调
});

// 状态
interview.sessionId        // 会话ID
interview.status           // 当前状态
interview.error            // 错误信息
interview.currentAgent     // 当前智能体
interview.currentQuestion  // 当前问题
interview.messages         // 消息列表
interview.evaluation       // 最新评估
interview.result           // 面试结果
interview.isLoading        // 加载状态
interview.isProcessing     // 处理状态

// 方法
interview.createSession(profile, config)
interview.startInterview()
interview.submitAnswer(answer, duration)
interview.pauseInterview()
interview.resumeInterview()
interview.completeInterview()
interview.cancelInterview()
interview.reset()
```

### 3. 使用示例

```jsx
import MultiAgentInterview from './components/MultiAgentInterview';

function App() {
  const candidateProfile = {
    name: "张三",
    skills: ["Python", "React"],
    experience_years: 5,
    target_position: "高级软件工程师"
  };

  const config = {
    total_rounds: 5,
    agent_order: ['technical', 'behavioral', 'hr']
  };

  return (
    <MultiAgentInterview
      candidateProfile={candidateProfile}
      config={config}
      onComplete={(result) => console.log('完成:', result)}
      onCancel={() => console.log('取消')}
    />
  );
}
```

## 身份验证

### JWT Token 认证

前端使用 `authenticatedFetch` 自动添加 Authorization Header：

```javascript
const authenticatedFetch = (url, options = {}) => {
  const token = localStorage.getItem('auth-token');
  
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};
```

后端验证：

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # 验证 token 逻辑
    if not valid_token(token):
        raise HTTPException(status_code=401, detail="未授权")
    return token
```

## 错误处理

### 错误类型

| 错误类型 | HTTP 状态码 | 说明 |
|---------|------------|------|
| NOT_FOUND | 404 | 会话不存在 |
| BAD_REQUEST | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 无权限 |
| SERVER_ERROR | 500 | 服务器错误 |
| NETWORK_ERROR | - | 网络连接失败 |

### 前端错误处理

```javascript
import { handleInterviewError } from './services/interviewService';

try {
  await interview.startInterview();
} catch (error) {
  const errorInfo = handleInterviewError(error);
  console.error(errorInfo.message);
  // 显示错误提示
}
```

### 后端错误处理

```python
from fastapi import HTTPException

@router.post("/sessions/{session_id}/start")
async def start_interview(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    try:
        success = await session.start()
        if not success:
            raise HTTPException(status_code=400, detail="无法开始面试")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 数据传输格式

### 候选人画像

```typescript
interface CandidateProfile {
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience_years: number;
  education?: Array<{
    school: string;
    degree: string;
    major: string;
  }>;
  previous_roles?: string[];
  target_position: string;
  current_salary?: string;
  expected_salary?: string;
  notice_period?: string;
}
```

### 面试配置

```typescript
interface InterviewConfig {
  total_rounds: number;
  max_duration: number;
  agent_order: string[];
  enable_follow_up: boolean;
  enable_stress_test: boolean;
}
```

### 面试结果

```typescript
interface InterviewResult {
  session_id: string;
  overall_score: number;
  grade: string;
  dimension_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  agent_scores: Record<string, {
    average_score: number;
    question_count: number;
  }>;
}
```

## 性能优化

### 1. WebSocket 自动重连

```javascript
class InterviewWebSocket {
  constructor() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    this.ws = new WebSocket(url);
    
    this.ws.onclose = (event) => {
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }
}
```

### 2. 消息节流

```javascript
const handleMessage = useCallback((data) => {
  // 处理消息
}, []);

// 使用 useCallback 避免不必要的重渲染
```

### 3. 状态管理优化

```javascript
// 使用函数式更新避免闭包问题
setMessages((prev) => [...prev, newMessage]);
```

## 安全考虑

### 1. 输入验证

前端：
```javascript
const validateAnswer = (answer) => {
  if (!answer || answer.trim().length === 0) {
    return { valid: false, error: '回答不能为空' };
  }
  if (answer.length > 10000) {
    return { valid: false, error: '回答过长' };
  }
  return { valid: true };
};
```

后端：
```python
from pydantic import BaseModel, validator

class AnswerRequest(BaseModel):
    answer: str
    duration: Optional[int]
    
    @validator('answer')
    def validate_answer(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('回答不能为空')
        if len(v) > 10000:
            raise ValueError('回答过长')
        return v
```

### 2. 速率限制

```python
from fastapi import Request
from fastapi_limiter import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/sessions/{session_id}/answer")
@limiter.limit("10/minute")
async def submit_answer(request: Request, session_id: str, answer: AnswerRequest):
    pass
```

## 调试工具

### 前端日志

```javascript
// 开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
  console.log('面试状态:', interview.status);
  console.log('消息列表:', interview.messages);
}
```

### 后端日志

```python
import logging

logger = logging.getLogger(__name__)

@router.post("/sessions/{session_id}/start")
async def start_interview(session_id: str):
    logger.info(f"开始面试: {session_id}")
    # ...
```

## 测试

### 单元测试

```javascript
// interviewService.test.js
import { interviewSessionService } from './interviewService';

describe('interviewSessionService', () => {
  it('should create session', async () => {
    const profile = { name: 'Test', skills: ['JS'] };
    const result = await interviewSessionService.createSession(profile);
    expect(result.session_id).toBeDefined();
  });
});
```

### 集成测试

```python
# test_interview_api.py
import pytest
from fastapi.testclient import TestClient

client = TestClient(app)

def test_create_session():
    response = client.post("/api/interview/sessions", json={
        "candidate_profile": {
            "name": "Test",
            "skills": ["Python"],
            "target_position": "Developer"
        }
    })
    assert response.status_code == 200
    assert "session_id" in response.json()
```

## 部署注意事项

### 1. 环境变量

```bash
# .env
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
    proxy_set_header Host $host;
}

location /api/interview {
    proxy_pass http://backend;
    proxy_set_header Host $host;
}
```

### 3. CORS 配置

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 总结

前后端交互通过 REST API 和 WebSocket 实现：

1. **REST API** 用于会话管理和控制操作
2. **WebSocket** 用于实时消息传输
3. **JWT Token** 用于身份验证
4. **完善的错误处理** 确保系统稳定性
5. **类型安全** 通过 TypeScript 和 Pydantic 实现

整个系统支持高并发、低延迟的实时面试体验。
