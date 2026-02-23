# AI 工作台 - 2026 年功能路线图

> **后端架构**: Java Spring Boot 3.2.0 (主后端) + Python FastAPI (辅助服务)  
> **更新时间**: 2026 年 2 月 23 日

---

## 📋 总览

| 阶段 | 功能模块 | 优先级 | 预计工期 | 状态 |
|------|----------|--------|----------|------|
| **Phase 1** | 多 AI Agent 统一管理平台 | P0 | 3 周 | 📋 待启动 |
| **Phase 2** | AI 办公自动化套件 | P0 | 4 周 | 📋 待启动 |
| **Phase 3** | 工作流可视化编辑器增强 | P0 | 3 周 | 📋 待启动 |
| **Phase 4** | WebUI 远程访问模式 | P1 | 2 周 | 📋 待启动 |
| **Phase 5** | AI 图像生成与编辑 | P1 | 2 周 | 📋 待启动 |
| **Phase 6** | 对话/会话管理增强 | P1 | 2 周 | 📋 待启动 |
| **Phase 7** | MCP 深度集成 | P2 | 3 周 | 📋 待启动 |
| **Phase 8** | 本地模型部署支持 | P2 | 1 周 | 📋 待启动 |
| **Phase 9** | 项目健康度仪表盘 | P3 | 2 周 | 📋 待启动 |
| **Phase 10** | 个性化界面定制 | P3 | 2 周 | 📋 待启动 |

**总预计工期**: 24 周 (约 6 个月)

---

## 🎯 Phase 1: 多 AI Agent 统一管理平台

**工期**: 3 周 | **优先级**: P0 | **后端**: Java Spring Boot

### 1.1 功能概述

构建统一的 AI Agent 管理平台，支持检测和集成多种 CLI AI 工具（Gemini CLI、Claude Code、Codex、Qwen Code、Goose 等），提供统一的图形界面和并行执行能力。

### 1.2 核心功能

```
├── 🔍 Agent 自动检测
│   ├── 扫描本地已安装的 CLI 工具
│   ├── 验证 Agent 可用性
│   └── 自动注册到管理平台
│
├── 💬 统一聊天界面
│   ├── 多 Agent 切换
│   ├── Agent 能力描述
│   └── 历史对话管理
│
├── ⚡ 多 Agent 并行执行
│   ├── 任务分发到多个 Agent
│   ├── 结果聚合与对比
│   └── 冲突解决机制
│
└── 🤖 Agent 间通信
    ├── Agent A 的输出作为 Agent B 的输入
    ├── 多 Agent 协作工作流
    └── 协作结果评估
```

