import { fsrs, createEmptyCard, State, Rating, generatorParameters } from 'ts-fsrs'
import { openDB, getAll, put, putMany, getById, deleteById } from '../stores/db'
import { schedulePush } from '../stores/sync'
import type { Question } from '../types'

// ─── FSRS Card type stored in IndexedDB ─────────────────────────
export interface FsrsCard {
  id: string            // = questionId
  front: string         // question text
  back: string          // answer + explanation
  questionId: string
  due: number           // timestamp (ms)
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number         // 0=New 1=Learning 2=Review 3=Relearning
  last_review: number | null
  createdAt: number
  learning_steps: number // P2-7: current learning step index (0 = not in learning phase)
}

// ─── Scheduler instance ────────────────────────────────────────────
const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
})

// ─── Helpers ───────────────────────────────────────────────────────
function toDate(ts: number | undefined | null): Date {
  return ts ? new Date(ts) : new Date()
}

function toTimestamp(d: Date): number {
  return d.getTime()
}

function cardFromTsFsrs(card: import('ts-fsrs').Card, front: string, back: string, questionId: string, createdAt?: number): FsrsCard {
  return {
    id: questionId,
    front,
    back,
    questionId,
    due: toTimestamp(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    last_review: card.last_review ? toTimestamp(card.last_review) : null,
    createdAt: createdAt ?? Date.now(),
    // P2-7: preserve learning_steps from the FSRS card
    learning_steps: card.learning_steps,
  }
}

// ─── Public API ────────────────────────────────────────────────────

/** Create a new FSRS card from a question and store it in IndexedDB */
export async function createFsrsCard(
  front: string,
  back: string,
  questionId: string,
): Promise<FsrsCard> {
  // 同一错题已有卡片时保留原卡（含 FSRS 调度进度），避免重复答错把进度清零
  const existing = await getById<FsrsCard>('fsrsCards', questionId)
  if (existing) return existing

  const now = new Date()
  const empty = createEmptyCard(now)
  const card: FsrsCard = cardFromTsFsrs(empty, front, back, questionId)
  await put('fsrsCards', card)
  schedulePush('fsrsCards')
  return card
}

/** Review a card with a rating and persist the updated card */
export async function reviewCard(
  cardId: string,
  rating: 1 | 2 | 3 | 4,
): Promise<FsrsCard> {
  const existing = await getById<FsrsCard>('fsrsCards', cardId)
  if (!existing) throw new Error(`FSRS card not found: ${cardId}`)

  // Convert stored card back to TS-FSRS Card type
  const tsCard: import('ts-fsrs').Card = {
    due: toDate(existing.due),
    stability: existing.stability,
    difficulty: existing.difficulty,
    elapsed_days: existing.elapsed_days,
    scheduled_days: existing.scheduled_days,
    reps: existing.reps,
    lapses: existing.lapses,
    state: existing.state as State,
    last_review: existing.last_review ? toDate(existing.last_review) : undefined,
    // P2-7: preserve the stored learning step index instead of hardcoding 0
    learning_steps: existing.learning_steps ?? 0,
  }

  const now = new Date()
  const updated = scheduler.next(tsCard, now, rating as any)
  const result = cardFromTsFsrs(
    updated.card,
    existing.front,
    existing.back,
    existing.questionId,
    existing.createdAt,
  )
  await put('fsrsCards', result)
  schedulePush('fsrsCards')
  return result
}

/** Get due cards with 'recent-due priority' ordering:
 *  a. Cards reviewed in last hour AND due now → top priority
 *  b. Other due cards → sorted by due ASC
 *  c. New cards (state=0, never reviewed) → sorted by createdAt DESC
 */
export async function getDueCards(limit: number = 20): Promise<FsrsCard[]> {
  const all = await getAll<FsrsCard>('fsrsCards')
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  const dueNow = all.filter(c => c.due <= now)
  const newCards = all.filter(c => c.state === 0 && c.last_review === null)

  // a) Recently reviewed in last hour AND due now → top priority
  const recentDue = dueNow.filter(c =>
    c.last_review !== null && c.last_review >= oneHourAgo,
  ).sort((a, b) => b.last_review! - a.last_review!)

  // b) Other due cards → sorted by due ASC
  const otherDue = dueNow.filter(c =>
    c.last_review === null || c.last_review < oneHourAgo,
  ).sort((a, b) => a.due - b.due)

  // c) New cards → sorted by createdAt DESC
  const newSorted = newCards
    .filter(c => c.due > now) // exclude anything already in due lists
    .sort((a, b) => b.createdAt - a.createdAt)

  const combined = [...recentDue, ...otherDue, ...newSorted]
  return combined.slice(0, limit)
}

/** Count due cards */
export async function countDueCards(): Promise<number> {
  const all = await getAll<FsrsCard>('fsrsCards')
  const now = Date.now()
  return all.filter(c => c.due <= now).length
}

/** Get retrievability (memory retention) as percentage */
export function getRetrievability(card: FsrsCard): number {
  const tsCard: import('ts-fsrs').Card = {
    due: toDate(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.last_review ? toDate(card.last_review) : undefined,
    // P2-7: use stored learning_steps value
    learning_steps: card.learning_steps,
  }
  const retention = scheduler.get_retrievability(tsCard, new Date(), false) as number
  return Math.round(retention * 100)
}

/** Check if a card exists */
export async function cardExists(questionId: string): Promise<boolean> {
  const card = await getById<FsrsCard>('fsrsCards', questionId)
  return !!card
}

/** Auto-create FSRS cards for wrong questions after a quiz */
export async function createCardsForWrongQuestions(
  questions: Question[],
  userAnswers: Record<string, { answer: string; correct: boolean }>,
): Promise<FsrsCard[]> {
  const cards: FsrsCard[] = []
  for (const q of questions) {
    const result = userAnswers[q.id]
    if (result && !result.correct) {
      const back = `**答案：** ${q.answer}\n\n**解析：** ${q.explanation}`
      const card = await createFsrsCard(q.question, back, q.id)
      cards.push(card)
    }
  }
  return cards
}

/** Get all FSRS cards */
export async function getAllFsrsCards(): Promise<FsrsCard[]> {
  return getAll<FsrsCard>('fsrsCards')
}

/** Delete an FSRS card */
export async function deleteFsrsCard(questionId: string): Promise<void> {
  return deleteById('fsrsCards', questionId)
}

// ─── Daily Challenge Tracking ─────────────────────────────────

const DAILY_KEY = 'exam-prep-daily-challenges'
const HISTORY_KEY = DAILY_KEY + '-history'
const MAX_HISTORY_DAYS = 90

interface DailyRecord {
  date: string        // YYYY-MM-DD
  reviews: number
  newCards: number
  quizzes: number
  minutes: number
}

// 本地时区的 YYYY-MM-DD（toISOString 会按 UTC 切日界，导致东八区晚 8 小时才换天）
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getToday(): string {
  return toLocalDateStr(new Date())
}

/**
 * P2-6 fix: archiveIfNeeded() is now called INSIDE getDailyChallenges()
 * BEFORE loadDailyRecord(), so it can properly detect a day boundary.
 * Archives the previous day's record to history and resets for today.
 */
function archiveIfNeeded(storedRec: DailyRecord | null): void {
  const today = getToday()
  // Nothing to archive if the stored record is already from today or absent
  if (!storedRec || storedRec.date === today) return

  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const history: DailyRecord[] = raw ? JSON.parse(raw) : []
    // Avoid duplicate entries
    if (!history.find(h => h.date === storedRec.date)) {
      history.push(storedRec)
      if (history.length > MAX_HISTORY_DAYS) {
        history.splice(0, history.length - MAX_HISTORY_DAYS)
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    }
  } catch { /* ignore */ }
}

function loadDailyRecord(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (raw) return JSON.parse(raw) as DailyRecord
  } catch { /* ignore */ }
  return { date: getToday(), reviews: 0, newCards: 0, quizzes: 0, minutes: 0 }
}

function saveDailyRecord(rec: DailyRecord): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify(rec))
}

