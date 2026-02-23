-- Phase 2: AI 办公自动化套件
-- 数据库迁移脚本

-- 文件批量处理任务表
CREATE TABLE IF NOT EXISTS file_batch_task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type VARCHAR(50) NOT NULL,
    source_paths TEXT NOT NULL,
    target_path VARCHAR(500),
    config TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result TEXT,
    error_message TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 文档生成历史表
CREATE TABLE IF NOT EXISTS document_generation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type VARCHAR(50) NOT NULL,
    source_content TEXT,
    output_path VARCHAR(500) NOT NULL,
    template VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    user_id INTEGER,
    project_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_file_batch_task_status ON file_batch_task(status);
CREATE INDEX IF NOT EXISTS idx_file_batch_task_user ON file_batch_task(user_id);
CREATE INDEX IF NOT EXISTS idx_document_generation_status ON document_generation_history(status);
CREATE INDEX IF NOT EXISTS idx_document_generation_user ON document_generation_history(user_id);
