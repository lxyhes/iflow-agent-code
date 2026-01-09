import asyncio
import os
import subprocess
from typing import List, Dict, Any

class GitService:
    def _run_git_sync(self, cwd: str, args: List[str]) -> str:
        """Run a git command synchronously (to avoid Windows asyncio issues)."""
        try:
            cmd = ["git"] + args
            print(f"[Git] Running: {' '.join(cmd)} in {cwd}")

            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=30
            )

            if result.returncode != 0:
                error_msg = result.stderr.strip()
                if not error_msg:
                    error_msg = result.stdout.strip() or f"Git command failed with code {result.returncode}"
                print(f"[Git] Command failed: {error_msg}")
                raise Exception(error_msg)

            print(f"[Git] Command succeeded, output length: {len(result.stdout)}")
            return result.stdout.strip()

        except subprocess.TimeoutExpired:
            print(f"[Git] Command timed out: {' '.join(args)}")
            raise Exception(f"Git command timed out: {' '.join(args)}")
        except Exception as e:
            error_detail = f"Type: {type(e).__name__}, Message: {str(e)}, Args: {e.args}"
            print(f"[Git] Error running git command {args}: {error_detail}")
            import traceback
            traceback.print_exc()
            raise e

    async def _run_git(self, cwd: str, args: List[str]) -> str:
        """Run a git command asynchronously (using thread pool to avoid Windows issues)."""
        return await asyncio.to_thread(self._run_git_sync, cwd, args)

    async def get_status(self, cwd: str) -> Dict[str, Any]:
        try:
            print(f"[Git] Getting status for {cwd}")
            output = await self._run_git(cwd, ["status", "--porcelain"])
            branch = await self._run_git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])
            print(f"[Git] Status retrieved successfully, branch: {branch}")
            print(f"[Git] Raw output length: {len(output)}")
            if output:
                print(f"[Git] First few lines of output:")
                for i, line in enumerate(output.split('\n')[:5]):
                    print(f"[Git]   Line {i}: '{line}' (len={len(line)})")
        except Exception as e:
            print(f"[Git] Failed to get status: {e}")
            return {"error": f"Git status failed: {str(e)}"}

        changes = []
        modified = []
        added = []
        deleted = []
        untracked = []

        if output:
            for line_num, line in enumerate(output.split('\n')):
                if len(line) < 4:
                    print(f"[Git] Skipping line {line_num}: too short (len={len(line)}): '{line}'")
                    continue
                x = line[0]
                y = line[1]
                # Git status --porcelain format: XY PATH
                # X = staged status, Y = unstaged status
                # Path starts after XY and a space (position 2)
                # But there might be a leading space for some status codes
                # Find the first space after the status codes
                path_start = line.find(' ')
                if path_start == -1:
                    print(f"[Git] Skipping line {line_num}: no space found: '{line}'")
                    continue
                path = line[path_start + 1:].strip('"') # Handle quotes
                print(f"[Git] Parsed line {line_num}: x='{x}', y='{y}', path='{path}'")

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

    async def get_branches(self, cwd: str) -> List[str]:
        try:
            output = await self._run_git(cwd, ["branch", "--format=%(refname:short)"])
            return output.split('\n') if output else []
        except:
            return []

    async def checkout(self, cwd: str, branch: str):
        return await self._run_git(cwd, ["checkout", branch])

    async def create_branch(self, cwd: str, branch: str):
        return await self._run_git(cwd, ["checkout", "-b", branch])

    async def commit(self, cwd: str, message: str, files: List[str]):
        # Add specific files
        for f in files:
            await self._run_git(cwd, ["add", f])
        return await self._run_git(cwd, ["commit", "-m", message])

    async def get_diff(self, cwd: str, file_path: str) -> str:
        try:
            return await self._run_git(cwd, ["diff", "HEAD", "--", file_path])
        except:
            return ""

    async def get_commits(self, cwd: str, limit: int = 10):
        try:
            print(f"[Git] Getting commits for {cwd}, limit={limit}")
            # Format: hash|author|date|message (using %x1f as separator)
            # %h = short hash, %an = author name, %ar = author date relative, %s = subject
            output = await self._run_git(cwd, ["log", f"-n{limit}", "--pretty=format:%h%x1f%an%x1f%ar%x1f%s"])
            print(f"[Git] Git log output length: {len(output)}")
            commits = []
            for line_num, line in enumerate(output.split('\n')):
                line = line.strip()
                if not line:
                    print(f"[Git] Skipping empty line {line_num}")
                    continue
                parts = line.split('\x1f')
                print(f"[Git] Commit line {line_num}: parts={len(parts)}, line='{line}'")
                if len(parts) >= 4:
                    commits.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "date": parts[2],
                        "message": parts[3]
                    })
            print(f"[Git] Parsed {len(commits)} commits")
            return commits
        except Exception as e:
            print(f"Error getting commits: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def get_commit_diff(self, cwd: str, commit_hash: str) -> str:
        try:
            return await self._run_git(cwd, ["show", commit_hash])
        except:
            return ""

    async def get_remote_status(self, cwd: str) -> Dict[str, Any]:
        try:
            branch = await self._run_git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])
            try:
                upstream = await self._run_git(cwd, ["rev-parse", "--abbrev-ref", f"{branch}@{{upstream}}"])
                counts = await self._run_git(cwd, ["rev-list", "--count", "--left-right", f"{upstream}...HEAD"])
                behind, ahead = map(int, counts.split())
                return {
                    "hasRemote": True,
                    "hasUpstream": True,
                    "branch": branch,
                    "remoteBranch": upstream,
                    "remoteName": upstream.split('/')[0] if '/' in upstream else 'origin',
                    "ahead": ahead,
                    "behind": behind,
                    "isUpToDate": ahead == 0 and behind == 0
                }
            except:
                return {
                    "hasRemote": False, 
                    "hasUpstream": False,
                    "branch": branch,
                    "message": "No remote tracking branch configured"
                }
        except:
            return {"error": "Failed to get remote status"}

    async def get_file_at_head(self, cwd: str, file_path: str) -> str:
        try:
            return await self._run_git(cwd, ["show", f"HEAD:{file_path}"])
        except:
            return ""

git_service = GitService()