// 科目API管理
// 职责：封装 /api/subjects 和 /api/upload 的后端调用

const API_BASE = '/api';
const TOKEN_KEY='exam_token';

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
  [key: string]: any;
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || '获取文件列表失败');
  }
  const data = await res.json();
  return data.files || data;
}
