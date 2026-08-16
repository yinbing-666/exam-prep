# Gemini Reference Code

> 更新：2026-06-21
> 本文件只作为数据接口和历史代码参考，不作为当前 UI 视觉规范。当前视觉规范以 `design.md`、`GEMINI-SPEC.md`、`SHAREDUI-REFERENCE.md` 为准。

### src/types.ts
```typescript
// 模拟考配置
export interface MockExamConfig {
  chapters: string[];          // 选中的章节
  questionTypes: {
    choice: number;            // 选择题数量
    judge: number;             // 判断题数量
    short: number;             // 简答题数量
    essay: number;             // 论述题数量
  };
  scoring: {
    choice: number;            // 每题分值
    judge: number;
    short: number;
    essay: number;
  };
  duration: number;            // 考试时长(分钟)
  referenceReal: boolean;      // 参考985/211真题
  customFocus: string;         // 自定义重点内容
}

// 资料
export interface Material {
  id: string;
  title: string;
  kind: 'pdf' | 'docx' | 'txt' | 'md';
  content: string;
  charCount: number;
  createdAt: number;
  subject?: string;
}

// 每日计划
export interface DailyPlan {
  id: string;
  moduleId: string;
  moduleTitle: string;
  date: string;           // YYYY-MM-DD
  dayOrder: number;
  reason: string;
  status: 'pending' | 'done';
  createdAt: number;
  subject?: string;           // 所属科目
  // 反馈字段
  mastery?: 'red' | 'yellow' | 'green';  // 🔴没懂 🟡半懂 🟢懂了
  timeSpent?: number;                      // 实际用时(分钟)
  note?: string;                           // 笔记/难点
  completedAt?: number;                    // 完成时间戳
}

// 考试项目（每日计划用）
export interface ExamProject {
  subject: string;
  examDate: string;       // YYYY-MM-DD
  dailyMinutes: number;
  targetScore?: string;
}

export interface Question {
  id: string;
  type: 'choice' | 'judge' | 'short' | 'essay';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  importance?: string;
  chapter: string;
}

export interface StudySet {
  id: string;
  title: string;
  chapter: string;
  content: string;
  questions: Question[];
  createdAt: number;
  subject?: string;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  correct: boolean;
  answeredAt: number;
}

export interface WrongQuestion {
  questionId: string;
  question: Question;
  lastUserAnswer: string;
  wrongCount: number;
  lastWrongAt: number;
}

export interface KnowledgeModule {
  id: string;
  title: string;
  chapter: string;
  estimatedMinutes: number;
  difficulty: '低' | '中' | '高';
  importanceRank: number;
  examPoints: string;
  practice: string;
  status: 'todo' | 'doing' | 'done';
  createdAt: number;
  subject?: string;
}

export interface LearnCard {
  id: string;
  moduleId: string;
  type: 'concept' | 'mistake' | 'exam' | 'quick_memory';
  front: string;
  back: string;
  importance?: number;
}

export interface MockExam {
  id: string;
  title: string;
  content: string;
  answerKey: string;
  duration: number;
  createdAt: number;
  subject?: string;
}

export interface MockAttempt {
  id: string;
  mockId: string;
  answers: string;
  feedback: string;
  score: string;
  createdAt: number;
}
```

