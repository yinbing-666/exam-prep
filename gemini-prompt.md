# 逢考必过 App - Gemini 前端优化提示词

## 项目背景

这是一个考试复习 PWA，技术栈为 React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion。项目已有完整数据层，包括 IndexedDB、FSRS、游戏化、科目、错题、模拟考试等。

当前任务不是重新设计，而是在 Phase 4 已完成的 React 页面基础上继续做细节打磨。不要推翻现有设计系统。

## 当前设计方向

目标不是后台管理、Notion、Linear 或通用 SaaS，而是移动端学习 App：

- 高饱和橙黄头部和外壳
- 暖橙背景包裹白色浮层卡片
- 模块之间露出橙色间隔
- 卡片大圆角、轻阴影、半透明橙色边框
- 数字有游戏化重量，普通列表文字不要过粗
- 图标统一进入 `GameIcon` 中枢，保持 Duolingo 2.5D 粗描边和物理厚度
- Phase 4 后卡片、阴影、按钮已经收敛减重，不要继续堆更重的 3D 阴影

## 技术约束

只做视觉与排版优化，优先修改：

- `src/components/TargetUI.tsx`
- `src/components/SharedUI.tsx`
- `src/pages/*.tsx`
- `src/index.css`
- `src/App.tsx`

不要修改：

- store 数据结构
- IndexedDB schema
- FSRS 算法
- AI prompt 逻辑
- 数据主路由结构。兼容路由 `/study/* -> /practice`、`/profile -> /me` 已存在，不要删除。

## 颜色系统

```text
全局外壳:
linear-gradient(180deg, #ff7900 0%, #ff9500 190px, #ffe4c4 360px, #fff1df 100%)

卡片背景: #ffffff
页面暖白: #fff9f2
主橙: #f97316
深橙: #ea580c
亮橙: #ff6500
金黄: #eab308
成功: #22c55e
错误: #ef4444
警告: #f59e0b
信息: #3b82f6
主文字: #1a1a1a
核心数字: #1f2937
次级文字: #656565
辅助文字: #9ca3af
```

## 布局规范

页面壳统一使用 `PageShell`：

```tsx
min-h-screen max-w-[480px] mx-auto
bg-[linear-gradient(180deg,#ff7900_0%,#ff9500_190px,#ffe4c4_360px,#fff1df_100%)]
pb-44 overflow-hidden
```

主内容区统一倾向：

```tsx
relative z-20 mt-7 px-6 space-y-8/9
```

重点：

- 白色卡片不要贴到屏幕左右边缘
- 模块之间要保留橙色/暖橙间隔
- 内部元素不要贴最外层卡片边缘
- 两个功能块之间不要紧贴

## 卡片规范

使用 `Card` 或 `.gamified-card`：

```css
background: #fff;
border-radius: 24px;
border: 1.5px solid rgba(251, 146, 60, 0.22);
box-shadow:
  0 14px 30px -4px rgba(249, 115, 22, 0.08),
  0 4px 12px -2px rgba(0, 0, 0, 0.02),
  inset 0 -4px 0 rgba(240, 240, 240, 0.5);
```

列表不要使用拥挤的分割线容器：

```tsx
// 不推荐
<div className="divide-y divide-gray-100">...</div>
```

推荐独立圆角块：

```tsx
<div className="space-y-3">
  <button className="rounded-[20px] border border-orange-100/60 bg-white px-4 py-3.5">...</button>
</div>
```

## 字体规范

- 页面大标题：`text-3xl font-black`
- 模块标题：`text-lg font-black`
- 普通列表主文案：`text-base font-bold`
- 描述：`text-sm font-bold text-gray-400`
- 辅助小字：`text-xs` 或 `text-[11px]`
- 大数字：`num-3d font-[900] tracking-tighter text-gray-800`

不要把普通列表项写成 `text-lg font-black`。这会让页面显得拥挤和粗糙。

## 图标规范

当前策略是：所有卡片、列表、标题、导航、成就、工具入口的视觉图标统一进入 `GameIcon` 中枢。

