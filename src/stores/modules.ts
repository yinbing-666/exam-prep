import { KnowledgeModule } from '../types';
import { getAll, getById, put, putMany, deleteById } from './db';
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
  // 逐条 deleteById 而非 clearStore：删除必须写墓碑，否则服务器旧记录会在下次 pull 时全部复活
  const modules = await getAllModules();
  for (const m of modules) {
    await deleteById('modules', String(m.id));
  }
  schedulePush('modules');
}
