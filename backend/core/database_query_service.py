"""
Database Query Service
强大的数据库查询工具，支持多种数据库
"""

import sqlite3
import json
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import pandas as pd

logger = logging.getLogger("DatabaseQueryService")


class DatabaseType(Enum):
    """数据库类型枚举"""
    SQLITE = "sqlite"
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    SQLSERVER = "sqlserver"
    ORACLE = "oracle"


@dataclass
class DatabaseConfig:
    """数据库配置"""
    db_type: DatabaseType
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    file_path: Optional[str] = None  # SQLite 专用
    
    def to_connection_string(self) -> str:
        """生成连接字符串"""
        if self.db_type == DatabaseType.SQLITE:
            return self.file_path or ""
        elif self.db_type == DatabaseType.MYSQL:
            return f"mysql+pymysql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
        elif self.db_type == DatabaseType.POSTGRESQL:
            return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
        elif self.db_type == DatabaseType.SQLSERVER:
            return f"mssql+pyodbc://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}?driver=ODBC+Driver+17+for+SQL+Server"
        elif self.db_type == DatabaseType.ORACLE:
            return f"oracle+cx_oracle://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
        return ""


@dataclass
class QueryResult:
    """查询结果"""
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    execution_time: float
    success: bool
    error: Optional[str] = None


@dataclass
class TableInfo:
    """表信息"""
    name: str
    type: str
    row_count: int
    columns: List[Dict[str, Any]]
    indexes: List[Dict[str, Any]]


