// 科目本地偏好读写
// 科目列表已统一由后端 API 提供（stores/subjects），这里只负责：
// 1. 以后端科目 id 为 key 的本地偏好（考试日期、每日学习时长）
// 2. 活跃科目 id 的记忆
// 3. 旧版本地科目数据的一次性迁移（按科目名匹配，旧数据保留不删）

export interface Subject {
  id: string;
  name: string;
  examDate: string;        // YYYY-MM-DD
  dailyMinutes: number;
  color: string;           // 标识色
  createdAt: number;
}

export interface SubjectPrefs {
  examDate: string;        // YYYY-MM-DD，空串表示未设置
  dailyMinutes: number;
}

export const DEFAULT_PREFS: SubjectPrefs = { examDate: '', dailyMinutes: 45 };

const PREFS_KEY = 'exam-prep-subject-prefs';      // { [后端科目id 或 旧科目名]: SubjectPrefs }
const ACTIVE_KEY = 'exam-prep-active-subject';    // 现在保存后端科目 id
const LEGACY_KEY = 'exam-prep-subjects';          // 旧版本地科目数组，迁移后保留
const MIGRATED_KEY = 'exam-prep-subject-prefs-migrated';

function readPrefsMap(): Record<string, SubjectPrefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch { return {}; }
}

function writePrefsMap(map: Record<string, SubjectPrefs>): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(map));
}

/** 取科目偏好：先按后端科目 id，再按科目名（迁移数据），都没有则返回默认值 */
export function getSubjectPrefs(subjectId: string, subjectName: string): SubjectPrefs {
  const map = readPrefsMap();
  return map[subjectId] || map[subjectName] || { ...DEFAULT_PREFS };
}

/** 写科目偏好（以后端科目 id 为 key；传入科目名时顺带清理同名旧 key） */
export function setSubjectPrefs(subjectId: string, prefs: SubjectPrefs, subjectName?: string): void {
  const map = readPrefsMap();
  if (subjectName) delete map[subjectName];
  map[subjectId] = prefs;
  writePrefsMap(map);
}

export function getActiveSubjectId(): string {
  return localStorage.getItem(ACTIVE_KEY) || '';
}

export function setActiveSubjectId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

/** 旧版本地科目名列表（后端不可用时的兜底展示） */
export function getLegacySubjectNames(): string[] {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return Array.isArray(legacy) ? legacy.map((s: Subject) => s.name) : [];
  } catch { return []; }
}

/** 一次性迁移：把旧版本地科目（exam-prep-subjects）的考试日期/学习时长
 *  转成按科目名 key 的偏好映射，读取时通过 getSubjectPrefs(name) 命中。旧数据保留。 */
export function migrateLegacySubjectPrefs(): void {
  if (localStorage.getItem(MIGRATED_KEY)) return;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    if (Array.isArray(legacy) && legacy.length > 0) {
      const map = readPrefsMap();
      for (const s of legacy) {
        if (s && s.name && !map[s.name]) {
          map[s.name] = {
            examDate: s.examDate || '',
            dailyMinutes: s.dailyMinutes || DEFAULT_PREFS.dailyMinutes,
          };
        }
      }
      writePrefsMap(map);
    }
  } catch { /* 解析失败不迁移 */ }
  localStorage.setItem(MIGRATED_KEY, '1');
}