### src/types/gamification.ts
```typescript
// 用户资料 & 游戏化数据（IndexedDB存储）

export interface UserProfile {
  id: string;           // 固定为 'current'
  nickname: string;
  level: number;
  xp: number;
  xpToNext: number;     // 升级所需XP
  streak: number;        // 连续打卡天数
  lastStudyDate: string; // YYYY-MM-DD
  totalQuestions: number;
  correctCount: number;
  totalStudyMinutes: number;
  createdAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  desc: string;
  condition: string;     // 描述解锁条件
  unlocked: boolean;
  unlockedAt?: number;
}

// 默认用户资料
export const DEFAULT_PROFILE: UserProfile = {
  id: 'current',
  nickname: '学习者',
  level: 1,
  xp: 0,
  xpToNext: 100,
  streak: 0,
  lastStudyDate: '',
  totalQuestions: 0,
  correctCount: 0,
  totalStudyMinutes: 0,
  createdAt: Date.now(),
};

// 成就列表
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-quiz', title: '初试牛刀', icon: '🎯', desc: '完成第一道题', condition: '完成1道题', unlocked: false },
  { id: 'quiz-10', title: '小试身手', icon: '📝', desc: '完成10道题', condition: '完成10道题', unlocked: false },
  { id: 'quiz-100', title: '百题斩', icon: '⚔️', desc: '完成100道题', condition: '完成100道题', unlocked: false },
  { id: 'quiz-500', title: '题海战术', icon: '🌊', desc: '完成500道题', condition: '完成500道题', unlocked: false },
  { id: 'streak-3', title: '三天打鱼', icon: '🔥', desc: '连续打卡3天', condition: '连续打卡3天', unlocked: false },
  { id: 'streak-7', title: '一周坚持', icon: '💪', desc: '连续打卡7天', condition: '连续打卡7天', unlocked: false },
  { id: 'streak-30', title: '月度学霸', icon: '🏆', desc: '连续打卡30天', condition: '连续打卡30天', unlocked: false },
  { id: 'accuracy-80', title: '八成把握', icon: '✅', desc: '正确率达到80%', condition: '正确率≥80%（至少50题）', unlocked: false },
  { id: 'accuracy-95', title: '近乎完美', icon: '💎', desc: '正确率达到95%', condition: '正确率≥95%（至少100题）', unlocked: false },
  { id: 'mock-first', title: '模拟初体验', icon: '📋', desc: '完成第一次模拟考试', condition: '完成1次模拟考', unlocked: false },
  { id: 'level-5', title: 'Lv.5 小成', icon: '⭐', desc: '达到5级', condition: '达到Lv.5', unlocked: false },
  { id: 'level-10', title: 'Lv.10 大成', icon: '🌟', desc: '达到10级', condition: '达到Lv.10', unlocked: false },
];

// XP经验值规则
export const XP_RULES = {
  quiz_correct: 10,      // 答对一题
  quiz_wrong: 2,         // 答错一题（鼓励尝试）
  mock_complete: 50,     // 完成模拟考
  daily_streak: 15,      // 每日打卡
  card_review: 5,        // 复习一张卡片
  knowledge_read: 3,     // 阅读一个知识点
};

// 等级所需XP表（每级递增）
export function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

// 虚拟排行榜角色
export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  level: number;
  studyMinutes: number;
  isVirtual: boolean;
}

export const VIRTUAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: '勤奋小王', avatar: '👨‍🎓', level: 8, studyMinutes: 1260, isVirtual: true },
  { rank: 2, name: '卷王小李', avatar: '👩‍💻', level: 7, studyMinutes: 1120, isVirtual: true },
  { rank: 3, name: '学霸小张', avatar: '🧑‍📚', level: 6, studyMinutes: 980, isVirtual: true },
  { rank: 4, name: '努力小陈', avatar: '👨‍🏫', level: 5, studyMinutes: 840, isVirtual: true },
  { rank: 5, name: '坚持小刘', avatar: '👩‍🎓', level: 5, studyMinutes: 720, isVirtual: true },
  { rank: 6, name: '加油小赵', avatar: '🧑‍🔬', level: 4, studyMinutes: 600, isVirtual: true },
  { rank: 7, name: '冲鸭小周', avatar: '👨‍💻', level: 4, studyMinutes: 480, isVirtual: true },
  { rank: 8, name: '必过小吴', avatar: '👩‍🏫', level: 3, studyMinutes: 360, isVirtual: true },
  { rank: 9, name: '上岸小孙', avatar: '🧑‍🎓', level: 3, studyMinutes: 240, isVirtual: true },
  { rank: 10, name: '满分小马', avatar: '👨‍🎤', level: 2, studyMinutes: 120, isVirtual: true },
];
```

