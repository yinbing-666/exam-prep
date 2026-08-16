"""科目管理 API"""
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import Subject
from auth import get_current_user_id

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


class SubjectCreate(BaseModel):
    name: str
    full_name: Optional[str] = ""
    icon: Optional[str] = "📚"
    color: Optional[str] = "#f97316"
    question_types: Optional[List[str]] = ["选择", "判断", "简答"]
    exam_style: Optional[str] = ""
    difficulty_base: Optional[int] = 60
    difficulty_advanced: Optional[int] = 30
    difficulty_challenge: Optional[int] = 10
    exam_reference: Optional[str] = ""
    special_requirements: Optional[str] = ""


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    question_types: Optional[List[str]] = None
    exam_style: Optional[str] = None
    difficulty_base: Optional[int] = None
    difficulty_advanced: Optional[int] = None
    difficulty_challenge: Optional[int] = None
    exam_reference: Optional[str] = None
    special_requirements: Optional[str] = None


def subject_to_dict(s) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "fullName": s.full_name,
        "icon": s.icon,
        "color": s.color,
        "questionTypes": json.loads(s.question_types) if s.question_types else [],
        "examStyle": s.exam_style,
        "difficulty": {
            "base": s.difficulty_base,
            "advanced": s.difficulty_advanced,
            "challenge": s.difficulty_challenge,
        },
        "examReference": s.exam_reference,
        "specialRequirements": s.special_requirements,
        "totalUploaded": s.total_uploaded or 0,
        "totalQuestions": s.total_questions or 0,
        "totalReviews": s.total_reviews or 0,
        "createdAt": str(s.created_at) if s.created_at else None,
        "updatedAt": str(s.updated_at) if s.updated_at else None,
    }


@router.get("")
def list_subjects(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    subjects = db.query(Subject).filter(Subject.user_id == user_id).order_by(Subject.created_at.desc()).all()
    return {"subjects": [subject_to_dict(s) for s in subjects]}


@router.post("")
def create_subject(body: SubjectCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    subject = Subject(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=body.name,
        full_name=body.full_name,
        icon=body.icon,
        color=body.color,
        question_types=json.dumps(body.question_types, ensure_ascii=False),
        exam_style=body.exam_style,
        difficulty_base=body.difficulty_base,
        difficulty_advanced=body.difficulty_advanced,
        difficulty_challenge=body.difficulty_challenge,
        exam_reference=body.exam_reference,
        special_requirements=body.special_requirements,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject_to_dict(subject)


@router.get("/{subject_id}")
def get_subject(subject_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user_id).first()
    if not subject:
        raise HTTPException(404, "科目不存在")
    return subject_to_dict(subject)


@router.put("/{subject_id}")
def update_subject(subject_id: str, body: SubjectUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user_id).first()
    if not subject:
        raise HTTPException(404, "科目不存在")
    
    for field, value in body.dict(exclude_unset=True).items():
        if field == "question_types":
            subject.question_types = json.dumps(value, ensure_ascii=False)
        else:
            setattr(subject, field, value)
    
    db.commit()
    db.refresh(subject)
    return subject_to_dict(subject)


@router.delete("/{subject_id}")
def delete_subject(subject_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user_id).first()
    if not subject:
        raise HTTPException(404, "科目不存在")
    db.delete(subject)
    db.commit()
    return {"ok": True}
