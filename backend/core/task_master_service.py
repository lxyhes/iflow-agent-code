import os
import sqlite3
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

logger = logging.getLogger("TaskMasterService")

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "developer_tools.db")

# Models
class Task(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    status: str = "pending" # pending, in-progress, done, blocked, deferred, cancelled
    priority: str = "medium" # low, medium, high
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    project_name: str
    parent_id: Optional[str] = None
    tags: List[str] = []

class PRD(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    project_name: str
    version: int = 1

class TaskMasterService:
    def __init__(self, db_path=None):
        # Allow overriding db_path for testing or if server.py passes it
        self.db_path = db_path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "developer_tools.db")
        self._memory_conn = None

    def get_db_connection(self):
        if self.db_path == ":memory:":
            if not self._memory_conn:
                self._memory_conn = sqlite3.connect(":memory:")
                self._memory_conn.row_factory = sqlite3.Row
            return self._memory_conn
            
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_tables(self):
        """Initialize TaskMaster tables if they don't exist"""
        try:
            # For memory DB, we don't close the connection here to persist tables
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Tasks table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'pending',
                    priority TEXT DEFAULT 'medium',
                    assignee TEXT,
                    due_date TEXT,
                    project_name TEXT NOT NULL,
                    parent_id INTEGER,
                    tags TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # PRDs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    project_name TEXT NOT NULL,
                    version INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(project_name, name, version)
                )
            ''')
            
            conn.commit()
            if self.db_path != ":memory:":
                conn.close()
            logger.info("TaskMaster tables initialized")
        except Exception as e:
            logger.error(f"Failed to initialize TaskMaster tables: {e}")

    # --- Task Operations ---

    def get_tasks(self, project_name: str) -> List[Dict[str, Any]]:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM tasks WHERE project_name = ? ORDER BY created_at DESC", 
                (project_name,)
            )
            rows = cursor.fetchall()
            tasks = []
            for row in rows:
                task = dict(row)
                task['id'] = str(task['id']) # Frontend expects string IDs often
                if task['tags']:
                    try:
                        task['tags'] = json.loads(task['tags'])
                    except:
                        task['tags'] = []
                else:
                    task['tags'] = []
                tasks.append(task)
            if self.db_path != ":memory:":
                conn.close()
            return tasks
        except Exception as e:
            logger.error(f"Error getting tasks: {e}")
            return []

    def create_task(self, task: Task) -> Dict[str, Any]:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO tasks (title, description, status, priority, assignee, due_date, project_name, parent_id, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                task.title,
                task.description,
                task.status,
                task.priority,
                task.assignee,
                task.due_date,
                task.project_name,
                task.parent_id,
                json.dumps(task.tags)
            ))
            
            task_id = cursor.lastrowid
            conn.commit()
            
            # Fetch the created task
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            if self.db_path != ":memory:":
                conn.close()
            
            created_task = dict(row)
            created_task['id'] = str(created_task['id'])
            created_task['tags'] = json.loads(created_task['tags']) if created_task['tags'] else []
            
            return created_task
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            raise e

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            fields = []
            values = []
            for key, value in updates.items():
                if key in ['title', 'description', 'status', 'priority', 'assignee', 'due_date', 'parent_id']:
                    fields.append(f"{key} = ?")
                    values.append(value)
                elif key == 'tags':
                    fields.append("tags = ?")
                    values.append(json.dumps(value))
            
            if not fields:
                return None
                
            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(task_id)
            
            query = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, tuple(values))
            conn.commit()
            
            # Fetch updated
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            if self.db_path != ":memory:":
                conn.close()
            
            if row:
                updated_task = dict(row)
                updated_task['id'] = str(updated_task['id'])
                updated_task['tags'] = json.loads(updated_task['tags']) if updated_task['tags'] else []
                return updated_task
            return None
        except Exception as e:
            logger.error(f"Error updating task: {e}")
            raise e

    def delete_task(self, task_id: str) -> bool:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            conn.commit()
            if self.db_path != ":memory:":
                conn.close()
            return True
        except Exception as e:
            logger.error(f"Error deleting task: {e}")
            return False

    # --- PRD Operations ---

    def get_prds(self, project_name: str) -> List[Dict[str, Any]]:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name, created_at, updated_at FROM prds WHERE project_name = ? GROUP BY name ORDER BY updated_at DESC", 
                (project_name,)
            )
            rows = cursor.fetchall()
            if self.db_path != ":memory:":
                conn.close()
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting PRDs: {e}")
            return []

    def get_prd_content(self, project_name: str, prd_name: str) -> Optional[Dict[str, Any]]:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM prds WHERE project_name = ? AND name = ? ORDER BY version DESC LIMIT 1", 
                (project_name, prd_name)
            )
            row = cursor.fetchone()
            if self.db_path != ":memory:":
                conn.close()
            if row:
                return dict(row)
            return None
        except Exception as e:
            logger.error(f"Error getting PRD content: {e}")
            return None

    def save_prd(self, project_name: str, title: str, content: str) -> Dict[str, Any]:
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Get latest version
            cursor.execute(
                "SELECT MAX(version) as max_ver FROM prds WHERE project_name = ? AND name = ?", 
                (project_name, title)
            )
            row = cursor.fetchone()
            next_version = (row['max_ver'] or 0) + 1
            
            cursor.execute('''
                INSERT INTO prds (name, content, project_name, version)
                VALUES (?, ?, ?, ?)
            ''', (title, content, project_name, next_version))
            
            prd_id = cursor.lastrowid
            conn.commit()
            
            cursor.execute("SELECT * FROM prds WHERE id = ?", (prd_id,))
            row = cursor.fetchone()
            if self.db_path != ":memory:":
                conn.close()
            
            return dict(row)
        except Exception as e:
            logger.error(f"Error saving PRD: {e}")
            raise e

# Global instance
task_master_service = TaskMasterService()
