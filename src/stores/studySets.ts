import { StudySet } from '../types';
import { getAll, getById, put, deleteById } from './db';
import { schedulePush } from './sync';

export async function getAllStudySets(): Promise<StudySet[]> {
  return getAll<StudySet>('studySets');
}

export async function getStudySet(id: string): Promise<StudySet | undefined> {
  return getById<StudySet>('studySets', id);
}

export async function saveStudySet(set: StudySet): Promise<void> {
  await put('studySets', set);
  schedulePush('studySets');
}

export async function deleteStudySet(id: string): Promise<void> {
  await deleteById('studySets', id);
  schedulePush('studySets');
}
