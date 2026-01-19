import os
import jwt
import logging
import secrets
from fastapi import Header, HTTPException, status, Depends

logger = logging.getLogger("AuthDependencies")

# JWT Secret 配置 - 从环境变量读取
# 生产环境必须设置强密码，否则会发出警告
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    if os.getenv("PYTHON_ENV") == "production":
        raise ValueError(
            "JWT_SECRET 环境变量未设置！生产环境必须设置强密码。"
            "请在 .env 文件中设置 JWT_SECRET，或使用以下命令生成："
            "python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        )
    else:
        # 开发环境使用默认密钥，但发出警告
        JWT_SECRET = "claude-ui-dev-secret-change-in-production"
        logger.warning(
            "使用默认 JWT Secret（仅用于开发环境）。"
            "生产环境请设置 JWT_SECRET 环境变量。"
        )

# 验证 JWT Secret 强度
if len(JWT_SECRET) < 32:
    logger.warning(
        f"JWT Secret 长度不足（当前：{len(JWT_SECRET)} 字符）。"
        "建议使用至少 32 字符的强密码。"
    )

async def get_current_user(authorization: str = Header(None)):
    """
    Verifies the JWT token from the Authorization header.
    Returns the decoded payload if valid.
    """
    # 仅在明确的开发模式下允许绕过认证
    dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

    if dev_mode and not authorization:
        logger.warning(
            "开发模式：跳过认证检查。"
            "生产环境请设置 DEV_MODE=false 并提供有效的 JWT token。"
        )
        return {"userId": 1, "username": "dev-user", "dev_mode": True}

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authentication Scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except (ValueError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        logger.warning(f"Token 验证失败: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def verify_token(user: dict = Depends(get_current_user)):
    """
    Dependency to ensure a valid token is present.
    Usage: router.get("/protected", dependencies=[Depends(verify_token)])
    """
    return user
