import time
import uuid
from collections import deque
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth import hash_password, verify_password, create_token
from geetest import captcha_enabled, validate_captcha

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---- 登录/注册限流（内存计数，单实例部署足够；公网接口防暴力破解/批量灌库） ----
LOGIN_MAX_FAILURES = 5        # 15 分钟内同一 IP+账号 失败 5 次则锁定
LOGIN_WINDOW_SECONDS = 15 * 60
REGISTER_MAX_PER_WINDOW = 10  # 15 分钟内同一 IP 最多注册 10 个账号
REGISTER_WINDOW_SECONDS = 15 * 60

# key -> 失败时间戳队列；成功登录清空
_login_failures: dict[str, deque[float]] = {}
# key -> 注册时间戳队列（IP 维度）
_register_counts: dict[str, deque[float]] = {}
_auth_lock = Lock()


def _client_ip(request: Request) -> str:
    # 站点经 Cloudflare Tunnel 反代，取 X-Forwarded-For 首个 IP；直连时取 socket IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _prune_window(timestamps: deque[float], now: float, window_seconds: int) -> None:
    while timestamps and now - timestamps[0] >= window_seconds:
        timestamps.popleft()


def _check_login_limit(request: Request, username: str) -> None:
    key = f"{_client_ip(request)}|{username.strip().lower()}"
    now = time.monotonic()
    with _auth_lock:
        timestamps = _login_failures.get(key)
        if timestamps is not None:
            _prune_window(timestamps, now, LOGIN_WINDOW_SECONDS)
            if not timestamps:
                del _login_failures[key]
                timestamps = None
        if timestamps is not None and len(timestamps) >= LOGIN_MAX_FAILURES:
            raise HTTPException(429, "尝试次数过多，请 15 分钟后再试")


def _record_login_failure(request: Request, username: str) -> None:
    key = f"{_client_ip(request)}|{username.strip().lower()}"
    now = time.monotonic()
    with _auth_lock:
        timestamps = _login_failures.get(key)
        if timestamps is None:
            timestamps = deque()
            _login_failures[key] = timestamps
        _prune_window(timestamps, now, LOGIN_WINDOW_SECONDS)
        timestamps.append(now)


def _clear_login_failures(request: Request, username: str) -> None:
    key = f"{_client_ip(request)}|{username.strip().lower()}"
    with _auth_lock:
        _login_failures.pop(key, None)


def _check_register_limit(request: Request) -> None:
    key = _client_ip(request)
    now = time.monotonic()
    with _auth_lock:
        timestamps = _register_counts.get(key)
        if timestamps is not None:
            _prune_window(timestamps, now, REGISTER_WINDOW_SECONDS)
            if not timestamps:
                del _register_counts[key]
                timestamps = None
        if timestamps is not None and len(timestamps) >= REGISTER_MAX_PER_WINDOW:
            raise HTTPException(429, "注册过于频繁，请稍后再试")
        _register_counts.setdefault(key, deque()).append(now)


class RegisterReq(BaseModel):
    username: str
    password: str
    nickname: str = ""
    # 极验4.0字段
    captcha_output: str = ""
    gen_time: str = ""
    lot_number: str = ""
    pass_token: str = ""


class LoginReq(BaseModel):
    username: str
    password: str
    # 极验4.0字段
    captcha_output: str = ""
    gen_time: str = ""
    lot_number: str = ""
    pass_token: str = ""


@router.post("/register")
async def register(req: RegisterReq, request: Request, db: Session = Depends(get_db)):
    # 0. 注册限流（IP 维度，防批量灌库）
    _check_register_limit(request)

    # 1. 密码强度校验（最小要求：长度≥8）
    if len(req.password) < 8:
        raise HTTPException(400, "密码长度至少 8 位")

    # 2. 人机验证
    if captcha_enabled("register"):
        if not all((req.captcha_output, req.gen_time, req.lot_number, req.pass_token)):
            raise HTTPException(400, "请完成人机验证")
        ok = await validate_captcha(
            req.captcha_output, req.gen_time, req.lot_number, req.pass_token,
            captcha_type="register"
        )
        if not ok:
            raise HTTPException(400, "人机验证失败，请重试")

    # 3. 检查用户名是否已存在
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "用户名已存在")

    # 4. 创建用户
    user = User(
        id=str(uuid.uuid4()),
        username=req.username,
        password_hash=hash_password(req.password),
        nickname=req.nickname or req.username,
    )
    db.add(user)
    db.commit()
    return {"token": create_token(user.id), "user_id": user.id, "nickname": user.nickname}


@router.post("/login")
async def login(req: LoginReq, request: Request, db: Session = Depends(get_db)):
    # 1. 登录失败计数限流（IP+账号维度，防暴力破解）
    _check_login_limit(request, req.username)

    # 2. 人机验证
    if captcha_enabled("login"):
        if not all((req.captcha_output, req.gen_time, req.lot_number, req.pass_token)):
            raise HTTPException(400, "请完成人机验证")
        ok = await validate_captcha(
            req.captcha_output, req.gen_time, req.lot_number, req.pass_token,
            captcha_type="login"
        )
        if not ok:
            raise HTTPException(400, "人机验证失败，请重试")

    # 3. 验证用户名密码
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        _record_login_failure(request, req.username)
        raise HTTPException(401, "用户名或密码错误")
    _clear_login_failures(request, req.username)
    return {"token": create_token(user.id), "user_id": user.id, "nickname": user.nickname}
