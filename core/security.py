"""
安全验证模块
提供API密钥验证和CORS源检查功能
"""

import re
from typing import Optional, Tuple, List
from fastapi import Request, HTTPException
from config import settings


def validate_api_key(request: Request) -> bool:
    """
    验证API密钥
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        bool: 验证是否通过
        
    Raises:
        HTTPException: 验证失败时抛出异常
    """
    # 如果没有设置保护密钥，则允许所有请求
    if not settings.API_KEY_PROTECTION:
        return True
    
    # 从多个位置获取API密钥
    auth_header = request.headers.get("Authorization", "")
    api_key_header = request.headers.get("X-API-Key") or request.headers.get("api-key")
    
    # 提取Bearer token
    bearer_token = None
    if auth_header.startswith("Bearer "):
        bearer_token = auth_header[7:]  # 移除 "Bearer " 前缀
    
    provided_key = api_key_header or bearer_token
    
    if not provided_key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Please provide it via Authorization header (Bearer token) or X-API-Key header."
        )
    
    if provided_key != settings.API_KEY_PROTECTION:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key."
        )
    
    return True


def validate_origin(request: Request) -> Tuple[bool, str]:
    """
    验证请求来源
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        Tuple[bool, str]: (是否验证通过, 允许的源)
        
    Raises:
        HTTPException: 验证失败时抛出异常
    """
    # 如果没有设置源限制，则允许所有源
    if not settings.ALLOWED_ORIGINS or settings.ALLOWED_ORIGINS == "*":
        return True, "*"
    
    origin = request.headers.get("Origin")
    allowed_list = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
    
    # 检查是否在允许列表中
    if origin and origin in allowed_list:
        return True, origin
    
    # 检查通配符匹配
    for allowed in allowed_list:
        if allowed == "*":
            return True, "*"
        if "*" in allowed:
            # 将通配符转换为正则表达式
            pattern = allowed.replace("*", ".*")
            if origin and re.match(f"^{pattern}$", origin):
                return True, origin
    
    # 如果没有Origin头（如服务器到服务器的请求），允许通过
    if not origin:
        return True, "*"
    
    raise HTTPException(
        status_code=403,
        detail=f"Origin '{origin}' not allowed."
    )


def get_cors_headers(request: Request) -> dict:
    """
    获取CORS响应头
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        dict: CORS响应头字典
    """
    try:
        _, allowed_origin = validate_origin(request)
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, api-key",
            "Access-Control-Max-Age": "86400"
        }
    except HTTPException:
        # 如果源验证失败，返回null源
        return {
            "Access-Control-Allow-Origin": "null",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, api-key"
        }


def security_middleware(request: Request) -> None:
    """
    安全中间件，验证API密钥和来源
    
    Args:
        request: FastAPI请求对象
        
    Raises:
        HTTPException: 验证失败时抛出异常
    """
    # 跳过OPTIONS请求的验证
    if request.method == "OPTIONS":
        return
    
    # 验证API密钥
    validate_api_key(request)
    
    # 验证来源
    validate_origin(request)


def is_protected() -> bool:
    """
    检查是否启用了API保护
    
    Returns:
        bool: 是否启用保护
    """
    return bool(settings.API_KEY_PROTECTION)


def get_allowed_origins() -> List[str]:
    """
    获取允许的源列表
    
    Returns:
        List[str]: 允许的源列表
    """
    if not settings.ALLOWED_ORIGINS or settings.ALLOWED_ORIGINS == "*":
        return ["*"]
    return [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
