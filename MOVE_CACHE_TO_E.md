# 项目缓存迁移到E盘指南

## 已完成的修改

### 1. 后端服务器 (server.py)
- 设置 TEMP/TMP 环境变量到 `E:/cache/agent_project/temp`

### 2. 核心服务文件已修改:
- `core/memory_provider.py` - llm_memory 缓存
- `core/workflow_service.py` - workflows 缓存
- `core/ocr_service.py` - ocr_cache 缓存
- `core/project_manager.py` - backups/storage 缓存

## 需要手动迁移的目录

### 从项目目录迁移到 E:/cache/agent_project/

1. **storage/** 目录 (如果有重要数据)
   ```bash
   # 复制数据（不要移动，先复制验证）
   xcopy "E:\zhihui-soft\agent_project\storage" "E:\cache\agent_project\storage" /E /I /H
   ```

2. **workflows/** 目录
   ```bash
   xcopy "E:\zhihui-soft\agent_project\workflows" "E:\cache\agent_project\workflows" /E /I /H
   ```

## 环境变量配置（可选）

如果需要自定义缓存位置，可以设置环境变量：

```powershell
# 设置用户环境变量
[Environment]::SetEnvironmentVariable("AGENT_PROJECT_CACHE", "E:/cache/agent_project", "User")
[Environment]::SetEnvironmentVariable("AGENT_PROJECT_STORAGE", "E:/cache/agent_project/storage", "User")
[Environment]::SetEnvironmentVariable("AGENT_PROJECT_BACKUPS", "E:/cache/agent_project/backups", "User")
[Environment]::SetEnvironmentVariable("AGENT_PROJECT_WORKFLOWS", "E:/cache/agent_project/workflows", "User")
[Environment]::SetEnvironmentVariable("AGENT_PROJECT_OCR", "E:/cache/agent_project/ocr_cache", "User")
```

## 验证配置

重启后端服务器后，检查缓存目录是否正确：

```python
# 在Python中验证
import os
print(os.environ.get('TEMP'))  # 应该输出 E:/cache/agent_project/temp
```

## 清理C盘原缓存

确认E盘缓存正常工作后，可以删除C盘的原缓存：

```powershell
# 删除项目原 storage 目录（谨慎操作！）
Remove-Item -Path "E:\zhihui-soft\agent_project\storage" -Recurse -Force

# 删除项目原 workflows 目录
Remove-Item -Path "E:\zhihui-soft\agent_project\workflows" -Recurse -Force
```

## 注意事项

1. **先备份重要数据** - 迁移前确保有备份
2. **逐步迁移** - 先复制，验证正常后再删除原文件
3. **重启服务** - 修改后需要重启后端服务器
4. **监控磁盘** - 迁移后监控E盘空间使用情况
