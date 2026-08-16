# GEMINI-SPEC - 逢考必过当前 UI 约束

> 更新：2026-06-22
> 用途：给 Gemini / 其他 UI 助手继续优化时使用
> 当前状态：Phase 4 产品级 UI 收敛版，后续只做细节优化，不重写数据层

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- framer-motion
- react-router-dom v7

不要修改 store、types、db、路由结构。视觉优化集中在：

- `src/components/TargetUI.tsx`
- `src/components/SharedUI.tsx`
- `src/pages/*.tsx`
- `src/index.css`
- `src/App.tsx`

## 当前设计关键词

- 橙黄游戏化备考 App
- Duolingo / Forest 式激励感
- 高饱和橙色外壳
- 暖橙背景包裹白卡
- 2.5D 粗描边图标
- 白色浮层卡片
- 厚底按钮和按压反馈
- 核心数字饱满、普通说明克制
- 卡片、按钮和阴影已经减重，后续不要继续堆装饰

## 全局布局

`PageShell` 是标准页面壳，宽度上限 `480px`。背景不是纯白，而是橙色到暖白渐变。

主内容区优先使用：

```tsx
relative z-20 mt-7 px-6 space-y-8/9
```

不要把卡片贴到屏幕左右边缘。

## 卡片

统一使用 `Card` / `.gamified-card`：

- 圆角：`24px`
- 背景：`#fff`
- 边框：橙色半透明 `rgba(251, 146, 60, 0.22)`
- 阴影：轻橙色环境光 + 底部物理厚度
- Phase 4 后只保留轻量浮层，避免所有卡片都使用重阴影

列表项也尽量独立成块，避免所有项挤在一个 `divide-y` 容器里。

## GameIcon 图标中枢

全站图标统一经过 `src/components/SharedUI.tsx` 的 `GameIcon`。

优先使用：

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

`GameIcon` 的 `framed` 规则：

- 默认 `framed={true}`：独立图标自带统一垫片。
- `framed={false}`：用于 `IconPod`、徽章、头像框、模式卡图标仓等已有容器内部。
- 不要在 `IconPod` 内嵌默认 framed 的 `GameIcon`。

语义映射：

| 场景 | type |
|---|---|
| 连续打卡皇冠 | `crown` |
| 页头小兔 | `rabbit` |
| 错题本 | `mistake` |
| 数学科目 | `math` |
| 英语科目 | `english` |
| 番茄钟/计时器 | `clock` |
| 刷题/靶心 | `target` |
| 资料/书本 | `book` |
| 奖杯/挑战 | `trophy` |
| 火焰/连胜 | `fire` |
| 闪电/复习 | `lightning` |
| 图表/统计 | `chart` |
| 剪贴板/任务 | `clipboard` |
| 社区/讨论 | `speech` |
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

兼容旧代码的 `AssetIcon` 和 `IconPod` 已经内部转发到 `GameIcon`。`AssetIcon` 默认裸图，`IconPod` 是唯一通用垫片。新增代码优先直接写语义 `GameIcon` 或 `IconPod`。

不要新增：

```tsx
<img src={get3DAsset('...')} />
<span>🏆</span>
```

正文提示里的 emoji 可以保留，但卡片、列表、标题、导航、成就、工具入口等视觉图标必须走 `GameIcon` / `AssetIcon` / `IconPod`。

## 字体

- 大标题：`font-black`
- 模块标题：`text-lg font-black`
- 普通列表：`text-base font-bold`
- 描述：`text-sm font-bold text-gray-400/500`
- 大数字：`num-3d font-[900] tracking-tighter text-gray-800`

不要把所有文本都设成 `font-black`。

## 按钮

主要按钮必须有 3D 厚底按压反馈：

```tsx
<OrangeButton>开始训练</OrangeButton>
```

优先使用 `OrangeButton`。它已经走统一 `.btn-3d-orange` token，不要在页面里重复手写整段阴影和边框。

## 页面要求

### Home

- 自定义头部，不使用通用 `HeroHeader`
- 顶部文案“每一次努力，都是未来的你在感谢现在的自己。”不得换行
- 连续打卡横幅：左火焰，中间数字/文案，右侧 `GameIcon type="crown"`
- quote 小火焰使用 `framed={false}`
- 空状态使用 `book` 语义，不要恢复 2D 红绿蓝教材插画

### Plan

- 周计划 7 天固定单元高度，圆点对齐
- 中段必须单列，不要恢复双列
- `BarChart` 必须是灰色圆壳舱 + 内部彩色圆角柱
- 图表内不允许出现悬浮工具图标

### Practice

- 刷题模式：蓝色渐变大卡，靶心图标走 `target`
- 模拟考试：橙色/金色渐变大卡，奖杯走 `trophy`
- 错题本入口走 `mistake`
- FSRS、知识清单三张独立白卡
- 模式卡左侧图标必须有独立安全仓，不能贴边或被圆角裁切

### Discover

- 学习资源 2x2
- 学霸榜 podium，皇冠走 `GameIcon type="crown"`
- 领奖台数字使用 `font-black text-2xl text-white drop-shadow-md`
- 学习方法列表为独立圆角块
- 排行榜头像使用动物序列，不使用文本 emoji 头像

### Me

- 顶部头像区域使用 flex 流，不要绝对定位硬覆盖
- 统计卡 icon 和数字同一行
- 成就墙：盾牌徽章
- 设置列表：独立圆角块

### Study / Legacy Routes

- `/study/*` 兼容重定向到 `/practice`。
- `/profile` 兼容重定向到 `/me`。
- `Study.tsx` 已迁到共享 UI 体系，但主产品入口仍以 `/practice` 为准。

## 不要做

- 不要重写 store
- 不要改 IndexedDB schema
- 不要恢复 Notion 风格
- 不要恢复纯白页面背景
- 不要恢复 SharedUI 旧组件
- 不要用分割线列表制造拥挤感
- 不要让卡片贴边
- 不要新增散落的裸 `<img>` 图标或页面级 emoji 图标
- 不要让 `IconPod` 和默认 framed `GameIcon` 嵌套

## 验证命令

```bash
npm run build
```

建议截图检查：

- `/`
- `/plan`
- `/practice`
- `/discover`
- `/me`

Phase 4 参考验收截图位于：

- `artifacts/phase4-home.png`
- `artifacts/phase4-home-final.png`
- `artifacts/phase4-plan.png`
- `artifacts/phase4-practice.png`
- `artifacts/phase4-discover.png`
- `artifacts/phase4-me.png`
