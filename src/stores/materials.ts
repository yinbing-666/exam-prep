// 资料库存储

import { Material } from '../types';
import { getAll, put, deleteById, openDB } from './db';

export async function getAllMaterials(): Promise<Material[]> {
  return getAll<Material>('materials');
}

export async function saveMaterial(material: Material): Promise<void> {
  return put('materials', material);
}

export async function deleteMaterial(id: string): Promise<void> {
  return deleteById('materials', id);
}