/** Increment today's review count */
export function trackReview(count: number = 1): void {
  const rec = loadDailyRecord()
  rec.reviews += count
  saveDailyRecord(rec)
}

/** Increment today's new cards count */
export function trackNewCards(count: number = 1): void {
  const rec = loadDailyRecord()
  rec.newCards += count
  saveDailyRecord(rec)
}

/** Increment today's quiz count */
export function trackQuiz(count: number = 1): void {
  const rec = loadDailyRecord()
  rec.quizzes += count
  saveDailyRecord(rec)
}

/** Add study minutes to today's record */
export function trackMinutes(mins: number): void {
  const rec = loadDailyRecord()
  rec.minutes += mins
  saveDailyRecord(rec)
}

/** Calculate consecutive-day streak (at least 1 review per day) */
export function calculateStreak(): number {
  const rec = loadDailyRecord()
  let streak = 0

  // If today has reviews, count today as day 1
  if (rec.reviews > 0) {
    streak = 1
  }

  // Walk backwards from yesterday checking localStorage history
  // We store an array of past daily records in a separate key
  try {
    const raw = localStorage.getItem(DAILY_KEY + '-history')
    if (raw) {
      const history: DailyRecord[] = JSON.parse(raw)
      const sorted = history
        .filter(h => h.reviews > 0)
        .sort((a, b) => b.date.localeCompare(a.date))

      // Start from yesterday
      let checkDate = new Date()
      checkDate.setDate(checkDate.getDate() - 1)
      const startDate = toLocalDateStr(checkDate)

      // If today doesn't count, start from today
      const effectiveStart = streak === 0 ? getToday() : startDate

      // 用本地日期分量逐天回溯，避免跨时区的 UTC 日界偏移
      let [y, m, d] = effectiveStart.split('-').map(Number)
      for (let i = 0; i < 365; i++) {
        const dateStr = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const found = sorted.find(h => h.date === dateStr)
        if (found) {
          if (streak === 0 && i === 0 && rec.reviews > 0) streak = 1
          else if (streak === 0 && i === 0) { /* skip, today has no reviews yet */ }
          else streak++
        } else {
          break
        }
        const prev = new Date(y, m - 1, d)
        prev.setDate(prev.getDate() - 1)
        y = prev.getFullYear()
        m = prev.getMonth() + 1
        d = prev.getDate()
      }
    }
  } catch { /* ignore */ }

  return streak
}

/** Get daily challenge progress for today */
export function getDailyChallenges(): {
  reviewsDone: number
  reviewsTarget: number
  quizzesDone: number
  quizzesTarget: number
  streak: number
} {
  // P2-6: archive before loading — this ensures we catch day boundaries correctly
  const stored = (() => {
    try { return localStorage.getItem(DAILY_KEY) ? JSON.parse(localStorage.getItem(DAILY_KEY)!) as DailyRecord : null }
    catch { return null }
  })()
  archiveIfNeeded(stored)
  const rec = loadDailyRecord()
  return {
    reviewsDone: rec.reviews,
    reviewsTarget: 20,
    quizzesDone: rec.quizzes,
    quizzesTarget: 3,
    streak: calculateStreak(),
  }
}

/** Get aggregated daily stats */
export async function getDailyStats(): Promise<{
  reviewed: number
  newCards: number
  streak: number
  totalMinutes: number
}> {
  const rec = loadDailyRecord()
  return {
    reviewed: rec.reviews,
    newCards: rec.newCards,
    streak: calculateStreak(),
    totalMinutes: rec.minutes,
  }
}
