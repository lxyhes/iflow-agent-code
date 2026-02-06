# IFlow Agent Backend (Java) + 阿里云 AI + AgentScope

这是 IFlow Agent 项目的 Java 版本后端，使用 Spring Boot 3.2 开发，深度集成了阿里云 AI 服务和 **AgentScope Java** 多智能体框架。

## ✨ 核心技术栈

### 1. 阿里云 AI 服务

| 服务 | 技术 | 用途 |
|------|------|------|
| **百炼大模型** | Spring AI Alibaba + DashScope SDK | 通义千问对话、文本生成 |
| **文本向量** | text-embedding-v2 | RAG 文档检索 |
| **OCR 文字识别** | 阿里云视觉智能 | 图片文字提取 |

### 2. AgentScope Java 多智能体框架

**AgentScope** 是阿里巴巴开源的生产级多智能体编程框架，本项目使用它构建了完整的多智能体面试系统：

- **ReAct 智能体** - 推理-行动范式，智能体自主规划和执行
- **多智能体协作** - 支持顺序、协作、仲裁等多种协调模式
- **工具调用** - 智能体可调用外部工具（评估、记录等）
- **记忆管理** - 跨会话的持久化记忆存储
- **A2A 协议** - 分布式多智能体协作

## 项目结构

```
backend-java/
├── pom.xml                          # Maven 配置文件
├── src/
│   ├── main/
│   │   ├── java/com/iflow/agent/
│   │   │   ├── AgentApplication.java           # 应用入口
│   │   │   ├── config/
│   │   │   │   ├── AliyunConfig.java           # 阿里云配置
│   │   │   │   ├── CacheConfig.java            # 缓存目录配置
│   │   │   │   └── WebConfig.java              # Web 配置（CORS 等）
│   │   │   ├── controller/
│   │   │   │   ├── AIController.java           # 阿里云 AI API（通义千问）
│   │   │   │   ├── FileController.java         # 文件管理 API
│   │   │   │   ├── HealthController.java       # 健康检查 API
│   │   │   │   ├── LLMController.java          # LLM 服务 API
│   │   │   │   ├── OcrController.java          # OCR API（阿里云）
│   │   │   │   ├── RagController.java          # RAG API（向量检索）
│   │   │   │   └── ResumeController.java       # 简历管理 API
│   │   │   ├── entity/
│   │   │   │   ├── Document.java               # RAG 文档实体
│   │   │   │   └── Resume.java                 # 简历实体
│   │   │   ├── exception/
│   │   │   │   └── GlobalExceptionHandler.java # 全局异常处理
│   │   │   ├── repository/
│   │   │   │   ├── DocumentRepository.java     # 文档数据访问
│   │   │   │   └── ResumeRepository.java       # 简历数据访问
│   │   │   └── service/
│   │   │       ├── ai/
│   │   │       │   └── TongyiQianwenService.java   # 通义千问服务
│   │   │       ├── file/
│   │   │       │   └── FileService.java        # 文件服务
│   │   │       ├── llm/
│   │   │       │   └── LLMService.java         # LLM 服务
│   │   │       ├── ocr/
│   │   │       │   ├── AliyunOcrService.java   # 阿里云 OCR 服务
│   │   │       │   └── OcrResult.java          # OCR 结果
│   │   │       ├── rag/
│   │   │       │   ├── Document.java           # RAG 文档实体
│   │   │       │   └── RagService.java         # RAG 服务
│   │   │       └── resume/
│   │   │           └── ResumeService.java      # 简历服务
│   │   └── resources/
│   │       └── application.yml                 # 应用配置
│   └── test/                                   # 测试代码
```

## 技术栈

- **框架**: Spring Boot 3.2
- **JDK**: Java 17
- **数据库**: SQLite (通过 Hibernate)
- **HTTP 客户端**: WebFlux (非阻塞)
- **构建工具**: Maven

### 核心依赖

```xml
<!-- Spring AI Alibaba -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-ai-alibaba-starter</artifactId>
    <version>1.0.0-M3.1</version>
</dependency>

<!-- DashScope SDK -->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>dashscope-sdk-java</artifactId>
    <version>2.16.7</version>
</dependency>

<!-- 阿里云 OCR SDK -->
<dependency>
    <groupId>com.aliyun</groupId>
    <artifactId>ocr_api20210707</artifactId>
    <version>3.1.0</version>
</dependency>

<!-- AgentScope Java - 多智能体框架 -->
<dependency>
    <groupId>io.agentscope</groupId>
    <artifactId>agentscope</artifactId>
    <version>1.0.8</version>
</dependency>
```

