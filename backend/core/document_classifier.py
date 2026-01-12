"""
智能文档分类器
自动为文档添加分类标签
"""

import os
import re
import logging
from typing import Dict, List, Optional, Set
from pathlib import Path

logger = logging.getLogger("DocumentClassifier")


class DocumentClassifier:
    """文档分类器"""
    
    # 文件类型分类
    FILE_TYPE_CATEGORIES = {
        'code': ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.dart'],
        'config': ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.xml', '.properties', '.env'],
        'document': ['.md', '.txt', '.rst', '.adoc', '.tex', '.doc', '.docx', '.pdf'],
        'style': ['.css', '.scss', '.sass', '.less', '.styl'],
        'template': ['.html', '.htm', '.vue', '.svelte', '.jsx', '.tsx'],
        'data': ['.csv', '.tsv', '.sql', '.db', '.sqlite', '.json'],
        'image': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
        'font': ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
        'media': ['.mp3', '.mp4', '.avi', '.mov', '.wav', '.ogg', '.webm'],
        'archive': ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2'],
        'build': ['.gradle', '.pom', '.package.json', 'yarn.lock', 'package-lock.json', 'Gemfile', 'Cargo.toml', 'go.mod', 'requirements.txt', 'setup.py', 'pyproject.toml'],
        'test': ['test_', '_test.', '.test.', '.spec.'],
        'git': ['.gitignore', '.gitattributes', '.gitmodules'],
    }
    
    # 编程语言映射
    LANGUAGE_MAP = {
        '.py': 'Python',
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.jsx': 'JavaScript (React)',
        '.tsx': 'TypeScript (React)',
        '.vue': 'Vue',
        '.svelte': 'Svelte',
        '.java': 'Java',
        '.go': 'Go',
        '.rs': 'Rust',
        '.c': 'C',
        '.cpp': 'C++',
        '.cs': 'C#',
        '.php': 'PHP',
        '.rb': 'Ruby',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
        '.scala': 'Scala',
        '.dart': 'Dart',
        '.sql': 'SQL',
        '.sh': 'Shell',
        '.bash': 'Bash',
        '.ps1': 'PowerShell',
        '.r': 'R',
        '.m': 'MATLAB',
        '.lua': 'Lua',
        '.pl': 'Perl',
    }
    
    # 目录分类
    DIRECTORY_CATEGORIES = {
        'src': 'source',
        'lib': 'library',
        'test': 'test',
        'tests': 'test',
        'spec': 'test',
        'docs': 'documentation',
        'doc': 'documentation',
        'examples': 'example',
        'example': 'example',
        'demo': 'demo',
        'assets': 'asset',
        'static': 'static',
        'public': 'public',
        'dist': 'distribution',
        'build': 'build',
        'target': 'build',
        'bin': 'binary',
        'obj': 'object',
        'out': 'output',
        'node_modules': 'dependency',
        'venv': 'virtual_environment',
        '.venv': 'virtual_environment',
        'env': 'virtual_environment',
        '__pycache__': 'cache',
        '.git': 'version_control',
        '.idea': 'ide_config',
        '.vscode': 'ide_config',
        'config': 'configuration',
        'configs': 'configuration',
        'scripts': 'script',
        'utils': 'utility',
        'helper': 'helper',
        'common': 'common',
        'shared': 'shared',
        'components': 'component',
        'pages': 'page',
        'views': 'view',
        'controllers': 'controller',
        'models': 'model',
        'services': 'service',
        'api': 'api',
        'styles': 'style',
        'stylesheets': 'style',
        'images': 'image',
        'img': 'image',
        'icons': 'icon',
        'fonts': 'font',
    }
    
    def __init__(self):
        """初始化文档分类器"""
        self.custom_rules = {}
    
    def classify_file(self, file_path: str, content: str = None) -> Dict[str, any]:
        """
        分类文档
        
        Args:
            file_path: 文件路径
            content: 文件内容（可选）
        
        Returns:
            分类信息字典
        """
        try:
            # 获取文件信息
            filename = os.path.basename(file_path)
            ext = os.path.splitext(filename)[1].lower()
            dirname = os.path.dirname(file_path)
            
            # 分类结果
            categories = set()
            tags = set()
            language = None
            purpose = None
            
            # 1. 根据文件扩展名分类
            for category, extensions in self.FILE_TYPE_CATEGORIES.items():
                if ext in extensions:
                    categories.add(category)
                    break
            
            # 2. 特殊文件名匹配
            if filename.startswith('test_') or filename.endswith('_test.py') or filename.endswith('.test.ts') or filename.endswith('.spec.ts'):
                categories.add('test')
                tags.add('unit_test')
            
            if filename.startswith('__'):
                categories.add('internal')
                tags.add('python_magic')
            
            if filename == 'package.json':
                categories.add('config')
                categories.add('build')
                language = 'JavaScript'
            
            if filename == 'requirements.txt':
                categories.add('config')
                categories.add('build')
                language = 'Python'
            
            if filename == 'Dockerfile':
                categories.add('config')
                tags.add('docker')
            
            if filename == 'docker-compose.yml' or filename == 'docker-compose.yaml':
                categories.add('config')
                tags.add('docker')
            
            # 3. 根据目录分类
            for dir_name in dirname.split(os.sep):
                dir_lower = dir_name.lower()
                if dir_lower in self.DIRECTORY_CATEGORIES:
                    categories.add(self.DIRECTORY_CATEGORIES[dir_lower])
            
            # 4. 确定编程语言
            language = self.LANGUAGE_MAP.get(ext, language)
            
            # 5. 根据内容分析（如果提供）
            if content:
                content_categories = self._classify_by_content(content, ext)
                categories.update(content_categories)
                
                # 检测特殊模式
                if '@test' in content or 'describe(' in content or 'it(' in content:
                    tags.add('unit_test')
                
                if 'import React' in content or 'from react' in content:
                    tags.add('react')
                
                if 'export default' in content or 'module.exports' in content:
                    tags.add('module')
                
                if 'class ' in content and ext in ['.py', '.js', '.ts', '.java', '.go']:
                    tags.add('class')
                
                if 'def ' in content or 'function ' in content:
                    tags.add('function')
            
            # 6. 确定文件用途
            purpose = self._determine_purpose(categories, tags, dirname)
            
            # 7. 添加通用标签
            if os.path.getsize(file_path) < 1024:
                tags.add('small_file')
            elif os.path.getsize(file_path) > 1024 * 1024:
                tags.add('large_file')
            
            return {
                'categories': sorted(list(categories)),
                'tags': sorted(list(tags)),
                'language': language,
                'purpose': purpose,
                'file_type': ext,
                'filename': filename,
                'directory': dirname
            }
            
        except Exception as e:
            logger.error(f"分类文档失败: {e}")
            return {
                'categories': ['unknown'],
                'tags': [],
                'language': None,
                'purpose': None,
                'file_type': os.path.splitext(file_path)[1],
                'filename': os.path.basename(file_path),
                'directory': os.path.dirname(file_path)
            }
    
    def _classify_by_content(self, content: str, ext: str) -> Set[str]:
        """根据内容分类"""
        categories = set()
        
        # 检测注释比例
        lines = content.splitlines()
        comment_lines = sum(1 for line in lines if line.strip().startswith('#') or line.strip().startswith('//') or line.strip().startswith('/*'))
        if len(lines) > 0 and comment_lines / len(lines) > 0.3:
            categories.add('documentation')
        
        # 检测配置内容
        if '=' in content and ('key' in content.lower() or 'value' in content.lower()):
            categories.add('configuration')
        
        # 检测数据内容
        if ext in ['.json', '.yaml', '.yml'] and content:
            categories.add('data')
        
        # 检测测试内容
        test_keywords = ['assert', 'expect', 'should', 'test', 'describe', 'it(', 'beforeEach', 'afterEach']
        if any(keyword in content for keyword in test_keywords):
            categories.add('test')
        
        # 检测 API 定义
        api_keywords = ['@app.route', '@api', 'router.', 'app.get', 'app.post', 'exports.', 'def api_']
        if any(keyword in content for keyword in api_keywords):
            categories.add('api')
        
        return categories
    
    def _determine_purpose(self, categories: Set[str], tags: Set[str], dirname: str) -> Optional[str]:
        """确定文件用途"""
        # 根据分类和标签推断用途
        if 'test' in categories:
            return 'testing'
        elif 'api' in categories:
            return 'api_endpoint'
        elif 'component' in categories:
            return 'ui_component'
        elif 'page' in categories:
            return 'page'
        elif 'config' in categories:
            return 'configuration'
        elif 'documentation' in categories:
            return 'documentation'
        elif 'build' in categories:
            return 'build_configuration'
        elif 'source' in categories:
            return 'source_code'
        elif 'library' in categories:
            return 'library_code'
        elif 'utility' in categories or 'helper' in categories:
            return 'utility_function'
        elif 'service' in categories:
            return 'business_logic'
        elif 'model' in categories:
            return 'data_model'
        elif 'controller' in categories:
            return 'request_handler'
        elif 'script' in categories:
            return 'automation_script'
        elif 'static' in categories:
            return 'static_resource'
        elif 'asset' in categories:
            return 'asset'
        elif 'image' in categories:
            return 'image_resource'
        elif 'style' in categories:
            return 'stylesheet'
        elif 'template' in categories:
            return 'ui_template'
        else:
            return None
    
    def add_custom_rule(self, pattern: str, category: str, tags: List[str] = None):
        """
        添加自定义分类规则
        
        Args:
            pattern: 文件名模式（支持通配符）
            category: 分类名称
            tags: 标签列表
        """
        self.custom_rules[pattern] = {
            'category': category,
            'tags': tags or []
        }
    
    def batch_classify(self, file_paths: List[str]) -> Dict[str, Dict]:
        """
        批量分类文件
        
        Args:
            file_paths: 文件路径列表
        
        Returns:
            分类结果字典 {file_path: classification}
        """
        results = {}
        for file_path in file_paths:
            try:
                classification = self.classify_file(file_path)
                results[file_path] = classification
            except Exception as e:
                logger.error(f"分类文件失败 {file_path}: {e}")
                results[file_path] = {
                    'categories': ['error'],
                    'error': str(e)
                }
        return results


# 全局分类器实例
_classifier = None


def get_classifier() -> DocumentClassifier:
    """获取文档分类器实例"""
    global _classifier
    if _classifier is None:
        _classifier = DocumentClassifier()
    return _classifier