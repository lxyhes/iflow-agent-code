"""
项目模板生成器 - 快速创建新项目
支持多种技术栈和最佳实践模板
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger("ProjectTemplateService")


class ProjectTemplate:
    """项目模板"""
    
    def __init__(
        self,
        template_id: str,
        name: str,
        description: str,
        tech_stack: List[str],
        structure: Dict[str, Any],
        files: Dict[str, str],
        dependencies: Dict[str, List[str]] = None,
        scripts: Dict[str, str] = None
    ):
        self.template_id = template_id
        self.name = name
        self.description = description
        self.tech_stack = tech_stack
        self.structure = structure
        self.files = files
        self.dependencies = dependencies or {}
        self.scripts = scripts or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "template_id": self.template_id,
            "name": self.name,
            "description": self.description,
            "tech_stack": self.tech_stack,
            "structure": self.structure,
            "files": self.files,
            "dependencies": self.dependencies,
            "scripts": self.scripts
        }


class ProjectTemplateService:
    """项目模板生成器服务"""
    
    def __init__(self):
        self.templates = self._initialize_templates()
    
    def _initialize_templates(self) -> Dict[str, ProjectTemplate]:
        """初始化内置模板"""
        templates = {}
        
        # React + TypeScript 模板
        templates['react-ts'] = ProjectTemplate(
            template_id='react-ts',
            name='React + TypeScript',
            description='使用 React 和 TypeScript 的现代 Web 应用',
            tech_stack=['React', 'TypeScript', 'Vite', 'Tailwind CSS'],
            structure={
                "src": {
                    "components": {},
                    "pages": {},
                    "hooks": {},
                    "utils": {},
                    "types": {}
                },
                "public": {},
                "tests": {}
            },
            files={
                "package.json": self._get_react_ts_package_json(),
                "tsconfig.json": self._get_react_ts_tsconfig(),
                "vite.config.ts": self._get_react_ts_vite_config(),
                "tailwind.config.js": self._get_react_ts_tailwind_config(),
                "src/main.tsx": self._get_react_ts_main(),
                "src/App.tsx": self._get_react_ts_app(),
                "src/index.css": self._get_react_ts_index_css(),
                ".gitignore": self._get_gitignore(),
                "README.md": self._get_readme_template('React + TypeScript')
            },
            dependencies={
                "dependencies": [
                    "react",
                    "react-dom",
                    "lucide-react"
                ],
                "devDependencies": [
                    "@types/react",
                    "@types/react-dom",
                    "@vitejs/plugin-react",
                    "typescript",
                    "vite",
                    "tailwindcss",
                    "postcss",
                    "autoprefixer"
                ]
            },
            scripts={
                "dev": "vite",
                "build": "tsc && vite build",
                "preview": "vite preview",
                "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
            }
        )
        
        # Node.js + Express 模板
        templates['node-express'] = ProjectTemplate(
            template_id='node-express',
            name='Node.js + Express',
            description='使用 Node.js 和 Express 的后端 API 服务',
            tech_stack=['Node.js', 'Express', 'TypeScript'],
            structure={
                "src": {
                    "controllers": {},
                    "models": {},
                    "routes": {},
                    "middleware": {},
                    "utils": {}
                },
                "tests": {}
            },
            files={
                "package.json": self._get_node_express_package_json(),
                "tsconfig.json": self._get_node_express_tsconfig(),
                "src/index.ts": self._get_node_express_index(),
                "src/app.ts": self._get_node_express_app(),
                ".gitignore": self._get_gitignore(),
                "README.md": self._get_readme_template('Node.js + Express')
            },
            dependencies={
                "dependencies": [
                    "express",
                    "cors",
                    "dotenv"
                ],
                "devDependencies": [
                    "@types/express",
                    "@types/cors",
                    "@types/node",
                    "typescript",
                    "ts-node",
                    "nodemon"
                ]
            },
            scripts={
                "dev": "nodemon src/index.ts",
                "build": "tsc",
                "start": "node dist/index.js",
                "test": "jest"
            }
        )
        
        # Python + FastAPI 模板
        templates['python-fastapi'] = ProjectTemplate(
            template_id='python-fastapi',
            name='Python + FastAPI',
            description='使用 Python 和 FastAPI 的现代 Web API',
            tech_stack=['Python', 'FastAPI', 'SQLAlchemy'],
            structure={
                "app": {
                    "api": {},
                    "models": {},
                    "schemas": {},
                    "core": {},
                    "db": {}
                },
                "tests": {}
            },
            files={
                "requirements.txt": self._get_python_fastapi_requirements(),
                "main.py": self._get_python_fastapi_main(),
                ".gitignore": self._get_python_gitignore(),
                "README.md": self._get_readme_template('Python + FastAPI')
            },
            dependencies={
                "dependencies": [
                    "fastapi",
                    "uvicorn",
                    "sqlalchemy",
                    "pydantic",
                    "python-dotenv"
                ],
                "devDependencies": [
                    "pytest",
                    "pytest-asyncio",
                    "black",
                    "flake8"
                ]
            },
            scripts={
                "dev": "uvicorn main:app --reload",
                "start": "uvicorn main:app",
                "test": "pytest",
                "lint": "flake8 ."
            }
        )
        
        # Go + Gin 模板
        templates['go-gin'] = ProjectTemplate(
            template_id='go-gin',
            name='Go + Gin',
            description='使用 Go 和 Gin 的高性能 Web 服务',
            tech_stack=['Go', 'Gin'],
            structure={
                "cmd": {},
                "internal": {
                    "handlers": {},
                    "models": {},
                    "services": {},
                    "middleware": {}
                },
                "pkg": {},
                "api": {}
            },
            files={
                "go.mod": self._get_go_gin_mod(),
                "main.go": self._get_go_gin_main(),
                ".gitignore": self._get_go_gitignore(),
                "README.md": self._get_readme_template('Go + Gin')
            },
            dependencies={
                "dependencies": [
                    "github.com/gin-gonic/gin",
                    "github.com/joho/godotenv"
                ]
            },
            scripts={
                "run": "go run main.go",
                "build": "go build -o bin/server",
                "test": "go test ./...",
                "tidy": "go mod tidy"
            }
        )
        
        return templates
    
    def get_templates(self) -> List[Dict[str, Any]]:
        """获取所有可用模板"""
        return [template.to_dict() for template in self.templates.values()]
    
    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """获取特定模板"""
        template = self.templates.get(template_id)
        return template.to_dict() if template else None
    
    def generate_project(
        self,
        template_id: str,
        project_name: str,
        output_path: str,
        custom_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        生成项目
        
        Args:
            template_id: 模板 ID
            project_name: 项目名称
            output_path: 输出路径
            custom_config: 自定义配置
        
        Returns:
            生成结果
        """
        template = self.templates.get(template_id)
        if not template:
            return {
                "success": False,
                "error": f"模板 {template_id} 不存在"
            }
        
        try:
            project_path = os.path.join(output_path, project_name)
            os.makedirs(project_path, exist_ok=True)
            
            # 创建目录结构
            self._create_structure(project_path, template.structure)
            
            # 创建文件
            for file_path, content in template.files.items():
                full_path = os.path.join(project_path, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                # 替换项目名称占位符
                content = content.replace('{{PROJECT_NAME}}', project_name)
                
                # 应用自定义配置
                if custom_config:
                    content = self._apply_custom_config(content, custom_config)
                
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            # 创建 package.json 或 requirements.txt
            if template.dependencies:
                self._create_dependency_files(project_path, template)
            
            return {
                "success": True,
                "project_path": project_path,
                "template": template.name,
                "message": f"项目 {project_name} 创建成功"
            }
        
        except Exception as e:
            logger.error(f"生成项目失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _create_structure(self, base_path: str, structure: Dict[str, Any]):
        """创建目录结构"""
        for name, content in structure.items():
            path = os.path.join(base_path, name)
            if isinstance(content, dict):
                os.makedirs(path, exist_ok=True)
                self._create_structure(path, content)
    
    def _create_dependency_files(self, project_path: str, template: ProjectTemplate):
        """创建依赖文件"""
        if template.template_id in ['react-ts', 'node-express']:
            # Node.js 项目 - 更新 package.json
            package_json_path = os.path.join(project_path, 'package.json')
            if os.path.exists(package_json_path):
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    package_json = json.load(f)
                
                package_json['dependencies'] = {dep: 'latest' for dep in template.dependencies.get('dependencies', [])}
                package_json['devDependencies'] = {dep: 'latest' for dep in template.dependencies.get('devDependencies', [])}
                package_json['scripts'] = template.scripts
                
                with open(package_json_path, 'w', encoding='utf-8') as f:
                    json.dump(package_json, f, indent=2)
        
        elif template.template_id == 'python-fastapi':
            # Python 项目 - 更新 requirements.txt
            requirements_path = os.path.join(project_path, 'requirements.txt')
            if os.path.exists(requirements_path):
                with open(requirements_path, 'r', encoding='utf-8') as f:
                    requirements = set(line.strip() for line in f if line.strip())
                
                requirements.update(template.dependencies.get('dependencies', []))
                
                with open(requirements_path, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(sorted(requirements)) + '\n')
        
        elif template.template_id == 'go-gin':
            # Go 项目 - 更新 go.mod
            go_mod_path = os.path.join(project_path, 'go.mod')
            if os.path.exists(go_mod_path):
                with open(go_mod_path, 'r', encoding='utf-8') as f:
                    go_mod_content = f.read()
                
                # 添加依赖
                for dep in template.dependencies.get('dependencies', []):
                    if dep not in go_mod_content:
                        go_mod_content += f'\nrequire {dep} latest\n'
                
                with open(go_mod_path, 'w', encoding='utf-8') as f:
                    f.write(go_mod_content)
    
    def _apply_custom_config(self, content: str, config: Dict[str, Any]) -> str:
        """应用自定义配置"""
        for key, value in config.items():
            placeholder = f'{{{{{key}}}}}'
            content = content.replace(placeholder, str(value))
        return content
    
    # 模板文件内容
    def _get_react_ts_package_json(self) -> str:
        return '''{
  "name": "{{PROJECT_NAME}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}'''
    
    def _get_react_ts_tsconfig(self) -> str:
        return '''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}'''
    
    def _get_react_ts_vite_config(self) -> str:
        return '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})'''
    
    def _get_react_ts_tailwind_config(self) -> str:
        return '''/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}'''
    
    def _get_react_ts_main(self) -> str:
        return '''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)'''
    
    def _get_react_ts_app(self) -> str:
        return '''import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to {{PROJECT_NAME}}
        </h1>
        <div className="text-center">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App'''
    
    def _get_react_ts_index_css(self) -> str:
        return '''@tailwind base;
@tailwind components;
@tailwind utilities;'''
    
    def _get_node_express_package_json(self) -> str:
        return '''{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "description": "Node.js Express API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}'''
    
    def _get_node_express_tsconfig(self) -> str:
        return '''{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}'''
    
    def _get_node_express_index(self) -> str:
        return '''import app from './app'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})'''
    
    def _get_node_express_app(self) -> str:
        return '''import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to {{PROJECT_NAME}} API' })
})

export default app'''
    
    def _get_python_fastapi_requirements(self) -> str:
        return '''fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-dotenv==1.0.0'''
    
    def _get_python_fastapi_main(self) -> str:
        return '''from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="{{PROJECT_NAME}}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to {{PROJECT_NAME}} API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)'''
    
    def _get_go_gin_mod(self) -> str:
        return '''module {{PROJECT_NAME}}

go 1.21

require github.com/gin-gonic/gin latest'''
    
    def _get_go_gin_main(self) -> str:
        return '''package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    
    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "message": "Welcome to {{PROJECT_NAME}}",
        })
    })
    
    r.Run(":8080")
}'''
    
    def _get_gitignore(self) -> str:
        return '''# Dependencies
node_modules/
__pycache__/
*.py[cod]
*$py.class

# Build
dist/
build/
*.exe
*.dll
*.so

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db'''
    
    def _get_python_gitignore(self) -> str:
        return '''# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db'''
    
    def _get_go_gitignore(self) -> str:
        return '''# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib
bin/
dist/

# Test binary, built with `go test -c`
*.test

# Output of the go coverage tool
*.out

# Dependency directories
vendor/

# Go workspace file
go.work

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db'''
    
    def _get_readme_template(self, tech_stack: str) -> str:
        return f'''# {{PROJECT_NAME}}

使用 {tech_stack} 的项目模板。

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
.
├── src/           # 源代码
├── public/        # 公共资源
└── tests/         # 测试文件
```

## 技术栈

- {tech_stack}

## 许可证

MIT
'''


# 全局实例
_project_template_service = None


def get_project_template_service() -> ProjectTemplateService:
    """获取项目模板生成器服务实例"""
    global _project_template_service
    if _project_template_service is None:
        _project_template_service = ProjectTemplateService()
    return _project_template_service