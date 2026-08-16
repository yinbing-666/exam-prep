// 后端API工具 — 用于将AI出题结果自动同步到后端

import { getToken } from '../stores/auth';
import type { Question } from '../types';

const API_BASE = '/api';

/**
 * 批量保存题目到后端
 * POST /api/questions/batch
 */
export async function batchSaveQuestions(
  questions: Question[],
  subjectId: string
): Promise<{ saved: number; skipped: number }> {
  const token = getToken();
  if (!token) {
    console.warn('[ai/api] 未登录，跳过题目同步');
    return { saved: 0, skipped: questions.length };
  }

  const payload = questions.map(q => ({
    subject_id: subjectId,
    question_text: q.question,
    question_type: q.type,
    correct_answer: q.answer,
    explanation: q.explanation || '',
  }));

  try {
    const resp = await fetch(`${API_BASE}/questions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.warn('[ai/api] 批量保存题目失败:', resp.status, err);
      return { saved: 0, skipped: questions.length };
    }

    const data = await resp.json();
    console.log(`[ai/api] 成功保存 ${data.saved ?? questions.length} 道题目到后端`);
    return { saved: data.saved ?? questions.length, skipped: data.skipped ?? 0 };
  } catch (e) {
    console.warn('[ai/api] 保存题目网络错误:', e);
    return { saved: 0, skipped: questions.length };
  }
}
