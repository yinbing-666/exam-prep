# 逢考必过 exam-prep — 前端后端需求分析报告

> 分析日期：2026-06-22
> 项目路径：/home/agentuser/projects/exam-prep/src/
> 已有后端：FastAPI (port 8099)，已有接口：auth/register, auth/login, sync/push, sync/pull, ai/chat, geetest/config
> 数据库：SQLite

---

## 一、总体架构现状

| 层级 | 当前实现 | 存储位置 |
|------|---------|---------|
| 数据存储 | IndexedDB (10个store) | 浏览器本地 |
| AI调用 | 前端直连外部API（硬编码API Key） | client.ts 直接fetch |
| 文件解析 | 浏览器端解析 PDF/DOCX/PPTX/TXT/MD | fileParser.ts |
| 用户认证 | 后端已实现，前端未接入 | 后端 SQLite |
| 数据同步 | 后端已实现，前端未接入 | 后端 SQLite |
| 科目管理 | localStorage | 浏览器本地 |
| 游戏化 | IndexedDB | 浏览器本地 |

**核心问题：整个前端是 100% 纯前端应用，后端已有的 auth/sync/ai 三个模块均未被前端调用。**

---

## 二、逐模块分析

### 📦 stores/ — 数据层（全部纯前端）

#### 1. db.ts — IndexedDB连接层
- **状态**：纯前端
- **需要后端**：不需要直接改，但它是 sync 的数据源
- **优先级**：—

#### 2. studySets.ts — 题集CRUD
- **状态**：纯前端，IndexedDB读写
- **需要后端**：通过 sync/push + sync/pull 实现云端同步
- **优先级**：**P0** — 核心数据，换设备必丢

#### 3. results.ts — 答题结果 & 错题
- **状态**：纯前端，IndexedDB读写
- **需要后端**：通过 sync/push + sync/pull 实现云端同步
- **优先级**：**P0** — 核心数据

#### 4. modules.ts — 知识模块
- **状态**：纯前端，IndexedDB读写
- **需要后端**：通过 sync 实现同步
- **优先级**：**P0** — 核心数据

#### 5. mocks.ts — 模拟考试
- **状态**：纯前端，IndexedDB读写
- **需要后端**：通过 sync 实现同步
- **优先级**：**P1** — 重要但非每日核心

#### 6. materials.ts — 资料库
- **状态**：纯前端，IndexedDB存储全文内容
- **需要后端**：通过 sync 实现同步（注意：资料内容可能很大，需考虑分片或仅同步元数据）
- **优先级**：**P1**

#### 7. dailyPlans.ts — 每日计划
- **状态**：纯前端，IndexedDB读写
- **需要后端**：通过 sync 实现同步
- **优先级**：**P1**

#### 8. gamification.ts — 游戏化系统
- **状态**：纯前端，IndexedDB读写
- **包含**：UserProfile（等级/XP/打卡）、Achievement（成就）、排行榜
- **需要后端**：
  - `getProfile/saveProfile` → sync 同步
  - `getAchievements/saveAchievements` → sync 同步
  - `getLeaderboard` → **需要新API**：真实用户排行榜（当前是虚拟角色）
  - `recordQuiz/updateStreak/addXP` → sync 同步
- **优先级**：Profile sync **P0**，排行榜 **P2**

---

### 🤖 ai/ — AI层（前端直连外部API）

#### 9. client.ts — AI客户端
- **状态**：⚠️ **硬编码API Key在前端代码中**（安全风险！）
- **当前调用**：直接 fetch 外部 MiMo API
- **需要后端**：应改用后端 `/api/ai/chat` 代理，隐藏 API Key
- **具体改造**：
  - `callAI()` 函数应改为调用 `POST /api/ai/chat`，将 systemPrompt + userContent 包装成 messages
  - 后端 `/api/ai/chat` 已存在，可直接复用
  - 自定义模型配置仍可留在前端（用户自己的Key），但内置免费模型必须走后端
- **优先级**：**P0** — API Key暴露在前端是严重安全问题

#### 10. generators.ts — AI生成器
- **状态**：通过 client.ts 调用AI，本身无直接后端调用
- **包含**：generateQuestions、generateModules、generateMockExam、generateMemorize、generateDailyPlan
- **需要后端**：改接 client.ts 后自动生效，无需额外API
- **优先级**：跟随 client.ts

#### 11. prompts.ts — Prompt模板
- **状态**：纯前端，静态文本
- **需要后端**：不需要
- **优先级**：—

---

### 🔧 utils/ — 工具层

