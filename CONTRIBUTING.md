# 贡献指南

感谢你对 iFlow Agent 项目的关注！我们欢迎任何形式的贡献。

## 🌟 如何贡献

### 报告 Bug
如果你发现了 Bug，请：
1. 检查是否已有相同的 Issue
2. 创建新的 Issue，包含：
   - Bug 描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 环境信息（操作系统、Node.js 版本、Python 版本等）
   - 相关日志或截图

### 提出新功能
如果你有新功能建议，请：
1. 检查是否已有相同的 Feature Request
2. 创建新的 Issue，包含：
   - 功能描述
   - 使用场景
   - 预期效果
   - 可能的实现方案

### 提交代码
如果你想提交代码，请按照以下流程进行：

## 🌿 分支策略

我们使用 Git Flow 工作流：

### 主要分支
- **`main`** - 主分支，生产环境代码，始终保持稳定
- **`develop`** - 开发分支，集成所有功能分支

### 功能分支
- **`feature/*`** - 新功能开发
  ```
  feature/add-user-authentication
  feature/implement-file-upload
  ```

- **`bugfix/*`** - Bug 修复
  ```
  bugfix/fix-login-error
  bugfix/resolve-memory-leak
  ```

- **`hotfix/*`** - 紧急修复（从 main 分支创建）
  ```
  hotfix/fix-critical-security-issue
  ```

- **`release/*`** - 发布准备
  ```
  release/v1.13.0
  ```

### 分支命名规范
```
<type>/<short-description>

类型：
- feature: 新功能
- bugfix: Bug 修复
- hotfix: 紧急修复
- refactor: 重构
- docs: 文档更新
- test: 测试相关
- chore: 构建/工具

示例：
feature/add-dark-mode
bugfix/fix-api-timeout
refactor/optimize-database-query
docs/update-readme
```

## 📝 提交信息规范

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（type）
- **`feat`** - 新功能
- **`fix`** - Bug 修复
- **`docs`** - 文档更新
- **`style`** - 代码格式（不影响代码运行）
- **`refactor`** - 重构（既不是新功能也不是修复）
- **``test`** - 测试相关
- **`chore`** - 构建/工具相关
- **`perf`** - 性能优化
- **`ci`** - CI/CD 相关

### 范围（scope）
- `backend` - 后端相关
- `frontend` - 前端相关
- `api` - API 相关
- `ui` - UI 组件
- `auth` - 认证相关
- `database` - 数据库相关
- `docs` - 文档相关
- `test` - 测试相关

### 主题（subject）
- 使用现在时态："add" 而不是 "added"
- 首字母小写
- 不以句号结尾

### 提交信息示例

#### 新功能
```bash
feat(chat): 添加工具调用折叠功能

- 合并重复的 file_read 工具调用
- 添加工具调用摘要栏，显示工具调用统计
- 默认折叠，可展开查看详细工具调用记录
- 优化渲染性能，减少不必要的重新渲染

Closes #123
```

#### Bug 修复
```bash
fix(frontend): 修复消息列表滚动位置丢失问题

- 修复切换会话时滚动位置重置的问题
- 保存每个会话的滚动位置
- 恢复会话时自动滚动到之前的位置

Fixes #456
```

#### 文档更新
```bash
docs(readme): 更新快速开始指南

- 添加环境变量配置说明
- 更新依赖安装步骤
- 添加常见问题解答
```

#### 重构
```bash
refactor(backend): 重构文件服务模块

- 将文件操作逻辑从多个服务中提取到独立的 FileService
- 统一文件路径验证逻辑
- 改进错误处理和日志记录
```

#### 测试
```bash
test(backend): 添加用户服务单元测试

- 添加用户创建、查询、更新、删除的测试用例
- 添加参数化测试覆盖边界情况
- 测试覆盖率从 60% 提升到 85%
```

### 提交最佳实践
```bash
# ✅ 推荐：清晰、简洁的提交信息
feat(auth): 添加 JWT 认证支持

fix(api): 修复用户查询接口超时问题

docs(readme): 更新安装指南

# ❌ 不推荐：模糊、冗长的提交信息
update
fix bug
changed some code
```

## 🔍 Code Review 流程

### 提交 Pull Request
1. 从 `develop` 分支创建功能分支
2. 在功能分支上进行开发
3. 提交代码并推送到远程仓库
4. 创建 Pull Request 到 `develop` 分支

### PR 描述模板
```markdown
## 📋 变更说明
简要描述这次变更的内容

