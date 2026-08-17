/**
 * 异步任务 API 调用
 */

import { handleUnauthorized } from '../stores/auth';

const API_BASE = '/api/jobs';

interface CreateJobParams {
  job_type: 'knowledge_list' | 'quiz' | 'mock_exam';
  subject_id: string;
  file_ids: string[];
  config?: Record<string, any>;
}

interface Job {
  id: string;
  job_type: string;
  status: string;
  progress: number;
  progress_text: string;
  result?: string;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

function getToken(): string | null {
  return localStorage.getItem('exam_token');
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const resp = await fetch(url, { ...options, headers });
  // token 过期：全局登出并跳转登录页
  if (resp.status === 401) handleUnauthorized();
  return resp;
}

/**
 * 创建异步任务
 */
export async function createJob(params: CreateJobParams): Promise<string> {
  const resp = await fetchWithAuth(API_BASE, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || `创建任务失败: ${resp.status}`);
  }
  
  const data = await resp.json();
  return data.job_id;
}

/**
 * 查询任务状态
 */
export async function getJobStatus(jobId: string): Promise<Job> {
  const resp = await fetchWithAuth(`${API_BASE}/${jobId}`);
  
  if (!resp.ok) {
    throw new Error(`查询任务失败: ${resp.status}`);
  }
  
  return resp.json();
}

/**
 * 列出任务
 */
export async function listJobs(params?: {
  subject_id?: string;
  status?: string;
  limit?: number;
}): Promise<{ jobs: Job[] }> {
  const queryParams = new URLSearchParams();
  if (params?.subject_id) queryParams.set('subject_id', params.subject_id);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  
  const resp = await fetchWithAuth(`${API_BASE}?${queryParams}`);
  
  if (!resp.ok) {
    throw new Error(`列出任务失败: ${resp.status}`);
  }
  
  return resp.json();
}

/**
 * 删除任务
 */
export async function deleteJob(jobId: string): Promise<void> {
  const resp = await fetchWithAuth(`${API_BASE}/${jobId}`, {
    method: 'DELETE',
  });
  
  if (!resp.ok) {
    throw new Error(`删除任务失败: ${resp.status}`);
  }
}

/**
 * 等待任务完成（轮询）
 */
export async function waitForJob(
  jobId: string,
  onProgress?: (progress: number, text: string) => void,
  pollInterval: number = 2000
): Promise<any> {
  while (true) {
    const job = await getJobStatus(jobId);
    
    if (onProgress) {
      onProgress(job.progress, job.progress_text);
    }
    
    if (job.status === 'completed') {
      try {
        return JSON.parse(job.result!);
      } catch {
        return job.result;
      }
    }
    
    if (job.status === 'failed') {
      throw new Error(job.error || '任务处理失败');
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}