### 1.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/agent/
├── AgentRegistryService.java      # Agent 注册与发现
├── AgentDetectionService.java     # 本地 CLI 工具检测
├── AgentExecutionService.java     # Agent 执行引擎
├── AgentCommunicationService.java # Agent 间通信
├── MultiAgentOrchestrator.java    # 多 Agent 编排器
└── AgentResultAggregator.java     # 结果聚合器
```

**新增控制器**:
```
backend-java/src/main/java/com/iflow/agent/controller/
├── AgentManagementController.java # Agent 管理 API
└── MultiAgentController.java      # 多 Agent 执行 API
```

**数据库表**:
```sql
-- Agent 注册表
CREATE TABLE ai_agent (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,      -- 'claude-code', 'gemini-cli', 'codex', etc.
    cli_path VARCHAR(500),
    version VARCHAR(50),
    status VARCHAR(20),             -- 'active', 'inactive', 'error'
    capabilities TEXT,              -- JSON 格式存储能力描述
    config TEXT,                    -- JSON 格式存储配置
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 多 Agent 任务表
CREATE TABLE multi_agent_task (
    id INTEGER PRIMARY KEY,
    task_description TEXT,
    assigned_agents TEXT,           -- JSON 数组 [agent_id, ...]
    execution_mode VARCHAR(20),     -- 'parallel', 'sequential', 'collaborative'
    status VARCHAR(20),
    results TEXT,                   -- JSON 格式存储结果
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### API 端点

```java
// Agent 管理
GET    /api/agents/discover           # 发现本地 Agent
GET    /api/agents                    # 获取 Agent 列表
POST   /api/agents                    # 注册新 Agent
PUT    /api/agents/{id}               # 更新 Agent 配置
DELETE /api/agents/{id}               # 移除 Agent
GET    /api/agents/{id}/health        # 检查 Agent 健康状态

// 多 Agent 执行
POST   /api/agents/execute            # 执行单 Agent 任务
POST   /api/agents/execute/multi      # 执行多 Agent 任务
GET    /api/agents/tasks/{id}         # 获取任务状态
GET    /api/agents/tasks/{id}/results # 获取任务结果
```

#### 前端组件

```
frontend/src/components/agents/
├── AgentRegistry.jsx           # Agent 注册管理
├── AgentSelector.jsx           # Agent 选择器
├── MultiAgentExecutor.jsx      # 多 Agent 执行界面
├── AgentResultViewer.jsx       # 结果查看器
└── AgentCollaborationFlow.jsx  # 协作流程图
```

### 1.4 验收标准

- [ ] 能够自动检测至少 3 种 CLI 工具 (Claude Code, Gemini CLI, Qwen Code)
- [ ] 支持同时向多个 Agent 发送相同请求并对比结果
- [ ] 支持 Agent 间结果传递和协作
- [ ] 提供 Agent 健康状态监控

---

## 📁 Phase 2: AI 办公自动化套件

**工期**: 4 周 | **优先级**: P0 | **后端**: Java Spring Boot

### 2.1 功能概述

扩展 AI 能力到办公场景，支持文件批量处理、Excel 数据分析、文档自动生成等功能，从"代码助手"扩展到"办公助手"。

### 2.2 核心功能

#### 2.2.1 智能文件批量处理

```
├── 📝 批量重命名
│   ├── AI 理解文件内容后智能命名
│   ├── 自定义命名规则模板
│   └── 预览和撤销支持
│
├── 🗂️ 自动分类整理
│   ├── 按内容类型分类 (代码/文档/图片)
│   ├── 按项目/日期/标签分类
│   └── 智能归档建议
│
└── 📄 文件合并/拆分
    ├── 多个 Markdown 合并为一份文档
    ├── 大文件按章节拆分
    └── PDF 合并/拆分
```

#### 2.2.2 Excel/数据处理

```
├── 📊 数据分析
│   ├── AI 驱动的数据洞察
│   ├── 趋势分析和预测
│   └── 异常值检测
│
├── 🎨 自动美化报表
│   ├── 样式优化 (条件格式/边框/配色)
│   ├── 图表自动生成
│   └── 数据透视表创建
│
└── 🔄 数据清洗
    ├── 格式标准化
    ├── 重复值/空值处理
    └── 数据验证规则
```

#### 2.2.3 文档生成与排版

```
├── 📑 PPT 自动生成
│   ├── Markdown/大纲 → 幻灯片
│   ├── 智能布局和配图
│   └── 主题模板应用
│
├── 📄 Word 文档排版
│   ├── AI 自动格式化
│   ├── 目录自动生成
│   └── 样式统一检查
│
└── 📕 PDF 生成与合并
    ├── Markdown/HTML → PDF
    ├── 多 PDF 合并
    └── PDF 书签/目录
```

#### 2.2.4 预览面板 (9+ 格式)

```
├── 文档类：PDF, Word, Excel, PPT
├── 代码类：代码高亮，Markdown
├── 图片类：JPG, PNG, GIF, SVG
├── 网页类：HTML 预览
└── 对比类：Diff 查看器
```

### 2.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/office/
├── FileBatchService.java         # 文件批量处理
├── FileRenameService.java        # 智能重命名
├── FileClassifierService.java    # 文件分类器
├── FileMergerService.java        # 文件合并器
├── ExcelAnalysisService.java     # Excel 分析服务
├── ExcelBeautifierService.java   # Excel 美化服务
├── DocumentGeneratorService.java # 文档生成服务
├── PresentationGeneratorService.java # PPT 生成
├── PdfGeneratorService.java      # PDF 生成服务
└── PreviewService.java           # 预览服务
```

**新增依赖** (pom.xml):
```xml
<!-- Apache POI - Excel/Word 处理 -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>

<!-- iText - PDF 处理 -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>8.0.0</version>
</dependency>

<!-- Apache PDFBox - PDF 处理 -->
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>2.0.30</version>
</dependency>

<!-- Thumbnailator - 图片处理 -->
<dependency>
    <groupId>net.coobird</groupId>
    <artifactId>thumbnailator</artifactId>
    <version>0.4.20</version>
</dependency>
```

**新增控制器**:
```
backend-java/src/main/java/com/iflow/agent/controller/
├── FileBatchController.java      # 文件批量处理 API
├── ExcelController.java          # Excel 处理 API
├── DocumentController.java       # 文档生成 API
└── PreviewController.java        # 预览 API
```

**数据库表**:
```sql
-- 文件批处理任务表
CREATE TABLE file_batch_task (
    id INTEGER PRIMARY KEY,
    task_type VARCHAR(50),        -- 'rename', 'classify', 'merge', etc.
    source_paths TEXT,            -- JSON 数组
    target_path VARCHAR(500),
    config TEXT,                  -- JSON 配置
    status VARCHAR(20),
    result TEXT,                  -- JSON 结果
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 文档生成历史表
CREATE TABLE document_generation_history (
    id INTEGER PRIMARY KEY,
    document_type VARCHAR(50),    -- 'ppt', 'word', 'pdf'
    source_content TEXT,
    output_path VARCHAR(500),
    template VARCHAR(100),
    status VARCHAR(20),
    created_at TIMESTAMP
);
```

#### API 端点

```java
// 文件批量处理
POST   /api/file-batch/rename         # 批量重命名
POST   /api/file-batch/classify       # 批量分类
POST   /api/file-batch/merge          # 批量合并
GET    /api/file-batch/tasks/{id}     # 获取任务状态

// Excel 处理
POST   /api/excel/analyze             # 分析 Excel
POST   /api/excel/beautify            # 美化 Excel
POST   /api/excel/generate-chart      # 生成图表
POST   /api/excel/clean-data          # 数据清洗

// 文档生成
POST   /api/document/generate/ppt     # 生成 PPT
POST   /api/document/generate/word    # 生成 Word
POST   /api/document/generate/pdf     # 生成 PDF
POST   /api/document/format           # 文档排版

// 预览
GET    /api/preview/{filePath}        # 获取文件预览
GET    /api/preview/supported-types   # 支持的预览类型
```

#### 前端组件

```
frontend/src/components/office/
├── FileBatchProcessor.jsx       # 文件批量处理
├── FileRenameWizard.jsx         # 重命名向导
├── FileClassifier.jsx           # 文件分类器
├── ExcelAnalyzer.jsx            # Excel 分析器
├── ExcelBeautifier.jsx          # Excel 美化器
├── DocumentGenerator.jsx        # 文档生成器
├── PresentationGenerator.jsx    # PPT 生成器
├── PdfGenerator.jsx             # PDF 生成器
└── PreviewPanel.jsx             # 预览面板
```

### 2.4 验收标准

- [ ] 支持至少 100 个文件的批量重命名
- [ ] Excel 分析能够生成至少 5 种图表类型
- [ ] PPT 生成支持至少 3 种模板
- [ ] 预览面板支持至少 9 种文件格式
- [ ] 所有操作支持撤销/恢复

---

## 🔄 Phase 3: 工作流可视化编辑器增强

**工期**: 3 周 | **优先级**: P0 | **后端**: Java Spring Boot

### 3.1 功能概述

将现有工作流编辑器升级为拖拽式可视化编辑器，支持 AI 辅助生成工作流，提供预设模板库和 MCP 工具集成。

### 3.2 核心功能

```
├── 🎨 拖拽式节点库
│   ├── 提示词节点 (Prompt Node)
│   ├── 子 Agent 节点 (Sub-Agent Node)
│   ├── 人工确认节点 (Human Approval)
│   ├── 条件判断节点 (Condition)
│   ├── 循环节点 (Loop)
│   ├── 工具调用节点 (Tool Call)
│   └── 变量节点 (Variable)
│
├── 🤖 AI 辅助生成
│   ├── 自然语言 → 工作流
│   ├── 智能节点布局
│   └── 自动连线
│
├── 📦 预设模板库
│   ├── 代码审查工作流
│   ├── 自动化测试工作流
│   ├── 文档生成工作流
│   ├── 数据分析工作流
│   └── 用户自定义模板
│
├── 🔌 MCP 工具集成
│   ├── GitHub MCP 节点
│   ├── Notion MCP 节点
│   ├── Slack MCP 节点
│   └── 自定义 MCP 节点
│
└── 📤 导出与执行
    ├── 导出为 .claude/agents/ 文件
    ├── 导出为 .claude/commands/ 文件
    └── 一键执行工作流
```

### 3.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/workflow/
├── WorkflowNodeService.java       # 工作流节点服务
├── WorkflowTemplateService.java   # 工作流模板服务
├── WorkflowGeneratorService.java  # AI 生成工作流
├── WorkflowExecutorService.java   # 工作流执行器
├── WorkflowValidatorService.java  # 工作流验证器
└── McpIntegrationService.java     # MCP 集成服务
```

**数据库表**:
```sql
-- 工作流节点定义表
CREATE TABLE workflow_node (
    id INTEGER PRIMARY KEY,
    workflow_id INTEGER,
    node_type VARCHAR(50),        -- 'prompt', 'agent', 'condition', 'tool', etc.
    node_config TEXT,             -- JSON 配置
    position_x INTEGER,
    position_y INTEGER,
    connections TEXT,             -- JSON 数组，连接的节点 ID
    created_at TIMESTAMP
);

-- 工作流模板表
CREATE TABLE workflow_template (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200),
    description TEXT,
    category VARCHAR(50),         -- 'code-review', 'testing', 'documentation', etc.
    template_data TEXT,           -- JSON 格式完整模板
    is_builtin BOOLEAN,
    created_at TIMESTAMP
);

-- 工作流执行历史表
CREATE TABLE workflow_execution (
    id INTEGER PRIMARY KEY,
    workflow_id INTEGER,
    status VARCHAR(20),
    input_data TEXT,
    output_data TEXT,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### API 端点

```java
// 工作流管理
GET    /api/workflows/nodes/types       # 获取节点类型定义
POST   /api/workflows/validate          # 验证工作流
POST   /api/workflows/generate          # AI 生成工作流
GET    /api/workflows/templates         # 获取模板列表
POST   /api/workflows/templates         # 创建模板
POST   /api/workflows/execute/{id}      # 执行工作流
GET    /api/workflows/executions        # 获取执行历史
```

#### 前端组件

```
frontend/src/components/workflow/
├── WorkflowEditor.jsx           # 工作流编辑器 (基于 React Flow)
├── WorkflowNodeLibrary.jsx      # 节点库面板
├── WorkflowNodeProperties.jsx   # 节点属性面板
├── WorkflowTemplateGallery.jsx  # 模板库
├── WorkflowAiGenerator.jsx      # AI 生成器
├── WorkflowExecutor.jsx         # 执行器
└── WorkflowExecutionHistory.jsx # 执行历史
```

### 3.4 验收标准

- [ ] 支持拖拽创建和连接节点
- [ ] AI 能够根据自然语言描述生成可用工作流
- [ ] 提供至少 10 个预设工作流模板
- [ ] 支持 MCP 工具节点调用
- [ ] 工作流可导出为 Claude Code 兼容格式

---

## 🌐 Phase 4: WebUI 远程访问模式

**工期**: 2 周 | **优先级**: P1 | **后端**: Java Spring Boot

### 4.1 功能概述

支持通过 Web 远程访问 AI 工作台，允许用户从任何设备（包括移动端）访问本地运行的服务，同时保证数据安全和访问控制。

### 4.2 核心功能

```
├── 🌍 远程访问支持
│   ├── 可配置监听地址 (localhost / 0.0.0.0)
│   ├── 可配置端口号
│   └── HTTPS 支持 (可选)
│
├── 📱 移动端优化
│   ├── 响应式布局
│   ├── 触摸友好界面
│   └── 移动端手势支持
│
├── 🔐 安全认证
│   ├── JWT Token 认证
│   ├── 可选 IP 白名单
│   ├── 访问令牌管理
│   └── 会话超时控制
│
└── 💾 数据本地存储
    ├── SQLite 本地数据库
    ├── 文件本地存储
    └── 数据不离开用户设备
```

### 4.3 技术实现

#### 后端 (Java Spring Boot)

**配置类**:
```java
// WebUI 配置
@Configuration
@ConfigurationProperties(prefix = "webui")
public class WebUiProperties {
    private boolean enabled = false;
    private String host = "localhost";
    private int port = 5173;
    private boolean remoteAccess = false;
    private List<String> ipWhitelist = new ArrayList<>();
    private long sessionTimeout = 3600000; // 1 hour
    // getters/setters
}
```

**安全配置**:
```java
@Configuration
@EnableWebSecurity
public class WebUiSecurityConfig {
    
    @Bean
    public SecurityFilterChain webUiFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/static/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .maximumSessions(10)
                .maxSessionsPreventsLogin(false)
            );
        return http.build();
    }
}
```

#### 启动命令

```bash
# 基本启动 (本地访问)
java -jar agent-backend.jar --webui.enabled=true

# 远程访问 (局域网)
java -jar agent-backend.jar --webui.enabled=true --webui.remote-access=true --webui.host=0.0.0.0

# 自定义端口
java -jar agent-backend.jar --webui.port=8888

# 带 IP 白名单
java -jar agent-backend.jar --webui.remote-access=true --webui.ip-whitelist=192.168.1.0/24
```

#### 前端优化

```jsx
// 移动端适配
- 使用 Tailwind CSS 响应式工具类
- 添加触摸事件支持
- 优化移动端导航
- 添加 PWA 支持 (离线访问)
```

### 4.4 验收标准

- [ ] 支持从局域网其他设备访问
- [ ] 移动端界面完美适配
- [ ] JWT 认证正常工作
- [ ] IP 白名单功能可用
- [ ] 支持至少 10 个并发连接

---

## 🎨 Phase 5: AI 图像生成与编辑

**工期**: 2 周 | **优先级**: P1 | **后端**: Java Spring Boot

### 5.1 功能概述

集成 AI 图像生成和编辑能力，支持通义万相、DALL-E、Stable Diffusion 等模型，提供图像识别和截图处理能力。

### 5.2 核心功能

```
├── 🖼️ 图像生成
│   ├── 通义万相集成
│   ├── DALL-E 3 集成
│   ├── Stable Diffusion 集成
│   └── 文生图/图生图
│
├── ✏️ 图像编辑
│   ├── AI 图像修复
│   ├── 图像扩展 (Outpainting)
│   ├── 图像内补 (Inpainting)
│   └── 风格转换
│
├── 👁️ 图像识别
│   ├── 物体识别
│   ├── 场景理解
│   ├── OCR 文字提取 (已有)
│   └── 图像描述生成
│
└── 📸 截图处理
    ├── 截图自动提取文字
    ├── 截图元素识别
    └── 截图转代码 (UI → Code)
```

### 5.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/image/
├── ImageGenerationService.java    # 图像生成服务
├── ImageEditingService.java       # 图像编辑服务
├── ImageRecognitionService.java   # 图像识别服务
├── ScreenshotProcessorService.java # 截图处理服务
└── UiToCodeService.java           # UI 转代码服务
```

**新增依赖**:
```xml
<!-- 阿里云 DashScope SDK (通义万相) -->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>dashscope-sdk-java</artifactId>
    <version>2.15.0</version>
</dependency>

<!-- OpenAI SDK (DALL-E) -->
<dependency>
    <groupId>com.theokanning.openai-gpt3-java</groupId>
    <artifactId>service</artifactId>
    <version>0.18.0</version>
</dependency>

<!-- OpenCV (图像处理) -->
<dependency>
    <groupId>org.openpnp</groupId>
    <artifactId>opencv</artifactId>
    <version>4.5.1-2</version>
</dependency>
```

#### API 端点

```java
// 图像生成
POST   /api/image/generate          # 文生图
POST   /api/image/variation         # 图生图 (变体)
POST   /api/image/edit              # 图像编辑

// 图像识别
POST   /api/image/recognize         # 图像识别
POST   /api/image/describe          # 生成图像描述
POST   /api/image/ocr               # OCR 文字提取

// 截图处理
POST   /api/screenshot/process      # 处理截图
POST   /api/screenshot/extract      # 提取内容
POST   /api/screenshot/ui-to-code   # UI 转代码
```

#### 前端组件

```
frontend/src/components/image/
├── ImageGenerator.jsx           # 图像生成器
├── ImageEditor.jsx              # 图像编辑器
├── ImageRecognizer.jsx          # 图像识别器
├── ScreenshotProcessor.jsx      # 截图处理器
└── UiToCodeConverter.jsx        # UI 转代码工具
```

### 5.4 验收标准

- [ ] 支持至少 2 种图像生成模型
- [ ] 图像生成响应时间 < 30 秒
- [ ] OCR 识别准确率 > 90%
- [ ] 支持 UI 截图转 HTML/CSS 代码

---

## 💬 Phase 6: 对话/会话管理增强

**工期**: 2 周 | **优先级**: P1 | **后端**: Java Spring Boot

### 6.1 功能概述

增强对话和会话管理能力，支持多会话并行、智能分类、全文搜索和导出功能，解决用户"对话无法保存、单会话限制"的痛点。

### 6.2 核心功能

```
├── 💬 多会话并行
│   ├── 同时开启多个独立会话
│   ├── 会话间上下文隔离
│   └── 会话快速切换
│
├── 🏷️ 会话标签/分类
│   ├── 手动添加标签
│   ├── AI 自动分类 (按项目/任务类型)
│   ├── 会话收藏/置顶
│   └── 会话归档
│
├── 🔍 会话搜索
│   ├── 全文搜索历史对话
│   ├── 按标签/日期/Agent 筛选
│   ├── 搜索结果高亮
│   └── 搜索历史
│
├── 📤 会话导出
│   ├── 导出为 Markdown
│   ├── 导出为 PDF
│   ├── 导出为 HTML
│   └── 批量导出
│
└── 📋 会话模板
    ├── 常用对话场景预设
    ├── 自定义模板创建
    └── 模板分享
```

### 6.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/session/
├── ConversationService.java       # 对话服务
├── SessionTagService.java         # 会话标签服务
├── SessionSearchService.java      # 会话搜索服务
├── SessionExportService.java      # 会话导出服务
├── SessionTemplateService.java    # 会话模板服务
└── SessionClassificationService.java # 会话分类服务
```

**数据库表**:
```sql
-- 会话标签表
CREATE TABLE session_tag (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    color VARCHAR(20),
    icon VARCHAR(50)
);

-- 会话 - 标签关联表
CREATE TABLE session_tag_mapping (
    session_id INTEGER,
    tag_id INTEGER,
    created_at TIMESTAMP,
    PRIMARY KEY (session_id, tag_id)
);

-- 会话模板表
CREATE TABLE session_template (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200),
    description TEXT,
    category VARCHAR(50),
    preset_messages TEXT,       -- JSON 预设对话
    preset_config TEXT,         -- JSON 配置
    is_builtin BOOLEAN,
    created_at TIMESTAMP
);

