# 逢考必过 - AI 入口文档

> 更新：2026-06-22
> 当前定位：考试备考 PWA，Phase 4 产品级橙黄游戏化移动端 UI，图标由 `GameIcon` 中枢统一管理

## 项目概况

- **路径**: `D:\逢考必过\exam-prep`
- **技术栈**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Framer Motion
- **数据层**: IndexedDB + localStorage
- **AI 层**: MiMo API，通过 OpenAI 兼容接口生成题目、模块和计划
- **设计目标**: 橙黄游戏化学习 App，不是后台、Notion 或通用模板风格

## 核心功能

1. **科目管理** - 多科目切换，每个科目独立题库
2. **刷题模式** - 选择、判断、简答、论述
3. **速背卡片** - 翻转卡片，认识/不认识反馈
4. **模拟考试** - 全真模拟，AI 出卷
5. **错题本** - 自动收集错题
6. **FSRS 复习** - 基于遗忘曲线的智能复习
7. **游戏化** - XP、等级、打卡、成就、排行榜
8. **数据管理** - 导出、导入、清除本地数据

## 关键路径

```text
src/
  App.tsx                 # 路由 + 底部 Tab 栏
  index.css               # 全局样式、卡片、按钮、进度条、背景
  components/
    TargetUI.tsx           # 当前主要 UI 组件入口
    SharedUI.tsx           # 3D asset 映射 + GameIcon 图标中枢 + 2.5D 矢量图标
    QuizCard.tsx           # 做题卡片组件
    ActivationModal.tsx    # 激活码弹窗
  pages/
    Home.tsx               # 首页
    Plan.tsx               # 计划页
    Practice.tsx            # 练习页
    Discover.tsx            # 发现页
    Me.tsx                  # 我的页
    Dashboard.tsx           # 备考仪表盘
  stores/
    gamification.ts        # XP/等级/打卡/成就逻辑
    dailyPlans.ts          # 每日计划
    db.ts                  # IndexedDB 连接层
    index.ts               # 统一导出
  types/
    gamification.ts        # UserProfile, Achievement, XP_RULES
    index.ts               # DailyPlan, Question, StudySet 等
  utils/
    subjects.ts            # 多科目管理
    activation.ts          # 激活码
    readiness.ts           # 备考就绪度计算
    fsrs-service.ts        # FSRS 间隔重复
  ai/
    client.ts              # MiMo API 调用层
    generators.ts          # 出题/模块/计划生成器
    prompts.ts             # AI prompt 模板
```

## 当前 UI 组件分工

### `TargetUI.tsx`

当前主要 UI 组件在这里：

- `PageShell`
- `HeroHeader`
- `Card`
- `SectionTitle`
- `AssetIcon`：兼容旧调用，内部转发到 `GameIcon`，默认输出裸图标 `framed={false}`
- `IconPod`：唯一通用图标垫片容器，内部经裸 `AssetIcon` 进入 `GameIcon`
- `ProgressBar`
- `AccuracyRing`
- `OrangeButton`
- `StatStrip`
- `EmptyState`
- `MedalBadge`
- `ShieldBadge`
- `daysUntil`

### `SharedUI.tsx`

当前是资产和图标中枢：

```ts
get3DAsset(emoji: string): string
GameIcon({ type, size, className, framed })
StreakCrownIcon
MascotRabbitIcon
MistakeBookIcon
```

不要从 `SharedUI` 恢复旧组件。旧的 `GradientHeader`、`LeaderboardPodium`、`BarChart`、`DayDots`、`DecorativeStars`、`Emoji3D` 已经不再作为组件入口使用。

## GameIcon 图标规范

新增卡片、列表、标题、导航、工具入口、成就图标时，优先使用：

```tsx
<GameIcon type="crown" size="lg" />
<GameIcon type="rabbit" size="lg" />
<GameIcon type="mistake" size="md" />
<GameIcon type="math" size="md" />
<GameIcon type="english" size="md" />
<GameIcon type="clock" size="sm" />
<GameIcon type="target" size="md" />
<GameIcon type="book" size="md" />
<GameIcon type="trophy" size="md" />
<GameIcon type="fox" size="md" />
<GameIcon type="cat" size="md" />
<GameIcon type="bear" size="md" />
```

`GameIcon` 默认 `framed={true}`，独立图标会带统一 `game-icon-frame` 垫片。放进 `IconPod`、徽章、头像框、领奖台动物头像、彩色模式卡图标仓时必须使用 `framed={false}`，避免双层底座或两个图标贴在一起。

不要新增裸 `<img src={get3DAsset(...)}` 或页面级 emoji 图标。正文提示文字里的 emoji 可以保留，但卡片、列表、导航、成就和头像位置不能使用文本 emoji。

## 设计系统摘要

- **全局外壳**: 橙色到暖白渐变，必须包裹页面内容
- **页面宽度**: `max-w-[480px]`
- **主内容区**: `relative z-20 mt-7 px-6 space-y-8`，信息密度高的页面可用 `space-y-9`
- **卡片**: 白底、24px 圆角、半透明橙色边框、轻量阴影；Phase 4 后不要继续叠加重阴影
- **模块间距**: 模块之间必须露出橙色/暖橙背景
- **字体**: 数字使用 `num-3d font-[900] tracking-tighter text-gray-800`，普通列表用 `font-bold`
- **图标**: 统一进入 `GameIcon` / `AssetIcon` / `IconPod`，只允许一个图标垫片层
- **按钮**: 主要操作使用橙黄渐变厚底按钮，按下下沉 `2px`
- **兼容路由**: `/study/*` 重定向到 `/practice`，`/profile` 重定向到 `/me`

完整规范见：

- `design.md`
- `GEMINI-SPEC.md`
- `SHAREDUI-REFERENCE.md`
- `gemini-optimization-prompt.md`

## 视觉禁忌

- 不要恢复纯白外框或纯白页面背景
- 不要让白卡贴屏幕左右边缘
- 不要让多个模块紧贴在一起
- 不要把主列表做成拥挤的 `divide-y`
- 不要把普通列表文字全部做成 `font-black`
- 不要新增裸 `<img>` 图标或散落 emoji 图标
- 不要在 `IconPod` 或头像框内嵌默认 framed 的 `GameIcon`
- 不要把排行榜头像继续做成书本或文本 emoji，优先使用 `fox`、`cat`、`bear`、`animalRabbit`
- 不要删除 `/study/*` 和 `/profile` 的兼容重定向
- 不要恢复旧版 `SharedUI` 组件体系

## 已知约束

- PWA，不支持服务端渲染
- 数据主要在 IndexedDB，无云同步
- Tailwind CSS 4，自定义类名定义在 `index.css`
- 动态拼接 Tailwind 类名可能无法被构建器识别

## 验证

视觉或文档之外的代码改动后至少运行：

```bash
npm run build
```
