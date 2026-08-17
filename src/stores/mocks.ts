import { MockExam, MockAttempt } from '../types';
import { getAll, put, deleteById } from './db';
import { schedulePush } from './sync';

export async function getAllMockExams(): Promise<MockExam[]> {
  return getAll<MockExam>('mockExams');
}

export async function saveMockExam(exam: MockExam): Promise<void> {
  await put('mockExams', exam);
  schedulePush('mockExams');
}

export async function deleteMockExam(id: string): Promise<void> {
  await deleteById('mockExams', id);
  schedulePush('mockExams');
}

export async function saveMockAttempt(attempt: MockAttempt): Promise<void> {
  await put('mockAttempts', attempt);
  schedulePush('mockAttempts');
}
