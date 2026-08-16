// 科目类型定义
export type SubjectName = '数学' | '英语' | '政治' | '历史' | '地理' | '物理' | '化学' | '生物';

// 科目配置
export const subjects: Record<SubjectName, { emoji: string; color: string }> = {
  '数学': { emoji: '📐', color: '#d97706' },
  '英语': { emoji: '📚', color: '#3b82f6' },
  '政治': { emoji: '📜', color: '#8b5cf6' },
  '历史': { emoji: '🏛️', color: '#f59e0b' },
  '地理': { emoji: '🌍', color: '#22c55e' },
  '物理': { emoji: '⚡', color: '#ef4444' },
  '化学': { emoji: '🧪', color: '#06b6d4' },
  '生物': { emoji: '🧬', color: '#10b981' },
};

// 获取所有科目名称
export function getSubjectNames(): SubjectName[] {
  return Object.keys(subjects) as SubjectName[];
}

// 获取科目 Emoji
export function getSubjectEmoji(subject: SubjectName): string {
  return subjects[subject]?.emoji || '📖';
}

// 获取科目颜色
export function getSubjectColor(subject: SubjectName): string {
  return subjects[subject]?.color || '#d97706';
}
