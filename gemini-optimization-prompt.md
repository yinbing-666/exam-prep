# Gemini UI 细节优化提示词

## 背景

这是一个 React + TypeScript + Tailwind v4 的考试学习 App。当前 UI 已经实现为 Image2 橙黄游戏化风格，不需要从零重写。你只需要做细节优化，必须遵守现有数据绑定和组件结构。

## 当前目标风格

- 橙黄渐变外壳
- 暖橙背景包裹白色卡片
- 卡片之间必须露出橙色间隔
- 白卡圆角大，边框为橙色半透明
- icon 要柔和贴合，不要像外链 PNG 硬抠进来
- 数字可以粗，普通列表文字不要过粗

## 重点规范

### 1. 页面边距

主内容区必须保留边距：

```tsx
relative z-20 -mt-7 px-6 space-y-6
```

不要让白色卡片贴到屏幕左右边缘。

### 2. 卡片

使用 `Card` 或 `.gamified-card`：

- `border-radius: 24px`
- `background: #fff`
- `border: 1.5px solid rgba(251, 146, 60, 0.22)`
- 橙色轻阴影

### 3. 列表

不要把多个列表项塞进一个 `divide-y` 容器里。

错误示例：

```tsx
<div className="divide-y divide-gray-100">
  <button>个人资料</button>
  <button>学习统计</button>
</div>
```

推荐：

```tsx
<div className="space-y-3">
  <button className="rounded-[20px] border border-orange-100/60 bg-white px-4 py-3.5">个人资料</button>
  <button className="rounded-[20px] border border-orange-100/60 bg-white px-4 py-3.5">学习统计</button>
</div>
```

### 4. 字体

- 大标题：`font-black`
- 模块标题：`text-lg font-black`
- 普通列表项：`text-base font-bold`
- 描述：`text-sm font-bold text-gray-400`
- 数字：`font-black`

不要让普通列表项使用 `text-lg font-black`。

### 5. 图标

不要强制所有 icon 使用 Fluent 3D PNG。

统计卡必须是 icon 和数字同一行：

```tsx
<div className="flex items-center justify-center gap-2">
  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50/90 text-[24px]">
    📝
  </span>
  <span className="text-2xl font-black">2568</span>
</div>
```

## 页面检查清单

### Home

- 顶部头像大于标题视觉高度
- “💪 + 引号文案”在同一行区域，可自然换行
- 连续打卡卡：左火焰，中间数字，右皇冠徽章
- 不允许 broken image

### Plan

- 周计划圆点对齐
- 单列布局，不要双列
- 每个模块之间有橙色间隔
- 今日任务项若存在，应是独立小卡

### Practice

- 刷题模式/模拟考试为蓝紫渐变大卡
- 错题本/FSRS/知识清单为独立白卡
- 三项之间有间隔

### Discover

- 资源 2x2
- 学习方法列表每项独立圆角块
- 列表字体不要过粗

### Me

- 三个统计卡：icon 和数字同一行
- 设置列表每项独立圆角块
- 设置列表字体 `text-base font-bold`

## 禁止事项

- 不要改 store/types/db
- 不要恢复旧 `SharedUI` 组件
- 不要恢复纯白背景
- 不要恢复贴边卡片
- 不要使用 `divide-y` 做主要列表
- 不要把普通列表文字做成 `font-black`

## 验证

修改后必须运行：

```bash
npm run build
```
