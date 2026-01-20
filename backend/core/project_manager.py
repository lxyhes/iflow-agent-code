import json
import os
import time
import shutil
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

PROJECTS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECTS_FILE = os.path.join(PROJECTS_DIR, "projects.json")
BACKUP_DIR = os.path.join(PROJECTS_DIR, "storage", "backups")
STORAGE_DIR = os.path.join(PROJECTS_DIR, "storage")

logger = logging.getLogger("ProjectManager")

# 备份配置
MAX_BACKUPS = 10  # 最多保留 10 个备份

class ProjectManager:
    def __init__(self):
        if not os.path.exists(STORAGE_DIR):
            os.makedirs(STORAGE_DIR)
        self.projects = self._load_projects()

    def _load_projects(self) -> List[Dict[str, Any]]:
        logger.info(f"正在加载项目列表，文件路径: {PROJECTS_FILE}")
        logger.info(f"文件是否存在: {os.path.exists(PROJECTS_FILE)}")
        
        if not os.path.exists(PROJECTS_FILE):
            logger.warning(f"项目文件不存在: {PROJECTS_FILE}，使用默认项目")
            return [{
                "name": "default",
                "displayName": "Default Project",
                "path": os.getcwd(),
                "fullPath": os.getcwd(),
                "sessions": [],
                "sessionMeta": {"total": 0}
            }]
        try:
            with open(PROJECTS_FILE, 'r', encoding='utf-8') as f:
                projects = json.load(f)
                logger.info(f"成功加载 {len(projects)} 个项目")
                for p in projects:
                    logger.info(f"  - {p.get('name')}: {p.get('fullPath')}")
                return projects
        except Exception as e:
            logger.error(f"加载项目文件失败: {e}")
            return []

    def save_projects(self):
        """保存项目列表，并在保存前创建备份"""
        try:
            # 如果文件存在，先创建备份
            if os.path.exists(PROJECTS_FILE):
                self._create_backup()

            # 保存新文件
            with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.projects, f, indent=2, ensure_ascii=False)

            logger.info(f"项目列表已保存: {len(self.projects)} 个项目")
        except Exception as e:
            logger.error(f"保存项目列表失败: {e}")
            raise

    def _create_backup(self):
        """创建 projects.json 的备份"""
        try:
            # 确保备份目录存在
            os.makedirs(BACKUP_DIR, exist_ok=True)

            # 生成备份文件名（带时间戳）
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"projects_backup_{timestamp}.json"
            backup_path = os.path.join(BACKUP_DIR, backup_filename)

            # 复制文件到备份目录
            shutil.copy2(PROJECTS_FILE, backup_path)
            logger.info(f"已创建备份: {backup_filename}")

            # 清理旧备份（保留最近 MAX_BACKUPS 个）
            self._cleanup_old_backups()

        except Exception as e:
            logger.error(f"创建备份失败: {e}")
            # 备份失败不应该阻止主操作，所以这里只记录错误

    def _cleanup_old_backups(self):
        """清理旧的备份文件，只保留最近的 MAX_BACKUPS 个"""
        try:
            if not os.path.exists(BACKUP_DIR):
                return

            # 获取所有备份文件
            backup_files = []
            for filename in os.listdir(BACKUP_DIR):
                if filename.startswith("projects_backup_") and filename.endswith(".json"):
                    filepath = os.path.join(BACKUP_DIR, filename)
                    backup_files.append((filepath, os.path.getmtime(filepath)))

            # 按修改时间排序（最新的在前）
            backup_files.sort(key=lambda x: x[1], reverse=True)

            # 删除超出限制的旧备份
            if len(backup_files) > MAX_BACKUPS:
                for filepath, _ in backup_files[MAX_BACKUPS:]:
                    os.remove(filepath)
                    logger.info(f"已删除旧备份: {os.path.basename(filepath)}")

        except Exception as e:
            logger.error(f"清理旧备份失败: {e}")

    def restore_from_backup(self, backup_filename: str):
        """从备份恢复 projects.json"""
        try:
            backup_path = os.path.join(BACKUP_DIR, backup_filename)

            if not os.path.exists(backup_path):
                raise FileNotFoundError(f"备份文件不存在: {backup_filename}")

            # 创建当前文件的备份（以防恢复失败）
            if os.path.exists(PROJECTS_FILE):
                self._create_backup()

            # 恢复备份文件
            shutil.copy2(backup_path, PROJECTS_FILE)

            # 重新加载项目
            self.projects = self._load_projects()

            logger.info(f"已从备份恢复: {backup_filename}")
            return True

        except Exception as e:
            logger.error(f"从备份恢复失败: {e}")
            raise

    def list_backups(self) -> List[Dict[str, Any]]:
        """列出所有可用的备份"""
        try:
            if not os.path.exists(BACKUP_DIR):
                return []

            backups = []
            for filename in os.listdir(BACKUP_DIR):
                if filename.startswith("projects_backup_") and filename.endswith(".json"):
                    filepath = os.path.join(BACKUP_DIR, filename)
                    mtime = os.path.getmtime(filepath)
                    size = os.path.getsize(filepath)

                    backups.append({
                        "filename": filename,
                        "path": filepath,
                        "created_at": datetime.fromtimestamp(mtime).isoformat(),
                        "size": size
                    })

            # 按创建时间排序（最新的在前）
            backups.sort(key=lambda x: x["created_at"], reverse=True)

            return backups

        except Exception as e:
            logger.error(f"列出备份失败: {e}")
            return []

    def get_projects(self) -> List[Dict[str, Any]]:
        # 更新每个项目的会话列表（从磁盘实时扫描）
        for p in self.projects:
            p["sessions"] = self._list_sessions(p["name"])
            p["sessionMeta"] = {"total": len(p["sessions"])}
        return self.projects

    def _get_session_dir(self, project_name: str):
        path = os.path.join(STORAGE_DIR, project_name, "sessions")
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    def _list_sessions(self, project_name: str) -> List[Dict[str, Any]]:
        session_dir = self._get_session_dir(project_name)
        sessions = []
        for f in os.listdir(session_dir):
            if f.endswith(".jsonl"):
                session_id = f.replace(".jsonl", "")
                # 简单从文件名或文件第一行读取摘要
                sessions.append({
                    "id": session_id,
                    "summary": f"Session {session_id[:8]}",
                    "updated_at": time.ctime(os.path.getmtime(os.path.join(session_dir, f))),
                    "__provider": "claude"
                })
        # 按时间排序
        sessions.sort(key=lambda x: x["updated_at"], reverse=True)
        return sessions

    def get_sessions(self, project_name: str, limit: int = 5, offset: int = 0) -> List[Dict[str, Any]]:
        """获取项目的会话列表（分页）"""
        all_sessions = self._list_sessions(project_name)
        return all_sessions[offset:offset + limit]

    def add_project(self, path: str) -> Dict[str, Any]:
        full_path = os.path.abspath(path)
        name = os.path.basename(full_path)
        for p in self.projects:
            if p["fullPath"] == full_path: return p
        new_p = {"name": name, "displayName": name, "path": path, "fullPath": full_path, "sessions": []}
        self.projects.append(new_p)
        self.save_projects()
        return new_p

    def save_message(self, project_name: str, session_id: str, role: str, content: str):
        session_dir = self._get_session_dir(project_name)
        file_path = os.path.join(session_dir, f"{session_id}.jsonl")
        with open(file_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({
                "role": role,
                "content": content,
                "timestamp": time.time()
            }, ensure_ascii=False) + "\n")

    def get_messages(self, project_name: str, session_id: str) -> List[Dict[str, Any]]:
        session_dir = self._get_session_dir(project_name)
        file_path = os.path.join(session_dir, f"{session_id}.jsonl")
        if not os.path.exists(file_path):
            return []
        messages = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    msg = json.loads(line)
                    # 适配前端格式：role -> type
                    msg["type"] = msg["role"]
                    messages.append(msg)
        return messages

    def update_session_summary(self, project_name: str, session_id: str, summary: str):
        """更新 session 的自定义名称/摘要"""
        # 创建一个元数据文件来存储自定义 summary
        session_dir = self._get_session_dir(project_name)
        metadata_file = os.path.join(session_dir, f"{session_id}.meta.json")

        metadata = {
            "summary": summary,
            "updated_at": time.time()
        }

        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

    def _get_session_metadata(self, project_name: str, session_id: str) -> Optional[Dict[str, Any]]:
        """获取 session 的元数据（如果有）"""
        session_dir = self._get_session_dir(project_name)
        metadata_file = os.path.join(session_dir, f"{session_id}.meta.json")

        if not os.path.exists(metadata_file):
            return None

        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None

    def _list_sessions(self, project_name: str) -> List[Dict[str, Any]]:
        session_dir = self._get_session_dir(project_name)
        sessions = []
        for f in os.listdir(session_dir):
            if f.endswith(".jsonl"):
                session_id = f.replace(".jsonl", "")

                # 尝试获取自定义 summary
                metadata = self._get_session_metadata(project_name, session_id)
                if metadata and "summary" in metadata:
                    summary = metadata["summary"]
                else:
                    summary = f"Session {session_id[:8]}"

                sessions.append({
                    "id": session_id,
                    "summary": summary,
                    "updated_at": time.ctime(os.path.getmtime(os.path.join(session_dir, f))),
                    "__provider": "claude"
                })
        # 按时间排序
        sessions.sort(key=lambda x: x["updated_at"], reverse=True)
        return sessions

project_manager = ProjectManager()