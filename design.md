# 逢考必过 Design System

> 更新：2026-06-22
> 状态：Phase 4 产品级收敛版
> 目标风格：橙黄游戏化学习 App，高饱和外壳 + 轻量白色浮层 + Duolingo 2.5D 图标体系

## 设计方向

逢考必过采用移动端 App 视觉，宽度上限为 `480px`。页面不是纯白背景，而是橙色到暖白的包裹式底色：白色内容卡片被橙色环境包住，模块之间需要露出暖橙间隔，形成层级和呼吸感。

整体观感参考 Duolingo / Forest 式激励风格：

- 高饱和橙黄头部
- 圆润白卡浮层
- 模块之间有明显橙色间隔
- 列表项尽量独立成块，少用贴边分割线
- 核心数字重且饱满
- 图标必须统一进入 `GameIcon` 中枢，保持 2.5D 质感
- Phase 4 之后的重点是“克制的产品质感”，不要继续无节制加阴影和装饰

## 颜色

### 背景

- 全局外壳：`linear-gradient(180deg, #ff7900 0%, #ff9500 190px, #ffe4c4 360px, #fff1df 100%)`
- 页面暖白区域：`#fff9f2`
- 卡片：`#ffffff`
- 橙色边框：`rgba(251, 146, 60, 0.22)`

### 品牌色

- 主橙：`#f97316`
- 深橙：`#ea580c`
- 亮橙：`#ff6500`
- 金黄：`#eab308`
- 主渐变：`linear-gradient(135deg, #f97316 0%, #ff923c 50%, #eab308 100%)`

### 语义色

- 成功：`#22c55e`
- 错误：`#ef4444`
- 警告：`#f59e0b`
- 信息：`#3b82f6`

### 文字

- 主文字：`#1a1a1a`
- 核心数字：`#1f2937`
- 正文/次级：`#656565`
- 辅助：`#9ca3af`

## 布局

### 页面壳

`PageShell` 是全站标准页面壳：

```tsx
min-h-screen max-w-[480px] mx-auto
bg-[linear-gradient(180deg,#ff7900_0%,#ff9500_190px,#ffe4c4_360px,#fff1df_100%)]
pb-44 overflow-hidden
```

主内容区使用：

```tsx
relative z-20 mt-7 px-6 space-y-8/9
```

含义：

- `px-6` 给卡片左右留出橙色包裹边
- `space-y-8` 或 `space-y-9` 让模块之间露出橙色底，同时避免页面过长
- 不要再把白卡贴到屏幕边缘

### 卡片

统一使用 `Card` 或 `.gamified-card`。Phase 4 后卡片比早期版本更轻，不要让每张卡都像最高层级浮起来。

```css
background: #fff;
border-radius: 24px;
border: 1.5px solid rgba(251, 146, 60, 0.22);
box-shadow:
  0 14px 28px -16px rgba(88, 45, 0, 0.18),
  0 4px 10px -6px rgba(0, 0, 0, 0.08),
  inset 0 1px 0 rgba(255, 255, 255, 0.92),
  inset 0 -3px 0 rgba(233, 213, 193, 0.45);
```

卡片内部常用 padding：

- 小型列表项：`p-3` 或 `p-4`
- 普通内容卡：`p-5`
- 模式入口卡：自定义渐变和 `min-h-[112px]`

## 字体层级

数字可以非常重，普通列表不要过粗。

- 页面大标题：`text-3xl` / `font-black`
- 重要模块标题：`text-lg` / `font-black`
- 普通列表主文案：`text-base` / `font-bold`
- 描述：`text-sm` / `font-bold` / 灰色
- 辅助小字：`text-xs` 或 `text-[11px]`
- 大数字：`num-3d font-[900] tracking-tighter text-gray-800`

不要把普通列表文字做成 `text-lg font-black`，除非它确实是模块标题。

## 图标规范

### GameIcon 中枢

全站图标由 `src/components/SharedUI.tsx` 的 `GameIcon` 控制。

```tsx
<GameIcon type="crown" size="lg" />
<GameIcon type="rabbit" size="lg" />
<GameIcon type="mistake" size="md" />
<GameIcon type="math" size="md" />
<GameIcon type="english" size="md" />
<GameIcon type="clock" size="sm" />
<GameIcon type="target" size="md" />
<GameIcon type="fire" size="sm" framed={false} />
```

`GameIcon` 支持 `framed`：

- `framed={true}`：默认，外层带统一 `game-icon-frame` 垫片。
- `framed={false}`：裸图标，用于已经在 `IconPod`、徽章、头像框、彩色模式卡内部的场景。

核心 2.5D SVG：

- `crown`：连续打卡皇冠徽章
- `rabbit`：页头必胜小兔
- `mistake`：红色厚皮错题本
- `math`：蓝色数学厚卡
- `english`：绿色英语心流耳机
- `clock`：西红柿专注钟
- `target`：刷题靶心

