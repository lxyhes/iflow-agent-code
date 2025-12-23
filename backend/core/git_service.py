import subprocess
import os
from typing import List, Dict, Any

class GitService:
    def _run_git(self, cwd: str, args: List[str]) -> str:
        """Run a git command in the specified directory."""
        try:
            result = subprocess.run(
                ["git"] + args,
                cwd=cwd,
                capture_output=True,
                text=True,
                check=True,
                encoding='utf-8' 
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            # print(f"Git error in {cwd}: {e.stderr}")
            raise Exception(e.stderr)
        except Exception as e:
            print(f"Error running git: {e}")
            raise e

    def get_status(self, cwd: str) -> Dict[str, Any]:
        try:
            output = self._run_git(cwd, ["status", "--porcelain"])
            branch = self._run_git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])
        except:
            return {"error": "Not a git repository or git not found"}

        changes = []
        modified = []
        added = []
        deleted = []
        untracked = []

        if output:
            for line in output.split('\n'):
                if len(line) < 4: continue
                x = line[0]
                y = line[1]
                path = line[3:].strip('"') # Handle quotes

                # Simple parsing logic for UI
                if x == '?' and y == '?': untracked.append(path)
                elif x == 'A' or y == 'A': added.append(path)
                elif y == 'D' or x == 'D': deleted.append(path)
                else: modified.append(path)

        return {
            "branch": branch,
            "modified": modified,
            "added": added,
            "deleted": deleted,
            "untracked": untracked,
            "hasCommits": True # Assume true for now
        }

    def get_branches(self, cwd: str) -> List[str]:
        try:
            output = self._run_git(cwd, ["branch", "--format=%(refname:short)"])
            return output.split('\n') if output else []
        except:
            return []

    def checkout(self, cwd: str, branch: str):
        return self._run_git(cwd, ["checkout", branch])

    def create_branch(self, cwd: str, branch: str):
        return self._run_git(cwd, ["checkout", "-b", branch])

    def commit(self, cwd: str, message: str, files: List[str]):
        # Add specific files
        for f in files:
            self._run_git(cwd, ["add", f])
        return self._run_git(cwd, ["commit", "-m", message])

    def get_diff(self, cwd: str, file_path: str) -> str:
        try:
            return self._run_git(cwd, ["diff", "HEAD", "--", file_path])
        except:
            return ""

    def get_commits(self, cwd: str, limit: int = 10):
        try:
            # Format: hash|author|date|message
            output = self._run_git(cwd, ["log", f"-n{limit}", "--pretty=format:%h|%an|%ar|%s"])
            commits = []
            for line in output.split('\n'):
                parts = line.split('|')
                if len(parts) >= 4:
                    commits.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "date": parts[2],
                        "message": parts[3]
                    })
            return commits
        except:
            return []

git_service = GitService()