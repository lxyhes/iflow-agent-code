"""
项目模板生成器
提供常用项目模板，快速初始化项目
"""

import os
import json
import logging
from typing import Dict, Any, List
from pathlib import Path

logger = logging.getLogger("ProjectTemplates")


class ProjectTemplate:
    """项目模板基类"""
    
    def __init__(
        self,
        name: str,
        description: str,
        category: str,
        language: str,
        icon: str = "📦"
    ):
        self.name = name
        self.description = description
        self.category = category
        self.language = language
        self.icon = icon
    
    def generate(self, project_path: str, project_name: str) -> Dict[str, Any]:
        """
        生成项目文件
        
        Args:
            project_path: 项目路径
            project_name: 项目名称
        
        Returns:
            生成结果
        """
        raise NotImplementedError


class ReactTemplate(ProjectTemplate):
    """React 项目模板"""
    
    def __init__(self):
        super().__init__(
            name="React + Vite",
            description="使用 React 18 和 Vite 的现代前端项目",
            category="Frontend",
            language="JavaScript",
            icon="⚛️"
        )
    
    def generate(self, project_path: str, project_name: str) -> Dict[str, Any]:
        """生成 React 项目"""
        files = {
            "package.json": {
                "name": project_name.lower(),
                "version": "0.1.0",
                "type": "module",
                "scripts": {
                    "dev": "vite",
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
            },
            "vite.config.js": f"""import {{ defineConfig }} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({{
  plugins: [react()],
  server: {{
    port: 3000
  }}
}})""",
            "index.html": f"""<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{project_name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>""",
            "src/main.jsx": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)""",
            "src/App.jsx": """import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>欢迎使用 {import.meta.env.VITE_APP_NAME || 'React'} 项目</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          计数: {count}
        </button>
      </div>
    </div>
  )
}

export default App""",
            "src/App.css": """.App {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}""",
            "src/index.css": """body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
}"""
        }
        
        # 创建文件
        for file_path, content in files.items():
            full_path = os.path.join(project_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            if isinstance(content, dict):
                with open(full_path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, indent=2, ensure_ascii=False)
            else:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        
        return {
            "success": True,
            "files_created": list(files.keys()),
            "next_steps": [
                f"cd {project_name}",
                "npm install",
                "npm run dev"
            ]
        }


class PythonTemplate(ProjectTemplate):
    """Python 项目模板"""
    
    def __init__(self):
        super().__init__(
            name="Python FastAPI",
            description="使用 FastAPI 的现代 Python Web 项目",
            category="Backend",
            language="Python",
            icon="🐍"
        )
    
    def generate(self, project_path: str, project_name: str) -> Dict[str, Any]:
        """生成 Python 项目"""
        files = {
            "requirements.txt": """fastapi==0.104.0
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0""",
            "main.py": f"""from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="{project_name}",
    description="FastAPI 项目",
    version="0.1.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {{"message": "欢迎使用 {project_name} API"}}

@app.get("/health")
async def health():
    return {{"status": "healthy"}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)""",
            ".env.example": """# 环境变量配置