-- 全文搜索索引表 (可选，使用 SQLite FTS5)
CREATE VIRTUAL TABLE conversation_fts USING fts5(
    content,
    session_id,
    created_at
);
```

#### API 端点

```java
// 会话管理
GET    /api/sessions/tags             # 获取标签列表
POST   /api/sessions/tags             # 创建标签
POST   /api/sessions/{id}/tags        # 添加标签
DELETE /api/sessions/{id}/tags        # 移除标签

// 会话搜索
GET    /api/sessions/search           # 搜索会话
GET    /api/sessions/filter           # 筛选会话

// 会话导出
POST   /api/sessions/{id}/export      # 导出会话
GET    /api/sessions/export/{format}  # 批量导出

// 会话模板
GET    /api/sessions/templates        # 获取模板列表
POST   /api/sessions/templates        # 创建模板
POST   /api/sessions/templates/{id}/apply # 应用模板
```

#### 前端组件

```
frontend/src/components/session/
├── SessionManager.jsx           # 会话管理器
├── SessionTagManager.jsx        # 标签管理
├── SessionSearch.jsx            # 会话搜索
├── SessionExport.jsx            # 会话导出
├── SessionTemplateGallery.jsx   # 模板库
└── MultiSessionView.jsx         # 多会话视图
```

### 6.4 验收标准

- [ ] 支持至少 10 个并发会话
- [ ] 全文搜索响应时间 < 1 秒 (1000 条对话内)
- [ ] 支持 Markdown/PDF/HTML 三种导出格式
- [ ] AI 自动分类准确率 > 80%

---

## 🔌 Phase 7: MCP 深度集成

**工期**: 3 周 | **优先级**: P2 | **后端**: Java Spring Boot

### 7.1 功能概述

深度集成 Model Context Protocol (MCP)，提供 MCP 服务器管理、预设工具库和自定义工具创建能力，扩展 AI 的工具调用边界。

### 7.2 核心功能

```
├── 🔧 MCP 服务器管理
│   ├── MCP 服务器配置
│   ├── 服务器连接测试
│   ├── 服务器状态监控
│   └── 自动发现 MCP 服务
│
├── 🛠️ 预设 MCP 工具库
│   ├── GitHub MCP (PR/Issue/Code Review)
│   ├── Notion MCP (页面/数据库操作)
│   ├── Slack MCP (消息/频道管理)
│   ├── Google Drive MCP (文件操作)
│   ├── PostgreSQL MCP (数据库查询)
│   └── FileSystem MCP (本地文件操作)
│
├── 🔨 自定义 MCP 工具
│   ├── 可视化配置向导
│   ├── 工具测试界面
│   └── 工具分享/导入
│
└── 📊 MCP 工具使用分析
    ├── 工具调用统计
    ├── 成功率监控
    └── 性能分析
