// 生成器层 — 支持科目配置参数化

import { Question, KnowledgeModule, DailyPlan } from '../types';
import { callAI } from './client';
import { buildQuizPrompt, buildPlanPrompt, buildMockPrompt, buildMemorizePrompt, buildKnowledgeExtractPrompt, DAILY_PLAN_SYSTEM_PROMPT, SubjectConfig } from './prompts';
import { batchSaveQuestions } from './api';

/** 生成唯一 ID：优先 crypto.randomUUID（需安全上下文），不可用时降级为时间戳+随机后缀 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 10);
}

function extractJSON(text: string): any[] {
  // 1. 尝试直接提取JSON数组
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      // JSON解析失败，尝试修复常见问题
      let cleaned = match[0]
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/,\s*]/g, ']')  // 移除尾随逗号
        .replace(/,\s*}/g, '}')  // 移除对象尾随逗号
        .replace(/[\u0000-\u001F]+/g, '') // 移除控制字符
        .trim();
      try {
        return JSON.parse(cleaned);
      } catch (e2) {
        // 继续尝试其他方法
      }
    }
  }
  
  // 2. 尝试提取代码块中的JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // 继续
    }
  }
  
  // 3. 尝试找任何以[开头以]结尾的内容
  const anyArrayMatch = text.match(/\[[\s\S]{10,}\]/);
  if (anyArrayMatch) {
    try {
      return JSON.parse(anyArrayMatch[0]);
    } catch (e) {
      // 最后尝试
    }
  }
  
  throw new Error('AI返回格式错误，无法解析JSON数组');
}

/** Compute Jaccard similarity on character bigrams between two strings. */
export function bigramSimilarity(a: string, b: string): number {
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  let intersection = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;
  const union = bigramsA.size + bigramsB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/** Remove near-duplicate questions based on bigram similarity threshold. */
export function dedupQuestions(questions: Question[], threshold = 0.7): Question[] {
  const kept: Question[] = [];
  for (const q of questions) {
    const isDuplicate = kept.some(
      k => bigramSimilarity(q.question, k.question) > threshold
    );
    if (!isDuplicate) kept.push(q);
  }
  return kept;
}

function scoreQuestion(q: any): number {
  const validTypes = ['choice', 'judge', 'short', 'essay', 'programming', 'fill', 'calc', 'draw'];
  let score = 0;
  if (validTypes.includes(q.type)) score++;
  if (q.question && typeof q.question === 'string' && q.question.trim().length > 0) score++;
  if (q.type === 'choice') {
    if (Array.isArray(q.options) && q.options.length === 4) score++;
  } else {
    score++;
  }
  if (q.answer && typeof q.answer === 'string' && q.answer.trim().length > 0) score++;
  if (q.explanation && typeof q.explanation === 'string' && q.explanation.trim().length > 0) score++;
  if (q.question && q.question.trim().length > 10) score++;
  // 程序题额外验证：答案应该包含代码块
  if (q.type === 'programming') {
    if (q.answer && (q.answer.includes('```') || q.answer.includes('    '))) score++;
  }
  return score;
}

// ============================================================
// ============================================================
// 出题
// ============================================================

// ─── P1-4: Knowledge Points Cache ─────────────────────────────

type KnowledgePoint = { title: string; definition: string; exam_hint: string };

const KP_CACHE_PREFIX = 'exam-prep-kp-cache:';
const KP_CACHE_VERSION = 'v1';

/** Simple hash of the first 500 chars of content (no crypto needed). */
function contentHash(content: string): string {
  let hash = 0;
  const prefix = content.slice(0, 500);
  for (let i = 0; i < prefix.length; i++) {
    hash = ((hash << 5) - hash + prefix.charCodeAt(i)) | 0;
  }
  return `v1-${hash.toString(36)}`;
}

function getCachedKP(hash: string): KnowledgePoint[] | null {
  try {
    const raw = localStorage.getItem(KP_CACHE_PREFIX + hash);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Sanity check
      if (Array.isArray(parsed) && parsed.every(k => k && typeof k.title === 'string')) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedKP(hash: string, kps: KnowledgePoint[]): void {
  try {
    localStorage.setItem(KP_CACHE_PREFIX + hash, JSON.stringify(kps));
  } catch { /* storage full — ignore */ }
}

/** Generate knowledge points with localStorage cache keyed by content hash.
 *  On cache hit, skips the first LLM call entirely. */
export async function generateKnowledgePointsWithCache(
  content: string,
  providerId: string,
  modelId: string,
  subjectConfig?: SubjectConfig
): Promise<KnowledgePoint[]> {
  const hash = contentHash(content);
  const cached = getCachedKP(hash);
  if (cached) return cached;

  const kps = await generateKnowledgePoints(content, providerId, modelId, subjectConfig);
  if (kps.length > 0) setCachedKP(hash, kps);
  return kps;
}

/**
 * Public export — generates knowledge points without cache.
 * The cached version is used internally by generateQuestionsTwoStage.
 */
export async function generateKnowledgePoints(
  content: string,
  providerId: string,
  modelId: string,
  subjectConfig?: SubjectConfig
): Promise<KnowledgePoint[]> {
  const text = await callAI(providerId, modelId, buildKnowledgeExtractPrompt(subjectConfig), `课程内容：\n${content}`);
  const raw = extractJSON(text);
  return raw
    .filter((k: any) => k && typeof k.title === 'string' && k.title.trim().length > 0)
    .map((k, i) => ({
      title: k.title.trim(),
      definition: typeof k.definition === 'string' ? k.definition.trim() : '',
      exam_hint: typeof k.exam_hint === 'string' ? k.exam_hint.trim() : '',
    }))
}

// ─── P1-4 end ─────────────────────────────────────────────────

// ─── Two-stage question generation ────────────────────────────

export async function generateQuestionsTwoStage(
  content: string, chapter: string, providerId: string, modelId: string,
  count = 10, subjectConfig?: SubjectConfig,
  subjectId?: string,
  customPrompt?: string
): Promise<Question[]> {
  // P1-4: use cached knowledge points — skips LLM call on cache hit
  const knowledgePoints = await generateKnowledgePointsWithCache(content, providerId, modelId, subjectConfig);
  if (knowledgePoints.length === 0) {
    // 提炼失败则退回单段式
    return generateQuestions(content, chapter, providerId, modelId, count, subjectConfig, subjectId, customPrompt);
  }
  const pointsText = knowledgePoints
    .map((k, i) => `${i + 1}. ${k.title} — ${k.definition}（考法：${k.exam_hint || '待定'}）`)
    .join('\n');

  // 第二段：基于知识点出题
  const targetCount = Math.ceil(count * 1.6);
  let prompt = customPrompt || buildQuizPrompt(targetCount, subjectConfig, undefined, pointsText);

  let attempts = 0;
  const maxAttempts = 2;
  while (attempts < maxAttempts) {
    attempts++;
    const text = await callAI(providerId, modelId, prompt, `课程内容：\n${content}`);
    const raw = extractJSON(text);
    const parsed: Question[] = raw.map((q: any, i: number) => ({
      id: generateId(),
      type: q.type,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      importance: q.importance || '',
      chapter,
      knowledgeTags: Array.isArray(q.knowledgeTags) ? q.knowledgeTags.slice(0, 3) : [],
    }));
    const scored = parsed.map(q => ({ question: q, score: scoreQuestion(q) }));
    scored.sort((a, b) => b.score - a.score);
    const deduped = dedupQuestions(scored.map(s => s.question));
    const rescored = deduped.map(q => ({ question: q, score: scoreQuestion(q) }));
    rescored.sort((a, b) => b.score - a.score);
    const selected = rescored.slice(0, count).map(s => s.question);
    if (selected.length >= count) {
      if (subjectId) batchSaveQuestions(selected, subjectId);
      return selected;
    }
  }
  // 兜底
  const fallbackPrompt = customPrompt || buildQuizPrompt(targetCount, subjectConfig);
  const text = await callAI(providerId, modelId, fallbackPrompt, `课程内容：\n${content}`);
  const raw = extractJSON(text);
  const fallbackQuestions = raw.map((q: any, i: number) => ({
    id: generateId(),
    type: q.type,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    importance: q.importance || '',
    chapter,
    knowledgeTags: Array.isArray(q.knowledgeTags) ? q.knowledgeTags.slice(0, 3) : [],
  }));
  if (subjectId) batchSaveQuestions(fallbackQuestions, subjectId);
  return fallbackQuestions;
}

export async function generateQuestions(
  content: string, chapter: string, providerId: string, modelId: string,
  count = 10, subjectConfig?: SubjectConfig,
  /** 可选：题目自动保存到后端的科目ID */
  subjectId?: string,
  /** 可选：用户自定义的prompt */
  customPrompt?: string,
  /** 可选：只生成这些知识点的题目（针对性出题模式） */
  focusTags?: string[]
): Promise<Question[]> {
  const targetCount = Math.ceil(count * 1.6);

  // 构建针对性prompt（只在focusTags时追加约束）
  let prompt = customPrompt || buildQuizPrompt(targetCount, subjectConfig);
  if (focusTags?.length) {
    const tagList = focusTags.join('、');
    prompt = prompt.replace(
      '严格按JSON数组输出：',
      `【针对性出题约束】只生成以下知识点的题目：${tagList}。每道题的knowledgeTags必须来自这个列表。\n严格按JSON数组输出：`
    );
  }

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    const text = await callAI(providerId, modelId, prompt, `课程内容：\n${content}`);
    const raw = extractJSON(text);

    const parsed: Question[] = raw.map((q: any, i: number) => ({
      id: generateId(),
      type: q.type,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      importance: q.importance || '',
      chapter,
      knowledgeTags: Array.isArray(q.knowledgeTags) ? q.knowledgeTags.slice(0, 3) : [],
    }));

    const scored = parsed.map(q => ({ question: q, score: scoreQuestion(q) }));
    scored.sort((a, b) => b.score - a.score);

    const deduped = dedupQuestions(scored.map(s => s.question));
    const rescored = deduped.map(q => ({ question: q, score: scoreQuestion(q) }));
    rescored.sort((a, b) => b.score - a.score);

    const selected = rescored.slice(0, count).map(s => s.question);
    if (selected.length >= count) {
      // 异步保存到后端（不阻塞主流程）
      if (subjectId) batchSaveQuestions(selected, subjectId);
      return selected;
    }
  }

  // 最终兜底：不用focusTags约束，重试一次
  const fallbackPrompt = customPrompt || buildQuizPrompt(targetCount, subjectConfig);
  const text = await callAI(providerId, modelId, fallbackPrompt, `课程内容：\n${content}`);
  const raw = extractJSON(text);
  const fallbackQuestions = raw.map((q: any, i: number) => ({
    id: generateId(),
    type: q.type,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    importance: q.importance || '',
    chapter,
    knowledgeTags: Array.isArray(q.knowledgeTags) ? q.knowledgeTags.slice(0, 3) : [],
  }));
  // 异步保存到后端（不阻塞主流程）
  if (subjectId) batchSaveQuestions(fallbackQuestions, subjectId);
  return fallbackQuestions;
}

// ============================================================
// 知识模块拆分
// ============================================================
export async function generateModules(
  content: string, chapter: string, providerId: string, modelId: string,
  subjectConfig?: SubjectConfig
): Promise<KnowledgeModule[]> {
  const text = await callAI(providerId, modelId, buildPlanPrompt(subjectConfig), `请根据以下${chapter}的课件内容，拆出知识模块：\n\n${content}`);
  return extractJSON(text).map((m: any, i: number) => ({
    id: generateId(),
    title: m.title,
    chapter, 
    estimatedMinutes: m.estimated_minutes || 30,
    difficulty: m.difficulty || '中', 
    importanceRank: m.importance_rank || i + 1,
    examPoints: m.exam_points || '', 
    practice: m.practice || '',
    mnemonic: m.mnemonic || '',
    keyFormula: m.key_formula || '',
    visualHint: m.visual_hint || '',
    diagram: m.diagram || '',
    status: 'todo' as const, 
    createdAt: Date.now(),
  }));
}

// ============================================================
// 模拟考
// ============================================================
export async function generateMockExam(
  content: string,
  config: {
    chapters: string[];
    questionTypes: { choice: number; judge: number; short: number; essay: number; programming: number };
    scoring: { choice: number; judge: number; short: number; essay: number; programming: number };
    duration: number;
    referenceReal: boolean;
    customFocus?: string;
    subject?: SubjectConfig;
  },
  providerId: string,
  modelId: string
): Promise<{ paper: string; answerKey: string }> {
  const systemPrompt = buildMockPrompt(config);
  const text = await callAI(providerId, modelId, systemPrompt, `请根据以下课件内容出题：\n\n${content}`);
  const parts = text.split(/【答案与解析】|【答案解析】|【题目解析】/);
  return { paper: parts[0]?.replace(/【试卷标题】/g, '').trim() || text, answerKey: parts[1]?.trim() || '未找到解析' };
}

// ============================================================
// 速背
// ============================================================
export async function generateMemorize(
  moduleTitle: string, examPoints: string, providerId: string, modelId: string,
  subjectConfig?: SubjectConfig
): Promise<string> {
  return callAI(providerId, modelId, buildMemorizePrompt(subjectConfig), `请为以下知识点生成速背内容：\n\n知识点：${moduleTitle}\n考察内容：${examPoints}`);
}

// ============================================================
// 每日计划（已通用化，不依赖科目配置）
// ============================================================
export async function generateDailyPlan(
  modules: KnowledgeModule[],
  examDate: string,
  dailyMinutes: number,
  today: string,
  providerId: string,
  modelId: string
): Promise<DailyPlan[]> {
  const moduleList = modules.map(m =>
    `id:${m.id} | ${m.title} | 难度:${m.difficulty} | 重要排名:${m.importanceRank} | 预计:${m.estimatedMinutes}分钟`
  ).join('\n');

  const userContent = `考试日期：${examDate}\n今天日期：${today}\n每天可用时间：${dailyMinutes}分钟\n未完成模块：\n${moduleList}`;

  const text = await callAI(providerId, modelId, DAILY_PLAN_SYSTEM_PROMPT, userContent);
  const parsed = extractJSON(text);

  return parsed.map((p: any, i: number) => ({
    id: generateId(),
    moduleId: p.module_id,
    moduleTitle: p.module_title,
    date: p.date,
    dayOrder: p.day_order || i + 1,
    reason: p.reason || '',
    status: 'pending' as const,
    createdAt: Date.now(),
  }));
}
