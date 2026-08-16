"""异步任务处理 API"""
import uuid
import json
import re
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import ProcessingJob, UploadedFile, Subject
from auth import get_current_user_id

logger = logging.getLogger("jobs")
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class CreateJobRequest(BaseModel):
    job_type: str  # 'knowledge_list', 'quiz', 'mock_exam'
    subject_id: str
    file_ids: List[str]
    config: Optional[dict] = None


@router.post("")
async def create_job(
    req: CreateJobRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """创建异步处理任务"""
    subject = db.query(Subject).filter(
        Subject.id == req.subject_id,
        Subject.user_id == user_id
    ).first()
    if not subject:
        raise HTTPException(400, "科目不存在")

    files = db.query(UploadedFile).filter(
        UploadedFile.id.in_(req.file_ids),
        UploadedFile.user_id == user_id
    ).all()
    if len(files) != len(req.file_ids):
        raise HTTPException(400, "部分文件不存在")

    job_id = str(uuid.uuid4())
    job = ProcessingJob(
        id=job_id,
        user_id=user_id,
        job_type=req.job_type,
        status="pending",
        subject_id=req.subject_id,
        file_ids=json.dumps(req.file_ids),
        config=json.dumps(req.config) if req.config else None,
        progress=0,
        progress_text="任务已创建，等待处理...",
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(process_job, job_id, req.job_type, req.subject_id, req.file_ids, req.config)
    return {"job_id": job_id, "status": "pending"}


@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """查询任务状态"""
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == user_id
    ).first()
    if not job:
        raise HTTPException(404, "任务不存在")

    return {
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "progress_text": job.progress_text,
        "result": job.result,
        "error": job.error,
        "created_at": str(job.created_at) if job.created_at else None,
        "started_at": str(job.started_at) if job.started_at else None,
        "completed_at": str(job.completed_at) if job.completed_at else None,
    }


@router.get("")
async def list_jobs(
    subject_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """列出任务"""
    q = db.query(ProcessingJob).filter(ProcessingJob.user_id == user_id)
    if subject_id:
        q = q.filter(ProcessingJob.subject_id == subject_id)
    if status:
        q = q.filter(ProcessingJob.status == status)
    jobs = q.order_by(ProcessingJob.created_at.desc()).limit(limit).all()

    return {
        "jobs": [
            {
                "id": j.id,
                "job_type": j.job_type,
                "status": j.status,
                "progress": j.progress,
                "progress_text": j.progress_text,
                "created_at": str(j.created_at) if j.created_at else None,
            }
            for j in jobs
        ]
    }


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """删除任务"""
    job = db.query(ProcessingJob).filter(
        ProcessingJob.id == job_id,
        ProcessingJob.user_id == user_id
    ).first()
    if not job:
        raise HTTPException(404, "任务不存在")

    db.delete(job)
    db.commit()
    return {"ok": True}


# ============================================================
# 后台处理函数
# ============================================================

def _extract_json_array(text: str) -> list:
    """从 AI 响应中健壮地提取 JSON 数组"""
    # 尝试直接解析
    text = text.strip()
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            return [result]
    except json.JSONDecodeError:
        pass

    # 尝试提取 ```json ... ``` 代码块
    m = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试找第一个 [ 到最后一个 ]
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    logger.warning(f"JSON 提取失败，原始文本前200字符: {text[:200]}")
    return []


async def process_job(job_id: str, job_type: str, subject_id: str, file_ids: list, config: dict):
    """后台处理任务"""
    from database import SessionLocal
    from routes.ai_proxy import AI_API_KEY, AI_API_BASE, AI_MODEL

    db = SessionLocal()
    job = None
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.now()
        job.progress_text = "正在获取文件内容..."
        job.progress = 5
        db.commit()

        files = db.query(UploadedFile).filter(UploadedFile.id.in_(file_ids)).all()

        # 分批处理（每批最多3个文件，避免超时）
        BATCH_SIZE = 3
        all_content = []
        total_batches = (len(files) + BATCH_SIZE - 1) // BATCH_SIZE

        for batch_idx in range(total_batches):
            batch_start = batch_idx * BATCH_SIZE
            batch_end = min(batch_start + BATCH_SIZE, len(files))
            batch_files = files[batch_start:batch_end]

            job.progress_text = f"正在处理第 {batch_start+1}-{batch_end}/{len(files)} 个文件..."
            job.progress = int(10 + (batch_idx / total_batches) * 70)
            db.commit()

            batch_content = []
            for f in batch_files:
                batch_content.append(f"【{f.filename}】\n{f.extracted_text}")

            try:
                result = await call_ai_for_batch(
                    job_type,
                    "\n\n---\n\n".join(batch_content),
                    config,
                    AI_API_KEY,
                    AI_API_BASE,
                    AI_MODEL
                )
                all_content.append(result)
            except Exception as e:
                logger.error(f"批次 {batch_idx+1} 处理失败: {e}", exc_info=True)
                job.error = f"处理第{batch_start+1}-{batch_end}个文件时出错: {str(e)}"
                job.status = "failed"
                job.completed_at = datetime.now()
                db.commit()
                return

        # 合并所有批次的结果
        job.progress_text = "正在整理结果..."
        job.progress = 90
        db.commit()

        if job_type == "knowledge_list":
            all_modules = []
            for batch_result in all_content:
                modules = _extract_json_array(batch_result)
                if modules:
                    all_modules.extend(modules)

            # 去重（按title）
            seen = set()
            unique_modules = []
            for m in all_modules:
                if not isinstance(m, dict):
                    continue
                title = m.get("title", "")
                if title and title not in seen:
                    seen.add(title)
                    unique_modules.append(m)

            job.result = json.dumps(unique_modules, ensure_ascii=False)
        else:
            job.result = json.dumps({"content": "\n\n".join(all_content)}, ensure_ascii=False)

        job.status = "completed"
        job.progress = 100
        job.progress_text = "处理完成！"
        job.completed_at = datetime.now()
        db.commit()

    except Exception as e:
        logger.error(f"任务 {job_id} 失败: {e}", exc_info=True)
        if job:
            job.status = "failed"
            job.error = str(e)
            job.completed_at = datetime.now()
            db.commit()
    finally:
        db.close()


async def call_ai_for_batch(job_type: str, content: str, config: dict, api_key: str, api_base: str, model: str) -> str:
    """调用AI处理一批文件"""
    import httpx

    if not api_key:
        raise ValueError("AI API key 未配置，请在 .env 中设置 AI_API_KEY")

    if job_type == "knowledge_list":
        from ai.prompts import buildPlanPrompt
        system_prompt = buildPlanPrompt()
    elif job_type == "quiz":
        from ai.prompts import buildQuizPrompt
        count = config.get("count", 20) if config else 20
        system_prompt = buildQuizPrompt(count)
    elif job_type == "mock_exam":
        from ai.prompts import buildMockPrompt
        system_prompt = buildMockPrompt(config or {})
    else:
        raise ValueError(f"未知任务类型: {job_type}")

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            f"{api_base}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"请根据以下课件内容生成学习材料：\n\n{content}"}
                ],
                "temperature": 0.7,
                "max_tokens": 16384,
            },
        )
        if resp.status_code != 200:
            raise Exception(f"AI API error: {resp.status_code} - {resp.text[:200]}")

        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise Exception("AI 返回空结果")
        return choices[0].get("message", {}).get("content", "")
