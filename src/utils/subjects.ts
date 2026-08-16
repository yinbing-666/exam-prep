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
