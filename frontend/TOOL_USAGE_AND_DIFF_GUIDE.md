# 工具调用和代码对比功能指南

## 🎯 功能概述

ChatInterfaceMinimal 现在支持完整的工具调用显示和代码修改对比功能！

## ✨ 主要特性

### 1. 工具调用卡片
- ✅ 实时显示工具执行状态（运行中、成功、失败）
- ✅ 显示工具类型和参数
- ✅ 显示 Agent 信息
- ✅ 支持展开/折叠详细信息

### 2. 代码修改对比
- ✅ 统一差异视图
- ✅ 分屏对比视图
- ✅ 语法高亮（支持多种语言）
- ✅ 行号显示
- ✅ 可折叠代码块
- ✅ 添加/删除行统计

### 3. 命令执行显示
- ✅ 显示执行的命令
- ✅ 显示命令输出结果
- ✅ 终端风格界面

## 📋 支持的工具类型

### 文件操作
- `read_file` - 读取文件
- `write_file` - 写入文件（支持代码对比）
- `replace` - 替换文件内容（支持代码对比）

### 命令执行
- `command` - 执行命令
- `run_shell_command` - 执行 Shell 命令

### 搜索操作
- `search` - 搜索代码

## 🎨 使用示例

### 前端使用（SSE 数据格式）

当工具执行完成时，后端需要发送以下格式的 SSE 数据：

```json
{
  "type": "tool_end",
  "tool_name": "write_file",
  "tool_type": "write_file",
  "status": "success",
  "agent_info": {
    "name": "CodeEditor",
    "role": "editor"
  },
  "old_content": "// 旧代码\nfunction hello() {\n  console.log('Hello');\n}",
  "new_content": "// 新代码\nfunction hello() {\n  console.log('Hello World!');\n  return true;\n}",
  "output": "File updated successfully",
  "tool_params": {
    "path": "/path/to/file.js",
    "content": "..."
  }
}
```

### 代码对比显示

当 `tool_type` 为 `write_file` 或 `replace` 时，如果提供了 `old_content` 和 `new_content`，工具卡片会自动显示代码对比：

```javascript
// 在消息中
{
  isToolUse: true,
  toolType: 'write_file',
  toolLabel: 'path: /src/utils.js',
  toolStatus: 'success',
  oldContent: '// 旧代码内容',
  newContent: '// 新代码内容'
}
```

## 🎯 交互功能

### 展开工具详情
点击工具卡片右侧的箭头按钮，可以展开查看详细信息：

1. **代码修改对比**（write_file/replace）
   - 点击"显示对比"按钮查看代码差异
   - 支持切换"统一视图"和"分屏视图"
   - 支持显示/隐藏行号

2. **命令执行结果**（command/run_shell_command）
   - 显示执行的命令
   - 显示命令输出

3. **参数详情**
   - 显示工具的完整参数

### CodeDiffViewer 功能

#### 视图模式
- **统一视图**：在一个视图中显示所有差异
  - 绿色背景：添加的行
  - 红色背景：删除的行
  - 白色背景：未改变的行

- **分屏视图**：左右对比显示
  - 左侧：旧代码
  - 右侧：新代码

#### 统计信息
- 添加行数（绿色）
- 删除行数（红色）
- 总行数

#### 支持的语言
- JavaScript
- TypeScript
- Python
- Java
- C++
- CSS
- HTML
- JSON
- Markdown
- 更多...

## 🔧 技术实现

### 组件结构

```
ChatInterfaceMinimal
├── MessageList
│   └── MessageComponent
│       └── AssistantMessage
│           └── ToolUsageCard
│               ├── CodeDiffViewer (代码对比)
│               ├── CommandOutput (命令输出)
│               └── ToolParams (参数详情)
```

### 数据流

1. **SSE 流式响应**
   ```
   tool_start → tool_end (with diff data)
   ```

2. **消息状态更新**
   ```
   running → success/failed
   ```

3. **UI 渲染**
   ```
   ToolUsageCard → 展开 → CodeDiffViewer
   ```

## 🎨 样式定制

### 工具卡片颜色

- **运行中**：蓝色边框 + 脉冲动画
- **成功**：绿色边框
- **失败**：红色边框

### 代码对比颜色

- **添加行**：绿色背景 (#dcfce7)
- **删除行**：红色背景 (#fee2e2)
- **未改变**：白色背景

## 📊 性能优化

- ✅ 使用 React.memo 避免不必要的重渲染
- ✅ 差异计算优化（仅计算必要的行）
- ✅ 虚拟滚动支持（大量代码时）
- ✅ 懒加载代码对比（默认折叠）

## 🚀 未来计划

- [ ] 支持更多编程语言的语法高亮
- [ ] 添加代码差异的导出功能
- [ ] 支持代码差异的撤销/重做
- [ ] 添加代码质量检查提示
- [ ] 支持多文件批量对比

## 💡 使用建议

1. **对于大型文件**
   - 建议使用分屏视图
   - 可以折叠未改变的代码块

2. **对于小型修改**
   - 统一视图更直观
   - 可以快速查看所有变化

3. **对于命令执行**
   - 查看命令输出了解执行结果
   - 检查错误信息排查问题

## 📚 相关文档

- [ChatInterfaceMinimal 组件文档](./src/components/ChatInterfaceMinimal.jsx)
- [ToolUsageCard 组件文档](./src/components/messages/ToolUsageCard.jsx)
- [CodeDiffViewer 组件文档](./src/components/messages/CodeDiffViewer.jsx)

---

**版本**: 2.0.0  
**更新日期**: 2026-01-13  
**作者**: iFlow Team