```

### 7.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/mcp/
├── McpServerService.java        # MCP 服务器管理
├── McpClientervice.java         # MCP 客户端服务
├── McpToolRegistryService.java  # MCP 工具注册表
├── McpToolExecutorService.java  # MCP 工具执行
├── McpDiscoveryService.java     # MCP 服务发现
└── McpAnalyticsService.java     # MCP 使用分析
```

**新增依赖**:
```xml
<!-- MCP SDK (如果有官方 Java SDK) -->
<!-- 或使用 HTTP 客户端调用 MCP 服务 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

**数据库表**:
```sql
-- MCP 服务器配置表
CREATE TABLE mcp_server (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200),
    type VARCHAR(50),           -- 'github', 'notion', 'slack', etc.
    endpoint VARCHAR(500),
    auth_type VARCHAR(50),      -- 'api_key', 'oauth', 'none'
    auth_config TEXT,           -- JSON 加密存储
    status VARCHAR(20),         -- 'active', 'inactive', 'error'
    tools_discovered TEXT,      -- JSON 发现的工具列表
    created_at TIMESTAMP
);

-- MCP 工具调用历史表
CREATE TABLE mcp_tool_invocation (
    id INTEGER PRIMARY KEY,
    server_id INTEGER,
    tool_name VARCHAR(200),
    input_data TEXT,
    output_data TEXT,
    status VARCHAR(20),
    error_message TEXT,
    duration_ms INTEGER,
    invoked_at TIMESTAMP
);
```

#### API 端点

```java
// MCP 服务器管理
GET    /api/mcp/servers               # 获取 MCP 服务器列表
POST   /api/mcp/servers               # 添加 MCP 服务器
PUT    /api/mcp/servers/{id}          # 更新 MCP 服务器
DELETE /api/mcp/servers/{id}          # 删除 MCP 服务器
POST   /api/mcp/servers/{id}/discover # 发现工具
GET    /api/mcp/servers/{id}/status   # 检查状态