优先使用：

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
<GameIcon type="fire" size="sm" framed={false} />
```

`GameIcon` 默认 `framed={true}`，独立图标会带统一垫片。放入 `IconPod`、徽章、头像框、模式卡图标仓时必须使用 `framed={false}` 或经 `AssetIcon` 默认裸图输出。

`AssetIcon` 和 `IconPod` 已经内部转发到 `GameIcon`，可以作为旧调用兼容层。`IconPod` 是唯一通用图标垫片，不要再嵌套第二个图标垫片。

不要新增：

```tsx
<img src={get3DAsset('...')} />
<span>🏆</span>
```

正文说明中的 emoji 可以保留，但不要用 emoji 当卡片/列表左侧图标。

## 当前组件体系

### `TargetUI.tsx`

主要组件：

- `PageShell`
- `HeroHeader`
- `Card`
- `SectionTitle`
- `AssetIcon`
- `IconPod`
- `ProgressBar`
- `AccuracyRing`
- `OrangeButton`
- `StatStrip`
- `EmptyState`
- `MedalBadge`
- `ShieldBadge`
- `daysUntil`

### `SharedUI.tsx`

资产和图标中枢：

```tsx
get3DAsset(emoji)
GameIcon({ type, size, className, framed })
StreakCrownIcon
MascotRabbitIcon
MistakeBookIcon
```

不要恢复旧组件：

- `GradientHeader`
- `LeaderboardPodium`
- `BarChart`
- `DayDots`
- `DecorativeStars`
- `Emoji3D`

## 页面要求

### Home

- 自定义头部，不使用通用 `HeroHeader`
- “每一次努力，都是未来的你在感谢现在的自己。”不要换行
- 连续打卡横幅：左火焰，中间数字和文案，右 `GameIcon type="crown"`
- quote 左侧小火焰使用 `framed={false}`，不要带白色底座
- 卡片边缘必须露出橙色包裹感
- 不允许恢复 2D 红绿蓝教材插画

### Plan

- 周计划 7 天固定高度，今日态不能错位
- 中段使用单列布局，不要恢复双列
- `BarChart` 是灰色圆壳舱 + 内部彩色高光柱
- 今日任务、章节掌握度、考试准备度、FSRS、最近成就向下排列
- 任务项使用独立圆角块

### Practice

- 刷题模式使用蓝色渐变大卡
- 模拟考试使用橙金渐变大卡
- 刷题模式图标使用 `target`
- 模拟考试图标使用 `trophy`
- 错题本图标使用 `mistake`
- 错题本、FSRS、知识清单是三张独立白卡
- 三张白卡之间必须有间距，露出橙色背景
- 模式卡左侧图标必须有独立白色安全仓，不能被大卡圆角裁切

### Discover

- 学习资源为 2x2 矩阵
- 排行榜使用 podium
- 第一名皇冠使用 `GameIcon type="crown"`
- 学习工具为独立小卡
- 学习方法列表使用独立圆角块
- 列表字体不要超过 `text-base font-bold`
- 排行榜头像使用动物序列，名字必须是纯文本

### Me

- 顶部资料卡保持游戏化
- 顶部头像区使用 flex 流，不要绝对定位硬覆盖
- 三个统计卡：icon 和数字同一水平线
- 成就墙是盾牌徽章网格
- 设置列表每项独立圆角块
- 设置项字体使用 `text-base font-bold`

### Legacy Routes

- `/study/*` 兼容到 `/practice`。
- `/profile` 兼容到 `/me`。
- 不要重新引入旧的重复底部导航。

## 新用户初始状态

- 等级 Lv.1，经验值 0/100
- 连续打卡 0 天
- 刷题量 0，正确率 `--`
- 成就全部锁定
- 无科目、无计划、无题目
- 空状态必须有鼓励文案和明确 CTA

## 已有 Store API

保持现有 store、IndexedDB 和 FSRS 数据流，不要为了视觉重构更改接口。

## 验证

修改后必须运行：

```bash
npm run build
```

建议截图检查：

- `/`
- `/plan`
- `/practice`
- `/discover`
- `/me`

参考截图：

- `artifacts/phase4-home-final.png`
- `artifacts/phase4-plan.png`
- `artifacts/phase4-practice.png`
- `artifacts/phase4-discover.png`
- `artifacts/phase4-me.png`
