import os
import json
import time
from collections import defaultdict, deque
from threading import Lock
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, ValidationError
from auth import get_current_user_id

router = APIRouter(prefix="/api/ai", tags=["ai"])

# 从环境变量读取，不硬编码
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_API_BASE = os.getenv("AI_API_BASE", "").rstrip("/")
AI_MODEL = os.getenv("AI_MODEL", "")
AI_MODELS = {model.strip() for model in os.getenv("AI_MODELS", "").split(",") if model.strip()}

RATE_LIMIT = 10
RATE_WINDOW_SECONDS = 60
MAX_BODY_BYTES = 256 * 1024
MAX_MESSAGES = 50
MAX_MESSAGE_BYTES = 128 * 1024
MAX_TOKENS = 4096
_request_times: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = Lock()


class ChatReq(BaseModel):
    messages: list[dict]
    model: str | None = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=MAX_TOKENS, ge=1, le=MAX_TOKENS)


def _check_rate_limit(key: str) -> None:
    now = time.monotonic()
    with _rate_lock:
        timestamps = _request_times[key]
        while timestamps and now - timestamps[0] >= RATE_WINDOW_SECONDS:
            timestamps.popleft()
        if len(timestamps) >= RATE_LIMIT:
            raise HTTPException(429, "请求过于频繁，请稍后再试")
        timestamps.append(now)


@router.post("/chat")
async def chat(request: Request, user_id: str = Depends(get_current_user_id)):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) < 0 or int(content_length) > MAX_BODY_BYTES:
                raise HTTPException(413, "请求体过大")
        except ValueError:
            raise HTTPException(400, "Content-Length 无效")

    _check_rate_limit(user_id)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_BODY_BYTES:
            raise HTTPException(413, "请求体过大")
    try:
        req = ChatReq.model_validate_json(body)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc

    if not AI_API_KEY or not AI_API_BASE or not AI_MODEL:
        raise HTTPException(500, "AI service not configured")
    if not AI_MODELS:
        raise HTTPException(500, "AI model whitelist not configured")
    if not req.messages or len(req.messages) > MAX_MESSAGES:
        raise HTTPException(400, f"messages 数量必须在 1-{MAX_MESSAGES} 之间")
    message_bytes = len(json.dumps(req.messages, ensure_ascii=False).encode("utf-8"))
    if message_bytes > MAX_MESSAGE_BYTES:
        raise HTTPException(413, "messages 内容过大")

    model = req.model or AI_MODEL
    if model not in AI_MODELS:
        raise HTTPException(400, "不允许使用该 AI 模型")
    async with httpx.AsyncClient(timeout=120, limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)) as client:
        resp = await client.post(
            f"{AI_API_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {AI_API_KEY}"},
            json={
                "model": model,
                "messages": req.messages,
                "temperature": req.temperature,
                "max_tokens": req.max_tokens,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, resp.text)
        return resp.json()
