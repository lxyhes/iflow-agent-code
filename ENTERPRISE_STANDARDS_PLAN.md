# iFlow Agent 企业级开发规范调整计划

## 📋 现状分析

### 已配置的工具（✅ 良好）

#### 后端（Python）
- ✅ **Black** - 代码格式化（line-length: 100）
- ✅ **isort** - 导入排序（profile: black）
- ✅ **Pylint** - 代码质量检查（已配置禁用规则）
- ✅ **MyPy** - 类型检查（宽松模式）
- ✅ **Pytest** - 测试框架（已配置覆盖率）
- ✅ **Coverage** - 测试覆盖率报告

#### 前端（JavaScript/React）
- ✅ **ESLint** - 代码质量检查（已配置 React 规则）
- ✅ **Prettier** - 代码格式化（已配置）
- ✅ **Vite** - 构建工具

### 需要改进的地方（⚠️ 问题）

#### 1. 项目结构问题
- ❌ `backend/core/` 目录包含 60+ 个服务文件，缺乏模块化分组
- ❌ 前端 `src/components/` 包含 80+ 组件，缺乏分类组织
- ❌ 缺少统一的配置管理
- ❌ 缺少环境变量管理规范

#### 2. 代码质量问题
- ❌ 缺少单元测试覆盖率要求
- ❌ 缺少集成测试
- ❌ 缺少 E2E 测试
- ❌ 缺少 CI/CD 流水线
- ❌ 类型注解不完整（后端 MyPy 配置为宽松模式）

#### 3. 开发流程问题
- ❌ 缺少 Git 分支管理规范
- ❌ 缺少 Code Review 流程
- ❌ 缺少版本发布流程
- ❌ 缺少文档规范

#### 4. 安全问题
- ❌ 缺少依赖安全扫描
- ❌ 缺少代码安全审计
- ❌ 缺少敏感信息管理规范

---

## 🎯 企业级规范调整计划

### 阶段一：基础规范化（不破坏现有业务）

#### 1.1 代码质量工具增强

**后端**
```bash
# 添加 pre-commit 钩子
pip install pre-commit
```

创建 `.pre-commit-config.yaml`：
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.1.1
    hooks:
      - id: black
        language_version: python3.10

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort

  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--max-line-length=100', '--extend-ignore=E203,W503']

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

**前端**
```bash
# 添加 lint-staged
npm install --save-dev lint-staged husky
```

更新 `package.json`：
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

#### 1.2 代码规范文档

创建 `backend/CODING_STANDARDS.md`：
```markdown
# 后端代码规范

## Python 版本
- Python 3.10+

## 代码风格
- 遵循 PEP 8
- 使用 Black 格式化（line-length: 100）
- 使用 isort 排序导入

## 类型注解
- 所有公共函数必须有类型注解
- 使用 Pydantic 模型进行数据验证
- 逐步完善类型注解覆盖率

## 异常处理
- 使用自定义异常类（`backend/core/exceptions.py`）
- 所有异常必须记录日志
- 避免捕获宽泛的 Exception

## 日志规范
- 使用标准 logging 模块
- 日志级别：DEBUG < INFO < WARNING < ERROR < CRITICAL
- 结构化日志（JSON 格式）

## 安全规范
- 所有文件操作必须通过 PathValidator 验证
- 敏感信息不得硬编码
- 使用环境变量管理配置
```

创建 `frontend/CODING_STANDARDS.md`：
```markdown
# 前端代码规范

## JavaScript/React 版本
- React 18+
- ES2020+

## 代码风格
- 使用 ESLint + Prettier
- 函数式组件 + Hooks
- TypeScript 类型注解（逐步迁移）

## 组件规范
- 单一职责原则
- Props 使用 PropTypes 或 TypeScript
- 使用 class-variance-authority 管理样式变体

## 状态管理
- 优先使用 React Context API
- 复杂状态使用 Zustand 或 Redux Toolkit
- 避免过度使用全局状态

## 性能优化
- 使用 React.memo 避免不必要的渲染
- 使用 useMemo/useCallback 优化计算
- 虚拟滚动长列表（react-virtuoso）
```

#### 1.3 Git 规范

创建 `.gitignore` 补充：
```gitignore
# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# Test coverage
coverage/
.nyc_output/

# Build
dist/
build/
.pytest_cache/

# Database
*.db
*.sqlite
*.sqlite3

# OS
.DS_Store
Thumbs.db
```

