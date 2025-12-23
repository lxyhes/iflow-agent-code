import os
import pathspec
import time
import stat

class FileService:
    def _get_gitignore_spec(self, root_path: str):
        gitignore_path = os.path.join(root_path, ".gitignore")
        lines = [".git/", "__pycache__/", "node_modules/", "*.pyc", ".DS_Store"]
        if os.path.exists(gitignore_path):
            try:
                with open(gitignore_path, "r", encoding="utf-8") as f:
                    lines.extend(f.readlines())
            except:
                pass
        return pathspec.PathSpec.from_lines("gitwildmatch", lines)

    def get_tree(self, root_path: str):
        """Build a recursive tree structure for the frontend."""
        if not os.path.exists(root_path):
            return []
        
        spec = self._get_gitignore_spec(root_path)
        return self._build_tree(root_path, root_path, spec)

    def _build_tree(self, current_path: str, root_path: str, spec: pathspec.PathSpec):
        tree = []
        try:
            with os.scandir(current_path) as it:
                # Sort entries: directories first, then files, both alphabetically
                entries = sorted(list(it), key=lambda e: (not e.is_dir(), e.name.lower()))
                
                for entry in entries:
                    rel_path = os.path.relpath(entry.path, root_path)
                    
                    # Respect gitignore
                    if spec.match_file(rel_path):
                        continue
                    
                    stats = entry.stat()
                    item = {
                        "name": entry.name,
                        "path": rel_path,
                        "type": "directory" if entry.is_dir() else "file",
                        "size": stats.st_size,
                        "modified": stats.st_mtime * 1000, # ms for JS Date
                        "permissionsRwx": self._get_permissions_string(stats.st_mode)
                    }
                    
                    if entry.is_dir():
                        item["children"] = self._build_tree(entry.path, root_path, spec)
                        # Only add directory if it has children or we want to show empty dirs
                        tree.append(item)
                    else:
                        tree.append(item)
        except Exception as e:
            print(f"Error scanning {current_path}: {e}")
            
        return tree

    def _get_permissions_string(self, mode):
        """Convert stat mode to rwxrwxrwx string."""
        return stat.filemode(mode)

    def read_file(self, root_path: str, rel_path: str):
        full_path = os.path.join(root_path, rel_path)
        if not os.path.commonpath([root_path, full_path]) == root_path:
             raise ValueError("Access denied")
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File {rel_path} not found")
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            return "[Binary Content - Cannot display]"

    def write_file(self, root_path: str, rel_path: str, content: str):
        full_path = os.path.join(root_path, rel_path)
        if not os.path.commonpath([root_path, full_path]) == root_path:
             raise ValueError("Access denied")
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True

file_service = FileService()