## 环境要求

- Java 17 或更高版本
- Maven 3.8+
- 阿里云账号（用于 AI 服务）

## 配置阿里云 AI 服务

### 1. 获取阿里云 AccessKey

1. 登录 [阿里云控制台](https://www.aliyun.com/)
2. 进入「访问控制」->「AccessKey 管理」
3. 创建 AccessKey，记录 `AccessKey ID` 和 `AccessKey Secret`

### 2. 开通百炼大模型服务

1. 进入 [百炼控制台](https://bailian.console.aliyun.com/)
2. 开通服务并获取 API Key

### 3. 配置环境变量

```bash
# Windows PowerShell
$env:ALIYUN_ACCESS_KEY_ID="your-access-key-id"
$env:ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"
$env:ALIYUN_DASHSCOPE_API_KEY="your-dashscope-api-key"

# 或者在 application.yml 中配置
```

## 运行项目

### 1. 编译

```bash
cd backend-java
mvn clean compile
```

### 2. 运行

```bash
mvn spring-boot:run
```

或者直接运行 jar：

```bash
mvn clean package
java -jar target/agent-backend-1.0.0.jar
```

### 3. 访问 API

- 健康检查: http://localhost:8080/api/health
- 文件 API: http://localhost:8080/api/projects/{projectName}/files
- AI API: http://localhost:8080/api/ai/generate
- OCR API: http://localhost:8080/api/ocr/general
- RAG API: http://localhost:8080/api/rag/collections/{name}/query

## API 端点

### 阿里云 AI（通义千问）

```
POST /api/ai/generate              # 文本生成
POST /api/ai/chat                  # 多轮对话
POST /api/ai/generate/stream       # 流式生成
POST /api/ai/chat/stream           # 流式对话
POST /api/ai/embed                 # 文本向量化
POST /api/ai/generate/model        # 指定模型生成
GET  /api/ai/models                # 获取可用模型列表
```

**示例 - 文本生成：**
```bash
curl -X POST http://localhost:8080/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "介绍一下Java的Stream API"}'
```

**示例 - 多轮对话：**
```bash
curl -X POST http://localhost:8080/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "你是一个Java专家"},
      {"role": "user", "content": "什么是Spring Boot?"}
    ]
  }'
```

### OCR 文字识别（阿里云）

```
POST /api/ocr/general        # 通用文字识别
POST /api/ocr/table          # 表格识别
POST /api/ocr/document       # 文档结构化识别
POST /api/ocr/handwriting    # 手写文字识别
POST /api/ocr/smart          # 智能识别
POST /api/ocr/base64         # Base64 图片识别
GET  /api/ocr/status         # 服务状态
```

**示例 - 通用识别：**
```bash
curl -X POST http://localhost:8080/api/ocr/general \
  -F "file=@/path/to/image.jpg"
```

### RAG 知识库

```
POST   /api/rag/collections/{name}/documents       # 添加文档
POST   /api/rag/collections/{name}/documents/batch # 批量添加
POST   /api/rag/collections/{name}/search          # 相似度搜索
POST   /api/rag/collections/{name}/query           # RAG 问答
GET    /api/rag/collections/{name}/documents       # 获取文档列表
DELETE /api/rag/collections/{name}                 # 删除集合
```

**示例 - 添加文档：**
```bash
curl -X POST http://localhost:8080/api/rag/collections/mykb/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Spring Boot 简介",
    "content": "Spring Boot 是一个用于简化 Spring 应用开发的框架...",
    "source": "官方文档"
  }'
```

**示例 - RAG 问答：**
```bash
curl -X POST http://localhost:8080/api/rag/collections/mykb/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是 Spring Boot?",
    "topK": 3
  }'
```

### 文件管理

```
GET    /api/projects/{projectName}/files              # 获取文件树
GET    /api/projects/{projectName}/file?filePath=...  # 读取文件内容（JSON）
GET    /api/projects/{projectName}/files/content?...  # 读取文件（二进制）
PUT    /api/projects/{projectName}/file               # 保存文件
DELETE /api/projects/{projectName}/file?filePath=...  # 删除文件
POST   /api/projects/{projectName}/directories?...    # 创建目录
```

### 简历管理

```
GET    /api/resumes           # 获取所有简历
GET    /api/resumes/{id}      # 获取单个简历
POST   /api/resumes           # 创建简历
PUT    /api/resumes/{id}      # 更新简历
DELETE /api/resumes/{id}      # 删除简历
```

### 多智能体面试系统（AgentScope）

```
POST   /api/interviews/sessions                          # 创建面试会话
POST   /api/interviews/sessions/{id}/start               # 开始面试
POST   /api/interviews/sessions/{id}/questions/next      # 获取下一个问题
POST   /api/interviews/sessions/{id}/answers             # 提交回答
POST   /api/interviews/sessions/{id}/agents/next         # 切换面试官
POST   /api/interviews/sessions/{id}/complete            # 完成面试
GET    /api/interviews/sessions/{id}/report              # 获取面试报告
GET    /api/interviews/coordination-modes                # 获取协调模式
```

**示例 - 创建面试会话：**
```bash
curl -X POST http://localhost:8080/api/interviews/sessions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -d '{
    "candidateName": "张三",
    "position": "Java高级工程师",
    "coordinationMode": "sequential"
  }'
```

**示例 - 开始面试：**
```bash
curl -X POST http://localhost:8080/api/interviews/sessions/{sessionId}/start
```

**示例 - 获取问题：**
```bash
curl -X POST http://localhost:8080/api/interviews/sessions/{sessionId}/questions/next \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "5年",
    "skills": ["Java", "Spring", "MySQL"]
  }'
```

**示例 - 提交回答：**
```bash
curl -X POST http://localhost:8080/api/interviews/sessions/{sessionId}/answers \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "q123",
    "answer": "Java中的Stream API是..."
  }'
```

**示例 - 获取面试报告：**
```bash
curl http://localhost:8080/api/interviews/sessions/{sessionId}/report
```

## 配置

主要配置在 `src/main/resources/application.yml`：

```yaml
server:
  port: 8080  # 服务端口

spring:
  datasource:
    url: jdbc:sqlite:E:/cache/agent_project/database/agent.db  # 数据库路径

  # Spring AI Alibaba 配置
  ai:
    dashscope:
      api-key: ${ALIYUN_DASHSCOPE_API_KEY:}  # 百炼 API Key
      chat:
        options:
          model: qwen-turbo
          temperature: 0.7
      embedding:
        options:
          model: text-embedding-v2

# 阿里云配置
aliyun:
  access-key-id: ${ALIYUN_ACCESS_KEY_ID:}
  access-key-secret: ${ALIYUN_ACCESS_KEY_SECRET:}
  region: cn-hangzhou
  ocr:
    endpoint: ocr.cn-hangzhou.aliyuncs.com
```

## 可用模型

### 通义千问系列

| 模型 | 描述 | 适用场景 |
|------|------|----------|
| qwen-turbo | 极速版 | 快速响应、成本敏感 |
| qwen-plus | 增强版 | 平衡性能与成本 |
| qwen-max | 最强版 | 复杂任务、高质量输出 |
| qwen-max-longcontext | 长上下文版 | 长文档处理 |
| qwen-coder-plus | 代码版 | 编程辅助 |
| qwen-math-plus | 数学版 | 数学推理 |

## 与 Python 后端的对比

| 功能 | Python (FastAPI) | Java (Spring Boot) |
|------|-----------------|-------------------|
| 框架 | FastAPI | Spring Boot 3.2 |
| AI SDK | iflow_sdk | Spring AI Alibaba + DashScope |
| 异步 | async/await | WebFlux (Mono/Flux) |
| 数据库 | sqlite3 | Spring Data JPA + SQLite |
| 配置 | Python 文件 | YAML 文件 |
| 依赖注入 | 手动/全局 | Spring IoC 容器 |
| 类型检查 | Pydantic | Java 类型系统 |

## 开发计划

1. ✅ 基础项目结构
2. ✅ 配置文件和缓存目录
3. ✅ LLM 服务适配器
4. ✅ 文件管理服务
5. ✅ 基础 API 端点
6. ✅ 数据库和 ORM 配置
7. ✅ **阿里云 AI 集成**
   - ✅ Spring AI Alibaba（通义千问）
   - ✅ 文本向量（Embedding）
   - ✅ RAG 服务
   - ✅ 阿里云 OCR
8. ⬜ 面试系统迁移
9. ⬜ 认证授权
10. ⬜ 测试覆盖

## 参考资料

- [Spring AI Alibaba 文档](https://sca.aliyun.com/docs/2023/user-guide/ai/quick-start/)
- [阿里云百炼大模型](https://help.aliyun.com/zh/model-studio/)
- [阿里云 OCR 文档](https://help.aliyun.com/zh/ocr/)
- [DashScope Java SDK](https://help.aliyun.com/zh/dashscope/java-sdk-best-practices)