兜底图标：

- `book`
- `trophy`
- `fire`
- `lightning`
- `medal`
- `star`
- `calendar`
- `chart`
- `user`
- `home`
- `search`
- `pencil`
- `warning`
- `clipboard`
- `speech`
- `gear`
- `bell`
- `palette`
- `floppyDisk`
- `inbox`
- `wastebasket`
- `chemistry`
- `physics`
- `history`
- `geography`
- `biology`
- `law`

不要直接新增：

```tsx
<img src={get3DAsset('...')} />
<span>🏆</span>
```

兼容旧组件：

- `AssetIcon` 内部已经转发到 `GameIcon`，默认 `framed={false}`，适合放在已有容器里。
- `IconPod` 是唯一通用图标垫片容器，内部调用裸 `AssetIcon`，避免双层底座。
- 单独需要垫片时，优先 `<GameIcon type="..." />` 或 `<IconPod icon="..." />`。

## 按钮

主要操作按钮必须有真实 3D 厚度：

```tsx
<OrangeButton>开始训练</OrangeButton>
```

优先使用 `OrangeButton`，它已经走 `.btn-3d-orange` 的统一 token。不要在页面里重复手写整段按钮阴影，除非是特殊大模式卡。

## 核心组件

### `TargetUI.tsx`

当前主要 UI 组件都在 `src/components/TargetUI.tsx`：

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

`SharedUI.tsx` 是资产和图标中枢：

- `get3DAsset(emoji)`
- `GameIcon`
- `StreakCrownIcon`
- `MascotRabbitIcon`
- `MistakeBookIcon`

不要再从 `SharedUI` 恢复旧的 `GradientHeader`、`LeaderboardPodium`、`BarChart` 等布局组件。

## 页面规范

### Home

- 自定义头部，不使用通用 `HeroHeader`
- 右侧学士帽绝对定位，左侧文字保留安全区
- “每一次努力，都是未来的你在感谢现在的自己。”不得换行
- 连续打卡横幅：左火焰，中间数字和文案，右侧 `GameIcon type="crown"`
- quote 左侧小火焰用 `framed={false}`，避免和右侧学士帽形成双垫片
- 空状态不要恢复 2D 红绿蓝教材插画

### Plan

- 周计划 7 列必须固定高度，避免今日态错位
- 中段使用单列流式布局，不使用桌面双列
- `BarChart` 是灰色胶囊壳 + 内部彩色高光柱
- 章节掌握度上方只允许数值文本，不允许悬浮工具图标

### Practice

- 刷题模式和模拟考试使用蓝/橙高对比渐变大卡
- 刷题模式图标语义为 `target`
- 模拟考试图标语义为 `trophy`
- 错题本语义为 `mistake`
- 下方错题本、FSRS、知识清单是三张独立白卡，不共享分割线容器
- 模式卡左侧图标必须在独立白色安全仓内，不能被大卡圆角裁切

### Discover

- 资源为 2x2 矩阵
- 排行榜使用 podium
- 第一名皇冠使用 `GameIcon type="crown"`
- 学习方法列表每项独立圆角块
- 普通列表字体使用 `text-base font-bold`
- 排行榜头像使用动物序列，不使用文本 emoji 头像

### Me

- 顶部头像区使用 flex 流，不要绝对定位硬覆盖
- 统计三卡：icon 和数字同一行
- 成就墙是盾牌徽章网格
- 设置列表每项独立圆角块

### Study / Legacy Route

- `/study/*` 当前在 `App.tsx` 中兼容重定向到 `/practice`，避免旧链接白屏。
- `Study.tsx` 已迁移到共享 UI 体系，但主产品入口仍以 `/practice` 为准。
- `/profile` 兼容重定向到 `/me`。

## 动画

- 页面入场：`staggerChildren: 0.06`
- 子项：spring, `stiffness: 120`, `damping: 16`
- 卡片点击：`scale: 0.97`
- 按钮点击：按压下沉 `2px`

动画只用于轻微反馈，不做复杂过场。

## 禁止事项

- 不要让白卡贴屏幕左右边缘
- 不要让多个列表项只靠分割线挤在一张白卡里
- 不要让普通列表文字全部 `font-black`
- 不要新增裸 `<img>` 图标
- 不要新增散落 emoji 作为卡片/列表/导航图标
- 不要恢复 Plan 的双列布局
- 不要恢复 SharedUI 旧组件
- 不要让页面外侧出现纯白边

## 验证

每次视觉改动至少运行：

```bash
npm run build
```

关键页面建议用 Chrome headless 截图检查：

- `/`
- `/plan`
- `/practice`
- `/discover`
- `/me`

Phase 4 已验收截图：

- `artifacts/phase4-home.png`
- `artifacts/phase4-home-final.png`
- `artifacts/phase4-plan.png`
- `artifacts/phase4-practice.png`
- `artifacts/phase4-discover.png`
- `artifacts/phase4-me.png`
