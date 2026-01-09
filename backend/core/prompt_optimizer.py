"""
Prompt Optimizer - 智能优化用户输入的消息
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class PromptOptimizer:
    """智能提示词优化器 - 基于项目分析和用户意图优化消息"""

    def __init__(self, project_path: str):
        """
        初始化提示词优化器

        Args:
            project_path: 项目根目录路径
        """
        self.project_path = Path(project_path)
        self.project_info = {}
        self.tech_stack = []
        self.code_style = {}
        self.architecture_patterns = []
        self.relevant_files = []
        self.relevant_functions = []
        self.relevant_classes = []

    def analyze_project(self) -> Dict[str, Any]:
        """
        分析项目特征

        Returns:
            项目分析结果
        """
        logger.info(f"开始分析项目: {self.project_path}")

        # 1. 检测技术栈
        self.tech_stack = self._detect_tech_stack()

        # 2. 分析代码风格
        self.code_style = self._analyze_code_style()

        # 3. 检测架构模式
        self.architecture_patterns = self._detect_architecture_patterns()

        # 4. 读取项目配置
        self.project_info = self._read_project_config()

        # 5. 扫描项目代码（用于后续引用）
        self._scan_project_code()

        analysis_result = {
            'tech_stack': self.tech_stack,
            'code_style': self.code_style,
            'architecture_patterns': self.architecture_patterns,
            'project_info': self.project_info,
            'relevant_files': self.relevant_files[:10],  # 限制返回数量
            'relevant_functions': self.relevant_functions[:10],
            'relevant_classes': self.relevant_classes[:10]
        }

        logger.info(f"项目分析完成")
        return analysis_result

    def _scan_project_code(self):
        """扫描项目代码，提取关键信息"""
        logger.info("扫描项目代码...")

        # 扫描 Python 文件
        for py_file in self.project_path.rglob('*.py'):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 提取函数定义
                functions = re.findall(r'def\s+(\w+)\s*\((.*?)\):', content)
                for func_name, params in functions:
                    self.relevant_functions.append({
                        'name': func_name,
                        'params': params,
                        'file': str(py_file.relative_to(self.project_path))
                    })

                # 提取类定义
                classes = re.findall(r'class\s+(\w+)(?:\s*\([^)]*\))?:', content)
                for class_name in classes:
                    self.relevant_classes.append({
                        'name': class_name,
                        'file': str(py_file.relative_to(self.project_path))
                    })

                # 保存文件路径
                if functions or classes:
                    self.relevant_files.append(str(py_file.relative_to(self.project_path)))

            except Exception as e:
                logger.warning(f"扫描文件 {py_file} 失败: {e}")

        # 扫描 TypeScript/JavaScript 文件
        for ts_file in self.project_path.rglob('*.{ts,tsx,js,jsx}'):
            try:
                with open(ts_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 提取函数定义
                functions = re.findall(r'(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>|(\w+)\s*\([^)]*\)\s*{)', content)
                for match in functions:
                    func_name = match[0] or match[1] or match[2]
                    if func_name:
                        self.relevant_functions.append({
                            'name': func_name,
                            'file': str(ts_file.relative_to(self.project_path))
                        })

                # 提取类定义
                classes = re.findall(r'class\s+(\w+)', content)
                for class_name in classes:
                    self.relevant_classes.append({
                        'name': class_name,
                        'file': str(ts_file.relative_to(self.project_path))
                    })

                if functions or classes:
                    self.relevant_files.append(str(ts_file.relative_to(self.project_path)))

            except Exception as e:
                logger.warning(f"扫描文件 {ts_file} 失败: {e}")

        logger.info(f"扫描完成: 找到 {len(self.relevant_files)} 个相关文件, {len(self.relevant_functions)} 个函数, {len(self.relevant_classes)} 个类")

    def _detect_tech_stack(self) -> List[str]:
        """检测项目使用的技术栈"""
        tech_stack = []

        # 检查包管理文件
        package_files = {
            'package.json': 'JavaScript/Node.js',
            'requirements.txt': 'Python',
            'Pipfile': 'Python (Pipenv)',
            'pyproject.toml': 'Python (Poetry)',
            'go.mod': 'Go',
            'Cargo.toml': 'Rust',
            'pom.xml': 'Java (Maven)',
            'build.gradle': 'Java (Gradle)',
            'composer.json': 'PHP',
            'Gemfile': 'Ruby',
        }

        for file, tech in package_files.items():
            if (self.project_path / file).exists():
                tech_stack.append(tech)
                logger.info(f"检测到技术: {tech} ({file})")

        # 检查框架
        if (self.project_path / 'package.json').exists():
            try:
                with open(self.project_path / 'package.json', 'r', encoding='utf-8') as f:
                    package_json = json.load(f)

                dependencies = {**package_json.get('dependencies', {}), **package_json.get('devDependencies', {})}

                framework_map = {
                    'react': 'React',
                    'vue': 'Vue.js',
                    'angular': 'Angular',
                    'next': 'Next.js',
                    'nuxt': 'Nuxt.js',
                    'express': 'Express.js',
                    'fastify': 'Fastify',
                    'nestjs': 'NestJS',
                    'electron': 'Electron',
                    'svelte': 'Svelte',
                    'remix': 'Remix',
                    'astro': 'Astro',
                    'vite': 'Vite',
                    'webpack': 'Webpack',
                    'rollup': 'Rollup',
                    'typescript': 'TypeScript',
                    'tailwindcss': 'Tailwind CSS',
                    'bootstrap': 'Bootstrap',
                    'material-ui': 'Material-UI',
                    '@mui/material': 'Material-UI',
                    'antd': 'Ant Design',
                    'chakra-ui': 'Chakra UI',
                }

                for dep, framework in framework_map.items():
                    if dep in dependencies:
                        tech_stack.append(framework)
                        logger.info(f"检测到框架: {framework}")

            except Exception as e:
                logger.warning(f"读取 package.json 失败: {e}")

        if (self.project_path / 'requirements.txt').exists():
            try:
                with open(self.project_path / 'requirements.txt', 'r', encoding='utf-8') as f:
                    requirements = f.read()

                python_frameworks = {
                    'django': 'Django',
                    'flask': 'Flask',
                    'fastapi': 'FastAPI',
                    'tornado': 'Tornado',
                    'pyramid': 'Pyramid',
                    'celery': 'Celery',
                    'sqlalchemy': 'SQLAlchemy',
                    'pytest': 'Pytest',
                    'black': 'Black',
                    'mypy': 'MyPy',
                }

                for lib, framework in python_frameworks.items():
                    if lib.lower() in requirements.lower():
                        tech_stack.append(framework)
                        logger.info(f"检测到 Python 框架/工具: {framework}")

            except Exception as e:
                logger.warning(f"读取 requirements.txt 失败: {e}")

        return list(set(tech_stack))  # 去重

    def _analyze_code_style(self) -> Dict[str, Any]:
        """分析代码风格"""
        style = {
            'languages': [],
            'typescript': {},
            'python': {},
            'general': {}
        }

        # 检测主要编程语言
        language_counts = {}
        for ext in ['.ts', '.tsx', '.js', '.jsx']:
            language_counts['TypeScript/JavaScript'] = len(list(self.project_path.rglob(f'*{ext}')))

        for ext in ['.py']:
            language_counts['Python'] = len(list(self.project_path.rglob(f'*{ext}')))

        for ext in ['.go']:
            language_counts['Go'] = len(list(self.project_path.rglob(f'*{ext}')))

        for ext in ['.rs']:
            language_counts['Rust'] = len(list(self.project_path.rglob(f'*{ext}')))

        # 找出主要语言
        if language_counts:
            main_lang = max(language_counts.items(), key=lambda x: x[1])
            if main_lang[1] > 0:
                style['languages'] = [main_lang[0]]
                logger.info(f"主要语言: {main_lang[0]}")

        # TypeScript/JavaScript 风格分析
        if any(lang in style['languages'] for lang in ['TypeScript/JavaScript']):
            style['typescript'] = self._analyze_typescript_style()

        # Python 风格分析
        if 'Python' in style['languages']:
            style['python'] = self._analyze_python_style()

        # 通用风格分析
        style['general'] = self._analyze_general_style()

        return style

    def _analyze_typescript_style(self) -> Dict[str, Any]:
        """分析 TypeScript/JavaScript 代码风格"""
        style = {
            'interface_vs_type': 'unknown',
            'quote_style': 'unknown',
            'semicolon_usage': 'unknown',
            'arrow_functions': True,
            'const_vs_let': 'unknown',
        }

        interface_count = 0
        type_count = 0
        single_quote_count = 0
        double_quote_count = 0
        semicolon_count = 0
        const_count = 0
        let_count = 0

        for file_path in self.project_path.rglob('*.{ts,tsx,js,jsx}'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                interface_count += len(re.findall(r'\binterface\s+\w+', content))
                type_count += len(re.findall(r'\btype\s+\w+', content))
                single_quote_count += len(re.findall(r"'[^']*'", content))
                double_quote_count += len(re.findall(r'"[^"]*"', content))
                semicolon_count += len(re.findall(r';\s*$', content, re.MULTILINE))
                const_count += len(re.findall(r'\bconst\s+', content))
                let_count += len(re.findall(r'\blet\s+', content))

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        # 确定偏好
        total_interface_type = interface_count + type_count
        if total_interface_type > 0:
            style['interface_vs_type'] = 'interface' if interface_count > type_count else 'type'

        total_quotes = single_quote_count + double_quote_count
        if total_quotes > 0:
            style['quote_style'] = 'single' if single_quote_count > double_quote_count else 'double'

        style['semicolon_usage'] = 'always' if semicolon_count > 0 else 'optional'

        total_vars = const_count + let_count
        if total_vars > 0:
            style['const_vs_let'] = 'prefer_const' if const_count > let_count else 'balanced'

        return style

    def _analyze_python_style(self) -> Dict[str, Any]:
        """分析 Python 代码风格"""
        style = {
            'quote_style': 'unknown',
            'type_hints': False,
            'f_strings': True,
            'docstring_style': 'unknown',
        }

        single_quote_count = 0
        double_quote_count = 0
        type_hint_count = 0
        triple_double_count = 0
        triple_single_count = 0

        for file_path in self.project_path.rglob('*.py'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                single_quote_count += len(re.findall(r"'[^']*'", content))
                double_quote_count += len(re.findall(r'"[^"]*"', content))
                type_hint_count += len(re.findall(r':\s*\w+', content))
                triple_double_count += len(re.findall(r'"""[\s\S]*?"""', content))
                triple_single_count += len(re.findall(r"'''[\s\S]*?'''", content))

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

        total_quotes = single_quote_count + double_quote_count
        if total_quotes > 0:
            style['quote_style'] = 'single' if single_quote_count > double_quote_count else 'double'

        style['type_hints'] = type_hint_count > 0

        total_docstrings = triple_double_count + triple_single_count
        if total_docstrings > 0:
            style['docstring_style'] = 'triple_double' if triple_double_count > triple_single_count else 'triple_single'

        return style

    def _analyze_general_style(self) -> Dict[str, Any]:
        """分析通用代码风格"""
        style = {
            'indentation': 'unknown',
            'line_length': 'standard',
        }

        # 检测缩进
        for file_path in self.project_path.rglob('*.{py,ts,tsx,js,jsx,go,rs}'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                for line in lines:
                    if line.strip() and line.startswith(' '):
                        indent_size = len(line) - len(line.lstrip())
                        if indent_size == 2:
                            style['indentation'] = '2_spaces'
                            break
                        elif indent_size == 4:
                            style['indentation'] = '4_spaces'
                            break
                        elif indent_size == 8:
                            style['indentation'] = 'tabs'
                            break

            except Exception as e:
                logger.warning(f"分析文件 {file_path} 失败: {e}")

            if style['indentation'] != 'unknown':
                break

        return style

    def _detect_architecture_patterns(self) -> List[str]:
        """检测架构模式"""
        patterns = []

        # 检查目录结构
        dirs = [d.name for d in self.project_path.iterdir() if d.is_dir()]

        # MVC 模式
        if any(d in dirs for d in ['models', 'views', 'controllers']):
            patterns.append('MVC')

        # 分层架构
        if any(d in dirs for d in ['services', 'repositories', 'controllers', 'handlers']):
            patterns.append('Layered Architecture')

        # 微服务
        if any(d in dirs for d in ['microservices', 'services', 'api-gateway']):
            patterns.append('Microservices')

        # 单体架构
        if 'src' in dirs and 'public' in dirs:
            patterns.append('Monolithic SPA')

        # 模块化架构
        if 'modules' in dirs or 'features' in dirs:
            patterns.append('Modular Architecture')

        # 清洁架构
        if any(d in dirs for d in ['entities', 'usecases', 'interfaces', 'infrastructure']):
            patterns.append('Clean Architecture')

        return patterns

    def _read_project_config(self) -> Dict[str, Any]:
        """读取项目配置"""
        config = {
            'name': self.project_path.name,
            'has_git': (self.project_path / '.git').exists(),
            'has_readme': False,
            'has_license': False,
            'has_ci_cd': False,
        }

        # 检查常见文件
        if (self.project_path / 'README.md').exists():
            config['has_readme'] = True

        if (self.project_path / 'LICENSE').exists():
            config['has_license'] = True

        # 检查 CI/CD 配置
        ci_files = ['.github', '.gitlab-ci.yml', '.travis.yml', 'Jenkinsfile', 'azure-pipelines.yml']
        for ci_file in ci_files:
            if (self.project_path / ci_file).exists():
                config['has_ci_cd'] = True
                break

        return config

    def analyze_user_intent(self, user_input: str) -> Dict[str, Any]:
        """
        分析用户输入的意图

        Args:
            user_input: 用户输入的消息

        Returns:
            意图分析结果
        """
        logger.info(f"分析用户意图: {user_input[:100]}...")

        intent = {
            'type': 'unknown',
            'keywords': [],
            'entities': [],
            'action': None,
            'context': None
        }

        # 检测常见意图类型（支持中英文）
        intent_patterns = {
            'create_function': [
                r'创建.*函数', r'写.*函数', r'添加.*函数', r'实现.*函数',
                r'add.*function', r'create.*function', r'implement.*function', r'write.*function'
            ],
            'fix_bug': [
                r'修复.*bug', r'解决.*问题', r'修复.*错误',
                r'fix.*bug', r'solve.*problem', r'repair.*error'
            ],
            'add_feature': [
                r'添加.*功能', r'实现.*功能', r'增加.*功能',
                r'add.*feature', r'implement.*feature', r'增加.*feature'
            ],
            'refactor': [
                r'重构', r'优化.*代码', r'改进.*代码',
                r'refactor', r'optimize.*code', r'improve.*code'
            ],
            'explain': [
                r'解释', r'说明', r'描述',
                r'explain', r'describe', r'illustrate'
            ],
            'test': [
                r'测试', r'写.*测试', r'添加.*测试',
                r'test', r'write.*test', r'add.*test'
            ],
        }

        # 不转换为小写，保持中文匹配
        for intent_type, patterns in intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, user_input, re.IGNORECASE):
                    intent['type'] = intent_type
                    logger.info(f"匹配到意图: {intent_type} (模式: {pattern})")
                    break
            if intent['type'] != 'unknown':
                break

        # 提取关键词（支持中英文）
        # 使用更简单的模式，不依赖 \b 边界
        keywords = []
        keyword_list = ['函数', '功能', '类', '模块', '组件', '接口', 'API', '数据库', '用户', '登录', '注册', '认证', '授权',
                       'function', 'feature', 'class', 'module', 'component', 'interface', 'database', 'user', 'login', 'register', 'auth', 'authorize']
        for kw in keyword_list:
            if kw in user_input:
                keywords.append(kw)
        intent['keywords'] = list(set(keywords))

        # 提取实体（如具体的函数名、类名等）
        # 匹配驼峰命名、下划线命名和中文实体
        entities = re.findall(r'\b([A-Z][a-zA-Z0-9]*|[a-z_][a-z0-9_]*|[\u4e00-\u9fa5]+)\b', user_input)
        # 过滤掉常见词汇
        stop_words = {'的', '我', '你', '他', '她', '它', '是', '在', '有', '不', '了', '着', '过', '和', '与', '或', '但', '而', '因为', '所以', '如果', '那么', 'this', 'that', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now'}
        filtered_entities = [e for e in entities if e.lower() not in stop_words and len(e) > 1]
        intent['entities'] = list(set(filtered_entities))[:5]  # 限制数量

        logger.info(f"意图分析完成: {intent['type']}, 关键词: {intent['keywords']}, 实体: {intent['entities']}")
        return intent

    def find_relevant_code(self, user_input: str, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        根据用户输入和意图查找相关代码

        Args:
            user_input: 用户输入
            intent: 意图分析结果

        Returns:
            相关代码片段
        """
        logger.info("查找相关代码...")

        relevant_code = []

        # 根据关键词查找相关函数
        for keyword in intent.get('keywords', []):
            for func in self.relevant_functions:
                if keyword.lower() in func['name'].lower():
                    relevant_code.append({
                        'type': 'function',
                        'name': func['name'],
                        'file': func['file'],
                        'params': func.get('params', '')
                    })

        # 根据关键词查找相关类
        for keyword in intent.get('keywords', []):
            for cls in self.relevant_classes:
                if keyword.lower() in cls['name'].lower():
                    relevant_code.append({
                        'type': 'class',
                        'name': cls['name'],
                        'file': cls['file']
                    })

        # 根据实体查找
        for entity in intent.get('entities', []):
            for func in self.relevant_functions:
                if entity.lower() in func['name'].lower():
                    relevant_code.append({
                        'type': 'function',
                        'name': func['name'],
                        'file': func['file'],
                        'params': func.get('params', '')
                    })

            for cls in self.relevant_classes:
                if entity.lower() in cls['name'].lower():
                    relevant_code.append({
                        'type': 'class',
                        'name': cls['name'],
                        'file': cls['file']
                    })

        # 去重并限制数量
        seen = set()
        unique_code = []
        for code in relevant_code:
            key = (code['type'], code['name'], code['file'])
            if key not in seen:
                seen.add(key)
                unique_code.append(code)

        logger.info(f"找到 {len(unique_code)} 个相关代码片段")
        return unique_code[:5]  # 最多返回 5 个

    async def optimize_user_message(self, user_input: str, persona: str = "partner", iflow_client=None) -> Dict[str, Any]:
        """
        优化用户输入的消息（使用大模型）

        Args:
            user_input: 用户输入的消息
            persona: AI 人格类型
            iflow_client: iFlow 客户端实例

        Returns:
            优化结果
        """
        logger.info(f"开始智能优化用户消息: {user_input[:100]}...")

        # 1. 分析用户意图
        intent = self.analyze_user_intent(user_input)

        # 2. 查找相关代码
        relevant_code = self.find_relevant_code(user_input, intent)

        # 3. 构建项目上下文
        project_context = self._build_project_context()
        style_guide = self._build_style_guide()

        # 4. 使用大模型优化消息
        if iflow_client:
            optimized_message = await self._optimize_with_llm(
                user_input, intent, relevant_code, project_context, style_guide, iflow_client
            )
        else:
            # 如果没有提供 iFlow 客户端，使用规则优化
            optimized_message = self._build_optimized_message(user_input, intent, relevant_code)

        result = {
            'original_input': user_input,
            'intent': intent,
            'relevant_code': relevant_code,
            'optimized_message': optimized_message,
            'project_context': project_context,
            'code_style_guide': style_guide
        }

        logger.info(f"智能消息优化完成")
        return result

    async def _optimize_with_llm(
        self, user_input: str, intent: Dict[str, Any], relevant_code: List[Dict[str, Any]],
        project_context: str, style_guide: str, iflow_client
    ) -> str:
        """
        使用大模型优化消息

        Args:
            user_input: 原始用户输入
            intent: 意图分析结果
            relevant_code: 相关代码
            project_context: 项目上下文
            style_guide: 代码风格指南
            iflow_client: iFlow 客户端

        Returns:
            优化后的消息
        """
        logger.info("使用大模型优化消息...")

        # 构建优化提示词
        optimization_prompt = f"""你是一个专业的提示词优化专家。请根据以下信息，优化用户的输入消息，使其更具体、更符合项目的实际情况。

## 项目信息
{project_context}

## 代码风格指南
{style_guide}

## 用户意图
- 意图类型: {intent.get('type', 'unknown')}
- 关键词: {', '.join(intent.get('keywords', []))}
- 实体: {', '.join(intent.get('entities', []))}

## 相关代码
"""
        if relevant_code:
            for code in relevant_code:
                if code['type'] == 'function':
                    optimization_prompt += f"- 函数: {code['name']} (在 {code['file']})"
                else:
                    optimization_prompt += f"- 类: {code['name']} (在 {code['file']})"
        else:
            optimization_prompt += "- 无相关代码"

        optimization_prompt += f"""

## 用户原始输入
{user_input}

## 任务
请优化用户的输入消息，使其：
1. 包含项目背景信息
2. 引用相关的代码（如果有）
3. 明确代码风格要求
4. 根据意图类型添加具体要求
5. 让 AI 能够更好地理解项目上下文并提供准确的解决方案

请直接输出优化后的消息，不要包含任何解释或额外文字。"""

        try:
            # 调用大模型
            optimized_message = ""
            async for chunk in iflow_client.chat_stream(optimization_prompt):
                optimized_message += chunk

            logger.info(f"大模型优化完成，消息长度: {len(optimized_message)}")
            return optimized_message.strip()

        except Exception as e:
            logger.error(f"大模型优化失败: {e}")
            # 降级到规则优化
            return self._build_optimized_message(user_input, intent, relevant_code)

    def _build_optimized_message(self, user_input: str, intent: Dict[str, Any], relevant_code: List[Dict[str, Any]]) -> str:
        """
        构建优化后的消息

        Args:
            user_input: 原始用户输入
            intent: 意图分析结果
            relevant_code: 相关代码

        Returns:
            优化后的消息
        """
        message_parts = []

        # 添加项目背景信息
        message_parts.append(f"我正在为这个项目工作：")
        message_parts.append(f"- 项目名称：{self.project_info.get('name', 'Unknown')}")

        if self.tech_stack:
            message_parts.append(f"- 技术栈：{', '.join(self.tech_stack)}")

        if self.architecture_patterns:
            message_parts.append(f"- 架构模式：{', '.join(self.architecture_patterns)}")

        message_parts.append("")

        # 添加代码风格要求
        if self.code_style.get('python'):
            py_style = self.code_style['python']
            style_requirements = []

            if py_style.get('type_hints'):
                style_requirements.append("使用类型提示")

            if py_style.get('docstring_style') != 'unknown':
                style_requirements.append(f"使用 {py_style['docstring_style']} 文档字符串")

            if py_style.get('quote_style') != 'unknown':
                style_requirements.append(f"使用 {py_style['quote_style']} 引号")

            if style_requirements:
                message_parts.append(f"代码风格要求：{', '.join(style_requirements)}")
                message_parts.append("")

        # 添加相关代码引用
        if relevant_code:
            message_parts.append("项目中相关的代码：")
            for code in relevant_code:
                if code['type'] == 'function':
                    message_parts.append(f"- 函数：{code['name']} (在 {code['file']})")
                    if code.get('params'):
                        message_parts.append(f"  参数：{code['params']}")
                else:
                    message_parts.append(f"- 类：{code['name']} (在 {code['file']})")
            message_parts.append("")

        # 添加原始请求
        message_parts.append(f"我的需求是：{user_input}")

        # 添加具体要求
        message_parts.append("")
        message_parts.append("请：")

        # 根据意图添加具体要求
        if intent['type'] == 'create_function':
            message_parts.append("1. 按照项目的代码风格创建函数")
            message_parts.append("2. 添加适当的类型提示和文档字符串")
            message_parts.append("3. 考虑与现有代码的集成")
            message_parts.append("4. 如果有相关的函数或类，请引用它们")
        elif intent['type'] == 'fix_bug':
            message_parts.append("1. 分析问题并提供解决方案")
            message_parts.append("2. 遵循项目的代码风格")
            message_parts.append("3. 确保修复不会引入新的问题")
        elif intent['type'] == 'add_feature':
            message_parts.append("1. 按照项目的架构模式实现功能")
            message_parts.append("2. 保持代码风格一致")
            message_parts.append("3. 考虑与现有功能的集成")
        else:
            message_parts.append("1. 根据项目的实际情况提供解决方案")
            message_parts.append("2. 遵循项目的代码风格和架构模式")
            message_parts.append("3. 考虑与现有代码的集成")

        return '\n'.join(message_parts)

    def _build_project_context(self) -> str:
        """构建项目上下文"""
        context_parts = []

        # 项目信息
        context_parts.append(f"## PROJECT CONTEXT")
        context_parts.append(f"Project Name: {self.project_info.get('name', 'Unknown')}")

        # 技术栈
        if self.tech_stack:
            context_parts.append(f"\nTech Stack: {', '.join(self.tech_stack)}")

        # 架构模式
        if self.architecture_patterns:
            context_parts.append(f"Architecture Patterns: {', '.join(self.architecture_patterns)}")

        # 项目特征
        features = []
        if self.project_info.get('has_git'):
            features.append("Git version control")
        if self.project_info.get('has_ci_cd'):
            features.append("CI/CD pipeline")

        if features:
            context_parts.append(f"Project Features: {', '.join(features)}")

        return '\n'.join(context_parts)

    def _build_style_guide(self) -> str:
        """构建代码风格指南"""
        guide_parts = []

        guide_parts.append("\n## CODE STYLE GUIDE")

        # TypeScript/JavaScript 风格
        if self.code_style.get('typescript'):
            ts_style = self.code_style['typescript']
            guide_parts.append("\n### TypeScript/JavaScript Style:")

            if ts_style.get('interface_vs_type') != 'unknown':
                guide_parts.append(f"- Prefer {ts_style['interface_vs_type']} over type")

            if ts_style.get('quote_style') != 'unknown':
                guide_parts.append(f"- Use {ts_style['quote_style']} quotes")

            if ts_style.get('semicolon_usage') != 'unknown':
                guide_parts.append(f"- Semicolons: {ts_style['semicolon_usage']}")

            if ts_style.get('const_vs_let') != 'unknown':
                guide_parts.append(f"- Variable declaration: {ts_style['const_vs_let']}")

        # Python 风格
        if self.code_style.get('python'):
            py_style = self.code_style['python']
            guide_parts.append("\n### Python Style:")

            if py_style.get('quote_style') != 'unknown':
                guide_parts.append(f"- Use {py_style['quote_style']} quotes")

            if py_style.get('type_hints'):
                guide_parts.append("- Include type hints")

            if py_style.get('docstring_style') != 'unknown':
                guide_parts.append(f"- Use {py_style['docstring_style']} for docstrings")

        # 通用风格
        if self.code_style.get('general'):
            general_style = self.code_style['general']
            guide_parts.append("\n### General Style:")

            if general_style.get('indentation') != 'unknown':
                guide_parts.append(f"- Indentation: {general_style['indentation']}")

        return '\n'.join(guide_parts)


# 创建全局实例
_prompt_optimizer_cache = {}


def get_prompt_optimizer(project_path: str) -> PromptOptimizer:
    """
    获取提示词优化器实例（带缓存）

    Args:
        project_path: 项目路径

    Returns:
        PromptOptimizer 实例
    """
    if project_path not in _prompt_optimizer_cache:
        _prompt_optimizer_cache[project_path] = PromptOptimizer(project_path)
    return _prompt_optimizer_cache[project_path]
