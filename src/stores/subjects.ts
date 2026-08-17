// 科目API管理
// 职责：封装 /api/subjects 和 /api/upload 的后端调用（唯一数据源），
// 并把后端科目与本地偏好（考试日期/每日学习时长，见 utils/subjects）合并成展示层数据

import { getToken, handleUnauthorized } from './auth';
import type { SubjectConfig } from '../ai/prompts';
import { getSubjectPrefs } from '../utils/subjects';

const API_BASE = '/api';

function getHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** token 过期（401）时全局登出并跳转登录页 */
function maybeHandleUnauthorized(res: Response) {
  if (res.status === 401) handleUnauthorized();
}

// ---- Types ----

export interface Subject {
  id: string;
  name: string;
  fullName: string;
  icon: string;
  color: string;
  questionTypes: string[];
  examStyle: string;
  difficulty?: { base: number; advanced: number; challenge: number };
  examReference?: string;
  specialRequirements?: string;
  totalUploaded?: number;
  totalQuestions?: number;
  totalReviews?: number;
  createdAt?: string;
}

export interface CreateSubjectPayload {
  name: string;
  fullName: string;
  icon: string;
  color: string;
  questionTypes: string[];
  examStyle: string;
}

export interface UpdateSubjectPayload {
  name?: string;
  fullName?: string;
  icon?: string;
  color?: string;
  questionTypes?: string[];
  examStyle?: string;
}

export interface UploadResponse {
  charCount: number;
  imageCount?: number;
  imageSkipped?: number;
  [key: string]: any;
}

/** 后端返回的科目对象（同 Subject，语义化别名） */
export type BackendSubject = Subject;

/** 展示层科目：后端科目 + 本地偏好（examDate/dailyMinutes），供首页/计划/练习页使用 */
export interface DisplaySubject {
  id: string;
  name: string;
  color: string;
  icon: string;
  examDate: string;        // 本地偏好，空串表示未设置
  dailyMinutes: number;    // 本地偏好
}

/** 拉取后端科目并合并本地偏好；后端不可用时返回空数组（页面显示空态） */
export async function getDisplaySubjects(): Promise<DisplaySubject[]> {
  try {
    const subjects = await getAllSubjects();
    return subjects.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color || '#f97316',
      icon: s.icon || '📚',
      ...getSubjectPrefs(s.id, s.name),
    }));
  } catch (e) {
    console.warn('获取科目列表失败:', e);
    return [];
  }
}

/** 获取单个科目详情 */
export async function fetchSubjectDetail(subjectId: string): Promise<BackendSubject> {
  const res = await fetch(`${API_BASE}/subjects/${subjectId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '获取科目详情失败');
  }
  return res.json();
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

// ---- API Functions ----

/**
 * 获取所有科目列表
 */
export async function getAllSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_BASE}/subjects`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '获取科目列表失败');
  }
  const data = await res.json();
  return data.subjects || data;
}

/**
 * 创建科目
 */
export async function createSubject(payload: CreateSubjectPayload): Promise<Subject> {
  // 转换驼峰命名为下划线命名（后端Pydantic期望）
  const body = {
    name: payload.name,
    full_name: payload.fullName,
    icon: payload.icon,
    color: payload.color,
    question_types: payload.questionTypes,
    exam_style: payload.examStyle,
  };
  const res = await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '创建科目失败');
  }
  return res.json();
}

/**
 * 更新科目
 */
export async function updateSubject(id: string, payload: UpdateSubjectPayload): Promise<Subject> {
  // 转换驼峰命名为下划线命名
  const body: Record<string, any> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.fullName !== undefined) body.full_name = payload.fullName;
  if (payload.icon !== undefined) body.icon = payload.icon;
  if (payload.color !== undefined) body.color = payload.color;
  if (payload.questionTypes !== undefined) body.question_types = payload.questionTypes;
  if (payload.examStyle !== undefined) body.exam_style = payload.examStyle;
  
  const res = await fetch(`${API_BASE}/subjects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '更新科目失败');
  }
  return res.json();
}

/**
 * 删除科目
 */
export async function deleteSubject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subjects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '删除科目失败');
  }
}

/**
 * 上传文件到指定科目
 */
export async function uploadFile(file: File, subjectId: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject_id', subjectId);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '上传失败');
  }
  return res.json();
}

/**
 * 获取科目下的文件列表
 */
export async function getSubjectFiles(subjectId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/upload/files?subject_id=${subjectId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    maybeHandleUnauthorized(res);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '获取文件列表失败');
  }
  const data = await res.json();
  return data.files || data;
}
