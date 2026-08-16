// IndexedDB数据库连接层

const DB_NAME = 'exam-prep';
const DB_VERSION = 6;

export type StoreName = 'studySets' | 'results' | 'mastered' | 'modules' | 'mockExams' | 'mockAttempts' | 'materials' | 'dailyPlans' | 'fsrsCards' | 'gamification';

// 模块级单例连接：避免每次读写都新建 IDBDatabase 连接
let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // DB_VERSION 历史演进：各版本逐步新增 store，所有 store 均为简单 keyPath 存储，
      // 无索引、无 schema 变更，升级时只需补建缺失的 store，无需字段迁移。
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
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
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

const keyPaths: Record<string, string> = {
    studySets: 'id', results: 'questionId', mastered: 'questionId',
    modules: 'id', mockExams: 'id', mockAttempts: 'id',
    materials: 'id', dailyPlans: 'id', fsrsCards: 'id', gamification: 'id',
  };

// ── 同步脏标记：记录哪些 key 自上次推送后发生过本地写入 ────────
// 存 localStorage（而非 IndexedDB），避免脏标记本身进入同步数据
const DIRTY_PREFIX = 'exam-prep-sync-dirty:';

function readDirty(storeName: StoreName): string[] {
  try {
    return JSON.parse(localStorage.getItem(DIRTY_PREFIX + storeName) || '[]');
  } catch { return []; }
}

function writeDirty(storeName: StoreName, keys: string[]): void {
  localStorage.setItem(DIRTY_PREFIX + storeName, JSON.stringify(keys));
}

export function markDirtyKeys(storeName: StoreName, keys: string[]): void {
  if (keys.length === 0) return;
  const current = new Set(readDirty(storeName));
  keys.forEach(k => current.add(k));
  writeDirty(storeName, [...current]);
}

export function getDirtyKeys(storeName: StoreName): string[] {
  return readDirty(storeName);
}

export function clearDirtyKeys(storeName: StoreName, keys: string[]): void {
  if (keys.length === 0) return;
  const rest = readDirty(storeName).filter(k => !keys.includes(k));
  writeDirty(storeName, rest);
}

export function put<T>(storeName: StoreName, value: T): Promise<void> {
  return putRecord(storeName, value, { fromSync: false });
}

/** fromSync=true 时不打时间戳、不记脏标记，用于把服务器数据落到本地 */
export function putSynced<T>(storeName: StoreName, value: T): Promise<void> {
  return putRecord(storeName, value, { fromSync: true });
}

async function putRecord<T>(storeName: StoreName, value: T, opts: { fromSync: boolean }): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const kp = keyPaths[storeName];
  // 防御性检查：确保对象包含 keyPath 字段
  if (kp && (value as any)[kp] === undefined) {
    console.warn(`[db] put: 对象缺少 keyPath "${kp}"，store="${storeName}"，已跳过`, value);
    return;
  }
  if (!opts.fromSync) {
    // 本地写入点统一维护记录级 updatedAt（epoch ms），同步按它做新者胜出合并
    (value as any).updatedAt = Date.now();
  }
  tx.objectStore(storeName).put(value);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  if (!opts.fromSync && kp) {
    markDirtyKeys(storeName, [String((value as any)[kp])]);
  }
}

export async function putMany<T>(storeName: StoreName, values: T[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const kp = keyPaths[storeName];
  const now = Date.now();
  const writtenKeys: string[] = [];
  values.forEach(v => {
    if (kp && (v as any)[kp] === undefined) {
      console.warn(`[db] putMany: 对象缺少 keyPath "${kp}"，store="${storeName}"，已跳过`, v);
      return;
    }
    (v as any).updatedAt = now;
    tx.objectStore(storeName).put(v);
    if (kp) writtenKeys.push(String((v as any)[kp]));
  });
  if (writtenKeys.length === 0) return;
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  markDirtyKeys(storeName, writtenKeys);
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
