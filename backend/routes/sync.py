import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from database import get_db
from models import UserSync
from auth import get_current_user_id

router = APIRouter(prefix="/api/sync", tags=["sync"])

VALID_STORES = [
    "studySets", "results", "mastered", "modules",
    "mockExams", "mockAttempts", "materials",
    "dailyPlans", "fsrsCards", "gamification",
]

# 单次 push 的条数上限与单条记录体积上限：防一次性超大请求拖垮 DB
MAX_PUSH_ITEMS = 1000
MAX_ITEM_BYTES = 64 * 1024

# 墓碑保留期：超过该天数且 data.deleted=true 的记录在 pull 时顺手清理，
# 避免 user_sync 表行数只增不减（超期墓碑已足够传播到所有活跃客户端）
TOMBSTONE_GC_DAYS = 30


class SyncItem(BaseModel):
    item_id: str = Field(..., max_length=255)
    # 记录级更新时间戳（epoch ms）由 data.updatedAt 携带，用于按记录合并
    # 墓碑：本地删除的记录以 data={"deleted": true, "updatedAt": <epoch ms>} 推送，
    # 后端照常 upsert（保留 deleted 字段），pull 时照常返回，由客户端按时间戳裁决是否删除本地
    data: dict


class PushReq(BaseModel):
    store_name: str = Field(..., max_length=50)
    items: list[SyncItem]


class PullReq(BaseModel):
    store_names: list[str] = Field(..., max_length=20)
    since: str | None = Field(None, max_length=64)  # ISO datetime, 拉取此时间之后的变更


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

    # 前置校验：数量与单条体积上限（在逐条查询 DB 之前拒绝超大请求）
    if not req.items:
        raise HTTPException(400, "items 不能为空")
    if len(req.items) > MAX_PUSH_ITEMS:
        raise HTTPException(400, f"单次推送最多 {MAX_PUSH_ITEMS} 条")
    for item in req.items:
        data_bytes = len(json.dumps(item.data, ensure_ascii=False).encode("utf-8"))
        if data_bytes > MAX_ITEM_BYTES:
            raise HTTPException(413, f"单条记录体积不能超过 {MAX_ITEM_BYTES // 1024}KB")

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

    # 墓碑 GC：清理超期墓碑（data.deleted=true 且 updated_at 早于保留期）。
    # 这些墓碑已随历次 pull 传播给所有活跃客户端，保留只会让 user_sync 表无限膨胀。
    # 按用户 + 本次请求的 store 范围清理；不传 since 的旧客户端同样触发（按绝对年龄判断）。
    if req.store_names:
        gc_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=TOMBSTONE_GC_DAYS)
        stale_rows = db.query(UserSync).filter(
            UserSync.user_id == user_id,
            UserSync.store_name.in_(req.store_names),
            UserSync.updated_at < gc_cutoff,
        ).all()
        gc_ids = []
        for r in stale_rows:
            try:
                r_data = json.loads(r.data)
            except (json.JSONDecodeError, TypeError):
                r_data = {}
            if r_data.get("deleted") is True:
                gc_ids.append(r.id)
        if gc_ids:
            db.query(UserSync).filter(UserSync.id.in_(gc_ids)).delete(synchronize_session=False)
            db.commit()

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