// MCP 工具
GET    /api/mcp/tools                 # 获取可用工具列表
POST   /api/mcp/tools/execute         # 执行工具
GET    /api/mcp/tools/history         # 调用历史
GET    /api/mcp/tools/analytics       # 使用分析

// 预设工具配置
GET    /api/mcp/presets               # 获取预设配置
POST   /api/mcp/presets/{type}/setup  # 快速配置
```

#### 前端组件

```
frontend/src/components/mcp/
├── McpServerManager.jsx         # MCP 服务器管理
├── McpToolBrowser.jsx           # 工具浏览器
├── McpToolExecutor.jsx          # 工具执行器
├── McpToolConfigurator.jsx      # 工具配置器
├── McpAnalyticsDashboard.jsx    # 分析仪表板
└── McpQuickSetup.jsx            # 快速配置向导
```

### 7.4 验收标准

- [ ] 支持至少 5 种预设 MCP 工具
- [ ] MCP 工具调用成功率 > 95%
- [ ] 提供可视化 MCP 配置向导
- [ ] 支持自定义 MCP 工具创建

---

## 🏠 Phase 8: 本地模型部署支持

**工期**: 1 周 | **优先级**: P2 | **后端**: Java Spring Boot

### 8.1 功能概述

支持本地 AI 模型部署，包括 Ollama、LM Studio 等，满足数据敏感用户需求，降低使用成本。

### 8.2 核心功能

```
├── 🦙 Ollama 集成
│   ├── 自动检测本地 Ollama 服务
│   ├── 模型列表获取
│   ├── 模型下载/管理
│   └── 对话/补全调用
│
├── 🏪 LM Studio 集成
│   ├── LM Studio 服务检测
│   ├── 本地模型管理
│   └── API 兼容调用
│
├── ⚙️ 自定义 API 端点
│   ├── 自定义 OpenAI 兼容 API
│   ├── 认证配置
│   └── 连接测试
│
└── 📴 离线模式
    ├── 完全离线运行
    ├── 本地模型缓存
    └── 离线功能降级