#### 12. storage.ts — localStorage封装
- **状态**：纯前端
- **需要后端**：不需要（辅助工具）
- **优先级**：—

#### 13. subjects.ts — 科目管理
- **状态**：纯前端，localStorage
- **需要后端**：通过 sync 实现同步（科目数据量小，适合完整同步）
- **优先级**：**P0** — 科目是入口数据

#### 14. fileParser.ts — 文件解析
- **状态**：纯前端，浏览器端解析
- **需要后端**：当前方案已足够好（无需上传文件到服务器）
- **可选增强**：OCR识别扫描版PDF → 需要后端 OCR API
- **优先级**：当前 **不需要**，OCR增强 **P2**

#### 15. fsrs-service.ts — 间隔重复调度
- **状态**：纯前端，IndexedDB + localStorage
- **需要后端**：
  - FSRS卡片数据通过 sync 同步
  - Daily challenge tracking (localStorage) → 可选同步
- **优先级**：卡片同步 **P1**，daily challenge **P2**

#### 16. readiness.ts — 就绪度计算
- **状态**：纯前端，读取本地数据计算
- **需要后端**：不需要（计算逻辑在前端，数据通过sync同步后自动生效）
- **优先级**：—

---

### 📄 pages/ — 页面层

#### 17. Home.tsx — 首页
- **状态**：纯前端，读取本地 gamification/stores 数据
- **需要后端**：无直接API需求（数据层同步后自动生效）
- **优先级**：—

#### 18. Dashboard.tsx — 仪表盘
- **状态**：纯前端
- **需要后端**：无
- **优先级**：—

#### 19. Input.tsx — 内容导入/AI出题
- **状态**：调用 ai/generators 生成题目
- **需要后端**：AI调用走后端代理（跟随 client.ts 改造）
- **优先级**：跟随 P0

#### 20. Modules.tsx — 知识模块
- **状态**：调用 ai/generators 生成模块
- **需要后端**：同上
- **优先级**：跟随 P0

#### 21. Plan.tsx — 计划页（大文件，新旧UI混合）
- **状态**：读取本地数据 + AI生成每日计划
- **需要后端**：AI调用走后端代理
- **优先级**：跟随 P0

#### 22. Quiz.tsx — 答题页
- **状态**：纯前端（使用模拟数据/mock questions）
- **需要后端**：无直接需求
- **优先级**：—

#### 23. Practice.tsx — 练习主入口
- **状态**：纯前端，读取本地数据
- **需要后端**：无
- **优先级**：—

#### 24. Review.tsx — 错题复习
- **状态**：纯前端（使用硬编码模拟数据！）
- **需要后端**：需接入真实错题数据（来自 stores/results）
- **优先级**：**P1** — 当前是假数据

#### 25. ReviewSession.tsx — FSRS复习会话
- **状态**：纯前端，使用 fsrs-service
- **需要后端**：无（数据同步后自动生效）
- **优先级**：—

#### 26. MockExams.tsx — 模拟考试
- **状态**：调用 ai/generators 生成试卷
- **需要后端**：AI调用走后端代理
- **优先级**：跟随 P0

#### 27. Mistakes.tsx — 错题本
- **状态**：纯前端，读取 IndexedDB
- **需要后端**：无（数据同步后自动生效）
- **优先级**：—

#### 28. Study.tsx — 学习中心
- **状态**：纯前端
- **需要后端**：无
- **优先级**：—

#### 29. Stats.tsx — 统计页
- **状态**：纯前端，使用硬编码模拟数据！
- **需要后端**：需接入真实统计数据
- **优先级**：**P1**

#### 30. Settings.tsx — 模型设置
- **状态**：纯前端，管理自定义AI模型配置
- **需要后端**：无（配置存localStorage）
- **优先级**：—

#### 31. Profile.tsx — 个人资料
- **状态**：纯前端，使用硬编码模拟数据！
- **需要后端**：需接入真实 gamification 数据
- **优先级**：**P1**

#### 32. Materials.tsx — 资料库
- **状态**：纯前端
- **需要后端**：无（数据同步后自动生效）
- **优先级**：—

#### 33. Me.tsx — 我的页面（新版）
- **状态**：纯前端，读取真实 gamification 数据
- **需要后端**：
  - 数据导出/导入已有（JSON文件）
  - 可选：云端备份
- **优先级**：—

#### 34. Discover.tsx — 发现页
- **状态**：纯前端，虚拟排行榜
- **需要后端**：
  - 真实排行榜 API（`GET /api/leaderboard`）
  - 精选资源/学习方法可改为后端配置
- **优先级**：排行榜 **P2**，资源内容 **P2**

