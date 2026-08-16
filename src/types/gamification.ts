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
