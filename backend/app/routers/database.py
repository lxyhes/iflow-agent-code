"""
Database Router
数据库查询相关的 API 路由
"""

import os
import json
import sqlite3
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from backend.core.database_query_service import database_query_service
from backend.core.path_validator import project_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/database", tags=["Database"])


# ============================================
# 数据模型
# ============================================

class DatabaseConnectRequest(BaseModel):
    db_type: str = "sqlite"  # sqlite, mysql, postgresql, sqlserver, oracle
    db_path: Optional[str] = None  # SQLite 专用
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    connection_name: Optional[str] = None


class DatabaseQueryRequest(BaseModel):
    connection_name: str
    sql: str
    params: Optional[Dict[str, Any]] = None


class AddTemplateRequest(BaseModel):
    name: str
    sql: str
    description: Optional[str] = ""
    category: Optional[str] = "自定义"
    params: Optional[List[str]] = None


class DatabaseConfigRequest(BaseModel):
    project_name: str
    config_name: str
    db_type: str
    config: Dict[str, Any]


# ============================================
# Database 端点
# ============================================

@router.post("/connect")
async def connect_database(req: DatabaseConnectRequest):
    """连接数据库（支持多种类型）"""
    try:
        success = False

        if req.db_type == "sqlite":
            if not req.db_path:
                return JSONResponse({"error": "db_path is required for SQLite"}, status_code=400)
            success = database_query_service.connect_sqlite(req.db_path, req.connection_name)
        elif req.db_type == "mysql":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for MySQL"}, status_code=400)
            success = database_query_service.connect_mysql(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        elif req.db_type == "postgresql":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for PostgreSQL"}, status_code=400)
            success = database_query_service.connect_postgresql(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        elif req.db_type == "sqlserver":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for SQL Server"}, status_code=400)
            success = database_query_service.connect_sqlserver(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        elif req.db_type == "oracle":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for Oracle"}, status_code=400)
            success = database_query_service.connect_oracle(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        else:
            return JSONResponse({"error": f"Unsupported database type: {req.db_type}"}, status_code=400)

        if success:
            return {"success": True, "message": "Database connected successfully"}
        else:
            return JSONResponse({"error": "Failed to connect to database"}, status_code=400)
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/disconnect/{connection_name}")
async def disconnect_database(connection_name: str):
    """断开数据库连接"""
    try:
        success = database_query_service.disconnect(connection_name)
        if success:
            return {"success": True, "message": "Database disconnected successfully"}
        else:
            return JSONResponse({"error": "Connection not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error disconnecting database: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/connections")
async def get_database_connections():
    """获取所有数据库连接"""
    try:
        connections = database_query_service.get_connections()
        return {"connections": connections}
    except Exception as e:
        logger.error(f"Error getting connections: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/tables/{connection_name}")
async def get_database_tables(connection_name: str):
    """获取数据库中的所有表"""
    try:
        tables = database_query_service.get_tables(connection_name)
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error getting tables: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/table/{connection_name}/{table_name}")
async def get_table_info(connection_name: str, table_name: str):
    """获取表的详细信息"""
    try:
        logger.info(f"Getting table info - connection: {connection_name}, table: {table_name}")
        table_info = database_query_service.get_table_info(connection_name, table_name)
        if table_info:
            return {
                "name": table_info.name,
                "type": table_info.type,
                "row_count": table_info.row_count,
                "columns": table_info.columns,
                "indexes": table_info.indexes
            }
        else:
            logger.warning(f"Table not found: {table_name}")
            return JSONResponse({"error": "Table not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error getting table info: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/query")
async def execute_database_query(req: DatabaseQueryRequest):
    """执行 SQL 查询"""
    try:
        result = database_query_service.execute_query(req.connection_name, req.sql, req.params)
        if result.success:
            return {
                "success": True,
                "columns": result.columns,
                "rows": result.rows,
                "row_count": result.row_count,
                "execution_time": result.execution_time
            }
        else:
            return JSONResponse({"error": result.error}, status_code=400)
    except Exception as e:
        logger.error(f"Error executing query: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/export/{connection_name}/{format}")
async def export_query_result(
    connection_name: str,
    format: str,
    sql: str = Query(...),
    params: Optional[str] = Query(None)
):
    """导出查询结果"""
    try:
        params_dict = json.loads(params) if params else None

        if format == "csv":
            data = database_query_service.export_to_csv(connection_name, sql, params_dict)
            return Response(content=data, media_type="text/csv", headers={
                "Content-Disposition": "attachment; filename=query_result.csv"
            })
        elif format == "json":
            data = database_query_service.export_to_json(connection_name, sql, params_dict)
            return Response(content=data, media_type="application/json", headers={
                "Content-Disposition": "attachment; filename=query_result.json"
            })
        elif format == "excel":
            data = database_query_service.export_to_excel(connection_name, sql, params_dict)
            return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
                "Content-Disposition": "attachment; filename=query_result.xlsx"
            })
        else:
            return JSONResponse({"error": "Unsupported format. Use csv, json, or excel"}, status_code=400)
    except Exception as e:
        logger.error(f"Error exporting query result: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/templates")
async def get_query_templates():
    """获取查询模板"""
    try:
        templates = database_query_service.get_query_templates()
        return {"templates": templates}
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/templates")
async def add_query_template(req: AddTemplateRequest):
    """添加查询模板"""
    try:
        template = database_query_service.add_query_template(
            req.name, req.sql, req.description, req.category, req.params
        )
        return {"success": True, "template": template}
    except Exception as e:
        logger.error(f"Error adding template: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/history")
async def get_query_history(limit: int = Query(50, ge=1, le=200)):
    """获取查询历史"""
    try:
        history = database_query_service.get_query_history(limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting query history: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/save-config")
async def save_database_config(req: DatabaseConfigRequest):
    """保存数据库配置到项目"""
    try:
        project_path = _get_project_path(req.project_name)
        if not project_path:
            return JSONResponse({"error": "Project not found"}, status_code=404)

        # 创建数据库配置目录
        config_dir = os.path.join(project_path, ".database")
        os.makedirs(config_dir, exist_ok=True)

        # 保存配置
        config_file = os.path.join(config_dir, f"{req.config_name}.json")
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump({
                "name": req.config_name,
                "db_type": req.db_type,
                "config": req.config,
                "created_at": datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)

        logger.info(f"Saved database config: {req.config_name} for project: {req.project_name}")
        return {"success": True, "message": "Database config saved successfully"}
    except Exception as e:
        logger.error(f"Error saving database config: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/configs/{project_name}")
async def get_database_configs(project_name: str):
    """获取项目的数据库配置列表"""
    try:
        project_path = _get_project_path(project_name)
        if not project_path:
            return JSONResponse({"error": "Project not found"}, status_code=404)

        config_dir = os.path.join(project_path, ".database")
        configs = []

        if os.path.exists(config_dir):
            for filename in os.listdir(config_dir):
                if filename.endswith('.json'):
                    config_file = os.path.join(config_dir, filename)
                    try:
                        with open(config_file, 'r', encoding='utf-8') as f:
                            config = json.load(f)
                            configs.append(config)
                    except Exception as e:
                        logger.error(f"Error loading config {filename}: {e}")

        return {"configs": configs}
    except Exception as e:
        logger.error(f"Error getting database configs: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/config/{project_name}/{config_name}")
async def delete_database_config(project_name: str, config_name: str):
    """删除数据库配置"""
    try:
        project_path = _get_project_path(project_name)
        if not project_path:
            return JSONResponse({"error": "Project not found"}, status_code=404)

        config_file = os.path.join(project_path, ".database", f"{config_name}.json")

        if os.path.exists(config_file):
            os.remove(config_file)
            logger.info(f"Deleted database config: {config_name} for project: {project_name}")
            return {"success": True, "message": "Database config deleted successfully"}
        else:
            return JSONResponse({"error": "Config not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error deleting database config: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/project-databases/{project_name}")
async def get_project_databases(project_name: str):
    """获取项目中的所有数据库文件和配置"""
    try:
        import glob
        import yaml
        import toml
        from dotenv import load_dotenv

        project_path = _get_project_path(project_name)

        if not project_path or not os.path.exists(project_path):
            return JSONResponse({"error": "Project not found"}, status_code=404)

        db_files = []
        db_configs = []

        # 递归搜索数据库文件和配置文件
        for root, dirs, files in os.walk(project_path):
            # 跳过常见的非数据库目录
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__', 'dist', 'build', 'vendor']]

            for file in files:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, project_path)

                # 搜索 SQLite 数据库文件
                if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.sqlite3'):
                    file_size = os.path.getsize(full_path) if os.path.exists(full_path) else 0

                    # 验证是否是有效的 SQLite 数据库
                    is_valid = False
                    try:
                        conn = sqlite3.connect(full_path)
                        conn.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;")
                        conn.close()
                        is_valid = True
                    except Exception:
                        pass

                    db_files.append({
                        "name": file,
                        "path": relative_path,
                        "full_path": full_path,
                        "size": file_size,
                        "is_valid": is_valid,
                        "type": "sqlite"
                    })

                # 搜索配置文件
                elif file.endswith(('.yaml', '.yml', '.toml')) or file in ['.env', 'go.mod']:
                    is_config_file = (
                        file in ['config.yaml', 'config.yml', 'config.toml', '.env', 'go.mod'] or
                        file.startswith('config.') and file.endswith(('.yaml', '.yml', '.toml'))
                    )

                    # 只处理根目录的配置文件
                    if is_config_file and (root == project_path or relative_path.count('/') <= 1):
                        try:
                            config_data = None
                            config_type = None

                            if file.endswith(('.yaml', '.yml')):
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    config_data = yaml.safe_load(f)
                                config_type = 'yaml'
                            elif file.endswith('.toml'):
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    config_data = toml.load(f)
                                config_type = 'toml'
                            elif file == '.env':
                                config_data = {}
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    for line in f:
                                        line = line.strip()
                                        if line and not line.startswith('#') and '=' in line:
                                            key, value = line.split('=', 1)
                                            config_data[key.strip()] = value.strip()
                                config_type = 'env'

                            if config_data:
                                db_configs.append({
                                    "name": file,
                                    "path": relative_path,
                                    "full_path": full_path,
                                    "type": config_type,
                                    "config": config_data
                                })
                        except Exception as e:
                            logger.error(f"Error loading config {file}: {e}")

        return {
            "db_files": db_files,
            "db_configs": db_configs
        }
    except Exception as e:
        logger.error(f"Error getting project databases: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================
# 辅助函数
# ============================================

def _get_project_path(project: str) -> str:
    """获取项目路径（临时实现，后续需要与 project_registry 集成）"""
    # TODO: 使用 project_registry 获取项目路径
    return project