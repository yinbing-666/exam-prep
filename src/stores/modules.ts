import { KnowledgeModule } from '../types';
import { getAll, getById, put, putMany, clearStore } from './db';
import { schedulePush } from './sync';

export async function getAllModules(): Promise<KnowledgeModule[]> {
  return getAll<KnowledgeModule>('modules');
}

export async function saveModules(modules: KnowledgeModule[]): Promise<void> {
  await putMany('modules', modules);
  schedulePush('modules');
}

export async function updateModuleStatus(id: string, status: 'todo' | 'doing' | 'done'): Promise<void> {
  // 走 db 层读取 + put 写入，统一维护 updatedAt 和同步脏标记
  const module = await getById<KnowledgeModule>('modules', id);
  if (module) {
    module.status = status;
    await put('modules', module);
  }
  schedulePush('modules');
}

export async function deleteAllModules(): Promise<void> {
  return clearStore('modules');
}
