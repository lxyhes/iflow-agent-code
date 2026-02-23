-- Phase 3: 工作流可视化编辑器增强
-- 数据库迁移脚本

-- 工作流节点表
CREATE TABLE IF NOT EXISTS workflow_node (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    node_name VARCHAR(200),
    node_config TEXT,
    position_x INTEGER,
    position_y INTEGER,
    connections TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工作流模板表
CREATE TABLE IF NOT EXISTS workflow_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    template_data TEXT NOT NULL,
    is_builtin BOOLEAN DEFAULT FALSE,
    icon VARCHAR(50),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工作流执行历史表
CREATE TABLE IF NOT EXISTS workflow_execution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    input_data TEXT,
    output_data TEXT,
    error_message TEXT,
    execution_log TEXT,
    user_id INTEGER,
    project_id INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_workflow_node_workflow ON workflow_node(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_template_category ON workflow_template(category);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_workflow ON workflow_execution(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_user ON workflow_execution(user_id);
