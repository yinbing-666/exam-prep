import { getAllStudySets, getResults, getAllModules } from '../stores'
import { getAll } from '../stores/db'
import type { StudySet, QuizResult, MockAttempt, KnowledgeModule } from '../types'

export interface ChapterPerformance {
  chapter: string
  total: number
  correct: number
  percentage: number
}

export interface KnowledgeTagPerf {
  tag: string
  total: number
  correct: number
  percentage: number
}

export interface ReadinessData {
  readinessScore: number
  overallPercentage: number
  mockAttempts: number
  weakChapters: string[]
  chapterPerformance: Record<string, ChapterPerformance>
  knowledgeTagPerformance: Record<string, KnowledgeTagPerf>
  weakKnowledgeTags: string[]
  todayFocus: string[]
}

export async function calculateReadiness(): Promise<ReadinessData> {
  const [sets, results, mockAttempts, modules] = await Promise.all([
    getAllStudySets(),
    getResults(),
    getAll<MockAttempt>('mockAttempts'),
    getAllModules(),
  ])

  // Build question -> chapter map
  const questionChapter = new Map<string, string>()
  for (const s of sets) {
    for (const q of s.questions) {
      questionChapter.set(q.id, q.chapter || s.chapter || '未分类')
    }
  }

  // Chapter performance
  const chapterPerf = new Map<string, { total: number; correct: number }>()
  for (const r of results) {
    const ch = questionChapter.get(r.questionId) || '未分类'
    const entry = chapterPerf.get(ch) || { total: 0, correct: 0 }
    entry.total++
    if (r.correct) entry.correct++
    chapterPerf.set(ch, entry)
  }

  // Add chapters from modules that have no quiz results yet
  for (const m of modules) {
    const ch = m.chapter || '未分类'
    if (!chapterPerf.has(ch)) {
      chapterPerf.set(ch, { total: 0, correct: 0 })
    }
  }

  // Overall stats
  let totalAnswered = 0
  let totalCorrect = 0
  for (const entry of chapterPerf.values()) {
    totalAnswered += entry.total
    totalCorrect += entry.correct
  }

  const overallPercentage = totalAnswered > 0 ? totalCorrect / totalAnswered : 0

  // Build chapter performance record
  const chapterPerformance: Record<string, ChapterPerformance> = {}
  for (const [ch, data] of chapterPerf) {
    chapterPerformance[ch] = {
      chapter: ch,
      total: data.total,
      correct: data.correct,
      percentage: data.total > 0 ? data.correct / data.total : 0,
    }
  }

  // Weak chapters (<65% accuracy and has at least 1 question answered)
  const weakChapters: string[] = []
  for (const [ch, perf] of Object.entries(chapterPerformance)) {
    if (perf.total > 0 && perf.percentage < 0.65) {
      weakChapters.push(ch)
    }
  }

  // Build question -> knowledgeTags map
  const questionTags = new Map<string, string[]>()
  for (const s of sets) {
    for (const q of s.questions) {
      if (q.knowledgeTags?.length) {
        questionTags.set(q.id, q.knowledgeTags)
      }
    }
  }

  // Knowledge tag performance
  const tagPerf = new Map<string, { total: number; correct: number }>()
  for (const r of results) {
    const tags = questionTags.get(r.questionId)
    if (!tags) continue
    for (const tag of tags) {
      const entry = tagPerf.get(tag) || { total: 0, correct: 0 }
      entry.total++
      if (r.correct) entry.correct++
      tagPerf.set(tag, entry)
    }
  }

  // Build knowledge tag performance record
  const knowledgeTagPerformance: Record<string, KnowledgeTagPerf> = {}
  for (const [tag, data] of tagPerf) {
    knowledgeTagPerformance[tag] = {
      tag,
      total: data.total,
      correct: data.correct,
      percentage: data.total > 0 ? data.correct / data.total : 0,
    }
  }

  // Weak tags (<65% accuracy and at least 2 questions)
  const weakKnowledgeTags: string[] = []
  for (const [tag, perf] of Object.entries(knowledgeTagPerformance)) {
    if (perf.total >= 2 && perf.percentage < 0.65) {
      weakKnowledgeTags.push(tag)
    }
  }

  // Today focus: top 3 weak tags sorted by error count
  const todayFocus = Object.entries(knowledgeTagPerformance)
    .filter(([, p]) => p.total >= 2 && p.percentage < 0.65)
    .sort((a, b) => (b[1].total - b[1].correct) - (a[1].total - a[1].correct))
    .slice(0, 3)
    .map(([tag]) => tag)

  const mockCount = mockAttempts.length
  const weakCount = weakChapters.length
  const weakTagCount = weakKnowledgeTags.length

  // Readiness score formula (add tag dimension)
  const accuracyScore = overallPercentage * 40
  const mockScore = Math.min(mockCount, 3) * 10
  const weakChapterBonus = weakCount === 0 ? 20 : Math.max(0, 20 - weakCount * 4)
  const weakTagBonus = weakTagCount === 0 ? 10 : Math.max(0, 10 - weakTagCount * 2)
  const readinessScore = Math.min(100, Math.round(accuracyScore + mockScore + weakChapterBonus + weakTagBonus))

  return {
    readinessScore,
    overallPercentage,
    mockAttempts: mockCount,
    weakChapters,
    chapterPerformance,
    knowledgeTagPerformance,
    weakKnowledgeTags,
    todayFocus,
  }
}