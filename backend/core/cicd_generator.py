"""
CI/CD 配置生成器
支持 GitHub Actions、GitLab CI 等主流 CI/CD 平台
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

logger = logging.getLogger("CICDGenerator")


class CICDGenerator:
    """CI/CD 配置生成器"""
    
    def __init__(self):
        self.platforms = {
            'github': self._generate_github_actions,
            'gitlab': self._generate_gitlab_ci,
            'jenkins': self._generate_jenkinsfile
        }
    
    def generate(
        self,
        platform: str,
        project_type: str,
        project_name: str,
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        生成 CI/CD 配置
        
        Args:
            platform: CI/CD 平台 (github, gitlab, jenkins)
            project_type: 项目类型 (react, vue, python, node, etc.)
            project_name: 项目名称
            config: 自定义配置
        
        Returns:
            生成结果
        """
        if platform not in self.platforms:
            return {
                "success": False,
                "error": f"不支持的平台: {platform}"
            }
        
        try:
            generator = self.platforms[platform]
            result = generator(project_type, project_name, config or {})
            
            logger.info(f"成功生成 {platform} CI/CD 配置")
            return {
                "success": True,
                "platform": platform,
                "files": result
            }
        except Exception as e:
            logger.error(f"生成 CI/CD 配置失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _generate_github_actions(
        self,
        project_type: str,
        project_name: str,
        config: Dict[str, Any]
    ) -> Dict[str, str]:
        """生成 GitHub Actions 配置"""
        
        # Node.js 项目配置
        if project_type in ['react', 'vue', 'node']:
            workflow = f"""name: {project_name} CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{{{ matrix.node-version }}}}
      uses: actions/setup-node@v3
      with:
        node-version: ${{{{ matrix.node-version }}}}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build
        path: dist/
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy to production
      run: |
        # 添加你的部署命令
        echo "部署到生产环境"
"""
        
        # Python 项目配置
        elif project_type == 'python':
            workflow = f"""name: {project_name} CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python ${{{{ matrix.python-version }}}}
      uses: actions/setup-python@v4
      with:
        python-version: ${{{{ matrix.python-version }}}}
        cache: 'pip'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: |
        pytest --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Deploy to production
      run: |
        # 添加你的部署命令
        echo "部署到生产环境"
"""
        
        else:
            workflow = f"""name: {project_name} CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build
      run: |
        # 添加构建命令
        echo "构建项目"
    
    - name: Test
      run: |
        # 添加测试命令
        echo "运行测试"
"""
        
        return {
            '.github/workflows/ci.yml': workflow
        }
    
    def _generate_gitlab_ci(
        self,
        project_type: str,
        project_name: str,
        config: Dict[str, Any]
    ) -> Dict[str, str]:
        """生成 GitLab CI 配置"""
        
        # Node.js 项目配置
        if project_type in ['react', 'vue', 'node']:
            gitlab_ci = f"""stages:
  - test
  - build
  - deploy

variables:
  NODE_ENV: test

test:
  stage: test
  image: node:18
  
  before_script:
    - npm ci
  
  script:
    - npm test
    - npm run build
  
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  
  coverage: '/All files[^|]*\\|[^|]*\\s+([\\d\\.]+)/'
  
  only:
    - branches
    - merge_requests

build:
  stage: build
  image: node:18
  
  before_script:
    - npm ci
  
  script:
    - npm run build
  
  artifacts:
    paths:
      - dist/
  
  only:
    - main
    - develop

deploy_production:
  stage: deploy
  image: node:18
  
  before_script:
    - npm ci
  
  script:
    - npm run build
    # 添加部署命令
    - echo "部署到生产环境"
  
  environment:
    name: production
    url: https://{project_name.lower()}.example.com
  
  only:
    - main
  
  when: manual
"""
        
        # Python 项目配置
        elif project_type == 'python':
            gitlab_ci = f"""stages:
  - test
  - deploy

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

test:
  stage: test
  image: python:3.10
  
  before_script:
    - python -m pip install --upgrade pip
    - pip install -r requirements.txt
    - pip install pytest pytest-cov
  
  script:
    - pytest --cov=. --cov-report=xml --cov-report=html
  
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
    paths:
      - htmlcov/
    expire_in: 1 week
  
  only:
    - branches
    - merge_requests

deploy_production:
  stage: deploy
  image: python:3.10
  
  before_script:
    - python -m pip install --upgrade pip
    - pip install -r requirements.txt
  
  script:
    # 添加部署命令
    - echo "部署到生产环境"
  
  environment:
    name: production
    url: https://{project_name.lower()}.example.com
  
  only:
    - main
  
  when: manual
"""
        
        else:
            gitlab_ci = f"""stages:
  - test
  - deploy

test:
  stage: test
  script:
    - echo "运行测试"
  
  only:
    - branches

deploy:
  stage: deploy
  script:
    - echo "部署到生产环境"
  
  only:
    - main
"""
        
        return {
            '.gitlab-ci.yml': gitlab_ci
        }
    
    def _generate_jenkinsfile(
        self,
        project_type: str,
        project_name: str,
        config: Dict[str, Any]
    ) -> Dict[str, str]:
        """生成 Jenkinsfile"""
        
        # Node.js 项目配置
        if project_type in ['react', 'vue', 'node']:
            jenkinsfile = f"""pipeline {{
    agent any
    
    environment {{
        NODE_VERSION = '18.x'
        PROJECT_NAME = '{project_name}'
    }}
    
    stages {{
        stage('Checkout') {{
            steps {{
                checkout scm
            }}
        }}
        
        stage('Install') {{
            steps {{
                sh 'npm ci'
            }}
        }}
        
        stage('Test') {{
            steps {{
                sh 'npm test'
            }}
        }}
        
        stage('Build') {{
            steps {{
                sh 'npm run build'
            }}
        }}
        
        stage('Deploy') {{
            when {{
                branch 'main'
            }}
            steps {{
                echo '部署到生产环境'
                // 添加部署命令
            }}
        }}
    }}
    
    post {{
        always {{
            cleanWs()
        }}
    }}
}}
"""
        
        # Python 项目配置
        elif project_type == 'python':
            jenkinsfile = f"""pipeline {{
    agent any
    
    environment {{
        PYTHON_VERSION = '3.10'
        PROJECT_NAME = '{project_name}'
    }}
    
    stages {{
        stage('Checkout') {{
            steps {{
                checkout scm
            }}
        }}
        
        stage('Setup') {{
            steps {{
                sh '''
                    python -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                '''
            }}
        }}
        
        stage('Test') {{
            steps {{
                sh '''
                    . venv/bin/activate
                    pytest --cov=. --cov-report=xml
                '''
            }}
        }}
        
        stage('Deploy') {{
            when {{
                branch 'main'
            }}
            steps {{
                echo '部署到生产环境'
                // 添加部署命令
            }}
        }}
    }}
    
    post {{
        always {{
            cleanWs()
        }}
    }}
}}
"""
        
        else:
            jenkinsfile = f"""pipeline {{
    agent any
    
    stages {{
        stage('Build') {{
            steps {{
                echo '构建项目'
            }}
        }}
        
        stage('Test') {{
            steps {{
                echo '运行测试'
            }}
        }}
        
        stage('Deploy') {{
            steps {{
                echo '部署到生产环境'
            }}
        }}
    }}
}}
"""
        
        return {
            'Jenkinsfile': jenkinsfile
        }


# 创建单例
cicd_generator = CICDGenerator()


def generate_cicd_config(
    platform: str,
    project_type: str,
    project_name: str,
    config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    生成 CI/CD 配置
    
    Args:
        platform: CI/CD 平台 (github, gitlab, jenkins)
        project_type: 项目类型 (react, vue, python, node, etc.)
        project_name: 项目名称
        config: 自定义配置
    
    Returns:
        生成结果
    """
    return cicd_generator.generate(platform, project_type, project_name, config)


def get_supported_platforms() -> List[str]:
    """获取支持的 CI/CD 平台列表"""
    return list(cicd_generator.platforms.keys())


def get_supported_project_types() -> List[str]:
    """获取支持的项目类型列表"""
    return ['react', 'vue', 'python', 'node', 'go', 'rust', 'java']