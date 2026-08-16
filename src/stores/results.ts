import { QuizResult, Question, WrongQuestion } from '../types';
import { getAll, put, openDB } from './db';
import { getAllStudySets } from './studySets';
import { createFsrsCard } from '../utils/fsrs-service';

export async function getResults(): Promise<QuizResult[]> {
  return getAll<QuizResult>('results');
}

/**
 * Save a quiz result and, if wrong, create an FSRS review card.
 * @param result  The quiz result to persist.
 * @param question  Optional full question object — needed to build the FSRS card front/back.
 */
export async function saveResult(result: QuizResult, question?: Question): Promise<void> {
  await put('results', result);

  // P0-1: auto-create FSRS card for wrong answers
  if (!result.correct && question) {
    const back = `**答案：** ${question.answer}\n\n**解析：** ${question.explanation}`;
    // Fire-and-forget — don't block on card creation
    createFsrsCard(question.question, back, question.id).catch(err =>
      console.warn('[results] createFsrsCard failed:', err)
    );
  }
}

// 获取错题列表（未标记为已掌握的）
export async function getWrongQuestions(): Promise<WrongQuestion[]> {
  const db = await openDB();
  const results = await getResults();
  const wrongResults = results.filter(r => !r.correct);

  // 获取已掌握的题目ID
  const tx2 = db.transaction('mastered', 'readonly');
  const masteredReq = tx2.objectStore('mastered').getAll();
  const masteredIds = await new Promise<Set<string>>((resolve) => {
    masteredReq.onsuccess = () => resolve(new Set(masteredReq.result.map((m: any) => m.questionId)));
    masteredReq.onerror = () => resolve(new Set());
  });

  // 获取所有题目用于查找详情
  const sets = await getAllStudySets();
  const allQuestions = new Map<string, Question>();
  sets.forEach(s => s.questions.forEach(q => allQuestions.set(q.id, q)));

  // 按questionId分组统计
  const grouped = new Map<string, { answers: QuizResult[] }>();
  wrongResults.forEach(r => {
    if (masteredIds.has(r.questionId)) return;
    const existing = grouped.get(r.questionId);
    if (existing) { existing.answers.push(r); } else { grouped.set(r.questionId, { answers: [r] }); }
  });

  // 构建WrongQuestion列表
  const wrongQuestions: WrongQuestion[] = [];
  grouped.forEach((data, questionId) => {
    const question = allQuestions.get(questionId);
    if (!question) return;
    const sorted = data.answers.sort((a, b) => b.answeredAt - a.answeredAt);
    wrongQuestions.push({
      questionId,
      question,
      lastUserAnswer: sorted[0].userAnswer,
      wrongCount: data.answers.length,
      lastWrongAt: sorted[0].answeredAt,
    });
  });

  return wrongQuestions.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
}

// 标记题目为已掌握
export async function markMastered(questionId: string): Promise<void> {
  return put('mastered', { questionId, masteredAt: Date.now() });
}
