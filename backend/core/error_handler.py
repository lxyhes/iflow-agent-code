"""
统一错误处理模块

提供标准化的错误处理和响应格式
"""
import logging
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException, status

logger = logging.getLogger("ErrorHandler")


class AppError(Exception):
    """应用基础异常类"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or f"ERROR_{status_code}"
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(AppError):
    """验证错误"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            details=details
        )


class NotFoundError(AppError):
    """资源未找到错误"""

    def __init__(self, message: str, resource_type: Optional[str] = None):
        details = {"resource_type": resource_type} if resource_type else {}
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details=details
        )


class UnauthorizedError(AppError):
    """未授权错误"""

    def __init__(self, message: str = "未授权访问"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED"
        )


class ForbiddenError(AppError):
    """禁止访问错误"""

    def __init__(self, message: str = "禁止访问此资源"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN"
        )


class ConflictError(AppError):
    """冲突错误"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            details=details
        )


class InternalError(AppError):
    """内部服务器错误"""

    def __init__(self, message: str = "内部服务器错误", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR",
            details=details
        )


def handle_error(error: Exception) -> Tuple[int, Dict[str, Any]]:
    """
    统一错误处理函数

    Args:
        error: 异常对象

    Returns:
        (status_code, response_dict): HTTP 状态码和响应字典
    """
    # 如果是 AppError，直接使用其信息
    if isinstance(error, AppError):
        logger.error(f"AppError: {error.error_code} - {error.message}", extra=error.details)
        return error.status_code, {
            "success": False,
            "error": error.message,
            "error_code": error.error_code,
            "details": error.details
        }

    # 如果是 HTTPException，直接使用其信息
    if isinstance(error, HTTPException):
        logger.error(f"HTTPException: {error.status_code} - {error.detail}")
        return error.status_code, {
            "success": False,
            "error": error.detail,
            "error_code": f"HTTP_{error.status_code}"
        }

    # 其他未知错误，记录详细信息
    logger.exception(f"Unhandled error: {type(error).__name__} - {str(error)}")
    return status.HTTP_500_INTERNAL_SERVER_ERROR, {
        "success": False,
        "error": "内部服务器错误",
        "error_code": "INTERNAL_ERROR",
        "details": {
            "error_type": type(error).__name__,
            "message": str(error)
        }
    }


def create_error_response(error: Exception) -> Dict[str, Any]:
    """
    创建标准错误响应

    Args:
        error: 异常对象

    Returns:
        标准错误响应字典
    """
    _, response_dict = handle_error(error)
    return response_dict


def raise_error(error: AppError):
    """
    抛出 AppError 异常

    Args:
        error: AppError 异常对象

    Raises:
        AppError: 总是抛出传入的异常
    """
    raise error


# 常用错误快捷函数
def bad_request(message: str, details: Optional[Dict[str, Any]] = None) -> AppError:
    """创建 400 错误"""
    return ValidationError(message, details)


def not_found(message: str, resource_type: Optional[str] = None) -> AppError:
    """创建 404 错误"""
    return NotFoundError(message, resource_type)


def unauthorized(message: str = "未授权访问") -> AppError:
    """创建 401 错误"""
    return UnauthorizedError(message)


def forbidden(message: str = "禁止访问此资源") -> AppError:
    """创建 403 错误"""
    return ForbiddenError(message)


def conflict(message: str, details: Optional[Dict[str, Any]] = None) -> AppError:
    """创建 409 错误"""
    return ConflictError(message, details)


def internal_error(message: str = "内部服务器错误", details: Optional[Dict[str, Any]] = None) -> AppError:
    """创建 500 错误"""
    return InternalError(message, details)