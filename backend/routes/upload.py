"""文件上传解析 API — PDF/DOCX/TXT/MD → 提取文本；图片识别作为后台任务执行"""
import uuid
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import UploadedFile, Subject
from auth import get_current_user_id
from routes.jobs import process_image_recognition, MAX_IMAGES_PER_FILE

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = "/tmp/exam-uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

# AI配置（从环境变量读取）
AI_API_KEY = os.getenv("AI_API_KEY", "")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024


def extract_images_from_pdf(filepath: str) -> list:
    """从PDF提取图片，返回[(page_num, image_bytes, image_ext), ...]"""
    images = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(filepath)
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)
            for img_idx, img in enumerate(image_list):
                xref = img[0]
                try:
                    base_image = doc.extract_image(xref)
                    if base_image:
                        image_bytes = base_image["image"]
                        image_ext = base_image.get("ext", "png")
                        # 只处理大于1KB的图片（过滤掉小图标）
                        if len(image_bytes) > 1024:
                            images.append((page_num + 1, image_bytes, image_ext))
                except Exception as e:
                    print(f"图片提取跳过 xref={xref}: {e}")
                    continue
        doc.close()
    except Exception as e:
        print(f"图片提取失败: {e}")
    return images


def extract_text_from_pdf(filepath: str) -> tuple:
    """从PDF提取文本，返回(text, page_count)"""
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n---\n\n".join(pages), len(pdf.pages)
    except ImportError:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(filepath)
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n---\n\n".join(pages), len(reader.pages)
        except Exception as e:
            return f"[PDF解析失败: {e}]", 0
    except Exception as e:
        return f"[PDF解析失败: {e}]", 0


def extract_text_from_docx(filepath: str) -> tuple:
    """从DOCX提取文本"""
    try:
        from docx import Document
        doc = Document(filepath)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs), len(doc.sections)
    except Exception as e:
        return f"[DOCX解析失败: {e}]", 0


def extract_text_from_txt(filepath: str) -> tuple:
    """从TXT/MD提取文本"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()
        return text, text.count("\n") + 1
    except UnicodeDecodeError:
        with open(filepath, "r", encoding="gbk", errors="ignore") as f:
            text = f.read()
        return text, text.count("\n") + 1
    except Exception as e:
        return f"[文本读取失败: {e}]", 0


@router.post("")
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    request_length = request.headers.get("content-length")
    if request_length:
        try:
            if int(request_length) < 0 or int(request_length) > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "请求体大小不能超过 50MB")
        except ValueError:
            raise HTTPException(400, "请求 Content-Length 无效")

    # 验证科目归属
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user_id).first()
    if not subject:
        raise HTTPException(400, "科目不存在")

    # 验证文件类型
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件类型: {ext}，仅支持 PDF/DOCX/TXT/MD")

    content_length = file.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) < 0 or int(content_length) > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "文件大小不能超过 50MB")
        except ValueError:
            raise HTTPException(400, "文件 Content-Length 无效")

    # 保存文件到临时目录
    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    try:
        file_size = 0
        with open(save_path, "wb") as destination:
            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                file_size += len(chunk)
                if file_size > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "文件大小不能超过 50MB")
                destination.write(chunk)

        # 提取文本
        if ext == ".pdf":
            text, page_count = extract_text_from_pdf(save_path)
        elif ext == ".docx":
            text, page_count = extract_text_from_docx(save_path)
        else:
            text, page_count = extract_text_from_txt(save_path)

        # 限制文本长度
        MAX_CHARS = 500_000
        if len(text) > MAX_CHARS:
            text = text[:MAX_CHARS] + f"\n\n[...截断，原文共{len(text)}字符]"

        # 提取PDF图片并保存到临时文件，识别放到后台任务执行（不在请求内串行等 AI）
        image_total = 0
        image_queued = 0
        image_files = []
        if ext == ".pdf" and AI_API_KEY:
            images = extract_images_from_pdf(save_path)
            image_total = len(images)
            for idx, (page_num, img_bytes, img_ext) in enumerate(images[:MAX_IMAGES_PER_FILE]):
                img_path = os.path.join(UPLOAD_DIR, f"{file_id}_img{idx}.{img_ext}")
                with open(img_path, "wb") as f:
                    f.write(img_bytes)
                image_files.append((page_num, img_path))
            image_queued = len(image_files)

        # 存入数据库
        uploaded = UploadedFile(
            id=file_id,
            user_id=user_id,
            subject_id=subject_id,
            filename=file.filename or "unknown",
            file_type=ext.lstrip("."),
            file_size=file_size,
            extracted_text=text,
            image_descriptions="",
            page_count=page_count,
            char_count=len(text),
        )
        db.add(uploaded)

        # 更新科目统计
        subject.total_uploaded = (subject.total_uploaded or 0) + 1
        db.commit()
        db.refresh(uploaded)

        # 图片识别作为后台 job 阶段执行，识别完成后追加到 extracted_text
        if image_files:
            background_tasks.add_task(
                process_image_recognition, file_id, subject.name, image_files
            )
    finally:
        try:
            os.remove(save_path)
        except FileNotFoundError:
            pass
        except OSError as exc:
            logging.warning("Failed to remove temp file %s: %s", save_path, exc)

    return {
        "id": uploaded.id,
        "filename": uploaded.filename,
        "fileType": uploaded.file_type,
        "fileSize": uploaded.file_size,
        "pageCount": uploaded.page_count,
        "charCount": uploaded.char_count,
        "imageCount": image_queued,
        "imageSkipped": max(0, image_total - image_queued),
        "textPreview": text[:500] + ("..." if len(text) > 500 else ""),
        "createdAt": str(uploaded.created_at) if uploaded.created_at else None,
    }


@router.get("/files")
def list_files(
    subject_id: str = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    q = db.query(UploadedFile).filter(UploadedFile.user_id == user_id)
    if subject_id:
        q = q.filter(UploadedFile.subject_id == subject_id)
    files = q.order_by(UploadedFile.created_at.desc()).all()
    return {
        "files": [
            {
                "id": f.id,
                "filename": f.filename,
                "fileType": f.file_type,
                "fileSize": f.file_size,
                "pageCount": f.page_count,
                "charCount": f.char_count,
                "subjectId": f.subject_id,
                "createdAt": str(f.created_at) if f.created_at else None,
            }
            for f in files
        ]
    }


@router.get("/files/{file_id}/text")
def get_file_text(file_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    f = db.query(UploadedFile).filter(UploadedFile.id == file_id, UploadedFile.user_id == user_id).first()
    if not f:
        raise HTTPException(404, "文件不存在")
    return {
        "id": f.id,
        "filename": f.filename,
        "text": f.extracted_text,
        "charCount": f.char_count,
    }


@router.delete("/files/{file_id}")
def delete_file(file_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    f = db.query(UploadedFile).filter(UploadedFile.id == file_id, UploadedFile.user_id == user_id).first()
    if not f:
        raise HTTPException(404, "文件不存在")
    
    subject = db.query(Subject).filter(Subject.id == f.subject_id).first()
    if subject and subject.total_uploaded and subject.total_uploaded > 0:
        subject.total_uploaded -= 1
    
    db.delete(f)
    db.commit()
    return {"ok": True}
