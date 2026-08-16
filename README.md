# 逢考必过（exam-prep）

期末复习 PWA — 上传课件（PDF/PPT/Word）自动生成练习题，用 FSRS 间隔重复算法科学安排复习。面向大学生的考试复习工具。

## 功能

- **课件导入**：支持 PDF / PPT / Word，后端解析后自动生成选择题、判断题
- **科目管理**：自定义科目，按科目组织题库与复习
- **练习模式**：刷题 + 即时解析，支持错题收录
- **智能复习**：FSRS 间隔重复算法（ts-fsrs），到期卡片自动进入复习队列
- **错题本**：自动收录错题，支持重做
- **模考**：模拟考试模式，计时 + 成绩统计
- **每日计划**：按目标生成当日复习任务，进度可视化
- **成就系统**：经验 / 等级 / 连续天数 / 成就徽章，游戏化激励
- **数据备份**：一键导出全量数据（档案 + 题库 + 复习记录）为 JSON，支持导入恢复

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS，IndexedDB（题库/进度/复习卡片）+ localStorage（档案/成就）
- **复习算法**：ts-fsrs（FSRS-5 间隔重复）
- **文档解析**：pdfjs-dist / mammoth / pptxtojson（前端），后端另有 PDF/Word 解析服务
- **后端**：FastAPI + SQLite，负责课件解析任务、AI 出题代理、用户登录与数据同步

## 快速开始

### 前端

```bash
npm install
npm run dev        # 开发模式
npm run build      # 构建产物 → dist/
npm run preview    # 预览构建结果
```

### 后端

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 填入 AI 服务配置
uvicorn main:app --reload --port 8000
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `SECRET_KEY` | JWT 签名密钥，生产环境必须设置随机值 |
| `AI_API_KEY` | 出题用 AI 服务的 API Key |
| `AI_API_BASE` | AI 服务 Base URL |
| `AI_MODEL` | 出题模型名 |
| `AI_MODELS` | AI 代理允许使用的模型白名单（逗号分隔，需包含 `AI_MODEL`） |

## 数据说明

题库、复习记录和成就存储在浏览器本地（IndexedDB + localStorage）。登录后数据可同步到服务器，课件解析和 AI 出题需要后端服务。换设备前建议先导出 JSON 备份。

## 项目结构

```
src/
├── api/           # 后端接口（课件解析任务、登录同步）
├── components/    # 通用组件（QuizCard/SubjectSelector 等）
├── pages/         # 页面（练习/复习/模考/计划/我的 等）
├── stores/        # 状态管理（题库/结果/学习计划）
└── utils/         # FSRS 算法封装、复习计划等
backend/
├── main.py        # FastAPI 入口
├── auth.py        # 登录认证
├── geetest.py     # 人机验证
└── routes/        # ai_proxy / upload / sync 等
```

## License

MIT