```

### 8.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/local/
├── OllamaService.java           # Ollama 服务
├── LmStudioService.java         # LM Studio 服务
├── LocalModelManagerService.java # 本地模型管理
├── CustomApiService.java        # 自定义 API 服务
└── OfflineModeService.java      # 离线模式服务
```

**新增依赖**:
```xml
<!-- HTTP 客户端用于调用本地模型 API -->
<dependency>
    <groupId>io.projectreactor.netty</groupId>
    <artifactId>reactor-netty-http</artifactId>
</dependency>
```

#### API 端点

```java
// Ollama
GET    /api/local/ollama/status       # 检查 Ollama 状态
GET    /api/local/ollama/models       # 获取模型列表
POST   /api/local/ollama/pull         # 下载模型
POST   /api/local/ollama/chat         # 对话调用

// LM Studio
GET    /api/local/lmstudio/status     # 检查 LM Studio 状态
GET    /api/local/lmstudio/models     # 获取模型列表
POST   /api/local/lmstudio/chat       # 对话调用

// 自定义 API
POST   /api/local/custom/test         # 测试自定义 API
POST   /api/local/custom/chat         # 自定义 API 对话

// 离线模式
GET    /api/local/offline/status      # 离线模式状态
POST   /api/local/offline/enable      # 启用离线模式
```

