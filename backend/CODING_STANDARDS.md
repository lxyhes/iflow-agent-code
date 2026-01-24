# 后端代码规范

## 📌 Python 版本
- Python 3.10+

## 🎨 代码风格

### 格式化
- 使用 **Black** 进行代码格式化
- 行长度：100 字符
- 目标版本：Python 3.10

```bash
# 格式化代码
black backend/

# 检查格式
black --check backend/
```

### 导入排序
- 使用 **isort** 进行导入排序
- 配置文件：`pyproject.toml`

```bash
# 排序导入
isort backend/

# 检查导入
isort --check-only backend/
```

### 代码质量检查
- 使用 **Pylint** 进行代码质量检查
- 已禁用规则：
  - `C0111` - missing-docstring（允许缺少文档字符串）
  - `R0913` - too-many-arguments（允许较多参数）
  - `C0103` - invalid-name（允许短变量名）
  - `W0613` - unused-argument（允许未使用参数）
  - `R0903` - too-few-public-methods（允许较少方法）

```bash
# 检查代码质量
pylint backend/core/
```

### 类型检查
- 使用 **MyPy** 进行类型检查
- 当前模式：宽松模式（`disallow_untyped_defs: false`）
- 目标：逐步完善类型注解覆盖率

```bash
# 类型检查
mypy backend/core/
```

## 📝 类型注解规范

### 必须添加类型注解的场景
1. 所有公共函数和类方法
2. 所有 API 端点参数和返回值
3. 所有 Pydantic 模型
4. 所有异步函数

### 类型注解示例
```python
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

# 函数类型注解
def process_data(data: Dict[str, Any]) -> Optional[List[str]]:
    """处理数据并返回结果列表"""
    if not data:
        return None
    return list(data.keys())

# 异步函数类型注解
async def fetch_user(user_id: int) -> Dict[str, Any]:
    """异步获取用户信息"""
    return {"id": user_id, "name": "Test User"}

# 类方法类型注解
class UserService:
    def __init__(self, db: Any):
        self.db = db

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """获取用户信息"""
        return self.db.query(user_id)

# Pydantic 模型
class UserCreate(BaseModel):
    name: str
    email: str
    age: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "age": 30
            }
        }
```

## 🚨 异常处理规范

### 使用自定义异常
所有异常必须使用 `backend/core/exceptions.py` 中定义的自定义异常类：

```python
from backend.core.exceptions import (
    ValidationError,
    NotFoundError,
    PermissionError,
    ExternalServiceError
)

# 抛出异常
def get_user(user_id: int) -> Dict[str, Any]:
    user = db.query(user_id)
    if not user:
        raise NotFoundError(f"User {user_id} not found")
    return user
```

### 异常处理最佳实践
```python
import logging

logger = logging.getLogger(__name__)

def process_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """处理数据"""
    try:
        result = do_something(data)
        return result
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise ExternalServiceError("Failed to process data") from e
```

### 避免捕获宽泛异常
❌ 不推荐：
```python
try:
    do_something()
except Exception:
    pass
```

✅ 推荐：
```python
try:
    do_something()
except (ValueError, KeyError) as e:
    logger.error(f"Specific error: {e}")
    raise
```

## 📊 日志规范

### 日志级别
- **DEBUG**：详细的调试信息（开发环境）
- **INFO**：一般信息（生产环境默认）
- **WARNING**：警告信息（需要注意但不影响运行）
- **ERROR**：错误信息（需要立即处理）
- **CRITICAL**：严重错误（系统无法继续运行）

### 日志格式
使用结构化日志（JSON 格式）：

```python
import logging
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# 记录日志
logger.info("Processing request", extra={
    "user_id": 123,
    "request_id": "abc-123",
    "action": "process_data"
})

logger.error("Failed to process data", extra={
    "error": str(error),
    "user_id": 123,
    "stack_trace": traceback.format_exc()
})
```

### 日志最佳实践
```python
# ✅ 推荐：使用结构化日志
logger.info("User logged in", extra={
    "user_id": user.id,
    "ip_address": request.client.host,
    "timestamp": datetime.now().isoformat()
})

# ✅ 推荐：记录关键操作
logger.info("File uploaded", extra={
    "file_name": file.filename,
    "file_size": len(file.content),
    "user_id": user.id
})

# ❌ 不推荐：使用字符串拼接
logger.info(f"User {user.id} logged in from {request.client.host}")
```

## 🔒 安全规范

### 文件操作安全
所有文件系统操作必须通过 `PathValidator` 验证：

