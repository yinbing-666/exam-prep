# UI Reference - 当前组件职责

> 更新：2026-06-22
> 注意：`SharedUI` 现在是全局图标资产层，`GameIcon` 是唯一图标控制中枢。Phase 4 后已经统一 `framed` 图标框架，后续不要再新增散落的裸 emoji、裸 `<img>` 或页面级图标映射。

## 当前组件分工

### `src/components/SharedUI.tsx`

当前导出：

```tsx
get3DAsset(emoji: string): string
GameIcon({ type, size, className, framed })
StreakCrownIcon
MascotRabbitIcon
MistakeBookIcon
```

用途：

- `GameIcon` 是全站图标入口，负责 2.5D 精修 SVG 和 Fluent 3D 兜底。
- `GameIcon` 默认 `framed={true}`，会套统一 `.game-icon-frame` 垫片。
- `GameIcon framed={false}` 输出裸图标，用于 `IconPod`、徽章、头像框、模式卡安全仓等已有容器。
- `get3DAsset` 只保留给旧兼容路径和 `GameIcon` 兜底层，不建议页面直接调用。
- `StreakCrownIcon`、`MascotRabbitIcon`、`MistakeBookIcon` 是核心 2.5D SVG 原子图标，页面优先通过 `GameIcon` 使用。

不要从 `SharedUI` 恢复旧版布局组件：

- `GradientHeader`
- `ShieldBadge`
- `LeaderboardPodium`
- `AccuracyRing`
- `BarChart`
- `DayDots`
- `DecorativeStars`
- `Emoji3D`

这些旧组件已经被删除或迁移。

### `src/components/TargetUI.tsx`

当前 UI 组件入口：

| 组件 | 用途 |
|---|---|
| `PageShell` | 全站页面壳，480px 宽，橙色包裹背景 |
| `HeroHeader` | 通用渐变头部，吉祥物走 `GameIcon type="rabbit"` |
| `Card` | `.gamified-card` 白色浮层卡 |
| `SectionTitle` | 模块标题，内部图标经 `IconPod` 进入 `GameIcon` |
| `AssetIcon` | 兼容旧调用的代理，内部转发到 `GameIcon`，默认裸图 `framed={false}` |
| `IconPod` | 唯一通用图标垫片容器，内部通过裸 `AssetIcon` 接入 `GameIcon` |
| `ProgressBar` | 胶囊进度条 |
| `AccuracyRing` | SVG 圆环 |
| `OrangeButton` | 橙色厚底按钮 |
| `StatStrip` | 三列统计舱 |
| `EmptyState` | 空状态 |
| `MedalBadge` / `ShieldBadge` | 成就徽章 |
| `daysUntil` | 日期工具 |

## GameIcon 使用规范

优先使用语义类型，不要在页面里散落 emoji。

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

### `framed` 规则

| 场景 | 写法 |
|---|---|
| 独立展示图标，需要自带垫片 | `<GameIcon type="book" />` |
| 标题/列表左侧统一垫片 | `<IconPod icon="target" />` |
| 已经在 `IconPod`、徽章、头像框、彩色模式卡安全仓内 | `<GameIcon type="trophy" framed={false} />` |

不要把 `IconPod` 里再放一个默认 framed 的 `GameIcon`，否则会重新出现“双底座”。

常用映射：

| 语义 | 类型 |
|---|---|
| 连续打卡皇冠 | `crown` |
| 页头吉祥物 | `rabbit` |
| 错题本 | `mistake` |
| 数学 | `math` |
| 英语 | `english` |
| 番茄钟/计时器 | `clock` |
| 刷题靶心 | `target` |
| 书本/资料 | `book` |
| 奖杯/挑战 | `trophy` |
| 火焰/连胜 | `fire` |
| 闪电/复习 | `lightning` |
| 章节/图表 | `chart` |
| 剪贴板/任务 | `clipboard` |
| 社区讨论 | `speech` |
| 设置 | `gear` |
| 通知 | `bell` |
| 主题 | `palette` |
| 导出 | `floppyDisk` |
| 导入 | `inbox` |
| 删除 | `wastebasket` |
| 物理 | `physics` |
| 化学 | `chemistry` |
| 历史 | `history` |
| 地理 | `geography` |
| 生物 | `biology` |
| 政治/法律 | `law` |

兼容旧代码时可以继续使用：

```tsx
<AssetIcon icon="trophy" />
<IconPod icon="book" />
```

但新增页面或新增图标时必须优先写：

```tsx
<GameIcon type="trophy" />
<GameIcon type="book" />
```

不要直接写：

```tsx
<img src={get3DAsset('🏆')} />
<span>🏆</span>
```

## 布局建议

### 页面壳

```tsx
<PageShell>
  <HeroHeader title="学习计划" subtitle="继续努力" />
  <div className="relative z-20 mt-7 px-6 space-y-8">
    <Card className="p-5">...</Card>
  </div>
</PageShell>
```

### 卡片间距

不要：

```tsx
<div className="px-4 space-y-4">
```

推荐：

```tsx
<div className="px-6 space-y-8">
```

### 列表项

不要用拥挤的分割线列表：

```tsx
<div className="divide-y divide-gray-100">...</div>
```

推荐每项独立圆角块：

```tsx
<div className="space-y-3">
  <button className="rounded-[20px] border border-orange-100/60 bg-white px-4 py-3.5">
    ...
  </button>
</div>
```

## 核心视觉规则

- 页面外壳露出橙色背景。
- 白卡不要贴边。
- 模块之间要有橙色间隔。
- 核心数字使用 `num-3d` / `font-[900] tracking-tighter text-gray-800`。
- 操作按钮使用橙黄厚底 3D 按压反馈。
- 图标必须有 2.5D 质感或进入 `GameIcon` 垫片兜底。
- 卡片边框用橙色半透明，不要纯白边框。
- 卡片和按钮已经在 Phase 4 减重，不要继续叠加多层重阴影。
- `/study/*` 兼容重定向到 `/practice`，`/profile` 兼容重定向到 `/me`。
