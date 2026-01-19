# 数据库迁移脚本

本目录包含数据库迁移脚本，用于管理数据库结构的变更。

## 迁移脚本命名规范

迁移脚本应按照以下格式命名：
```
YYYYMMDD_HHMMSS_description.py
```

例如：
```
20240119_143000_add_user_table.py
20240119_150000_add_indexes.py
```

## 迁移脚本模板

```python
"""
迁移脚本描述

作者: Your Name
日期: YYYY-MM-DD
"""
import sqlite3
import os
import logging
from datetime import datetime

logger = logging.getLogger("Migration")

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "database.db")

def up():
    """执行迁移（升级）"""
    logger.info("开始执行迁移...")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 在这里编写迁移 SQL
        # 例如：
        # cursor.execute("""
        #     CREATE TABLE IF NOT EXISTS users (
        #         id INTEGER PRIMARY KEY AUTOINCREMENT,
        #         username TEXT UNIQUE NOT NULL,
        #         email TEXT UNIQUE NOT NULL,
        #         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        #     )
        # """)

        conn.commit()
        logger.info("迁移执行成功")

    except Exception as e:
        logger.error(f"迁移执行失败: {e}")
        raise
    finally:
        conn.close()

def down():
    """回滚迁移（降级）"""
    logger.info("开始回滚迁移...")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 在这里编写回滚 SQL
        # 例如：
        # cursor.execute("DROP TABLE IF EXISTS users")

        conn.commit()
        logger.info("迁移回滚成功")

    except Exception as e:
        logger.error(f"迁移回滚失败: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "down":
        down()
    else:
        up()
```

## 使用方法

### 执行迁移

```bash
# 执行所有未执行的迁移
python3 backend/migrations/migrate.py

# 执行特定的迁移
python3 backend/migrations/20240119_143000_add_user_table.py
```

### 回滚迁移

```bash
# 回滚特定的迁移
python3 backend/migrations/20240119_143000_add_user_table.py down
```

## 迁移记录

迁移记录存储在 `schema_migrations` 表中，用于跟踪已执行的迁移。

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 注意事项

1. **备份**: 在执行迁移前，务必备份数据库
2. **测试**: 在生产环境执行前，先在测试环境验证
3. **回滚**: 每个迁移脚本都应该提供回滚方法
4. **原子性**: 确保迁移是原子性的，要么全部成功，要么全部失败
5. **幂等性**: 迁移脚本应该可以重复执行而不会出错

## 迁移最佳实践

1. **小步快跑**: 每个迁移脚本只做一件事
2. **向前兼容**: 尽量保持向后兼容
3. **数据迁移**: 如果需要迁移数据，先备份数据
4. **性能考虑**: 大数据量迁移要考虑性能影响
5. **文档**: 记录迁移的目的和影响

## 示例迁移

### 添加新表

```python
def up():
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

def down():
    cursor.execute("DROP TABLE IF EXISTS users")
```

### 添加新列

```python
def up():
    cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")

def down():
    # SQLite 不支持 DROP COLUMN，需要重建表
    cursor.execute("""
        CREATE TABLE users_backup AS SELECT id, username, email, created_at FROM users
    """)
    cursor.execute("DROP TABLE users")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("INSERT INTO users SELECT * FROM users_backup")
    cursor.execute("DROP TABLE users_backup")
```

### 创建索引

```python
def up():
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")

def down():
    cursor.execute("DROP INDEX IF EXISTS idx_users_email")
```