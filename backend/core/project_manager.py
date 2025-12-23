import json
import os
import time
from typing import List, Dict, Any, Optional

PROJECTS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECTS_FILE = os.path.join(PROJECTS_DIR, "projects.json")
STORAGE_DIR = os.path.join(PROJECTS_DIR, "storage")

class ProjectManager:
    def __init__(self):
        if not os.path.exists(STORAGE_DIR):
            os.makedirs(STORAGE_DIR)
        self.projects = self._load_projects()

    def _load_projects(self) -> List[Dict[str, Any]]:
        if not os.path.exists(PROJECTS_FILE):
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
                return json.load(f)
        except:
            return []

    def save_projects(self):
        with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.projects, f, indent=2, ensure_ascii=False)

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

project_manager = ProjectManager()