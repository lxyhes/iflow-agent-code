# 多智能体面试系统

## 系统概述

基于 AI 工作台 代码库开发的多智能体协作面试平台，支持技术面试官、行为面试官和 HR 面试官三种智能体协作完成面试流程。

## 核心功能

### 1. 智能体角色设计

系统包含三种面试官智能体：

#### 技术面试官智能体 (TechnicalInterviewerAgent)
- **专业领域**: 编程语言、算法、系统设计、架构
- **评估维度**: 技术深度、编码能力、问题解决、系统设计、知识广度
- **提问策略**: 由浅入深、代码实操、场景设计
- **权重**: 1.2 (技术面试权重较高)

#### 行为面试官智能体 (BehavioralInterviewerAgent)
- **专业领域**: 团队协作、问题解决、领导力、文化契合
- **评估维度**: 团队协作、问题解决、领导力、沟通表达、适应能力、文化契合
- **提问策略**: STAR法则、情景模拟、压力测试
- **权重**: 1.0

#### HR面试官智能体 (HRInterviewerAgent)
- **专业领域**: 职业规划、薪资期望、公司文化、价值观
- **评估维度**: 职业契合、文化契合、求职动机、稳定性、沟通能力
- **提问策略**: 开放式提问、期望管理
- **权重**: 0.8

### 2. 智能体协作机制

#### 消息总线 (MessageBus)
- 支持点对点消息和广播消息
- 异步消息处理
- 消息优先级管理
- 消息历史记录

#### 共享上下文 (SharedInterviewContext)
- 候选人画像管理
- 面试回合记录
- 评估结果汇总
- 实时状态同步

#### 智能体协调器 (AgentCoordinator)
- 智能体注册和管理
- 面试流程控制
- 智能体轮换调度
- 消息协调

### 3. 面试流程管理

#### 面试会话管理 (InterviewSessionManager)
- 会话创建、存储和检索
- SQLite 持久化
- 会话状态管理
- 过期会话清理

#### 流程控制器 (FlowController)
- 阶段管理: 准备 -> 热身 -> 技术面试 -> 行为面试 -> HR面试 -> 总结 -> 完成
- 阶段时长控制
- 流程转换逻辑

#### 问题生成器 (QuestionGenerator)
- 基于候选人画像的个性化问题生成
- 问题模板库
- 追问问题生成
- 难度自适应

### 4. 候选人评估系统

#### 评分引擎 (ScoringEngine)
- 多维度加权评分
- 置信度校准
- 趋势分析
- 优势劣势识别

#### 评估器 (Evaluator)
- 评估标准管理
- 等级描述
- 评估执行