创建 `CONTRIBUTING.md`：
```markdown
# 贡献指南

## 分支策略
- `main` - 主分支，生产环境代码
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支
- `hotfix/*` - 紧急修复分支

## 提交信息规范
遵循 Conventional Commits：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

示例：
```
feat(chat): 添加工具调用折叠功能

- 合并重复的 file_read 工具调用
- 添加工具调用摘要栏
- 默认折叠，可展开查看详情
```

## Code Review 流程
1. 创建 Pull Request
2. 至少 1 人 Review
3. 通过 CI 检查
4. Squash and Merge
```

### 阶段二：项目结构优化（渐进式重构）

#### 2.1 后端模块化重组

**当前结构**：
```
backend/core/
├── 60+ 服务文件（平铺）
```

**目标结构**：
```
backend/core/
├── __init__.py
├── ai/                    # AI 相关服务
│   ├── __init__.py
│   ├── agent.py
│   ├── llm.py
│   ├── iflow_client.py
│   ├── iflow_sdk_client.py
│   ├── prompt_optimizer.py
│   └── prompt_manager_service.py
├── analysis/              # 代码分析服务
│   ├── __init__.py
│   ├── code_analyzer.py
│   ├── code_review_service.py
│   ├── code_style_analyzer.py
│   ├── code_completion_service.py
│   ├── code_dependency_analyzer.py
│   ├── refactor_suggester.py
│   ├── test_generator.py
│   └── error_analyzer.py
├── project/               # 项目管理服务
│   ├── __init__.py
│   ├── project_manager.py
│   ├── project_developer_agent.py
│   ├── project_template_service.py
│   ├── project_templates.py
│   ├── file_service.py
│   ├── dependency_analyzer.py
│   └── feature_locator_service.py
├── git/                   # Git 服务
│   ├── __init__.py
│   └── git_service.py
├── document/              # 文档服务
│   ├── __init__.py
│   ├── doc_generator.py
│   ├── document_classifier.py
│   ├── document_summarizer.py
│   ├── document_version_manager.py
│   └── smart_chunker.py
├── workflow/              # 工作流服务
│   ├── __init__.py
│   ├── task_master_service.py
│   ├── smart_requirement_service.py
│   ├── cicd_generator.py
│   ├── solution_generator_service.py
│   ├── business_flow_summarizer.py
│   ├── business_memory_service.py
│   ├── command_shortcut_service.py
│   ├── workflow_execution_store.py
│   ├── workflow_executor.py
│   └── workflow_service.py
├── rag/                   # RAG 服务
│   ├── __init__.py
│   ├── rag_service.py
│   ├── rag_backend.py
│   ├── context_graph_service.py
│   └── snippet_service.py
├── system/                # 系统服务
│   ├── __init__.py
│   ├── shell_service.py
│   ├── async_command.py
│   ├── sandbox_service.py
│   ├── health_analyzer.py
│   ├── performance_monitor.py
│   ├── report_generator.py
│   ├── report_generator_enhanced.py
│   ├── gamification_service.py
│   └── auto_heal_service.py
├── security/              # 安全服务
│   ├── __init__.py
│   ├── path_validator.py
│   └── security.py
├── common/                # 通用模块
│   ├── __init__.py
│   ├── schema.py
│   ├── registry.py
│   ├── retry.py
│   ├── exceptions.py
│   ├── error_handler.py
│   ├── memory_provider.py
│   ├── structured_output.py
│   └── auto_fixer.py
├── ocr/                   # OCR 服务
│   ├── __init__.py
│   ├── ocr_service.py
│   └── ocr_local_pipeline.py
├── frameworks/            # 框架集成
│   └── ...
└── providers/             # 提供商集成
    └── ...
```

**迁移策略**（不破坏业务）：
1. 创建新的目录结构
2. 使用软链接或别名引用旧文件
3. 逐步迁移并更新导入
4. 删除旧文件

#### 2.2 前端组件重组

**当前结构**：
```
frontend/src/components/
├── 80+ 组件文件（平铺）
```

**目标结构**：
```
frontend/src/components/
├── chat/                  # 聊天相关组件
│   ├── ChatInterface.jsx
│   ├── ChatInterfaceMinimal.jsx
│   └── ...
├── messages/              # 消息相关组件
│   ├── MessageComponent.jsx
│   ├── MessageList.jsx
│   ├── AssistantMessage.jsx
│   ├── UserMessage.jsx
│   ├── ToolUsageCard.jsx
│   └── ...
├── markdown/              # Markdown 渲染
│   └── ...
├── settings/              # 设置相关组件
│   └── ...
├── sidebar/               # 侧边栏组件
│   └── ...
├── ui/                    # UI 基础组件
│   └── ...
├── visualizations/        # 可视化组件
│   └── ...
└── layouts/               # 布局组件
    └── ...
```

### 阶段三：测试增强

#### 3.1 后端测试

**目标覆盖率**：
- 核心服务：≥ 80%
- API 端点：≥ 70%
- 工具函数：≥ 90%

创建测试模板：
```python
# tests/services/test_template.py
import pytest
from backend.core.{module}.service import Service

class TestService:
    @pytest.fixture
    def service(self):
        return Service()

    def test_method_success(self, service):
        """测试方法成功场景"""
        result = service.method()
        assert result is not None

    @pytest.mark.parametrize("input,expected", [
        (1, 2),
        (2, 4),
    ])
    def test_method_parameterized(self, service, input, expected):
        """测试方法参数化场景"""
        result = service.method(input)
        assert result == expected

    def test_method_exception(self, service):
        """测试方法异常场景"""
        with pytest.raises(ValueError):
            service.method(invalid_input)
```

#### 3.2 前端测试

添加 React Testing Library：
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 阶段四：CI/CD 流水线

创建 `.github/workflows/ci.yml`：
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - run: pip install black isort flake8 mypy pylint
      - run: black --check backend/
      - run: isort --check-only backend/
      - run: flake8 backend/
      - run: mypy backend/
      - run: pylint backend/

  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - run: pip install -r backend/requirements.txt
      - run: pip install pytest pytest-cov
      - run: pytest backend/tests/ --cov=backend --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - run: pip install safety bandit
      - run: safety check backend/requirements.txt
      - run: bandit -r backend/core/
```

### 阶段五：文档完善

#### 5.1 技术文档

创建 `docs/` 目录：
```
docs/
├── architecture/          # 架构文档
│   ├── system-design.md
│   ├── database-schema.md
│   └── api-design.md
├── guides/                # 开发指南
│   ├── getting-started.md
│   ├── development-setup.md
│   └── deployment-guide.md
├── api/                   # API 文档
│   └── endpoints.md
└── components/            # 组件文档
    └── component-catalog.md
```

#### 5.2 README 优化

更新 `README.md`：
```markdown
# iFlow Agent

> 智能代码助手系统，为 Claude Code 和 Cursor CLI 提供桌面和移动端 Web UI

## 🚀 快速开始

### 环境要求
- Node.js 20+
- Python 3.10+
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/lxyhes/iflow-agent-code.git
cd iflow-agent-code

# 安装后端依赖
cd backend
pip install -r requirements.txt

# 安装前端依赖
cd ../frontend
npm install
```

### 运行

```bash
# 启动后端
cd backend
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# 启动前端（新终端）
cd frontend
npm run dev
```

## 📚 文档

- [架构设计](docs/architecture/system-design.md)
- [开发指南](docs/guides/development-setup.md)
- [API 文档](docs/api/endpoints.md)
- [贡献指南](CONTRIBUTING.md)

## 🧪 测试

```bash
# 后端测试
cd backend
pytest

# 前端测试
cd frontend
npm test
```

## 📝 代码规范

- [后端代码规范](backend/CODING_STANDARDS.md)
- [前端代码规范](frontend/CODING_STANDARDS.md)

## 🔧 开发工具

```bash
# 后端代码格式化
cd backend
black .
isort .

# 前端代码格式化
cd frontend
npm run lint:fix
```

## 📄 许可证

MIT License
```

---

## 📅 实施时间表

### 第 1 周：基础规范化
- [ ] 配置 pre-commit 钩子
- [ ] 创建代码规范文档
- [ ] 配置 Git 规范
- [ ] 添加 lint-staged

### 第 2 周：项目结构优化
- [ ] 后端模块化重组（第一阶段）
- [ ] 前端组件重组（第一阶段）
- [ ] 更新导入路径

### 第 3 周：测试增强
- [ ] 添加核心服务单元测试
- [ ] 添加 API 集成测试
- [ ] 添加前端组件测试
- [ ] 配置测试覆盖率

### 第 4 周：CI/CD 流水线
- [ ] 配置 GitHub Actions
- [ ] 添加安全扫描
- [ ] 配置自动化部署

### 第 5 周：文档完善
- [ ] 编写架构文档
- [ ] 编写开发指南
- [ ] 优化 README
- [ ] 创建组件文档

---

## ⚠️ 注意事项

1. **渐进式迁移**：所有调整都是渐进式的，不会破坏现有业务
2. **向后兼容**：保持向后兼容性，逐步迁移
3. **充分测试**：每次调整后都要充分测试
4. **代码审查**：所有调整都要经过 Code Review
5. **文档同步**：代码调整和文档更新同步进行

---

## 🎯 成功指标

- 代码覆盖率 ≥ 70%
- CI/CD 通过率 ≥ 95%
- 平均 Code Review 时间 < 24 小时
- 文档完整性 ≥ 80%
- 安全漏洞数量 = 0

---

**创建时间**：2026-01-23
**维护者**：iFlow Agent Team
**版本**：1.0.0