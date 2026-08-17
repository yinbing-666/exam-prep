// 资料库存储

import { Material } from '../types';
import { getAll, put, deleteById, openDB } from './db';
import { schedulePush } from './sync';

export async function getAllMaterials(): Promise<Material[]> {
  return getAll<Material>('materials');
}

export async function saveMaterial(material: Material): Promise<void> {
  await put('materials', material);
  schedulePush('materials');
}

export async function deleteMaterial(id: string): Promise<void> {
  await deleteById('materials', id);
  schedulePush('materials');
}
