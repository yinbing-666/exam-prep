from sqlalchemy import Column, String, Integer, DateTime, Text, Float
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # uuid
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    nickname = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())
    last_sync = Column(DateTime, nullable=True)


class ProcessingJob(Base):
    """异步处理任务"""
    __tablename__ = "processing_jobs"
    
    id = Column(String, primary_key=True)  # uuid
    user_id = Column(String, index=True, nullable=False)
    job_type = Column(String, nullable=False)  # 'knowledge_list', 'quiz', 'mock_exam'
    status = Column(String, default="pending")  # 'pending', 'processing', 'completed', 'failed'
    
    # 输入参数
    subject_id = Column(String, nullable=True)
    file_ids = Column(Text, nullable=True)  # JSON array of file IDs
    config = Column(Text, nullable=True)  # JSON config
    
    # 输出结果
    result = Column(Text, nullable=True)  # JSON result
    error = Column(Text, nullable=True)
    
    # 进度
    progress = Column(Integer, default=0)  # 0-100
    progress_text = Column(String, default="")  # "正在处理第3/12个文件..."
    
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class UserSync(Base):
    """每个用户的同步数据"""
    __tablename__ = "user_sync"
    __table_args__ = {"sqlite_autoincrement": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    store_name = Column(String, nullable=False)
    item_id = Column(String, nullable=False)
    data = Column(Text, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AICallLog(Base):
    """AI调用计数"""
    __tablename__ = "ai_call_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    model = Column(String, nullable=False)
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Subject(Base):
    """用户自定义科目"""
    __tablename__ = "subjects"

    id = Column(String, primary_key=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    full_name = Column(String, default="")
    icon = Column(String, default="📚")
    color = Column(String, default="#f97316")
    
    # 出题配置
    question_types = Column(Text, default='["选择","判断","简答"]')
    exam_style = Column(String, default="")
    difficulty_base = Column(Integer, default=60)
    difficulty_advanced = Column(Integer, default=30)
    difficulty_challenge = Column(Integer, default=10)
    exam_reference = Column(String, default="")
    special_requirements = Column(String, default="")
    
    # 统计
    total_uploaded = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    total_reviews = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UploadedFile(Base):
    """已上传的课件文件"""
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True)
    user_id = Column(String, index=True, nullable=False)
    subject_id = Column(String, index=True, nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    extracted_text = Column(Text, default="")
    image_descriptions = Column(Text, default="")  # AI识别的图片描述
    page_count = Column(Integer, default=0)
    char_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class AIGeneratedQuestion(Base):
    """AI出题记录 — 防止重复出题"""
    __tablename__ = "ai_questions"

    id = Column(String, primary_key=True)
    user_id = Column(String, index=True, nullable=False)
    subject_id = Column(String, index=True, nullable=False)
    
    # 题目内容（摘要，用于去重）
    question_hash = Column(String, index=True, nullable=False)  # 内容hash
    question_text = Column(Text, nullable=False)   # 题目文本
    question_type = Column(String, nullable=False)  # 选择/判断/简答等
    correct_answer = Column(Text, default="")
    explanation = Column(Text, default="")
    
    # 来源
    source_file_id = Column(String, nullable=True)  # 来自哪个上传文件
    source_chunk = Column(Text, default="")         # 出题时使用的文本片段
    
    # 统计
    times_reviewed = Column(Integer, default=0)
    last_reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