```python
from backend.core.path_validator import PathValidator

path_validator = PathValidator()

# ✅ 推荐：使用 PathValidator
safe_path = path_validator.validate_path(user_input_path)
content = read_file(safe_path)

# ❌ 不推荐：直接使用用户输入
content = read_file(user_input_path)  # 危险！可能导致路径遍历攻击
```

### 敏感信息管理
- ❌ 不得硬编码敏感信息（密码、API 密钥等）
- ✅ 使用环境变量管理配置
- ✅ 使用 `.env` 文件（不提交到 Git）

```python
# ✅ 推荐：使用环境变量
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# ❌ 不推荐：硬编码敏感信息
API_KEY = "sk-1234567890abcdef"  # 危险！
```

### 输入验证
所有用户输入必须验证：

```python
from pydantic import BaseModel, validator

class CreateUserRequest(BaseModel):
    name: str
    email: str
    age: int

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('name cannot be empty')
        return v.strip()

    @validator('email')
    def email_must_be_valid(cls, v):
        if '@' not in v:
            raise ValueError('email must be valid')
        return v

    @validator('age')
    def age_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('age must be positive')
        return v
```

## 🧪 测试规范

### 测试文件命名
- 测试文件：`test_*.py` 或 `*_test.py`
- 测试类：`Test*`
- 测试函数：`test_*`

### 测试结构
```python
import pytest
from backend.core.service import Service

class TestService:
    """Service 测试类"""

    @pytest.fixture
    def service(self):
        """创建 Service 实例"""
        return Service()

    @pytest.fixture
    def sample_data(self):
        """创建测试数据"""
        return {"key": "value"}

    def test_method_success(self, service, sample_data):
        """测试方法成功场景"""
        result = service.method(sample_data)
        assert result is not None
        assert "key" in result

    @pytest.mark.parametrize("input,expected", [
        (1, 2),
        (2, 4),
        (3, 6),
    ])
    def test_method_parameterized(self, service, input, expected):
        """测试方法参数化场景"""
        result = service.method(input)
        assert result == expected

    def test_method_exception(self, service):
        """测试方法异常场景"""
        with pytest.raises(ValueError):
            service.method(invalid_input)

    @pytest.mark.asyncio
    async def test_async_method(self, service):
        """测试异步方法"""
        result = await service.async_method()
        assert result is not None
```

### 测试覆盖率目标
- 核心服务：≥ 80%
- API 端点：≥ 70%
- 工具函数：≥ 90%

## 📦 模块组织规范

### 导入顺序
```python
# 1. 标准库导入
import os
import sys
from typing import Optional, List

# 2. 第三方库导入
import pytest
from fastapi import FastAPI
from pydantic import BaseModel

# 3. 本地导入
from backend.core.service import Service
from backend.core.exceptions import NotFoundError

# 4. 相对导入
from .utils import helper_function
```

### 模块文档字符串
```python
"""
用户服务模块

提供用户相关的功能，包括：
- 用户创建
- 用户查询
- 用户更新
- 用户删除

Example:
    >>> service = UserService()
    >>> user = service.create_user(name="John", email="john@example.com")
    >>> print(user.id)
    123
"""

class UserService:
    """用户服务类"""

    def create_user(self, name: str, email: str) -> Dict[str, Any]:
        """创建新用户

        Args:
            name: 用户名
            email: 用户邮箱

        Returns:
            创建的用户信息字典

        Raises:
            ValidationError: 输入验证失败
            DatabaseError: 数据库操作失败

        Example:
            >>> service = UserService()
            >>> user = service.create_user("John", "john@example.com")
            >>> print(user["name"])
            John
        """
        pass
```

## 🔧 开发工具

### Pre-commit 钩子
```bash
# 安装 pre-commit
pip install pre-commit

# 安装钩子
pre-commit install

# 手动运行所有钩子
pre-commit run --all-files
```

### 代码检查命令
```bash
# 格式化代码
black backend/
isort backend/

# 检查代码质量
pylint backend/core/
mypy backend/core/
flake8 backend/

# 运行测试
pytest backend/tests/ -v
pytest backend/tests/ --cov=backend --cov-report=html
```

## 📚 参考资料

- [PEP 8 - Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [Black - The Uncompromising Code Formatter](https://black.readthedocs.io/)
- [isort - Python import sorter](https://pycqa.github.io/isort/)
- [Pylint - Python code analysis](https://pylint.org/)
- [MyPy - Static Type Checker](https://mypy.readthedocs.io/)
- [Pytest - Testing Framework](https://docs.pytest.org/)

---

**创建时间**：2026-01-23
**维护者**：iFlow Agent Team
**版本**：1.0.0