#### 报告生成器 (ReportGenerator)
- 结构化面试报告
- Markdown 和 JSON 格式输出
- 录用建议生成

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (React)                            │
├─────────────────────────────────────────────────────────────────┤
│  InterviewPreparation │ MultiAgentInterview │ InterviewReport   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 网关 (FastAPI)                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/interview/*  │  WebSocket  │  Auth  │  Rate Limit         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    多智能体面试引擎                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 技术面试官    │  │ 行为面试官    │  │ HR面试官      │          │
│  │   Agent      │  │   Agent      │  │   Agent      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           ▼                                     │
│                  ┌─────────────────┐                           │
│                  │  智能体协调器    │                           │
│                  │  Coordinator    │                           │
│                  └────────┬────────┘                           │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         ▼                 ▼                 ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 面试会话管理  │  │ 问题生成器    │  │ 评估引擎      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      基础设施层                                   │
├─────────────────────────────────────────────────────────────────┤
│  AI SDK  │  RAG Service  │  Memory Provider  │  SQLite       │
└─────────────────────────────────────────────────────────────────┘
```

## API 接口

### REST API

#### 会话管理
- `POST /api/interview/sessions` - 创建面试会话
- `GET /api/interview/sessions/{session_id}` - 获取会话信息
- `GET /api/interview/sessions` - 列表面试会话
- `DELETE /api/interview/sessions/{session_id}` - 删除会话

#### 面试控制
- `POST /api/interview/sessions/{session_id}/start` - 开始面试
- `POST /api/interview/sessions/{session_id}/answer` - 提交回答
- `POST /api/interview/sessions/{session_id}/pause` - 暂停面试
- `POST /api/interview/sessions/{session_id}/resume` - 恢复面试
- `POST /api/interview/sessions/{session_id}/complete` - 完成面试
- `POST /api/interview/sessions/{session_id}/cancel` - 取消面试

#### 结果获取
- `GET /api/interview/sessions/{session_id}/result` - 获取面试结果

### WebSocket

- `WS /api/interview/ws/{session_id}` - 实时面试交互

## 技术栈

### 后端
- **框架**: FastAPI + Python 3.11+
- **智能体框架**: 自定义多智能体框架
- **LLM**: GLM-4.7（通过 AI SDK）
- **数据库**: SQLite
- **异步**: asyncio

### 前端
- **框架**: React 18 + Vite
- **状态管理**: React Context
- **UI组件**: Tailwind CSS + Lucide React
- **图表**: Recharts
- **实时通信**: WebSocket

## 项目结构

```
backend/
├── core/
│   ├── interview_agents/          # 智能体模块
│   │   ├── __init__.py
│   │   ├── base_interviewer.py    # 基础面试官智能体
│   │   ├── technical_interviewer.py
│   │   ├── behavioral_interviewer.py
│   │   ├── hr_interviewer.py
│   │   ├── coordinator.py         # 智能体协调器
│   │   ├── message_bus.py         # 消息总线
│   │   └── shared_context.py      # 共享上下文
│   ├── interview_engine/          # 面试引擎
│   │   ├── __init__.py
│   │   ├── interview_session.py   # 会话管理
│   │   ├── flow_controller.py     # 流程控制
│   │   └── question_generator.py  # 问题生成
│   └── evaluation/                # 评估系统
│       ├── __init__.py
│       ├── evaluator.py           # 评估器
│       ├── scoring_engine.py      # 评分引擎
│       └── report_generator.py    # 报告生成
└── app/
    └── routers/
        └── interview.py           # API路由

frontend/
└── src/
    └── components/
        ├── InterviewPreparation.jsx
        ├── MultiAgentInterview.jsx
        └── InterviewReport.jsx
```

## 使用示例

### 创建面试会话

```python
from backend.core.interview_agents import CandidateProfile, InterviewConfig
from backend.core.interview_engine import InterviewSessionManager

# 创建候选人画像
candidate = CandidateProfile(
    name="张三",
    skills=["Python", "React", "FastAPI"],
    experience_years=5,
    target_position="高级软件工程师",
)

# 创建会话管理器
manager = InterviewSessionManager()

# 创建会话
session = manager.create_session(
    candidate_id=candidate.id,
    job_position_id="position_001",
)

# 初始化会话
await session.initialize(candidate)

# 开始面试
await session.start()
```

### 处理面试回合

```python
# 处理候选人回答
async for chunk in session.process_turn("这是我的回答..."):
    print(chunk)
```

### 获取面试结果

```python
# 完成面试
result = await session.complete()

# 查看结果
print(f"总体分数: {result['overall_score']}")
print(f"等级: {result['grade']}")
```

## 测试

运行测试脚本：

```bash
python test_multi_agent_interview.py
```

## 未来扩展

1. **更多智能体类型**: 系统设计面试官、编码面试官等
2. **语音交互**: 支持语音面试
3. **视频分析**: 面部表情和肢体语言分析
4. **知识库集成**: RAG 增强的问题生成
5. **A/B 测试**: 不同面试策略的效果对比

## 贡献指南

1. 遵循现有代码风格和架构
2. 添加适当的测试用例
3. 更新文档
4. 提交 PR 前运行测试

## 许可证

MIT License
