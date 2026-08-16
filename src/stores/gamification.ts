// 游戏化数据管理 - XP/等级/打卡/成就
import { openDB, getAll, put, getById } from './db';
import { schedulePush } from './sync';
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
  // 走 db.put 统一维护 updatedAt 和同步脏标记
  await put(STORE_NAME, { ...profile, id: 'profile' });
  schedulePush('gamification');
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
  // 走 db.put 统一维护 updatedAt 和同步脏标记
  await put(STORE_NAME, { id: 'achievements', data: achievements });
  schedulePush('gamification');
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
