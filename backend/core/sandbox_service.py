"""
实时代码预览沙盒服务 (Real-time Code Preview Sandbox Service)
支持 React/Vue 组件的实时预览和热重载
"""

import os
import json
import logging
import tempfile
import shutil
import subprocess
import asyncio
from typing import Dict, List, Any, Optional
from pathlib import Path
import hashlib

logger = logging.getLogger("SandboxService")


class SandboxService:
    """实时代码预览沙盒服务"""
    
    def __init__(self):
        self.sandboxes = {}
        self.temp_dir = tempfile.mkdtemp(prefix="sandbox_")
        logger.info(f"Sandbox temp directory: {self.temp_dir}")
    
    async def create_sandbox(
        self,
        project_name: str,
        component_code: str,
        component_type: str = "react",
        dependencies: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        创建预览沙盒
        
        Args:
            project_name: 项目名称
            component_code: 组件代码
            component_type: 组件类型 (react, vue, vanilla)
            dependencies: 依赖包列表
        
        Returns:
            沙盒信息
        """
        try:
            sandbox_id = self._generate_sandbox_id(project_name, component_code)
            
            # 创建沙盒目录
            sandbox_dir = os.path.join(self.temp_dir, sandbox_id)
            os.makedirs(sandbox_dir, exist_ok=True)
            
            # 根据组件类型创建不同的沙盒
            if component_type == "react":
                await self._create_react_sandbox(sandbox_dir, component_code, dependencies)
            elif component_type == "vue":
                await self._create_vue_sandbox(sandbox_dir, component_code, dependencies)
            else:
                await self._create_vanilla_sandbox(sandbox_dir, component_code, dependencies)
            
            # 启动开发服务器
            server_info = await self._start_dev_server(sandbox_dir, component_type)
            
            sandbox_info = {
                "sandbox_id": sandbox_id,
                "project_name": project_name,
                "component_type": component_type,
                "preview_url": server_info["url"],
                "port": server_info["port"],
                "status": "running",
                "created_at": asyncio.get_event_loop().time()
            }
            
            self.sandboxes[sandbox_id] = sandbox_info
            logger.info(f"Created sandbox {sandbox_id} for {project_name}")
            
            return sandbox_info
        
        except Exception as e:
            logger.exception(f"Failed to create sandbox: {e}")
            return {"error": f"创建沙盒失败: {str(e)}"}
    
    async def update_sandbox_component(
        self,
        sandbox_id: str,
        component_code: str
    ) -> Dict[str, Any]:
        """
        更新沙盒中的组件代码
        
        Args:
            sandbox_id: 沙盒 ID
            component_code: 新的组件代码
        
        Returns:
            更新结果
        """
        try:
            if sandbox_id not in self.sandboxes:
                return {"error": "沙盒不存在"}
            
            sandbox_info = self.sandboxes[sandbox_id]
            sandbox_dir = os.path.join(self.temp_dir, sandbox_id)
            
            # 更新组件文件
            component_file = os.path.join(sandbox_dir, "src", "Component.jsx")
            if os.path.exists(component_file):
                with open(component_file, 'w', encoding='utf-8') as f:
                    f.write(component_code)
                
                logger.info(f"Updated component in sandbox {sandbox_id}")
                return {"success": True, "message": "组件更新成功"}
            else:
                return {"error": "组件文件不存在"}
        
        except Exception as e:
            logger.exception(f"Failed to update sandbox: {e}")
            return {"error": f"更新沙盒失败: {str(e)}"}
    
    async def get_sandbox_status(self, sandbox_id: str) -> Dict[str, Any]:
        """获取沙盒状态"""
        if sandbox_id not in self.sandboxes:
            return {"error": "沙盒不存在"}
        
        return self.sandboxes[sandbox_id]
    
    async def destroy_sandbox(self, sandbox_id: str) -> Dict[str, Any]:
        """销毁沙盒"""
        try:
            if sandbox_id not in self.sandboxes:
                return {"error": "沙盒不存在"}
            
            sandbox_info = self.sandboxes[sandbox_id]
            sandbox_dir = os.path.join(self.temp_dir, sandbox_id)
            
            # 停止开发服务器
            if "port" in sandbox_info:
                await self._stop_dev_server(sandbox_info["port"])
            
            # 删除沙盒目录
            if os.path.exists(sandbox_dir):
                shutil.rmtree(sandbox_dir)
            
            del self.sandboxes[sandbox_id]
            logger.info(f"Destroyed sandbox {sandbox_id}")
            
            return {"success": True, "message": "沙盒已销毁"}
        
        except Exception as e:
            logger.exception(f"Failed to destroy sandbox: {e}")
            return {"error": f"销毁沙盒失败: {str(e)}"}
    
    async def _create_react_sandbox(
        self,
        sandbox_dir: str,
        component_code: str,
        dependencies: Optional[Dict[str, str]] = None
    ):
        """创建 React 沙盒"""
        # 创建 package.json
        package_json = {
            "name": "sandbox-preview",
            "version": "1.0.0",
            "type": "module",
            "scripts": {
                "dev": "vite --port 0",
                "build": "vite build",
                "preview": "vite preview"
            },
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            },
            "devDependencies": {
                "@vitejs/plugin-react": "^4.0.0",
                "vite": "^4.3.0"
            }
        }
        
        if dependencies:
            package_json["dependencies"].update(dependencies)
        
        # 创建目录结构
        os.makedirs(os.path.join(sandbox_dir, "src"), exist_ok=True)
        os.makedirs(os.path.join(sandbox_dir, "public"), exist_ok=True)
        
        # 写入 package.json
        with open(os.path.join(sandbox_dir, "package.json"), 'w', encoding='utf-8') as f:
            json.dump(package_json, f, indent=2)
        
        # 写入 vite.config.js
        vite_config = """
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 0
  }
})
"""
        with open(os.path.join(sandbox_dir, "vite.config.js"), 'w', encoding='utf-8') as f:
            f.write(vite_config)
        
        # 写入 index.html
        index_html = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"""
        with open(os.path.join(sandbox_dir, "index.html"), 'w', encoding='utf-8') as f:
            f.write(index_html)
        
        # 写入 main.jsx
        main_jsx = """
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
"""
        with open(os.path.join(sandbox_dir, "src", "main.jsx"), 'w', encoding='utf-8') as f:
            f.write(main_jsx)
        
        # 写入 Component.jsx
        with open(os.path.join(sandbox_dir, "src", "Component.jsx"), 'w', encoding='utf-8') as f:
            f.write(component_code)
        
        # 写入 App.jsx
        app_jsx = """
import React from 'react'
import Component from './Component'

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <Component />
    </div>
  )
}

export default App
"""
        with open(os.path.join(sandbox_dir, "src", "App.jsx"), 'w', encoding='utf-8') as f:
            f.write(app_jsx)
        
        # 写入 index.css
        index_css = """
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
"""
        with open(os.path.join(sandbox_dir, "src", "index.css"), 'w', encoding='utf-8') as f:
            f.write(index_css)
        
        # 安装依赖
        await self._install_dependencies(sandbox_dir)
    
    async def _create_vue_sandbox(self, sandbox_dir: str, component_code: str, dependencies: Optional[Dict[str, str]] = None):
        """创建 Vue 沙盒"""
        # 类似的实现，但使用 Vue
        pass
    
    async def _create_vanilla_sandbox(self, sandbox_dir: str, component_code: str, dependencies: Optional[Dict[str, str]] = None):
        """创建原生 JS 沙盒"""
        # 创建简单的 HTML + JS 沙盒
        pass
    
    async def _install_dependencies(self, sandbox_dir: str):
        """安装依赖"""
        try:
            process = await asyncio.create_subprocess_exec(
                "npm", "install",
                cwd=sandbox_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"npm install failed: {stderr.decode()}")
            else:
                logger.info("Dependencies installed successfully")
        
        except Exception as e:
            logger.exception(f"Failed to install dependencies: {e}")
    
    async def _start_dev_server(self, sandbox_dir: str, component_type: str) -> Dict[str, Any]:
        """启动开发服务器"""
        try:
            process = await asyncio.create_subprocess_exec(
                "npm", "run", "dev",
                cwd=sandbox_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # 等待服务器启动
            await asyncio.sleep(3)
            
            # 读取输出获取端口
            stdout, stderr = await process.communicate()
            output = stdout.decode() + stderr.decode()
            
            # 解析端口
            port = None
            for line in output.split('\n'):
                if 'localhost:' in line or '0.0.0.0:' in line:
                    import re
                    match = re.search(r':(\d+)', line)
                    if match:
                        port = int(match.group(1))
                        break
            
            if port is None:
                port = 5173  # 默认 Vite 端口
            
            return {
                "url": f"http://localhost:{port}",
                "port": port,
                "process": process
            }
        
        except Exception as e:
            logger.exception(f"Failed to start dev server: {e}")
            return {"url": None, "port": None}
    
    async def _stop_dev_server(self, port: int):
        """停止开发服务器"""
        try:
            # 查找并杀死占用端口的进程
            if platform.system() == "Darwin" or platform.system() == "Linux":
                process = await asyncio.create_subprocess_exec(
                    "lsof", "-ti", f":{port}",
                    stdout=asyncio.subprocess.PIPE
                )
                stdout, _ = await process.communicate()
                pid = stdout.decode().strip()
                
                if pid:
                    await asyncio.create_subprocess_exec("kill", "-9", pid)
            elif platform.system() == "Windows":
                process = await asyncio.create_subprocess_exec(
                    "netstat", "-ano", "|", "findstr", f":{port}",
                    stdout=asyncio.subprocess.PIPE
                )
                stdout, _ = await process.communicate()
                # 解析 PID 并杀死进程
                pass
        
        except Exception as e:
            logger.exception(f"Failed to stop dev server: {e}")
    
    def _generate_sandbox_id(self, project_name: str, component_code: str) -> str:
        """生成沙盒 ID"""
        content = f"{project_name}_{component_code}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    async def cleanup(self):
        """清理所有沙盒"""
        for sandbox_id in list(self.sandboxes.keys()):
            await self.destroy_sandbox(sandbox_id)
        
        # 清理临时目录
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)


# 全局实例
_sandbox_service = None


def get_sandbox_service() -> SandboxService:
    """获取沙盒服务实例"""
    global _sandbox_service
    if _sandbox_service is None:
        _sandbox_service = SandboxService()
    return _sandbox_service


import platform