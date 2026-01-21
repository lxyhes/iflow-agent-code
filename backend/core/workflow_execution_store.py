import json
import os
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime


class WorkflowExecutionStore:
    def __init__(self, base_dir: Optional[str] = None):
        root = base_dir or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.executions_dir = os.path.join(root, "workflows", "executions")
        os.makedirs(self.executions_dir, exist_ok=True)
        self._lock = threading.Lock()

    def _execution_path(self, execution_id: str) -> str:
        safe_id = "".join(c for c in execution_id if c.isalnum() or c in ("_", "-", "."))
        return os.path.join(self.executions_dir, f"{safe_id}.json")

    def create(self, execution_id: str, payload: Dict[str, Any]) -> str:
        now = datetime.now().isoformat()
        record = {
            "execution_id": execution_id,
            "created_at": now,
            "updated_at": now,
            **payload,
            "events": []
        }
        path = self._execution_path(execution_id)
        with self._lock:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
        return path

    def append_event(self, execution_id: str, event: Dict[str, Any]) -> None:
        path = self._execution_path(execution_id)
        with self._lock:
            if not os.path.exists(path):
                self.create(execution_id, {"status": "running"})
            with open(path, "r", encoding="utf-8") as f:
                record = json.load(f)
            record["events"].append(event)
            record["updated_at"] = datetime.now().isoformat()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, indent=2)

    def update(self, execution_id: str, fields: Dict[str, Any]) -> None:
        path = self._execution_path(execution_id)
        with self._lock:
            if not os.path.exists(path):
                self.create(execution_id, {"status": "running"})
            with open(path, "r", encoding="utf-8") as f:
                record = json.load(f)
            record.update(fields)
            record["updated_at"] = datetime.now().isoformat()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, indent=2)

    def get(self, execution_id: str) -> Optional[Dict[str, Any]]:
        path = self._execution_path(execution_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list(
        self,
        limit: int = 50,
        workflow_id: Optional[str] = None,
        project_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        files = []
        for name in os.listdir(self.executions_dir):
            if not name.endswith(".json"):
                continue
            files.append(os.path.join(self.executions_dir, name))
        files.sort(key=lambda p: os.path.getmtime(p), reverse=True)

        results: List[Dict[str, Any]] = []
        for p in files:
            if len(results) >= limit:
                break
            try:
                with open(p, "r", encoding="utf-8") as f:
                    record = json.load(f)
                if workflow_id and record.get("workflow_id") != workflow_id:
                    continue
                if project_name and record.get("project_name") != project_name:
                    continue
                results.append({
                    "execution_id": record.get("execution_id"),
                    "workflow_id": record.get("workflow_id"),
                    "workflow_name": record.get("workflow_name"),
                    "project_name": record.get("project_name"),
                    "status": record.get("status"),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at"),
                    "steps_total": record.get("steps_total", 0),
                    "steps_completed": record.get("steps_completed", 0),
                    "error": record.get("error")
                })
            except Exception:
                continue
        return results


workflow_execution_store = WorkflowExecutionStore()

