#!/usr/bin/env python3
"""
迁移管理工具

用于执行和管理数据库迁移
"""
import os
import sys
import sqlite3
import logging
from datetime import datetime
from pathlib import Path

# 添加项目根目录到路径
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

logger = logging.getLogger("Migrate")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)

# 数据库路径
DB_PATH = os.path.join(PROJECT_ROOT, "storage", "database.db")
MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)))


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_migrations_table():
    """确保迁移记录表存在"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def get_applied_migrations():
    """获取已应用的迁移"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT version FROM schema_migrations ORDER BY version")
    applied = {row[0] for row in cursor.fetchall()}

    conn.close()
    return applied


def get_pending_migrations():
    """获取待执行的迁移"""
    applied = get_applied_migrations()
    all_migrations = []

    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if filename.endswith('.py') and not filename.startswith('__') and filename != 'migrate.py' and filename != 'README.md':
            version = filename.replace('.py', '')
            if version not in applied:
                all_migrations.append((version, filename))

    return all_migrations


def apply_migration(version, filename):
    """应用迁移"""
    logger.info(f"应用迁移: {filename}")

    # 动态导入迁移模块
    module_path = os.path.join(MIGRATIONS_DIR, filename)
    spec = __import__('importlib.util').util.spec_from_file_location(filename, module_path)
    module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # 执行迁移
    if hasattr(module, 'up'):
        module.up()

    # 记录迁移
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        (version, datetime.now().isoformat())
    )

    conn.commit()
    conn.close()

    logger.info(f"迁移应用成功: {filename}")


def rollback_migration(version, filename):
    """回滚迁移"""
    logger.info(f"回滚迁移: {filename}")

    # 动态导入迁移模块
    module_path = os.path.join(MIGRATIONS_DIR, filename)
    spec = __import__('importlib.util').util.spec_from_file_location(filename, module_path)
    module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # 执行回滚
    if hasattr(module, 'down'):
        module.down()

    # 删除迁移记录
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM schema_migrations WHERE version = ?", (version,))

    conn.commit()
    conn.close()

    logger.info(f"迁移回滚成功: {filename}")


def run_migrations():
    """运行所有待执行的迁移"""
    logger.info("开始执行迁移...")

    ensure_migrations_table()

    pending = get_pending_migrations()

    if not pending:
        logger.info("没有待执行的迁移")
        return

    logger.info(f"发现 {len(pending)} 个待执行的迁移")

    for version, filename in pending:
        try:
            apply_migration(version, filename)
        except Exception as e:
            logger.error(f"迁移失败: {filename}")
            logger.error(f"错误: {e}")
            sys.exit(1)

    logger.info("所有迁移执行完成")


def list_migrations():
    """列出所有迁移及其状态"""
    ensure_migrations_table()

    applied = get_applied_migrations()
    all_migrations = []

    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if filename.endswith('.py') and not filename.startswith('__') and filename != 'migrate.py' and filename != 'README.md':
            version = filename.replace('.py', '')
            status = "applied" if version in applied else "pending"
            all_migrations.append((version, filename, status))

    print("\n迁移状态:")
    print("-" * 60)
    print(f"{'状态':<10} {'版本':<20} {'文件名'}")
    print("-" * 60)

    for version, filename, status in all_migrations:
        status_symbol = "✓" if status == "applied" else "○"
        print(f"{status_symbol} {status:<10} {version:<20} {filename}")

    print("-" * 60)
    print(f"总计: {len(all_migrations)} 个迁移")
    print(f"已应用: {len([m for m in all_migrations if m[2] == 'applied'])}")
    print(f"待执行: {len([m for m in all_migrations if m[2] == 'pending'])}")
    print()


def main():
    """主函数"""
    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "list":
            list_migrations()
        elif command == "up":
            run_migrations()
        elif command == "version":
            version = sys.argv[2] if len(sys.argv) > 2 else None
            if not version:
                logger.error("请指定迁移版本")
                sys.exit(1)
            filename = f"{version}.py"
            if not os.path.exists(os.path.join(MIGRATIONS_DIR, filename)):
                logger.error(f"迁移文件不存在: {filename}")
                sys.exit(1)
            apply_migration(version, filename)
        elif command == "down":
            version = sys.argv[2] if len(sys.argv) > 2 else None
            if not version:
                logger.error("请指定迁移版本")
                sys.exit(1)
            filename = f"{version}.py"
            if not os.path.exists(os.path.join(MIGRATIONS_DIR, filename)):
                logger.error(f"迁移文件不存在: {filename}")
                sys.exit(1)
            rollback_migration(version, filename)
        else:
            logger.error(f"未知命令: {command}")
            logger.info("可用命令: list, up, version <version>, down <version>")
            sys.exit(1)
    else:
        # 默认执行所有待执行的迁移
        run_migrations()


if __name__ == "__main__":
    main()