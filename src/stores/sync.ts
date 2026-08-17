// 数据同步层
// 职责：在IndexedDB和后端之间同步数据
// 语义：push 只推脏记录（带本地 updatedAt）；pull 逐条比较本地与服务器记录的
// updatedAt（epoch ms），新者胜出，不再全量盲覆盖。

import { getToken, handleUnauthorized } from './auth';
import { getAll, getById, putSynced, deleteById, clearDirtyKeys, getDirtyKeys, markDirtyKeys, getTombstones, clearTombstones, type StoreName } from './db';

// 需要同步的store（keyPath都是'id'的）
const SYNC_STORES: StoreName[] = ['studySets', 'modules', 'fsrsCards', 'gamification', 'materials', 'dailyPlans', 'mockExams', 'mockAttempts'];

// ---- 同步状态（暴露给 UI：上次成功时间 / 最后错误 / 是否同步中） ----
const SYNC_STATE_KEY = 'exam_sync_state';

export interface SyncState {
  lastSuccessAt: number | null;
  lastError: string | null;
  syncing: boolean;
}

type SyncStateListener = (state: SyncState) => void;

let currentSyncState: SyncState = loadSyncState();
const syncStateListeners = new Set<SyncStateListener>();

function loadSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        lastSuccessAt: typeof parsed.lastSuccessAt === 'number' ? parsed.lastSuccessAt : null,
        lastError: typeof parsed.lastError === 'string' ? parsed.lastError : null,
        syncing: false,
      };
    }
  } catch { /* 忽略损坏的本地状态 */ }
  return { lastSuccessAt: null, lastError: null, syncing: false };
}

function setSyncState(partial: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...partial };
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(currentSyncState));
  } catch { /* localStorage 不可用时静默 */ }
  syncStateListeners.forEach(fn => fn(currentSyncState));
}

export function getSyncState(): SyncState {
  return { ...currentSyncState };
}

/** 订阅同步状态变化，返回取消订阅函数 */
export function subscribeSyncState(listener: SyncStateListener): () => void {
  syncStateListeners.add(listener);
  listener(currentSyncState);
  return () => { syncStateListeners.delete(listener); };
}

// ---- 401 特殊错误：不重试，直接抛 ----
class SyncAuthError extends Error {}

// ---- 指数退避重试：3 次尝试，间隔 2s / 4s ----
const RETRY_DELAYS_MS = [2000, 4000];

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof SyncAuthError) throw err;
      attempt++;
      if (attempt > RETRY_DELAYS_MS.length) throw err;
      const delay = RETRY_DELAYS_MS[attempt - 1];
      console.warn(`[sync] ${label} 第 ${attempt} 次失败，${delay / 1000}s 后重试:`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function apiFetch(path: string, body: unknown) {
  const token = getToken();
  if (!token) throw new Error('未登录');
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (resp.status === 401) {
    // token 过期：全局登出并跳转登录页，抛特殊错误避免无意义重试
    handleUnauthorized();
    throw new SyncAuthError('登录已过期，请重新登录');
  }
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || `同步失败: ${resp.status}`);
  }
  return resp.json();
}

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
        // 推送前快照每条脏记录的 updatedAt：push 完成后只清除「版本未变」的脏标记，
        // 若 push 网络往返期间用户又写入了同一记录（updatedAt 已变），保留脏标记等下一轮推送，避免丢更新
        const pushedAt = new Map<string, number>();
        for (const dirtyKey of dirtyKeys) {
            const record = await getById<Record<string, unknown>>(storeName, dirtyKey);
            if (record) {
                items.push({ item_id: String(record[key]), data: record });
                const ts = recordTs(record);
                if (ts !== null) pushedAt.set(dirtyKey, ts);
            }
        }
        // 墓碑：本地已删除的记录以 {deleted: true, updatedAt} 推送，后端照常 upsert
        for (const t of tombstones) {
            items.push({ item_id: t.itemId, data: { deleted: true, updatedAt: t.updatedAt } });
        }
        if (items.length > 0) {
            await withRetry(`push ${storeName}`, () => apiFetch('/api/sync/push', { store_name: storeName, items }));
        }
        // 竞态清理：仅清除「updatedAt 仍等于推送快照」的脏 key；推送期间被再次写入的 key 保留脏标记
        const cleared: string[] = [];
        for (const dirtyKey of dirtyKeys) {
            const record = await getById<Record<string, unknown>>(storeName, dirtyKey);
            const ts = recordTs(record);
            // 记录已本地删除（墓碑已随本轮推送）或版本未变 → 可安全清除脏标记；
            // 版本已变 → 保留，确保新版本下一轮推送
            if (!record || (ts !== null && pushedAt.get(dirtyKey) === ts)) {
                cleared.push(dirtyKey);
            }
        }
        clearDirtyKeys(storeName, cleared);
        clearTombstones(storeName, tombstones);
        setSyncState({ syncing: false, lastSuccessAt: Date.now(), lastError: null });
    } catch (err) {
        console.warn(`[sync] push ${storeName} failed:`, err);
        setSyncState({
            syncing: false,
            lastError: err instanceof Error ? err.message : `push ${storeName} 失败`,
        });
    }
}

/** 从后端拉取数据：逐条比较 updatedAt，新者胜出（本地较新则保留并补脏标记待推送） */
export async function syncPull(storeNames?: StoreName[]): Promise<void> {
  const token = getToken();
  if (!token) return;
  const names = storeNames || SYNC_STORES;
  setSyncState({ syncing: true });
  try {
    const body: { store_names: StoreName[]; since?: string } = { store_names: names };
    // 增量拉取：以上次成功同步时间为 since，只取此后的变更；首次同步（lastSuccessAt 为 null）不传 since 保持全量。
    // 减 60s 缓冲抵消客户端/服务器时钟偏差——客户端时钟快于服务器时 since 会落到未来导致漏拉。
    const lastSuccessAt = currentSyncState.lastSuccessAt;
    if (lastSuccessAt !== null) {
      body.since = new Date(lastSuccessAt - 60_000).toISOString();
    }
    const data = await withRetry('pull', () => apiFetch('/api/sync/pull', body));
    if (!data) {
      setSyncState({ syncing: false, lastSuccessAt: Date.now(), lastError: null });
      return;
    }
    for (const storeName of names) {
      const items = data[storeName];
      if (!Array.isArray(items) || items.length === 0) continue;
      const key = getKeyForStore(storeName);
      const localAll = await getAll<Record<string, unknown>>(storeName);
      const localMap = new Map(localAll.map(r => [String(r[key]), r]));
      // 本地墓碑表：墓碑 updatedAt 新于服务器记录时，保持本地已删除状态，不复活（墓碑随后由 push 推送）
      const localTombstones = new Map(getTombstones(storeName).map(t => [t.itemId, t.updatedAt]));
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
        const tombTs = localTombstones.get(it.item_id);
        if (tombTs !== undefined && (serverTs === null || tombTs > serverTs)) {
          // 本地墓碑较新：本地已删除且删除时间晚于服务器记录，跳过该条避免瞬时复活；
          // 墓碑仍在 localStorage，本周期 syncPush 会优先推送（后端按时间戳合并）
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
    setSyncState({ syncing: false, lastSuccessAt: Date.now(), lastError: null });
  } catch (err) {
    console.warn('[sync] pull failed:', err);
    setSyncState({
      syncing: false,
      lastError: err instanceof Error ? err.message : '同步拉取失败',
    });
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
