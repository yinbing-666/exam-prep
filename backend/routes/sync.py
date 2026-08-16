import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import UserSync
from auth import get_current_user_id

router = APIRouter(prefix="/api/sync", tags=["sync"])

VALID_STORES = [
    "studySets", "results", "mastered", "modules",
    "mockExams", "mockAttempts", "materials",
    "dailyPlans", "fsrsCards", "gamification",
]


class SyncItem(BaseModel):
    item_id: str
    # 记录级更新时间戳（epoch ms）由 data.updatedAt 携带，用于按记录合并
    # 墓碑：本地删除的记录以 data={"deleted": true, "updatedAt": <epoch ms>} 推送，
    # 后端照常 upsert（保留 deleted 字段），pull 时照常返回，由客户端按时间戳裁决是否删除本地
    data: dict


class PushReq(BaseModel):
    store_name: str
    items: list[SyncItem]


class PullReq(BaseModel):
    store_names: list[str]
    since: str | None = None  # ISO datetime, 拉取此时间之后的变更


def _client_ts(data: dict) -> float | None:
    """从记录 data 中取客户端维护的更新时间戳（epoch ms），缺失返回 None"""
    ts = data.get("updatedAt")
    if isinstance(ts, (int, float)) and not isinstance(ts, bool):
        return float(ts)
    return None


@router.post("/push")
def push_data(req: PushReq, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if req.store_name not in VALID_STORES:
        raise HTTPException(400, f"Invalid store: {req.store_name}")

    synced = 0
    skipped = 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for item in req.items:
        existing = db.query(UserSync).filter(
            UserSync.user_id == user_id,
            UserSync.store_name == req.store_name,
            UserSync.item_id == item.item_id,
        ).first()

        if existing:
            # 按 updated_at 大者胜出合并：客户端时间戳更旧时不覆盖服务器上的新版本。
            # 墓碑记录（data.deleted 为 true）与普通记录同样处理：墓碑较新则覆盖为墓碑
            #（其余设备 pull 后删除本地）；墓碑较旧则跳过（保留服务器上的新版本/新墓碑）
            try:
                existing_data = json.loads(existing.data)
            except (json.JSONDecodeError, TypeError):
                existing_data = {}
            incoming_ts = _client_ts(item.data)
            existing_ts = _client_ts(existing_data)
            if (
                incoming_ts is not None
                and existing_ts is not None
                and incoming_ts < existing_ts
            ):
                skipped += 1
                continue
            existing.data = json.dumps(item.data, ensure_ascii=False)
            existing.updated_at = now
        else:
            db.add(UserSync(
                user_id=user_id,
                store_name=req.store_name,
                item_id=item.item_id,
                data=json.dumps(item.data, ensure_ascii=False),
            ))
        synced += 1

    db.commit()
    return {"synced": synced, "skipped": skipped}


@router.post("/pull")
def pull_data(req: PullReq, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # since 是 ISO 字符串，需解析为 datetime 再与 DateTime 列比较
    since_dt = None
    if req.since:
        try:
            since_dt = datetime.fromisoformat(req.since.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(400, "since 必须是合法的 ISO datetime")
        if since_dt.tzinfo is not None:
            since_dt = since_dt.replace(tzinfo=None)

    result = {}
    for store_name in req.store_names:
        if store_name not in VALID_STORES:
            continue
        query = db.query(UserSync).filter(
            UserSync.user_id == user_id,
            UserSync.store_name == store_name,
        )
        if since_dt is not None:
            query = query.filter(UserSync.updated_at > since_dt)

        rows = query.all()
        result[store_name] = [
            {"item_id": r.item_id, "data": json.loads(r.data), "updated_at": r.updated_at.isoformat()}
            for r in rows
        ]
    return result


@router.delete("/clear/{store_name}")
def clear_store(store_name: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if store_name not in VALID_STORES:
        raise HTTPException(400, f"Invalid store: {store_name}")
    db.query(UserSync).filter(
        UserSync.user_id == user_id,
        UserSync.store_name == store_name,
    ).delete()
    db.commit()
    return {"cleared": store_name}
