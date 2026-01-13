-- Initialize authentication database
PRAGMA foreign_keys = ON;

-- Users table (single user system)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1,
    git_name TEXT,
    git_email TEXT,
    has_completed_onboarding BOOLEAN DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- API Keys table for external API access
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- User credentials table for storing various tokens/credentials (GitHub, GitLab, etc.)
CREATE TABLE IF NOT EXISTS user_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_name TEXT NOT NULL,
    credential_type TEXT NOT NULL, -- 'github_token', 'gitlab_token', 'bitbucket_token', etc.
    credential_value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_type ON user_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_user_credentials_active ON user_credentials(is_active);

-- ============================================
-- Snippets Table - 代码片段管理
-- ============================================
CREATE TABLE IF NOT EXISTS snippets (
    snippet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    language TEXT DEFAULT 'javascript',
    category TEXT DEFAULT '通用',
    description TEXT,
    tags TEXT DEFAULT '[]', -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language);
CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category);
CREATE INDEX IF NOT EXISTS idx_snippets_updated_at ON snippets(updated_at);

CREATE TABLE IF NOT EXISTS snippet_usage (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    snippet_id INTEGER NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snippet_id) REFERENCES snippets(snippet_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snippet_usage_snippet_id ON snippet_usage(snippet_id);
CREATE INDEX IF NOT EXISTS idx_snippet_usage_used_at ON snippet_usage(used_at);

-- ============================================
-- Command Shortcuts Table - 命令快捷方式
-- ============================================
CREATE TABLE IF NOT EXISTS command_shortcuts (
    shortcut_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    category TEXT DEFAULT '通用',
    description TEXT,
    tags TEXT DEFAULT '[]', -- JSON array
    working_dir TEXT,
    timeout INTEGER DEFAULT 60,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_command_shortcuts_category ON command_shortcuts(category);
CREATE INDEX IF NOT EXISTS idx_command_shortcuts_updated_at ON command_shortcuts(updated_at);

CREATE TABLE IF NOT EXISTS command_executions (
    execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
    shortcut_id INTEGER,
    command TEXT NOT NULL,
    working_dir TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_code INTEGER,
    output TEXT,
    error TEXT,
    FOREIGN KEY (shortcut_id) REFERENCES command_shortcuts(shortcut_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_command_executions_shortcut_id ON command_executions(shortcut_id);
CREATE INDEX IF NOT EXISTS idx_command_executions_executed_at ON command_executions(executed_at);

-- ============================================
-- Solutions Table - 方案生成
-- ============================================
CREATE TABLE IF NOT EXISTS solutions (
    solution_id INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement TEXT NOT NULL,
    template_type TEXT DEFAULT 'general',
    title TEXT,
    overview TEXT,
    tech_stack TEXT, -- JSON object
    architecture TEXT, -- JSON object
    implementation_steps TEXT, -- JSON array
    risks TEXT, -- JSON array
    success_criteria TEXT, -- JSON array
    estimated_cost TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solutions_template_type ON solutions(template_type);
CREATE INDEX IF NOT EXISTS idx_solutions_created_at ON solutions(created_at);

-- ============================================
-- Code Review Results Table - 代码审查结果
-- ============================================
CREATE TABLE IF NOT EXISTS code_review_results (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    issues TEXT, -- JSON array
    summary TEXT, -- JSON object
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code_review_results_project ON code_review_results(project_name);
CREATE INDEX IF NOT EXISTS idx_code_review_results_file_path ON code_review_results(file_path);
CREATE INDEX IF NOT EXISTS idx_code_review_results_reviewed_at ON code_review_results(reviewed_at);