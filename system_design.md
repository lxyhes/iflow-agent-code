# 智能需求分析系统设计方案 (Smart Requirement Analysis System Design)

## 1. 系统概览
本系统旨在通过 AI 技术（LLM + 计算机视觉）自动分析用户输入的需求（文本或设计图），智能关联现有项目模块，并生成可执行的实施方案和计划。

## 2. 核心模块架构

### 2.1 需求解析引擎 (Requirement Parsing Engine)
*   **输入**: 文本描述、图片文件
*   **处理核心**: 
    *   **文本**: 使用 LLM (Claude/GPT) 进行语义分析，提取关键实体、用户意图、非功能性需求。
    *   **图片**: (原型阶段) 模拟视觉模型识别 UI 组件和布局结构；(完整版) 集成 Vision API 提取界面元素。
*   **输出**: 结构化需求对象 (JSON)，包含：
    *   `summary`: 需求摘要
    *   `type`: 需求类型 (Web/Mobile/Backend/Data)
    *   `keywords`: 关键技术词汇
    *   `complexity`: 复杂度评分 (1-10)

### 2.2 智能模块关联系统 (Smart Module Matcher)
*   **功能**: 将新需求与现有项目代码库进行关联。
*   **算法**:
    1.  **扫描**: 动态扫描当前项目根目录下的顶层目录和关键文件。
    2.  **索引**: 为每个模块生成简短描述（基于文件名或 README）。
    3.  **匹配**: 使用 LLM 评估需求关键词与模块的相关性，计算匹配度评分。
*   **输出**: 匹配模块列表，包含：
    *   `module_path`: 模块路径
    *   `relevance_score`: 关联度 (0-100%)
    *   `reason`: 关联理由

### 2.3 方案生成器 (Solution Generator)
*   **功能**: 基于需求和现有架构生成实施方案。
*   **流程**:
    *   结合现有项目技术栈（通过 `DependencyAnalyzer` 获取）。
    *   利用 LLM 生成 Markdown 格式的方案文档。
*   **内容**:
    *   技术选型建议
    *   架构变更点
    *   工作量预估

### 2.4 执行计划生成 (Execution Planner)
*   **功能**: 生成具体的任务分解和时间线。
*   **输出**:
    *   里程碑列表
    *   任务甘特图数据 (JSON)
    *   风险评估

## 3. 接口设计 (API Design)

### POST `/api/smart-requirements/analyze`
*   **Request**: 
    ```json
    {
      "text": "User requirement text...",
      "image_path": "/path/to/uploaded/image.png" (optional)
    }
    ```
*   **Response**:
    ```json
    {
      "analysis": { ... },
      "matched_modules": [ ... ],
      "solution_doc": "Markdown string...",
      "execution_plan": { ... }
    }
    ```

## 4. 技术栈
*   **Backend**: Python, FastAPI, LLM Service (IFlowProvider)
*   **Frontend**: React, Tailwind CSS, Lucide Icons
*   **AI**: IFlow SDK (Mocked or Real)

## 5. 验收标准对应实现
1.  **需求匹配准确率**: 通过 LLM 的语义理解能力保证，优于简单的关键词匹配。
2.  **响应时间**: 异步处理，前端展示加载状态，优化 Prompt 长度。
3.  **可操作性**: 生成结果包含具体文件路径和明确的步骤。