## 🎯 相关 Issue
Closes #123
Related to #456

## ✅ 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 测试

## 🧪 测试
- [ ] 添加了单元测试
- [ ] 添加了集成测试
- [ ] 手动测试通过
- [ ] 测试覆盖率达标

## 📸 截图/录屏
如果有 UI 变更，请提供截图或录屏

## ✅ 检查清单
- [ ] 代码符合项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 通过了所有 CI 检查
- [ ] 没有 console.log 或调试代码
- [ ] 没有敏感信息泄露
```

### Review 流程
1. **自动检查**：CI 流水线自动运行测试和代码检查
2. **人工 Review**：至少 1 名维护者进行 Code Review
3. **修改建议**：Review 者提出修改建议
4. **修改代码**：作者根据建议修改代码
5. **再次 Review**：确认修改后再次 Review
6. **合并**：通过 Review 后合并到目标分支

### Review 注意事项
- 关注代码质量和可维护性
- 检查是否遵守项目规范
- 确认测试覆盖充分
- 验证文档是否更新
- 提供建设性的反馈

## 🧪 测试要求

### 后端测试
```bash
# 运行所有测试
pytest backend/tests/

# 运行特定测试文件
pytest backend/tests/test_user_service.py

# 运行测试并生成覆盖率报告
pytest backend/tests/ --cov=backend --cov-report=html

# 运行特定测试用例
pytest backend/tests/ -k "test_create_user"
```

### 前端测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监听模式
npm test -- --watch

# 运行特定测试文件
npm test -- UserProfile.test.jsx
```

### 测试覆盖率要求
- 后端核心服务：≥ 80%
- 后端 API 端点：≥ 70%
- 前端核心组件：≥ 70%
- 前端工具函数：≥ 90%

## 📚 文档要求

### 代码文档
- 所有公共函数必须有文档字符串
- 复杂逻辑必须有注释说明
- API 端点必须有 OpenAPI 文档

### 更新文档
- 新功能需要更新 README
- API 变更需要更新 API 文档
- 重大变更需要更新 CHANGELOG

## 🚫 代码规范

### 后端（Python）
```bash
# 格式化代码
black backend/
isort backend/

# 检查代码质量
pylint backend/core/
mypy backend/core/
flake8 backend/
```

### 前端（JavaScript/React）
```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,md}"
```

## 🔐 安全要求

### 敏感信息
- ❌ 不要提交 API 密钥、密码等敏感信息
- ❌ 不要提交 `.env` 文件
- ✅ 使用环境变量管理配置
- ✅ 使用 `.env.example` 提供配置模板

### 依赖安全
- 定期更新依赖包
- 使用 `npm audit` 和 `pip-audit` 检查安全漏洞
- 及时修复已知安全漏洞

## 📦 发布流程

### 版本号规范
遵循 [Semantic Versioning](https://semver.org/)：
- **MAJOR.MINOR.PATCH**
  - MAJOR：不兼容的 API 变更
  - MINOR：向下兼容的功能新增
  - PATCH：向下兼容的 Bug 修复

示例：
- `1.12.0` → `1.13.0`：新功能
- `1.13.0` → `1.13.1`：Bug 修复
- `1.13.1` → `2.0.0`：重大变更

### 发布步骤
1. 从 `develop` 创建 `release/vX.Y.Z` 分支
2. 更新版本号（`package.json`, `README.md`）
3. 更新 CHANGELOG
4. 运行完整测试
5. 合并到 `main` 和 `develop`
6. 创建 Git Tag
7. 发布到 npm（如果需要）

## 🤝 社区准则

### 行为准则
- 尊重所有贡献者
- 建设性的反馈
- 避免攻击性语言
- 关注问题，而非个人

### 沟通渠道
- GitHub Issues：报告 Bug 和功能请求
- GitHub Discussions：技术讨论
- Pull Requests：代码贡献

## 📞 获取帮助

如果你有任何问题：
1. 查看 [README.md](./README.md)
2. 查看 [文档](./docs/)
3. 搜索已有的 Issues
4. 创建新的 Issue 提问

## 🙏 致谢

感谢所有为 iFlow Agent 项目做出贡献的开发者！

---

**最后更新**：2026-01-23
**维护者**：iFlow Agent Team