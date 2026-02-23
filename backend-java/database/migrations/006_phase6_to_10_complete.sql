-- Phase 6: 对话/会话管理增强
-- 数据库迁移脚本

-- 会话表
CREATE TABLE IF NOT EXISTS conversation_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200),
    project_id INTEGER,
    user_id INTEGER,
    agent_id INTEGER,
    tags TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    message_count INTEGER DEFAULT 0,
    token_usage INTEGER DEFAULT 0,
    last_message_summary TEXT,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会话消息表
CREATE TABLE IF NOT EXISTS conversation_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    token_usage INTEGER DEFAULT 0,
    is_important BOOLEAN DEFAULT FALSE,
    attachments TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会话标签表
CREATE TABLE IF NOT EXISTS conversation_tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    user_id INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会话模板表
CREATE TABLE IF NOT EXISTS conversation_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    preset_messages TEXT,
    preset_config TEXT,
    is_builtin BOOLEAN DEFAULT FALSE,
    user_id INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversation_session_user ON conversation_session(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_session_project ON conversation_session(project_id);
CREATE INDEX IF NOT EXISTS idx_conversation_message_session ON conversation_message(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tag_user ON conversation_tag(user_id);

-- Phase 7: MCP 深度集成
CREATE TABLE IF NOT EXISTS mcp_server (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(500),
    auth_type VARCHAR(50),
    auth_config TEXT,
    status VARCHAR(20) DEFAULT 'inactive',
    tools_discovered TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_tool_invocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    tool_name VARCHAR(200),
    input_data TEXT,
    output_data TEXT,
    status VARCHAR(20),
    error_message TEXT,
    duration_ms INTEGER,
    invoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 8: 本地模型部署支持
CREATE TABLE IF NOT EXISTS local_model (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50),
    endpoint VARCHAR(500),
    status VARCHAR(20) DEFAULT 'inactive',
    config TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 9: 项目健康度仪表盘
CREATE TABLE IF NOT EXISTS project_health_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    code_quality_score REAL,
    test_coverage REAL,
    technical_debt INTEGER,
    dependency_health_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 10: 个性化界面定制
CREATE TABLE IF NOT EXISTS user_preference (
    user_id INTEGER,
    preference_key VARCHAR(200),
    preference_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, preference_key)
);

CREATE TABLE IF NOT EXISTS user_theme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name VARCHAR(200),
    colors TEXT,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_layout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    layout_data TEXT,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_mcp_server_status ON mcp_server(status);
CREATE INDEX IF NOT EXISTS idx_local_model_provider ON local_model(provider);
CREATE INDEX IF NOT EXISTS idx_project_health_project ON project_health_snapshot(project_id);
