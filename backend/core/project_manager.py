import json
import os
from typing import List, Dict, Any

PROJECTS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "projects.json")

class ProjectManager:
    def __init__(self):
        self.projects = self._load_projects()

    def _load_projects(self) -> List[Dict[str, Any]]:
        if not os.path.exists(PROJECTS_FILE):
            # Default to current directory if no file exists
            default_project = {
                "name": "default",
                "displayName": "Default Project",
                "path": os.getcwd(),
                "fullPath": os.getcwd(),
                "sessions": [],
                "sessionMeta": {"total": 0}
            }
            return [default_project]
        
        try:
            with open(PROJECTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading projects: {e}")
            return []

    def save_projects(self):
        try:
            with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.projects, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving projects: {e}")

    def get_projects(self) -> List[Dict[str, Any]]:
        return self.projects

    def add_project(self, path: str) -> Dict[str, Any]:
        full_path = os.path.abspath(path)
        name = os.path.basename(full_path)
        
        # Check for duplicates
        for p in self.projects:
            if p["fullPath"] == full_path:
                return p

        new_project = {
            "name": name,
            "displayName": name,
            "path": path,
            "fullPath": full_path,
            "sessions": [],
            "sessionMeta": {"total": 0}
        }
        self.projects.append(new_project)
        self.save_projects()
        return new_project

    def delete_project(self, project_name: str):
        self.projects = [p for p in self.projects if p["name"] != project_name]
        self.save_projects()

project_manager = ProjectManager()
