import json
from datetime import datetime
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
    data: dict


class PushReq(BaseModel):
    store_name: str
    items: list[SyncItem]


class PullReq(BaseModel):
    store_names: list[str]
    since: str | None = None  # ISO datetime, 拉取此时间之后的变更


@router.post("/push")
def push_data(req: PushReq, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if req.store_name not in VALID_STORES:
        raise HTTPException(400, f"Invalid store: {req.store_name}")

    count = 0
    for item in req.items:
        existing = db.query(UserSync).filter(
            UserSync.user_id == user_id,
            UserSync.store_name == req.store_name,
            UserSync.item_id == item.item_id,
        ).first()

        if existing:
            existing.data = json.dumps(item.data, ensure_ascii=False)
            existing.updated_at = datetime.utcnow()
        else:
            db.add(UserSync(
                user_id=user_id,
                store_name=req.store_name,
                item_id=item.item_id,
                data=json.dumps(item.data, ensure_ascii=False),
            ))
        count += 1

    db.commit()
    return {"synced": count}


@router.post("/pull")
def pull_data(req: PullReq, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    result = {}
    for store_name in req.store_names:
        if store_name not in VALID_STORES:
            continue
        query = db.query(UserSync).filter(
            UserSync.user_id == user_id,
            UserSync.store_name == store_name,
        )
        if req.since:
            query = query.filter(UserSync.updated_at > req.since)

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
