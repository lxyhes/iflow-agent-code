# LLM 框架组合落地（LangChain / LlamaIndex / Semantic Kernel / AutoGen / CrewAI / MemGPT / Guidance / DSPy / SWE-agent）

## 目标
- 让“编排、RAG、多智能体、长期记忆、结构化输出、代码任务”能力可插拔
- 不强制引入重依赖：默认沿用现有后端能力；安装可选依赖后自动解锁额外框架

## 推荐组合（按场景）
- 快速上手/功能全：LangChain（编排） +（可选）DSPy（结构化输出）
- RAG 应用：现有 `backend/core/rag_service.py` 作为默认 +（可选）LlamaIndex 作为替代实现
- 企业级应用：Semantic Kernel（连接器/插件） + LangChain（编排路由）
- 多智能体协作：AutoGen 或 CrewAI（编排）+ 现有工具执行层（文件/命令/Git/工作流）
- 长期记忆：现有 `business_memory_service`/版本管理 作为默认 +（可选）MemGPT 对齐 Memory API
- 精确控制输出：Pydantic/JSON Schema + 重试（默认）+（可选）DSPy/Guidance 增强
- 代码任务：现有 `code_analyzer/auto_fixer/auto_heal/workflow_executor`（默认）+（可选）SWE-agent 作为策略层

## 在本系统的落点（最重要的边界）
- 框架“只做编排/推理”，不要直接读写文件/执行命令
- 任何副作用统一走现有后端的安全执行层：
  - 文件：`backend/core/file_service.py`
  - 命令：`backend/core/shell_service.py` / `sandbox_service.py`
  - Git：`backend/core/git_service.py`
  - 工作流：`backend/core/workflow_executor.py`

这样可以保证：
- 权限控制一致
- 审计/日志一致
- 未来替换框架成本低

## 已接入的能力（本次改动）
- 新增框架目录：`backend/core/frameworks/`
  - 可用性检测：按 import 是否存在判断框架是否已安装
  - 推荐组合：按你的 goals 生成建议 stack，并给出与现有模块的映射
- 新增 API：
  - `GET /api/frameworks/status`：返回每个框架是否可用、能力标签
  - `POST /api/frameworks/recommend`：输入 goals 返回推荐组合与落地映射

## 运行开关（环境变量）
- `ORCHESTRATION_ENABLED`：是否启用编排层（默认 true）
- `ORCHESTRATOR_PROVIDER`：编排 provider（默认 langchain），可选：`langchain` / `semantic_kernel` / `autogen` / `crewai` / `swe_agent` / `json`
- `ORCHESTRATOR_FALLBACK`：编排回退链（默认 `langchain,json`，逗号分隔）
- `RAG_ENABLED`：是否启用 RAG（默认 true）
- `RAG_BACKEND`：RAG 后端选择：`legacy`（默认，走现有 rag_service）或 `llamaindex`
- `MEMORY_PROVIDER`：长期记忆 provider（默认 business），可选：`business` / `memgpt`（当前为兼容模式：落盘记忆）
- `OUTPUT_PROVIDER`：结构化输出 provider（默认 legacy），可选：`legacy` / `dspy` / `guidance`（当前为兼容模式：更严格提示 + 更多重试）
- `chat_only_mode`：已有全局配置（legacy `global_config`），开启时会禁用有副作用的工具（写文件/跑命令/执行工作流）

## 已接入入口
- 聊天入口 `/stream`：通过 `get_agent()` 返回的对象统一接入编排层与 RAG（见 `backend/server.py`）
- 工作流执行器：`WorkflowExecutor` 内部初始化的 Agent 也已包一层编排器（见 `backend/core/workflow_executor.py`）

## LangChain 编排方式（当前实现）
- 使用 ReAct Agent（文本格式的 Action/Observation），不依赖模型原生 function calling
- 工具入参要求：Action Input 使用 JSON 字符串（例如 `{"path":"README.md"}`）
- 自动附带 `rag_search` 工具（如果启用了 RAG），用于按需检索项目知识库

## Provider 回退策略（统一）
- 可通过 `GET /api/frameworks/providers/plan` 查看：已安装（availability）、可用兼容模式（compatible）、最终生效（effective）
- `native_used` 字段用于指示：本次最终生效是否走了对应框架的“原生运行时”

## 原生运行时（自动启用）
- 只要你选择了对应 provider 且环境满足条件，就会优先走“原生运行时”；否则自动回退到兼容实现（不影响现有入口）
- Semantic Kernel / AutoGen / CrewAI 的原生运行时当前依赖 OpenAI 环境变量（至少 `OPENAI_API_KEY`，SK 还需要 `OPENAI_CHAT_MODEL_ID`）；未配置会回退
- DSPy / Guidance 当前已预留原生适配入口（会先尝试原生生成，再回退到“严格提示 + 重试 + JSON 解析”）

## 可选依赖安装
在 `backend/requirements-llm-frameworks.txt` 里列出了可选依赖。你可以按需安装其中一部分，而不是一次性全装。

## 下一步（如果你要“真正跑起来”）
- 选定 1 个编排框架（LangChain 或 Semantic Kernel），把它接到“工具调用层”的适配器上
- 选定 1 个 RAG 框架（继续用现有 or LlamaIndex），统一到一个 `RAGBackend` 接口
- 选定 1 个多智能体框架（AutoGen/CrewAI），把每个 agent 的“动作”限制为调用后端工具 API