#### 前端组件

```
frontend/src/components/local/
├── OllamaManager.jsx            # Ollama 管理
├── LmStudioManager.jsx          # LM Studio 管理
├── LocalModelBrowser.jsx        # 本地模型浏览器
├── CustomApiConfig.jsx          # 自定义 API 配置
└── OfflineModeToggle.jsx        # 离线模式切换
```

### 8.4 验收标准

- [ ] 自动检测 Ollama 服务
- [ ] 支持 Ollama 模型下载和管理
- [ ] 自定义 API 支持 OpenAI 兼容格式
- [ ] 离线模式下基本功能可用

---

## 📊 Phase 9: 项目健康度仪表盘

**工期**: 2 周 | **优先级**: P3 | **后端**: Java Spring Boot

### 9.1 功能概述

提供项目健康度可视化和分析功能，帮助团队持续改进代码质量。

### 9.2 核心功能

```
├── 📈 代码质量趋势
│   ├── 代码复杂度趋势图
│   ├── 代码重复率分析
│   ├── 代码规范遵守率
│   └── 技术债务估算
│
├── 🧪 测试覆盖率
│   ├── 行覆盖率可视化
│   ├── 分支覆盖率
│   ├── 测试用例统计
│   └── 覆盖率趋势
│
├── 📦 依赖管理
│   ├── 依赖更新提醒
│   ├── 安全漏洞扫描
│   ├── 过时依赖检测
│   └── 依赖健康评分
│
└── 🤖 AI 改进建议
    ├── 自动生成的改进报告
    ├── 优先级排序
    └── 改进追踪
```

### 9.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/health/
├── CodeQualityService.java      # 代码质量分析
├── TestCoverageService.java     # 测试覆盖率服务
├── DependencyHealthService.java # 依赖健康服务
├── ProjectHealthDashboardService.java # 健康仪表盘
└── AiRecommendationService.java # AI 改进建议
```

**新增依赖**:
```xml
<!-- 代码分析工具 -->
<dependency>
    <groupId>com.github.javaparser</groupId>
    <artifactId>javaparser-core</artifactId>
    <version>3.25.5</version>
</dependency>

<!-- 依赖检查 -->
<dependency>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-core</artifactId>
    <version>9.0.7</version>
