"""异步任务处理 API"""
import uuid
import json
import re
import os
import base64
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx
import asyncio
from database import get_db
from models import ProcessingJob, UploadedFile, Subject
from auth import get_current_user_id
from routes.ai_proxy import AI_API_KEY, AI_API_BASE, AI_MODEL

logger = logging.getLogger("jobs")
router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# 每用户同时进行中的任务数上限：每个任务触发多轮 16384 max_tokens 的 AI 调用，
# 无上限会被并发刷爆 AI 成本
MAX_ACTIVE_JOBS_PER_USER = 5
MAX_FILES_PER_JOB = 50


def _utcnow():
    """naive UTC，与 sync.py/questions.py 的存储约定一致（SQLite DateTime 列存 naive UTC）"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    if not req.file_ids:
        raise HTTPException(400, "请选择要处理的文件")
    if len(req.file_ids) > MAX_FILES_PER_JOB:
        raise HTTPException(400, f"单次任务最多处理 {MAX_FILES_PER_JOB} 个文件")

    active_count = db.query(ProcessingJob).filter(
        ProcessingJob.user_id == user_id,
        ProcessingJob.status.in_(["pending", "processing"]),
    ).count()
    if active_count >= MAX_ACTIVE_JOBS_PER_USER:
        raise HTTPException(429, f"同时进行中的任务不能超过 {MAX_ACTIVE_JOBS_PER_USER} 个，请等待现有任务完成")

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

# 每个文件最多识别的图片数，超出部分跳过（每张 AI 识别最长约 60s，无上限会把上传请求挂死）
MAX_IMAGES_PER_FILE = 20


def fail_stale_jobs():
    """服务启动时把上次运行中断遗留的 pending/running 任务置为 failed，避免前端无限轮询"""
    from database import SessionLocal

    db = SessionLocal()
    try:
        stale = db.query(ProcessingJob).filter(
            ProcessingJob.status.in_(["pending", "processing"])
        ).all()
        if not stale:
            return
        now = _utcnow()
        for job in stale:
            job.status = "failed"
            job.error = "服务重启，任务中断，请重新发起"
            job.completed_at = now
        db.commit()
        logger.info(f"[startup] 已将 {len(stale)} 个遗留 pending/running 任务置为 failed")
    except Exception as e:
        db.rollback()
        logger.error(f"[startup] 清理遗留任务失败: {e}")
    finally:
        db.close()


def _extract_json_array(text: str) -> list:
    """从 AI 响应中健壮地提取 JSON 数组"""
    # 尝试直接解析
    text = text.strip()
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            # 兼容 {"content": "[...]"} 包装格式：content 是 JSON 数组字符串时解包
            content = result.get("content")
            if isinstance(content, str):
                inner = content.strip()
                try:
                    inner_result = json.loads(inner)
                    if isinstance(inner_result, list):
                        return inner_result
                    if isinstance(inner_result, dict):
                        return [inner_result]
                except json.JSONDecodeError:
                    pass
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

    db = SessionLocal()
    job = None
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.started_at = _utcnow()
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
                job.completed_at = _utcnow()
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
        job.completed_at = _utcnow()
        db.commit()

    except Exception as e:
        logger.error(f"任务 {job_id} 失败: {e}", exc_info=True)
        if job:
            job.status = "failed"
            job.error = str(e)
            job.completed_at = _utcnow()
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

    # 对 5xx 瞬时错误（502/503/504）做指数退避重试，最多 3 次
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
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
        if resp.status_code == 200:
            break
        if resp.status_code >= 500 and attempt < max_attempts:
            wait = attempt * 5
            logger.warning(f"AI API 返回 {resp.status_code}，{wait}s 后重试（第 {attempt}/{max_attempts} 次）")
            await asyncio.sleep(wait)
            continue
        raise Exception(f"AI API error: {resp.status_code} - {resp.text[:200]}")

    data = resp.json()
    choices = data.get("choices", [])
    if not choices:
        raise Exception("AI 返回空结果")
    return choices[0].get("message", {}).get("content", "")


async def describe_image_with_ai(image_bytes: bytes, image_ext: str, page_num: int, subject_name: str) -> str:
    """用AI视觉模型识别图片内容（科目名作为 prompt 参数，不再硬编码课程）"""
    if not AI_API_KEY or not AI_API_BASE or not AI_MODEL:
        return f"[图片{page_num}页: AI未配置]"

    # 转base64
    b64 = base64.b64encode(image_bytes).decode()
    mime = "image/png" if image_ext == "png" else "image/jpeg"

    try:
        async with httpx.AsyncClient(timeout=60, limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)) as client:
            resp = await client.post(
                f"{AI_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {AI_API_KEY}"},
                json={
                    "model": AI_MODEL,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"这是《{subject_name}》课件第{page_num}页的图片。请详细描述这张图的内容，包括：\n1. 图的类型（结构图/流程图/时序图/接线图/表格等）\n2. 图中的所有文字标注\n3. 图的结构和组成部分\n4. 这张图想表达的核心知识点\n\n请用中文回答，尽量详细，因为这些信息将用于生成学习笔记和考试题目。"
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime};base64,{b64}"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 1000,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                return f"[图片识别失败: HTTP {resp.status_code}]"
    except Exception as e:
        return f"[图片识别异常: {str(e)[:50]}]"


async def process_image_recognition(file_id: str, subject_name: str, image_files: list):
    """后台识别课件图片并追加到文件文本（上传接口只提取文本，图片识别在这里异步执行）

    image_files: [(page_num, 图片文件路径), ...]，数量已在上传侧限制为 MAX_IMAGES_PER_FILE
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        descriptions = []
        for page_num, img_path in image_files:
            try:
                with open(img_path, "rb") as f:
                    img_bytes = f.read()
                ext = os.path.splitext(img_path)[1].lstrip(".")
                desc = await describe_image_with_ai(img_bytes, ext, page_num, subject_name)
                if desc and not desc.startswith("["):
                    descriptions.append(f"【第{page_num}页图片】\n{desc}")
                    logger.info(f"[image-recognition] file={file_id} 第{page_num}页图片已识别")
                else:
                    logger.warning(f"[image-recognition] file={file_id} 第{page_num}页图片识别失败: {desc}")
            except Exception as e:
                logger.warning(f"[image-recognition] file={file_id} 读取图片 {img_path} 失败: {e}")

        if descriptions:
            uploaded = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if uploaded:
                img_text = "\n\n=== 课件图片内容（AI识别）===\n\n" + "\n\n".join(descriptions)
                uploaded.image_descriptions = img_text
                uploaded.extracted_text = (uploaded.extracted_text or "") + img_text
                uploaded.char_count = len(uploaded.extracted_text)
                db.commit()
    except Exception as e:
        logger.error(f"[image-recognition] file={file_id} 后台识别失败: {e}", exc_info=True)
    finally:
        for _, img_path in image_files:
            try:
                os.remove(img_path)
            except OSError:
                pass
        db.close()
