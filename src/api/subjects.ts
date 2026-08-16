// 科目配置API — 从后端获取科目配置（题型偏好、考试风格等）

import { getToken } from '../stores/auth';
import type { SubjectConfig } from '../ai/prompts';

/** 后端返回的科目对象 */
export interface BackendSubject {
  id: string;
  name: string;
  fullName?: string;
  icon?: string;
  color?: string;
  questionTypes?: string[];
  examStyle?: string;
  difficulty?: { base: number; advanced: number; challenge: number };
  examReference?: string;
  specialRequirements?: string;
  description?: string;
  chapterCount?: number;
  questionCount?: number;
}

const API_BASE = '/api';

async function authFetch(path: string): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error('未登录');
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || `请求失败: ${resp.status}`);
  }
  return resp;
}

/** 获取所有科目列表 */
export async function fetchSubjects(): Promise<BackendSubject[]> {
  try {
    const resp = await authFetch('/subjects');
    const data = await resp.json();
    return data.subjects || data || [];
  } catch (e) {
    console.warn('获取科目列表失败，使用本地科目:', e);
    return [];
  }
}

/** 获取单个科目详情 */
export async function fetchSubjectDetail(subjectId: string): Promise<BackendSubject> {
  const resp = await authFetch(`/subjects/${subjectId}`);
  return resp.json();
}

/** 将后端科目转换为 SubjectConfig 供 Prompt 使用 */
export function toSubjectConfig(subject: BackendSubject): SubjectConfig {
  return {
    name: subject.name,
    fullName: subject.fullName,
    questionTypes: subject.questionTypes,
    examStyle: subject.examStyle,
    difficulty: subject.difficulty,
    examReference: subject.examReference,
    specialRequirements: subject.specialRequirements,
  };
}
