import { KnowledgeModule } from '../types';
import { getAll, put, putMany, clearStore, openDB } from './db';
import { schedulePush } from './sync';

export async function getAllModules(): Promise<KnowledgeModule[]> {
  return getAll<KnowledgeModule>('modules');
}

export async function saveModules(modules: KnowledgeModule[]): Promise<void> {
  await putMany('modules', modules);
  schedulePush('modules');
}

export async function updateModuleStatus(id: string, status: 'todo' | 'doing' | 'done'): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('modules', 'readwrite');
  const req = tx.objectStore('modules').get(id);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const module = req.result;
      if (module) { module.status = status; tx.objectStore('modules').put(module); }
    };
    tx.oncomplete = () => { schedulePush('modules'); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAllModules(): Promise<void> {
  return clearStore('modules');
}
