"""
数据库模块

提供SQLite数据库连接和管理功能。
"""

import os
import sqlite3
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 简历数据库路径
RESUME_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "storage",
    "resume.db",
)


class Database:
    """数据库连接管理类"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or RESUME_DB_PATH
        self._connection: Optional[sqlite3.Connection] = None

        # 确保目录存在
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    def get_connection(self) -> sqlite3.Connection:
        """获取数据库连接"""
        if self._connection is None:
            self._connection = sqlite3.connect(self.db_path, check_same_thread=False)
            self._connection.row_factory = sqlite3.Row
            # 启用外键支持
            self._connection.execute("PRAGMA foreign_keys = ON")
        return self._connection

    def execute(self, query: str, parameters: tuple = ()) -> sqlite3.Cursor:
        """执行SQL查询"""
        conn = self.get_connection()
        cursor = conn.execute(query, parameters)
        conn.commit()
        return cursor

    def close(self):
        """关闭数据库连接"""
        if self._connection:
            self._connection.close()
            self._connection = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# 全局数据库实例
_db_instance: Optional[Database] = None


def get_db() -> Database:
    """获取数据库实例"""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance


def init_tables():
    """初始化所有表"""
    db = get_db()
    # 表会在 ResumeService 中创建
    logger.info("数据库表初始化完成")
