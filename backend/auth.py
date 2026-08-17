"""认证模块 — 注册/登录/Token验证"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

_secret = os.getenv("SECRET_KEY")
if not _secret:
    raise RuntimeError("SECRET_KEY environment variable is required")
SECRET_KEY = _secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False：缺 Authorization 头时由 get_current_user_id 统一抛 401，
# 而不是 FastAPI 默认的 403（与客户端"未登录"语义匹配）
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    # naive UTC，与原 utcnow() 行为等价；jose 的 exp 经 utctimetuple 取 UTC 分量
    expire = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user_id(
    cred: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if cred is None:
        raise HTTPException(status_code=401, detail="未提供认证凭证")
    user_id = verify_token(cred.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token无效或已过期")
    return user_id