#### 35. DailyPlanPage.tsx — 每日计划页
- **状态**：调用 ai/generators 生成计划
- **需要后端**：AI调用走后端代理
- **优先级**：跟随 P0

---

## 三、需要新增的后端API清单

### 🔴 P0 — 必须（上线前必须完成）

| # | API | 方法 | 说明 | 前端调用方 |
|---|-----|------|------|-----------|
| 1 | `/api/ai/chat` | POST | **已有**，前端需接入 | client.ts → 所有AI功能 |
| 2 | `/api/sync/push` | POST | **已有**，前端需接入 | 所有 stores 写操作 |
| 3 | `/api/sync/pull` | POST | **已有**，前端需接入 | 应用启动时拉取 |
| 4 | `/api/auth/register` | POST | **已有**，前端需接入 | 登录注册页 |
| 5 | `/api/auth/login` | POST | **已有**，前端需接入 | 登录注册页 |

**P0 核心工作：前端接入已有的4个后端API（auth + sync + ai）**
- 移除 client.ts 中的硬编码 API Key
- 添加登录/注册页面
- 在 stores 写操作后自动 push 到后端
- 应用启动时从后端 pull 最新数据
- Token 管理（localStorage 存储 JWT）

### 🟡 P1 — 重要（体验提升）

| # | API | 方法 | 说明 | 优先级理由 |
|---|-----|------|------|-----------|
| 6 | `/api/user/profile` | GET/PUT | 用户资料（昵称/头像） | 个人中心展示 |
| 7 | `/api/study/daily-stats` | GET | 每日学习统计（真实数据） | Stats.tsx 当前是假数据 |
| 8 | `/api/study/review-data` | GET | 真实错题复习数据 | Review.tsx 当前是假数据 |

### 🟢 P2 — 锦上添花

| # | API | 方法 | 说明 | 优先级理由 |
|---|-----|------|------|-----------|
| 9 | `/api/leaderboard` | GET | 真实用户排行榜 | Discover.tsx 当前是虚拟角色 |
| 10 | `/api/resources` | GET | 精选资源/学习方法配置 | 可后端配置化 |
| 11 | `/api/ai/ocr` | POST | OCR识别扫描版PDF | fileParser.ts 增强 |
| 12 | `/api/study/analytics` | GET | 深度学习分析（趋势/预测） | 高级统计功能 |

---

## 四、前端改造工作量评估

### P0：接入已有后端（预计 3-5 天）

1. **添加认证模块**（1天）
   - 新增 `pages/Login.tsx`（登录/注册页面）
   - 新增 `utils/auth.ts`（token管理、登录状态检查）
   - App.tsx 路由守卫

2. **改造 AI 调用**（0.5天）
   - `ai/client.ts` 的 `callAI()` 改为调用 `/api/ai/chat`
   - 内置免费模型走后端代理，自定义模型保持前端直连

3. **接入数据同步**（1.5天）
   - 新增 `utils/sync.ts`（同步管理器）
   - 写操作后自动 push（debounce）
   - 启动时 pull 合并数据
   - 冲突处理策略（last-write-wins）

4. **测试联调**（1天）

### P1：修复假数据页面（预计 1-2 天）

1. Review.tsx → 接入 stores/results 真实数据
2. Stats.tsx → 接入真实学习记录
3. Profile.tsx → 接入 gamification 真实数据

---

## 五、关键发现与风险

### ⚠️ 安全风险
- `ai/client.ts` 第20-21行硬编码了 MiMo API Key：`tp-sbgjb2s69big6nlehyaa7ie21hgwgz5m3xgi7onngkm4t2ki`
- 必须在 P0 阶段移除，改用后端代理

### ⚠️ 假数据页面
- `Review.tsx`：使用硬编码的示例错题（第11-15行）
- `Stats.tsx`：使用硬编码的模拟趋势数据（第112行 `[3, 5, 2, 8, 6, 4, 7]`）
- `Profile.tsx`：使用硬编码的统计数据（第10-16行 `totalQuestions: 1248` 等）
- `Quiz.tsx`：使用随机生成的模拟题目（第28-36行）

### 💡 架构优势
- IndexedDB 的 store 结构与后端 sync API 的 VALID_STORES 完全对应
- 后端 sync 已支持增量同步（since 参数）
- AI 代理已实现，前端只需改调用地址

### 💡 用户场景考虑
- 个人开发者，无企业主体 → 无需微信登录等企业功能
- 用户量预期不大 → SQLite 够用，无需迁移
- 考试备考场景 → 数据丢失是致命的，sync 是最高优先级
