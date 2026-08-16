from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# 必须在导入任何路由之前加载 .env，否则路由模块里的 os.getenv() 拿不到值
load_dotenv()

from database import engine, Base
from routes.auth import router as auth_router
from routes.sync import router as sync_router
from routes.ai_proxy import router as ai_router
from routes.subjects import router as subjects_router
from routes.upload import router as upload_router
from routes.questions import router as questions_router
from routes.jobs import router as jobs_router
from geetest import router as geetest_router

# 创建表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="逢考必过 API", version="1.0.0")

_allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_allowed_origins = [o.strip() for o in _allowed.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sync_router)
app.include_router(ai_router)
app.include_router(subjects_router)
app.include_router(upload_router)
app.include_router(questions_router)
app.include_router(jobs_router)
app.include_router(geetest_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