### src/stores/gamification.ts
```typescript
// 游戏化数据管理 - XP/等级/打卡/成就
import { openDB, getAll, put, getById } from './db';
import { UserProfile, Achievement, DEFAULT_PROFILE, ACHIEVEMENTS, XP_RULES, getXpForLevel, LeaderboardEntry, VIRTUAL_LEADERBOARD } from '../types/gamification';

const STORE_NAME = 'gamification';

// 获取用户资料
export async function getProfile(): Promise<UserProfile> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('profile');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || { ...DEFAULT_PROFILE });
      req.onerror = () => resolve({ ...DEFAULT_PROFILE });
    });
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

// 保存用户资料
export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ ...profile, id: 'profile' });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 获取成就列表
export async function getAchievements(): Promise<Achievement[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('achievements');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.data || ACHIEVEMENTS.map(a => ({ ...a })));
      req.onerror = () => resolve(ACHIEVEMENTS.map(a => ({ ...a })));
    });
  } catch {
    return ACHIEVEMENTS.map(a => ({ ...a }));
  }
}

// 保存成就列表
export async function saveAchievements(achievements: Achievement[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ id: 'achievements', data: achievements });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 增加XP并处理升级
export async function addXP(amount: number, reason: string): Promise<{ leveledUp: boolean; newLevel: number }> {
  const profile = await getProfile();
  profile.xp += amount;
  let leveledUp = false;

  while (profile.xp >= profile.xpToNext) {
    profile.xp -= profile.xpToNext;
    profile.level += 1;
    profile.xpToNext = getXpForLevel(profile.level);
    leveledUp = true;
  }

  await saveProfile(profile);
  return { leveledUp, newLevel: profile.level };
}

// 更新打卡
export async function updateStreak(): Promise<{ streak: number; isNew: boolean }> {
  const profile = await getProfile();
  const today = new Date().toISOString().split('T')[0];

  if (profile.lastStudyDate === today) {
    return { streak: profile.streak, isNew: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (profile.lastStudyDate === yesterday) {
    profile.streak += 1;
  } else if (profile.lastStudyDate !== today) {
    profile.streak = 1;
  }

  profile.lastStudyDate = today;
  await saveProfile(profile);
  await addXP(XP_RULES.daily_streak, 'daily_streak');
  return { streak: profile.streak, isNew: true };
}

// 记录答题结果
export async function recordQuiz(correct: boolean): Promise<void> {
  const profile = await getProfile();
  profile.totalQuestions += 1;
  if (correct) profile.correctCount += 1;
  await saveProfile(profile);
  await addXP(correct ? XP_RULES.quiz_correct : XP_RULES.quiz_wrong, correct ? 'quiz_correct' : 'quiz_wrong');
  await checkAchievements();
}

// 检查并解锁成就
export async function checkAchievements(): Promise<Achievement[]> {
  const profile = await getProfile();
  const achievements = await getAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const a of achievements) {
    if (a.unlocked) continue;
    let unlock = false;

    switch (a.id) {
      case 'first-quiz': unlock = profile.totalQuestions >= 1; break;
      case 'quiz-10': unlock = profile.totalQuestions >= 10; break;
      case 'quiz-100': unlock = profile.totalQuestions >= 100; break;
      case 'quiz-500': unlock = profile.totalQuestions >= 500; break;
      case 'streak-3': unlock = profile.streak >= 3; break;
      case 'streak-7': unlock = profile.streak >= 7; break;
      case 'streak-30': unlock = profile.streak >= 30; break;
      case 'accuracy-80': unlock = profile.totalQuestions >= 50 && (profile.correctCount / profile.totalQuestions) >= 0.8; break;
      case 'accuracy-95': unlock = profile.totalQuestions >= 100 && (profile.correctCount / profile.totalQuestions) >= 0.95; break;
      case 'level-5': unlock = profile.level >= 5; break;
      case 'level-10': unlock = profile.level >= 10; break;
    }

    if (unlock) {
      a.unlocked = true;
      a.unlockedAt = Date.now();
      newlyUnlocked.push(a);
    }
  }

  if (newlyUnlocked.length > 0) {
    await saveAchievements(achievements);
  }
  return newlyUnlocked;
}

// 获取排行榜（虚拟角色 + 用户）
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const profile = await getProfile();
  const userEntry: LeaderboardEntry = {
    rank: 0,
    name: profile.nickname || '我',
    avatar: '🙋',
    level: profile.level,
    studyMinutes: profile.totalStudyMinutes,
    isVirtual: false,
  };

  const all = [...VIRTUAL_LEADERBOARD, userEntry];
  all.sort((a, b) => b.studyMinutes - a.studyMinutes);
  all.forEach((entry, i) => entry.rank = i + 1);
  return all;
}

// 记录学习时长（分钟）
export async function addStudyMinutes(minutes: number): Promise<void> {
  const profile = await getProfile();
  profile.totalStudyMinutes += minutes;
  await saveProfile(profile);
}
```

### src/stores/index.ts
```typescript
export { getAllStudySets, getStudySet, saveStudySet, deleteStudySet } from './studySets';
export { getResults, saveResult, getWrongQuestions, markMastered } from './results';
export { getAllModules, saveModules, updateModuleStatus, deleteAllModules } from './modules';
export { getAllMockExams, saveMockExam, deleteMockExam, saveMockAttempt } from './mocks';
export { getAllMaterials, saveMaterial, deleteMaterial } from './materials';
export { getAllDailyPlans, saveDailyPlans, updatePlanStatus, completePlanWithFeedback, deleteAllDailyPlans } from './dailyPlans';
```

