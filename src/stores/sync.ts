// 数据同步层
// 职责：在IndexedDB和后端之间同步数据

import { getToken } from './auth';
import { getAll, putMany, type StoreName } from './db';

// 需要同步的store（keyPath都是'id'的）
const SYNC_STORES: StoreName[] = ['studySets', 'modules', 'fsrsCards', 'gamification', 'materials', 'dailyPlans', 'mockExams', 'mockAttempts'];

// 获取store中每条记录的key名
function getKeyForStore(storeName: StoreName): string {
  const map: Record<string, string> = {
    studySets: 'id', modules: 'id', fsrsCards: 'id', gamification: 'id',
    materials: 'id', dailyPlans: 'id', mockExams: 'id', mockAttempts: 'id',
    results: 'questionId', mastered: 'questionId',
  };
  return map[storeName] || 'id';
}

async function apiFetch(path: string, body: unknown) {
  const token = getToken();
  if (!token) throw new Error('未登录');
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || `同步失败: ${resp.status}`);
  }
  return resp.json();
}

/** 把某个store的所有数据推送到后端 */
export async function syncPush(storeName: StoreName): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    const all = await getAll(storeName);
    if (all.length === 0) return;
    const key = getKeyForStore(storeName);
    const items = all.map((item) => {
      const obj = item as Record<string, unknown>;
      return { item_id: String(obj[key]), data: item };
    });
    await apiFetch('/api/sync/push', { store_name: storeName, items });
  } catch (err) {
    console.warn(`[sync] push ${storeName} failed:`, err);
  }
}

/** 从后端拉取数据到本地 */
export async function syncPull(storeNames?: StoreName[]): Promise<void> {
  const token = getToken();
  if (!token) return;
  const names = storeNames || SYNC_STORES;
  try {
    const data = await apiFetch('/api/sync/pull', { store_names: names });
    if (!data) return;
    for (const storeName of names) {
      const items = data[storeName];
      if (Array.isArray(items) && items.length > 0) {
        const records = items.map((it: { item_id: string; data: Record<string, unknown> }) => it.data);
        await putMany(storeName, records);
      }
    }
  } catch (err) {
    console.warn('[sync] pull failed:', err);
  }
}

/** 同步所有：先拉后推 */
export async function syncAll(): Promise<void> {
  await syncPull();
  for (const s of SYNC_STORES) {
    await syncPush(s);
  }
}

/** 在store写操作后自动推送（防抖） */
let pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};
export function schedulePush(storeName: StoreName) {
  if (!getToken()) return;
  if (pushTimers[storeName]) clearTimeout(pushTimers[storeName]);
  pushTimers[storeName] = setTimeout(() => { syncPush(storeName); }, 2000);
}