DEBUG=True
PORT=8000
DATABASE_URL=sqlite:///./app.db""",
            "README.md": f"""# {project_name}

## 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### 运行开发服务器
```bash
python main.py
```

### 访问 API
- API: http://localhost:8000
- 文档: http://localhost:8000/docs
"""
        }
        
        # 创建文件
        for file_path, content in files.items():
            full_path = os.path.join(project_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return {
            "success": True,
            "files_created": list(files.keys()),
            "next_steps": [
                f"cd {project_name}",
                "python -m venv venv",
                "source venv/bin/activate  # Windows: venv\\Scripts\\activate",
                "pip install -r requirements.txt",
                "python main.py"
            ]
        }


class NodeExpressTemplate(ProjectTemplate):
    """Node.js Express 项目模板"""
    
    def __init__(self):
        super().__init__(
            name="Node.js Express",
            description="使用 Express.js 的 Node.js 后端项目",
            category="Backend",
            language="JavaScript",
            icon="🟢"
        )
    
    def generate(self, project_path: str, project_name: str) -> Dict[str, Any]:
        """生成 Node.js Express 项目"""
        files = {
            "package.json": {
                "name": project_name.lower(),
                "version": "1.0.0",
                "description": "Express.js 项目",
                "main": "index.js",
                "scripts": {
                    "start": "node index.js",
                    "dev": "nodemon index.js"
                },
                "dependencies": {
                    "express": "^4.18.2",
                    "cors": "^2.8.5",
                    "dotenv": "^16.3.1"
                },
                "devDependencies": {
                    "nodemon": "^3.0.1"
                }
            },
            "index.js": f"""const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.get('/', (req, res) => {{
  res.json({{ message: '欢迎使用 {project_name} API' }});
}});

app.get('/health', (req, res) => {{
  res.json({{ status: 'healthy' }});
}});

// 启动服务器
app.listen(PORT, () => {{
  console.log(`Server is running on port ${{PORT}}`);
}});""",
            ".env.example": """PORT=3000
NODE_ENV=development""",
            "README.md": f"""# {project_name}

## 快速开始

### 安装依赖
```bash
npm install
```

### 运行开发服务器
```bash
npm run dev
```

### 访问 API
- API: http://localhost:3000
"""
        }
        
        # 创建文件
        for file_path, content in files.items():
            full_path = os.path.join(project_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            if isinstance(content, dict):
                with open(full_path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, indent=2, ensure_ascii=False)
            else:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        
        return {
            "success": True,
            "files_created": list(files.keys()),
            "next_steps": [
                f"cd {project_name}",
                "npm install",
                "npm run dev"
            ]
        }


class VueTemplate(ProjectTemplate):
    """Vue 3 项目模板"""
    
    def __init__(self):
        super().__init__(
            name="Vue 3 + Vite",
            description="使用 Vue 3 和 Vite 的现代前端项目",
            category="Frontend",
            language="JavaScript",
            icon="💚"
        )
    
    def generate(self, project_path: str, project_name: str) -> Dict[str, Any]:
        """生成 Vue 3 项目"""
        files = {
            "package.json": {
                "name": project_name.lower(),
                "version": "0.1.0",
                "type": "module",
                "scripts": {
                    "dev": "vite",
                    "build": "vite build",
                    "preview": "vite preview"
                },
                "dependencies": {
                    "vue": "^3.3.0"
                },
                "devDependencies": {
                    "@vitejs/plugin-vue": "^4.0.0",
                    "vite": "^4.3.0"
                }
            },
            "vite.config.js": f"""import {{ defineConfig }} from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({{
  plugins: [vue()],
  server: {{
    port: 3000
  }}
}})""",
            "index.html": f"""<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{project_name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>""",
            "src/main.js": """import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')""",
            "src/App.vue": """<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <h1>欢迎使用 Vue 3 项目</h1>
    <div class="card">
      <button @click="count++">
        计数: {{ count }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  background-color: #42b883;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #35495e;
}
</style>""",
            "src/style.css": """body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#app {
  width: 100%;
}"""
        }
        
        # 创建文件
        for file_path, content in files.items():
            full_path = os.path.join(project_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            if isinstance(content, dict):
                with open(full_path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, indent=2, ensure_ascii=False)
            else:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        
        return {
            "success": True,
            "files_created": list(files.keys()),
            "next_steps": [
                f"cd {project_name}",
                "npm install",
                "npm run dev"
            ]
        }


# 模板注册表
TEMPLATE_REGISTRY: Dict[str, ProjectTemplate] = {
    "react": ReactTemplate(),
    "python": PythonTemplate(),
    "node-express": NodeExpressTemplate(),
    "vue": VueTemplate()
}


def get_all_templates() -> List[Dict[str, Any]]:
    """获取所有可用模板"""
    templates = []
    for template_id, template in TEMPLATE_REGISTRY.items():
        templates.append({
            "id": template_id,
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "language": template.language,
            "icon": template.icon
        })
    return templates


def get_template(template_id: str) -> ProjectTemplate:
    """获取指定模板"""
    return TEMPLATE_REGISTRY.get(template_id)


def generate_project(template_id: str, project_path: str, project_name: str) -> Dict[str, Any]:
    """生成项目"""
    template = get_template(template_id)
    if not template:
        return {
            "success": False,
            "error": f"模板 '{template_id}' 不存在"
        }
    
    try:
        # 创建项目目录
        os.makedirs(project_path, exist_ok=True)
        
        # 生成项目文件
        result = template.generate(project_path, project_name)
        
        logger.info(f"成功生成项目: {project_name} 使用模板: {template.name}")
        return result
    except Exception as e:
        logger.error(f"生成项目失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }