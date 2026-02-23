-- Phase 5: AI 图像生成与编辑
-- 数据库迁移脚本

-- 图像生成历史表
CREATE TABLE IF NOT EXISTS image_generation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generation_type VARCHAR(50) NOT NULL,
    prompt TEXT,
    negative_prompt TEXT,
    input_image_path VARCHAR(500),
    output_image_path VARCHAR(500) NOT NULL,
    model VARCHAR(100),
    config TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 图像处理任务表
CREATE TABLE IF NOT EXISTS image_task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type VARCHAR(50) NOT NULL,
    input_image_path VARCHAR(500) NOT NULL,
    output_result TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_image_generation_status ON image_generation(status);
CREATE INDEX IF NOT EXISTS idx_image_generation_user ON image_generation(user_id);
CREATE INDEX IF NOT EXISTS idx_image_task_status ON image_task(status);
CREATE INDEX IF NOT EXISTS idx_image_task_type ON image_task(task_type);