### src/stores/db.ts
```typescript
// IndexedDB数据库连接层

const DB_NAME = 'exam-prep';
const DB_VERSION = 6;

export type StoreName = 'studySets' | 'results' | 'mastered' | 'modules' | 'mockExams' | 'mockAttempts' | 'materials' | 'dailyPlans' | 'fsrsCards' | 'gamification';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const stores: StoreName[] = ['studySets', 'results', 'mastered', 'modules', 'mockExams', 'mockAttempts', 'materials', 'dailyPlans', 'fsrsCards', 'gamification'];
      const keyPaths: Record<string, string> = {
        studySets: 'id', results: 'questionId', mastered: 'questionId',
        modules: 'id', mockExams: 'id', mockAttempts: 'id',
        materials: 'id', dailyPlans: 'id', fsrsCards: 'id', gamification: 'id',
      };
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: keyPaths[name] });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const req = tx.objectStore(storeName).getAll();
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}

export async function getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const req = tx.objectStore(storeName).get(id);
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}

export async function put<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function putMany<T>(storeName: StoreName, values: T[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  values.forEach(v => tx.objectStore(storeName).put(v));
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function deleteById(storeName: StoreName, id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
```

### src/utils/subjects.ts
```typescript
// 多科目管理工具

export interface Subject {
  id: string;
  name: string;           // 如 "微机原理"
  examDate: string;        // YYYY-MM-DD
  dailyMinutes: number;
  color: string;           // 标识色
  createdAt: number;
}

const STORAGE_KEY = 'exam-prep-subjects';
const ACTIVE_KEY = 'exam-prep-active-subject';

// 预设颜色
const COLORS = ['#e07030', '#1976d2', '#43a047', '#8e24aa', '#d32f2f', '#00897b', '#5c6bc0', '#f4511e'];

export function getSubjects(): Subject[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveSubjects(subjects: Subject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
}

export function addSubject(name: string, examDate: string, dailyMinutes: number): Subject {
  const subjects = getSubjects();
  const color = COLORS[subjects.length % COLORS.length];
  const subject: Subject = {
    id: `subj-${Date.now()}`,
    name,
    examDate,
    dailyMinutes,
    color,
    createdAt: Date.now(),
  };
  subjects.push(subject);
  saveSubjects(subjects);
  return subject;
}

export function updateSubject(id: string, updates: Partial<Omit<Subject, 'id' | 'createdAt'>>): void {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === id);
  if (idx >= 0) {
    subjects[idx] = { ...subjects[idx], ...updates };
    saveSubjects(subjects);
  }
}

export function deleteSubject(id: string): void {
  const subjects = getSubjects().filter(s => s.id !== id);
  saveSubjects(subjects);
  if (getActiveSubjectId() === id) {
    setActiveSubjectId(subjects[0]?.id || '');
  }
}

export function getActiveSubjectId(): string {
  return localStorage.getItem(ACTIVE_KEY) || '';
}

export function setActiveSubjectId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveSubject(): Subject | null {
  const id = getActiveSubjectId();
  const subjects = getSubjects();
  return subjects.find(s => s.id === id) || subjects[0] || null;
}

// 迁移旧数据（单科目 → 多科目）
export function migrateFromLegacy(): void {
  const subjects = getSubjects();
  if (subjects.length > 0) return; // 已有数据不迁移

  try {
    const legacy = JSON.parse(localStorage.getItem('exam-prep-project') || 'null');
    if (legacy && legacy.subject) {
      const subj = addSubject(legacy.subject, legacy.examDate, legacy.dailyMinutes);
      setActiveSubjectId(subj.id);
      localStorage.removeItem('exam-prep-project');
    }
  } catch {}
}
```

### src/App.tsx
```typescript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isActivated } from './utils/activation';
import ActivationModal from './components/ActivationModal';
import Home from './pages/Home';
import Plan from './pages/Plan';
import Practice from './pages/Practice';
import Discover from './pages/Discover';
import Me from './pages/Me';
import './index.css';

// Tab栏组件
function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/plan', icon: '📅', label: '计划' },
    { path: '/practice', icon: '📝', label: '练习' },
    { path: '/discover', icon: '🔍', label: '发现' },
    { path: '/me', icon: '👤', label: '我的' },
  ];

  return (
    <nav className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.path}
          className={`tab-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

// 主布局（带Tab栏）
function MainLayout() {
  return (
    <div className="app-layout">
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/practice/*" element={<Practice />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/me" element={<Me />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  );
}

export default function App() {
  const [activated, setActivated] = useState(isActivated());

  if (!activated) {
    return <ActivationModal onSuccess={() => setActivated(true)} />;
  }

  return (
    <Router>
      <MainLayout />
    </Router>
  );
}
```
