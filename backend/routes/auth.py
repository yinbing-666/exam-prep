import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth import hash_password, verify_password, create_token
from geetest import captcha_enabled, validate_captcha

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
async def register(req: RegisterReq, db: Session = Depends(get_db)):
    # 0. 密码强度校验（最小要求：长度≥8）
    if len(req.password) < 8:
        raise HTTPException(400, "密码长度至少 8 位")

    # 1. 人机验证
    if captcha_enabled("register"):
        if not all((req.captcha_output, req.gen_time, req.lot_number, req.pass_token)):
            raise HTTPException(400, "请完成人机验证")
        ok = await validate_captcha(
            req.captcha_output, req.gen_time, req.lot_number, req.pass_token,
            captcha_type="register"
        )
        if not ok:
            raise HTTPException(400, "人机验证失败，请重试")

    # 2. 检查用户名是否已存在
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "用户名已存在")

    # 3. 创建用户
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
async def login(req: LoginReq, db: Session = Depends(get_db)):
    # 1. 人机验证
    if captcha_enabled("login"):
        if not all((req.captcha_output, req.gen_time, req.lot_number, req.pass_token)):
            raise HTTPException(400, "请完成人机验证")
        ok = await validate_captcha(
            req.captcha_output, req.gen_time, req.lot_number, req.pass_token,
            captcha_type="login"
        )
        if not ok:
            raise HTTPException(400, "人机验证失败，请重试")

    # 2. 验证用户名密码
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "用户名或密码错误")
    return {"token": create_token(user.id), "user_id": user.id, "nickname": user.nickname}
