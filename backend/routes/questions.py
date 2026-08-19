"""AI出题记录 API — 存储已出题目，防重复"""
import json
import uuid
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel, Field
from typing import Optional, List
from database import get_db
from models import AIGeneratedQuestion, Subject
from auth import get_current_user_id

router = APIRouter(prefix="/api/questions", tags=["questions"])


class QuestionRecord(BaseModel):
    subject_id: str = Field(..., max_length=100)
    question_text: str = Field(..., max_length=20000)
    question_type: str = Field(..., max_length=50)
    correct_answer: Optional[str] = Field("", max_length=10000)
    explanation: Optional[str] = Field("", max_length=20000)
    source_file_id: Optional[str] = Field(None, max_length=100)
    source_chunk: Optional[str] = Field("", max_length=50000)


class ReviewRecord(BaseModel):
    question_id: str


def _question_hash(text: str) -> str:
    """SHA256 hash for dedup"""
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()


@router.post("")
def record_question(body: QuestionRecord, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """记录一道AI出的题（去重存储）"""
    subject = db.query(Subject).filter(Subject.id == body.subject_id, Subject.user_id == user_id).first()
    if not subject:
        raise HTTPException(400, "科目不存在")

    q_hash = _question_hash(body.question_text)

    existing = db.query(AIGeneratedQuestion).filter(
        AIGeneratedQuestion.user_id == user_id,
        AIGeneratedQuestion.subject_id == body.subject_id,
        AIGeneratedQuestion.question_hash == q_hash,
    ).first()
    if existing:
        return {"id": existing.id, "duplicate": True}

    question = AIGeneratedQuestion(
        id=str(uuid.uuid4()),
        user_id=user_id,
        subject_id=body.subject_id,
        question_hash=q_hash,
        question_text=body.question_text,
        question_type=body.question_type,
        correct_answer=body.correct_answer,
        explanation=body.explanation,
        source_file_id=body.source_file_id,
        source_chunk=body.source_chunk,
    )
    db.add(question)
    subject.total_questions = (subject.total_questions or 0) + 1
    db.commit()
    db.refresh(question)
    return {"id": question.id, "duplicate": False}


# 批量出题接口的上限：防一次性超大请求拖垮 DB / 刷存储（与 ai_proxy.MAX_BODY_BYTES 同量级）
MAX_BATCH_ITEMS = 200
MAX_BODY_BYTES = 256 * 1024


@router.post("/batch")
def record_questions_batch(body: List[QuestionRecord], db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """批量记录题目"""
    if not body:
        raise HTTPException(400, "批量记录不能为空")
    if len(body) > MAX_BATCH_ITEMS:
        raise HTTPException(400, f"批量记录数量不能超过 {MAX_BATCH_ITEMS} 条")
    body_bytes = len(json.dumps([item.model_dump() for item in body], ensure_ascii=False).encode("utf-8"))
    if body_bytes > MAX_BODY_BYTES:
        raise HTTPException(413, "请求体过大，请减少批量条数或单条长度")
    results = []
    new_count = 0
    dup_count = 0

    for item in body:
        subject = db.query(Subject).filter(Subject.id == item.subject_id, Subject.user_id == user_id).first()
        if not subject:
            results.append({"error": "科目不存在"})
            continue

        q_hash = _question_hash(item.question_text)
        existing = db.query(AIGeneratedQuestion).filter(
            AIGeneratedQuestion.user_id == user_id,
            AIGeneratedQuestion.subject_id == item.subject_id,
            AIGeneratedQuestion.question_hash == q_hash,
        ).first()

        if existing:
            dup_count += 1
            results.append({"id": existing.id, "duplicate": True})
        else:
            question = AIGeneratedQuestion(
                id=str(uuid.uuid4()),
                user_id=user_id,
                subject_id=item.subject_id,
                question_hash=q_hash,
                question_text=item.question_text,
                question_type=item.question_type,
                correct_answer=item.correct_answer or "",
                explanation=item.explanation or "",
                source_file_id=item.source_file_id,
                source_chunk=item.source_chunk or "",
            )
            db.add(question)
            subject.total_questions = (subject.total_questions or 0) + 1
            new_count += 1
            results.append({"id": question.id, "duplicate": False})

    db.commit()
    return {"results": results, "new": new_count, "duplicates": dup_count}


@router.get("")
def list_questions(
    subject_id: str = None,
    question_type: str = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """列出已出的题目"""
    q = db.query(AIGeneratedQuestion).filter(AIGeneratedQuestion.user_id == user_id)
    if subject_id:
        q = q.filter(AIGeneratedQuestion.subject_id == subject_id)
    if question_type:
        q = q.filter(AIGeneratedQuestion.question_type == question_type)

    total = q.count()
    questions = q.order_by(AIGeneratedQuestion.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "questions": [
            {
                "id": q.id,
                "subjectId": q.subject_id,
                "questionText": q.question_text,
                "questionType": q.question_type,
                "correctAnswer": q.correct_answer,
                "explanation": q.explanation,
                "timesReviewed": q.times_reviewed or 0,
                "createdAt": str(q.created_at) if q.created_at else None,
            }
            for q in questions
        ],
    }


@router.get("/stats")
def question_stats(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """出题统计"""
    by_subject = db.query(
        AIGeneratedQuestion.subject_id,
        sqlfunc.count(AIGeneratedQuestion.id),
    ).filter(
        AIGeneratedQuestion.user_id == user_id,
    ).group_by(AIGeneratedQuestion.subject_id).all()

    by_type = db.query(
        AIGeneratedQuestion.question_type,
        sqlfunc.count(AIGeneratedQuestion.id),
    ).filter(
        AIGeneratedQuestion.user_id == user_id,
    ).group_by(AIGeneratedQuestion.question_type).all()

    total = db.query(sqlfunc.count(AIGeneratedQuestion.id)).filter(
        AIGeneratedQuestion.user_id == user_id,
    ).scalar()

    return {
        "total": total,
        "bySubject": {sid: cnt for sid, cnt in by_subject},
        "byType": {qt: cnt for qt, cnt in by_type},
    }


@router.post("/{question_id}/review")
def mark_reviewed(question_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """标记题目已复习"""
    q = db.query(AIGeneratedQuestion).filter(
        AIGeneratedQuestion.id == question_id,
        AIGeneratedQuestion.user_id == user_id,
    ).first()
    if not q:
        raise HTTPException(404, "题目不存在")

    q.times_reviewed = (q.times_reviewed or 0) + 1
    q.last_reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"ok": True, "timesReviewed": q.times_reviewed}


@router.get("/check-duplicate")
def check_duplicate(
    question_text: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """检查题目是否重复"""
    q_hash = _question_hash(question_text)
    existing = db.query(AIGeneratedQuestion).filter(
        AIGeneratedQuestion.user_id == user_id,
        AIGeneratedQuestion.question_hash == q_hash,
    ).first()
    return {"duplicate": existing is not None, "existingId": existing.id if existing else None}