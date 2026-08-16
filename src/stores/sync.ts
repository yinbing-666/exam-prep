// 数据同步层
// 职责：在IndexedDB和后端之间同步数据
// 语义：push 只推脏记录（带本地 updatedAt）；pull 逐条比较本地与服务器记录的
// updatedAt（epoch ms），新者胜出，不再全量盲覆盖。

import { getToken } from './auth';
import { getAll, getById, putSynced, deleteById, clearDirtyKeys, getDirtyKeys, markDirtyKeys, getTombstones, clearTombstones, type StoreName } from './db';

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

function recordTs(record: Record<string, unknown> | undefined): number | null {
  const ts = record?.updatedAt;
  return typeof ts === 'number' ? ts : null;
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

/** 把某个 store 中自上次推送后变更过的记录推送到后端（记录带 updatedAt，由后端按时间戳合并）；本地删除的墓碑一并推送 */
export async function syncPush(storeName: StoreName): Promise<void> {
    const token = getToken();
    if (!token) return;
    const dirtyKeys = getDirtyKeys(storeName);
    const tombstones = getTombstones(storeName);
    if (dirtyKeys.length === 0 && tombstones.length === 0) return;
    try {
        const key = getKeyForStore(storeName);
        // 脏标记里可能含已本地删除的记录（已写入墓碑，此处跳过即可），推送成功后统一清掉标记
        const items: Array<{ item_id: string; data: Record<string, unknown> }> = [];
        for (const dirtyKey of dirtyKeys) {
            const record = await getById<Record<string, unknown>>(storeName, dirtyKey);
            if (record) {
                items.push({ item_id: String(record[key]), data: record });
            }
        }
        // 墓碑：本地已删除的记录以 {deleted: true, updatedAt} 推送，后端照常 upsert
        for (const t of tombstones) {
            items.push({ item_id: t.itemId, data: { deleted: true, updatedAt: t.updatedAt } });
        }
        if (items.length > 0) {
            await apiFetch('/api/sync/push', { store_name: storeName, items });
        }
        clearDirtyKeys(storeName, dirtyKeys);
        clearTombstones(storeName, tombstones);
    } catch (err) {
        console.warn(`[sync] push ${storeName} failed:`, err);
    }
}

/** 从后端拉取数据：逐条比较 updatedAt，新者胜出（本地较新则保留并补脏标记待推送） */
export async function syncPull(storeNames?: StoreName[]): Promise<void> {
  const token = getToken();
  if (!token) return;
  const names = storeNames || SYNC_STORES;
  try {
    const data = await apiFetch('/api/sync/pull', { store_names: names });
    if (!data) return;
    for (const storeName of names) {
      const items = data[storeName];
      if (!Array.isArray(items) || items.length === 0) continue;
      const key = getKeyForStore(storeName);
      const localAll = await getAll<Record<string, unknown>>(storeName);
      const localMap = new Map(localAll.map(r => [String(r[key]), r]));
      const localNewerKeys: string[] = [];
      for (const it of items) {
        const serverRecord = it.data as Record<string, unknown>;
        const localRecord = localMap.get(it.item_id);
        const localTs = recordTs(localRecord);
        const serverTs = recordTs(serverRecord);
        if (localRecord && localTs !== null && (serverTs === null || localTs > serverTs)) {
          // 本地较新（或服务器记录无时间戳）：保留本地，标记为脏等待推送
          localNewerKeys.push(it.item_id);
          continue;
        }
        if (serverRecord.deleted === true) {
          // 服务器墓碑较新：删除本地记录（fromSync=true 不再写新墓碑，避免删除被再次推送循环）
          if (localRecord) {
            await deleteById(storeName, it.item_id, { fromSync: true });
          }
          continue;
        }
        // 本地缺失 / 服务器较新 / 双方均无时间戳（以服务器为基准）→ 取服务器版本
        await putSynced(storeName, serverRecord);
      }
      if (localNewerKeys.length > 0) {
        markDirtyKeys(storeName, localNewerKeys);
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
