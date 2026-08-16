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

const keyPaths: Record<string, string> = {
    studySets: 'id', results: 'questionId', mastered: 'questionId',
    modules: 'id', mockExams: 'id', mockAttempts: 'id',
    materials: 'id', dailyPlans: 'id', fsrsCards: 'id', gamification: 'id',
  };

export async function put<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const kp = keyPaths[storeName];
  // 防御性检查：确保对象包含 keyPath 字段
  if (kp && (value as any)[kp] === undefined) {
    console.warn(`[db] put: 对象缺少 keyPath "${kp}"，store="${storeName}"，已跳过`, value);
    return;
  }
  tx.objectStore(storeName).put(value);
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function putMany<T>(storeName: StoreName, values: T[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const kp = keyPaths[storeName];
  let count = 0;
  values.forEach(v => {
    if (kp && (v as any)[kp] === undefined) {
      console.warn(`[db] putMany: 对象缺少 keyPath "${kp}"，store="${storeName}"，已跳过`, v);
      return;
    }
    tx.objectStore(storeName).put(v);
    count++;
  });
  if (count === 0) return;
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
