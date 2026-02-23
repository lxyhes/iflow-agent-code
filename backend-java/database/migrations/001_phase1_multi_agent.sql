-- Phase 1: 多 AI Agent 统一管理平台
-- 数据库迁移脚本

-- AI Agent 注册表
CREATE TABLE IF NOT EXISTS ai_agent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    cli_path VARCHAR(500),
    version VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'inactive',
    capabilities TEXT,
    config TEXT,
    last_health_check TIMESTAMP,
    health_message VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 多 Agent 任务表
CREATE TABLE IF NOT EXISTS multi_agent_task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_description TEXT NOT NULL,
    assigned_agents TEXT NOT NULL,
    execution_mode VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    results TEXT,
    error_message TEXT,
    user_id INTEGER,
    project_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    started_at TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_agent_status ON ai_agent(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_type ON ai_agent(type);
CREATE INDEX IF NOT EXISTS idx_multi_agent_task_status ON multi_agent_task(status);
CREATE INDEX IF NOT EXISTS idx_multi_agent_task_user ON multi_agent_task(user_id);

-- 插入示例数据 (可选)
-- INSERT INTO ai_agent (name, type, status, capabilities, config) 
-- VALUES ('My Claude Agent', 'claude-code', 'active', '["代码生成", "代码审查"]', '{}');