class DatabaseQueryService:
    """数据库查询服务"""
    
    def __init__(self):
        self.connections: Dict[str, Union[sqlite3.Connection, Any]] = {}
        self.connection_configs: Dict[str, DatabaseConfig] = {}  # 存储连接配置
        self.query_history: List[Dict] = []
        self.query_templates: List[Dict] = self._load_default_templates()
    
    def _load_default_templates(self) -> List[Dict]:
        """加载默认查询模板"""
        return [
            {
                "id": "template_1",
                "name": "查询所有表",
                "description": "列出数据库中的所有表",
                "sql": "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
                "category": "系统"
            },
            {
                "id": "template_2",
                "name": "表结构",
                "description": "查看指定表的结构",
                "sql": "PRAGMA table_info({table_name});",
                "category": "结构",
                "params": ["table_name"]
            },
            {
                "id": "template_3",
                "name": "表索引",
                "description": "查看指定表的索引",
                "sql": "PRAGMA index_list({table_name});",
                "category": "结构",
                "params": ["table_name"]
            },
            {
                "id": "template_4",
                "name": "统计信息",
                "description": "查看表的统计信息",
                "sql": """
                    SELECT 
                        name as table_name,
                        (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
                    FROM sqlite_master m 
                    WHERE type='table' 
                    ORDER BY name;
                """,
                "category": "统计"
            },
            {
                "id": "template_5",
                "name": "前N条记录",
                "description": "查询表的前N条记录",
                "sql": "SELECT * FROM {table_name} LIMIT {limit};",
                "category": "查询",
                "params": ["table_name", "limit"]
            }
        ]
    
    def connect_sqlite(self, db_path: str, connection_name: str = None) -> bool:
        """连接 SQLite 数据库"""
        try:
            connection_name = connection_name or db_path
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            self.connections[connection_name] = conn
            self.connection_configs[connection_name] = DatabaseConfig(
                db_type=DatabaseType.SQLITE,
                file_path=db_path
            )
            logger.info(f"Connected to SQLite database: {db_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to SQLite database: {e}")
            return False
    
    def connect_mysql(self, host: str, port: int, database: str, username: str, password: str, connection_name: str = None) -> bool:
        """连接 MySQL 数据库"""
        try:
            import pymysql
            connection_name = connection_name or f"{username}@{host}:{port}/{database}"
            conn = pymysql.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                database=database,
                cursorclass=pymysql.cursors.DictCursor
            )
            self.connections[connection_name] = conn
            self.connection_configs[connection_name] = DatabaseConfig(
                db_type=DatabaseType.MYSQL,
                host=host,
                port=port,
                database=database,
                username=username,
                password=password
            )
            logger.info(f"Connected to MySQL database: {database}")
            return True
        except ImportError:
            logger.error("pymysql is not installed. Install with: pip install pymysql")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to MySQL database: {e}")
            return False
    
    def connect_postgresql(self, host: str, port: int, database: str, username: str, password: str, connection_name: str = None) -> bool:
        """连接 PostgreSQL 数据库"""
        try:
            import psycopg2
            connection_name = connection_name or f"{username}@{host}:{port}/{database}"
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=username,
                password=password,
                database=database
            )
            self.connections[connection_name] = conn
            self.connection_configs[connection_name] = DatabaseConfig(
                db_type=DatabaseType.POSTGRESQL,
                host=host,
                port=port,
                database=database,
                username=username,
                password=password
            )
            logger.info(f"Connected to PostgreSQL database: {database}")
            return True
        except ImportError:
            logger.error("psycopg2-binary is not installed. Install with: pip install psycopg2-binary")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL database: {e}")
            return False
    
    def connect_sqlserver(self, host: str, port: int, database: str, username: str, password: str, connection_name: str = None) -> bool:
        """连接 SQL Server 数据库"""
        try:
            import pyodbc
            connection_name = connection_name or f"{username}@{host}:{port}/{database}"
            conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={host},{port};DATABASE={database};UID={username};PWD={password}"
            conn = pyodbc.connect(conn_str)
            self.connections[connection_name] = conn
            self.connection_configs[connection_name] = DatabaseConfig(
                db_type=DatabaseType.SQLSERVER,
                host=host,
                port=port,
                database=database,
                username=username,
                password=password
            )
            logger.info(f"Connected to SQL Server database: {database}")
            return True
        except ImportError:
            logger.error("pyodbc is not installed. Install with: pip install pyodbc")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to SQL Server database: {e}")
            return False
    
    def connect_oracle(self, host: str, port: int, database: str, username: str, password: str, connection_name: str = None) -> bool:
        """连接 Oracle 数据库"""
        try:
            import cx_Oracle
            connection_name = connection_name or f"{username}@{host}:{port}/{database}"
            dsn = cx_Oracle.makedsn(host, port, service_name=database)
            conn = cx_Oracle.connect(username, password, dsn)
            self.connections[connection_name] = conn
            self.connection_configs[connection_name] = DatabaseConfig(
                db_type=DatabaseType.ORACLE,
                host=host,
                port=port,
                database=database,
                username=username,
                password=password
            )
            logger.info(f"Connected to Oracle database: {database}")
            return True
        except ImportError:
            logger.error("cx_Oracle is not installed. Install with: pip install cx_Oracle")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to Oracle database: {e}")
            return False
    
    def disconnect(self, connection_name: str) -> bool:
        """断开数据库连接"""
        try:
            if connection_name in self.connections:
                self.connections[connection_name].close()
                del self.connections[connection_name]
                logger.info(f"Disconnected from database: {connection_name}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to disconnect: {e}")
            return False
    
    def get_tables(self, connection_name: str) -> List[str]:
        """获取所有表名"""
        try:
            conn = self.connections.get(connection_name)
            if not conn:
                raise ValueError(f"Connection {connection_name} not found")
            
            config = self.connection_configs.get(connection_name)
            if not config:
                raise ValueError(f"Connection config for {connection_name} not found")
            
            cursor = conn.cursor()
            
            # 根据不同的数据库类型执行不同的查询
            if config.db_type == DatabaseType.SQLITE:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
                tables = [row[0] for row in cursor.fetchall()]
            elif config.db_type == DatabaseType.MYSQL:
                cursor.execute("SHOW TABLES;")
                tables = [list(row.values())[0] for row in cursor.fetchall()]
            elif config.db_type == DatabaseType.POSTGRESQL:
                cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
                tables = [row[0] for row in cursor.fetchall()]
            elif config.db_type == DatabaseType.SQLSERVER:
                cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;")
                tables = [row[0] for row in cursor.fetchall()]
            elif config.db_type == DatabaseType.ORACLE:
                cursor.execute("SELECT table_name FROM user_tables ORDER BY table_name;")
                tables = [row[0] for row in cursor.fetchall()]
            else:
                tables = []
            
            return tables
        except Exception as e:
            logger.error(f"Failed to get tables: {e}")
            return []
    
    def get_table_info(self, connection_name: str, table_name: str) -> Optional[TableInfo]:
        """获取表详细信息"""
        try:
            conn = self.connections.get(connection_name)
            if not conn:
                raise ValueError(f"Connection {connection_name} not found")
            
            config = self.connection_configs.get(connection_name)
            if not config:
                raise ValueError(f"Connection config for {connection_name} not found")
            
            cursor = conn.cursor()
            columns = []
            indexes = []
            
            # 验证表名是否有效（防止 SQL 注入）
            import re
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
                raise ValueError(f"Invalid table name: {table_name}")
            
            # 根据不同的数据库类型获取列信息
            if config.db_type == DatabaseType.SQLITE:
                cursor.execute(f"PRAGMA table_info({table_name});")
                for row in cursor.fetchall():
                    columns.append({
                        "cid": row[0],
                        "name": row[1],
                        "type": row[2],
                        "notnull": bool(row[3]),
                        "default_value": row[4],
                        "pk": bool(row[5])
                    })
                cursor.execute(f"PRAGMA index_list({table_name});")
                for row in cursor.fetchall():
                    indexes.append({
                        "seq": row[0],
                        "name": row[1],
                        "unique": bool(row[2]),
                        "origin": row[3],
                        "partial": bool(row[4])
                    })
            elif config.db_type == DatabaseType.MYSQL:
                cursor.execute(f"DESCRIBE `{table_name}`;")
                for row in cursor.fetchall():
                    columns.append({
                        "name": row['Field'],
                        "type": row['Type'],
                        "null": row['Null'] == 'YES',
                        "key": row['Key'],
                        "default": row['Default'],
                        "extra": row['Extra']
                    })
            elif config.db_type == DatabaseType.POSTGRESQL:
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position;
                """, (table_name,))
                for row in cursor.fetchall():
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "null": row[2] == 'YES',
                        "default": row[3]
                    })
            elif config.db_type == DatabaseType.SQLSERVER:
                cursor.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = ?
                    ORDER BY ORDINAL_POSITION;
                """, (table_name,))
                for row in cursor.fetchall():
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "null": row[2] == 'YES',
                        "default": row[3]
                    })
            elif config.db_type == DatabaseType.ORACLE:
                cursor.execute("""
                    SELECT column_name, data_type, nullable, data_default
                    FROM user_tab_columns
                    WHERE table_name = UPPER(:table_name)
                    ORDER BY column_id;
                """, {"table_name": table_name})
                for row in cursor.fetchall():
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "null": row[2] == 'Y',
                        "default": row[3]
                    })
            
            # 获取行数
            if config.db_type == DatabaseType.SQLITE:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            elif config.db_type == DatabaseType.MYSQL:
                cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`;")
            elif config.db_type == DatabaseType.POSTGRESQL:
                cursor.execute("SELECT COUNT(*) FROM %s;", (table_name,))
            elif config.db_type == DatabaseType.SQLSERVER:
                cursor.execute("SELECT COUNT(*) FROM ?;", (table_name,))
            elif config.db_type == DatabaseType.ORACLE:
                cursor.execute("SELECT COUNT(*) FROM :table_name", {"table_name": table_name})
            
            row_count = cursor.fetchone()[0]
            
            return TableInfo(
                name=table_name,
                type="table",
                row_count=row_count,
                columns=columns,
                indexes=indexes
            )
        except Exception as e:
            logger.error(f"Failed to get table info: {e}")
            return None
    
    def execute_query(self, connection_name: str, sql: str, params: Dict = None) -> QueryResult:
        """执行 SQL 查询"""
        params = params or {}
        start_time = datetime.now()
        
        try:
            conn = self.connections.get(connection_name)
            if not conn:
                return QueryResult(
                    columns=[],
                    rows=[],
                    row_count=0,
                    execution_time=0,
                    success=False,
                    error=f"Connection {connection_name} not found"
                )
            
            config = self.connection_configs.get(connection_name)
            if not config:
                raise ValueError(f"Connection config for {connection_name} not found")
            
            cursor = conn.cursor()
            
            # 替换参数
            formatted_sql = sql.format(**params)
            
            cursor.execute(formatted_sql)
            
            # 检查是否是查询语句
            if formatted_sql.strip().upper().startswith(("SELECT", "PRAGMA", "EXPLAIN", "DESCRIBE", "SHOW", "WITH")):
                rows = cursor.fetchall()
                
                # 处理不同数据库类型的返回结果
                if config.db_type == DatabaseType.SQLITE:
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    result_rows = [list(row) for row in rows]
                elif config.db_type in [DatabaseType.MYSQL, DatabaseType.POSTGRESQL]:
                    columns = list(rows[0].keys()) if rows else []
                    result_rows = [list(row.values()) for row in rows]
                elif config.db_type == DatabaseType.SQLSERVER:
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    result_rows = [list(row) for row in rows]
                elif config.db_type == DatabaseType.ORACLE:
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    result_rows = [list(row) for row in rows]
                else:
                    columns = []
                    result_rows = []
                
                row_count = len(result_rows)
            else:
                conn.commit()
                result_rows = [[f"Affected rows: {cursor.rowcount}"]]
                columns = ["Result"]
                row_count = 1
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # 记录历史
            self.query_history.append({
                "timestamp": datetime.now().isoformat(),
                "sql": formatted_sql,
                "row_count": row_count,
                "execution_time": execution_time,
                "success": True
            })
            
            return QueryResult(
                columns=columns,
                rows=result_rows,
                row_count=row_count,
                execution_time=execution_time,
                success=True
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # 记录历史
            self.query_history.append({
                "timestamp": datetime.now().isoformat(),
                "sql": sql,
                "error": str(e),
                "execution_time": execution_time,
                "success": False
            })
            
            return QueryResult(
                columns=[],
                rows=[],
                row_count=0,
                execution_time=execution_time,
                success=False,
                error=str(e)
            )
    
    def export_to_csv(self, connection_name: str, sql: str, params: Dict = None) -> bytes:
        """导出查询结果为 CSV"""
        try:
            result = self.execute_query(connection_name, sql, params)
            
            if not result.success:
                raise ValueError(result.error)
            
            # 创建 DataFrame
            df = pd.DataFrame(result.rows, columns=result.columns)
            
            # 转换为 CSV
            csv_data = df.to_csv(index=False)
            
            return csv_data.encode('utf-8')
        except Exception as e:
            logger.error(f"Failed to export to CSV: {e}")
            raise
    
    def export_to_json(self, connection_name: str, sql: str, params: Dict = None) -> bytes:
        """导出查询结果为 JSON"""
        try:
            result = self.execute_query(connection_name, sql, params)
            
            if not result.success:
                raise ValueError(result.error)
            
            # 转换为 JSON
            data = []
            for row in result.rows:
                data.append(dict(zip(result.columns, row)))
            
            json_data = json.dumps(data, indent=2, ensure_ascii=False, default=str)
            
            return json_data.encode('utf-8')
        except Exception as e:
            logger.error(f"Failed to export to JSON: {e}")
            raise
    
    def export_to_excel(self, connection_name: str, sql: str, params: Dict = None) -> bytes:
        """导出查询结果为 Excel"""
        try:
            result = self.execute_query(connection_name, sql, params)
            
            if not result.success:
                raise ValueError(result.error)
            
            # 创建 DataFrame
            df = pd.DataFrame(result.rows, columns=result.columns)
            
            # 转换为 Excel
            from io import BytesIO
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Query Result')
            
            return output.getvalue()
        except Exception as e:
            logger.error(f"Failed to export to Excel: {e}")
            raise
    
    def get_query_templates(self) -> List[Dict]:
        """获取查询模板"""
        return self.query_templates
    
    def add_query_template(self, name: str, sql: str, description: str = "", category: str = "自定义", params: List[str] = None) -> Dict:
        """添加查询模板"""
        template = {
            "id": f"template_{len(self.query_templates) + 1}",
            "name": name,
            "description": description,
            "sql": sql,
            "category": category,
            "params": params or []
        }
        self.query_templates.append(template)
        return template
    
    def get_query_history(self, limit: int = 50) -> List[Dict]:
        """获取查询历史"""
        return self.query_history[-limit:]
    
    def get_connections(self) -> List[str]:
        """获取所有连接"""
        return list(self.connections.keys())


# 全局实例
database_query_service = DatabaseQueryService()