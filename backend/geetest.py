"""极验 GeeTest 4.0 人机验证服务端"""
import os
import hmac
import logging
import httpx
from fastapi import APIRouter

logger = logging.getLogger("geetest")

router = APIRouter(prefix="/api/geetest", tags=["geetest"])

# 极验配置 — 注册和登录使用不同的验证（从环境变量读取）
GEETEST_CONFIGS = {
    "register": {
        "id": os.getenv("GEETEST_REGISTER_ID", ""),
        "key": os.getenv("GEETEST_REGISTER_KEY", ""),
    },
    "login": {
        "id": os.getenv("GEETEST_LOGIN_ID", ""),
        "key": os.getenv("GEETEST_LOGIN_KEY", ""),
    },
}


@router.get("/config")
def get_geetest_config(type: str = "login"):
    """前端获取极验配置"""
    config = GEETEST_CONFIGS.get(type, GEETEST_CONFIGS["login"])
    return {"enabled": bool(config["id"] and config["key"]), "captcha_id": config["id"]}


def captcha_enabled(captcha_type: str = "login") -> bool:
    """验证码 ID 和服务端密钥均已配置时才视为启用。"""
    config = GEETEST_CONFIGS.get(captcha_type, GEETEST_CONFIGS["login"])
    return bool(config["id"] and config["key"])


async def validate_captcha(
    captcha_output: str,
    gen_time: str,
    lot_number: str,
    pass_token: str,
    captcha_type: str = "login",
) -> bool:
    """验证极验4.0前端返回的验证结果"""
    config = GEETEST_CONFIGS.get(captcha_type, GEETEST_CONFIGS["login"])

    # 验证结果必须由服务端向极验核验，任何客户端特殊字符串都不可信。
    if not config["id"] or not config["key"]:
        logger.error("GeeTest %s config is incomplete", captcha_type)
        return False
    if not all((captcha_output, gen_time, lot_number, pass_token)):
        return False

    # 生成签名: 用HMAC-SHA256, key=captcha_key, message=lot_number
    sign_token = hmac.new(
        config["key"].encode(), lot_number.encode(), digestmod="SHA256"
    ).hexdigest()

    try:
        async with httpx.AsyncClient(timeout=10, limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)) as client:
            url = f"https://gcaptcha4.geetest.com/validate?captcha_id={config['id']}"
            resp = await client.post(
                url,
                data={
                    "lot_number": lot_number,
                    "captcha_output": captcha_output,
                    "pass_token": pass_token,
                    "gen_time": gen_time,
                    "sign_token": sign_token,
                },
            )
            if resp.status_code != 200:
                logger.warning("GeeTest validation returned HTTP %s", resp.status_code)
                return False

            result = resp.json()
            return result.get("result") == "success"
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("GeeTest validation failed: %s", exc)
        return False