</dependency>
```

#### API 端点

```java
GET    /api/project/health              # 项目健康度总览
GET    /api/project/health/quality      # 代码质量分析
GET    /api/project/health/coverage     # 测试覆盖率
GET    /api/project/health/dependencies # 依赖健康
GET    /api/project/health/recommendations # AI 改进建议
POST   /api/project/health/scan         # 触发扫描
```

#### 前端组件

```
frontend/src/components/health/
├── ProjectHealthDashboard.jsx   # 健康仪表盘
├── CodeQualityChart.jsx         # 代码质量图表
├── TestCoverageChart.jsx        # 覆盖率图表
├── DependencyHealthPanel.jsx    # 依赖健康面板
└── AiRecommendationsList.jsx    # AI 建议列表
```

### 9.4 验收标准

- [ ] 支持 Java/Python/JavaScript 代码分析
- [ ] 测试覆盖率数据准确
- [ ] 依赖安全漏洞检测及时
- [ ] AI 改进建议具体可操作

---

## 🎨 Phase 10: 个性化界面定制

**工期**: 2 周 | **优先级**: P3 | **后端**: Java Spring Boot

### 10.1 功能概述

提供界面个性化定制能力，支持主题、布局、字体等自定义，提升用户体验。

### 10.2 核心功能

```
├── 🎨 主题定制
│   ├── 预设主题库
│   ├── 自定义配色方案
│   ├── 深色/浅色模式
│   └── 主题分享/导入
│
├── 📐 布局自定义
│   ├── 拖拽调整面板位置
│   ├── 面板大小调整
│   ├── 面板显示/隐藏
│   └── 布局保存/恢复
│
├── 🔤 字体/显示
│   ├── 字体选择
│   ├── 字号调整
│   ├── 行高/字间距
│   └── 代码编辑器主题
│
└── ⚙️ 其他设置
    ├── 快捷键自定义
    ├── 通知偏好设置
    └── 语言设置
```

### 10.3 技术实现

#### 后端 (Java Spring Boot)

**新增服务类**:
```
backend-java/src/main/java/com/iflow/agent/service/settings/
├── ThemeService.java            # 主题服务
├── LayoutService.java           # 布局服务
├── UserPreferenceService.java   # 用户偏好服务
└── ShortcutService.java         # 快捷键服务
```

**数据库表**:
```sql
-- 用户主题表
CREATE TABLE user_theme (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    name VARCHAR(200),
    colors TEXT,                -- JSON 配色方案
    is_builtin BOOLEAN,
    created_at TIMESTAMP
);

-- 用户布局表
CREATE TABLE user_layout (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    layout_data TEXT,           -- JSON 布局配置
    name VARCHAR(200),
    created_at TIMESTAMP
);

-- 用户偏好表
CREATE TABLE user_preference (
    user_id INTEGER,
    preference_key VARCHAR(200),
    preference_value TEXT,
    updated_at TIMESTAMP,
    PRIMARY KEY (user_id, preference_key)
);
```

#### API 端点

```java
// 主题管理
GET    /api/settings/themes         # 获取主题列表
POST   /api/settings/themes         # 创建主题
PUT    /api/settings/themes/{id}    # 更新主题
DELETE /api/settings/themes/{id}    # 删除主题

// 布局管理
GET    /api/settings/layouts        # 获取布局列表
POST   /api/settings/layouts        # 保存布局
PUT    /api/settings/layouts/{id}   # 更新布局

// 用户偏好
GET    /api/settings/preferences    # 获取偏好设置
PUT    /api/settings/preferences    # 更新偏好

// 快捷键
GET    /api/settings/shortcuts      # 获取快捷键
PUT    /api/settings/shortcuts      # 自定义快捷键
```

#### 前端组件

```
frontend/src/components/settings/
├── ThemeManager.jsx           # 主题管理
├── LayoutEditor.jsx           # 布局编辑器
├── PreferencePanel.jsx        # 偏好设置面板
├── ShortcutConfig.jsx         # 快捷键配置
└── FontSettings.jsx           # 字体设置
```

### 10.4 验收标准

- [ ] 提供至少 5 个预设主题
- [ ] 支持拖拽调整布局
- [ ] 偏好设置实时生效
- [ ] 支持布局配置导出/导入

---

## 📅 实施时间表

| 季度 | 阶段 | 功能模块 |
|------|------|----------|
| **Q1 2026** (2-4 月) | Phase 1-3 | 多 AI Agent 管理、AI 办公自动化、工作流增强 |
| **Q2 2026** (5-7 月) | Phase 4-6 | WebUI 远程访问、图像生成、会话管理增强 |
| **Q3 2026** (8-10 月) | Phase 7-8 | MCP 深度集成、本地模型支持 |
| **Q4 2026** (11-1 月) | Phase 9-10 | 项目健康度、个性化界面 |

---

## 🎯 成功指标

| 指标 | 当前 | 目标 | 衡量方式 |
|------|------|------|----------|
| 支持的 AI Agent 数量 | 3 | 10+ | Agent 注册表 |
| 办公场景覆盖率 | 0% | 80% | 功能清单 |
| 工作流模板数量 | 5 | 50+ | 模板库 |
| 月活跃用户 | - | 1000+ | 用户统计 |
| 用户满意度 | - | 4.5/5 | 用户调研 |

---

## 📝 下一步行动

1. **Phase 1 启动** - 开始多 AI Agent 管理平台开发
2. **技术预研** - MCP 协议、图像生成 API 调研
3. **UI/UX 设计** - 新功能界面设计
4. **测试计划** - 制定各阶段测试方案

---

*文档版本：1.0 | 最后更新：2026 年 2 月 23 日*
