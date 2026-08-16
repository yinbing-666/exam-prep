import { MockExam, MockAttempt } from '../types';
import { getAll, put, deleteById } from './db';

export async function getAllMockExams(): Promise<MockExam[]> {
  return getAll<MockExam>('mockExams');
}

export async function saveMockExam(exam: MockExam): Promise<void> {
  return put('mockExams', exam);
}

export async function deleteMockExam(id: string): Promise<void> {
  return deleteById('mockExams', id);
}

export async function saveMockAttempt(attempt: MockAttempt): Promise<void> {
  return put('mockAttempts', attempt);
}
