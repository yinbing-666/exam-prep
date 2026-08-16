import { useState, useEffect, useCallback } from 'react'
import { getDueCards, countDueCards, reviewCard, getRetrievability, trackReview } from '../utils/fsrs-service'
import type { FsrsCard } from '../utils/fsrs-service'

interface Props {
  onBack: () => void
}

export default function ReviewSession({ onBack }: Props) {
  const [cards, setCards] = useState<FsrsCard[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<{ cardId: string; rating: number; retentionBefore: number }[]>([])
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCards()
  }, [])

  async function loadCards() {
    setLoading(true)
    const due = await getDueCards(50)
    setCards(due)
    setIndex(0)
    setRevealed(false)
    setResults([])
    setFinished(false)
    setLoading(false)
  }

  const currentCard = cards[index]

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    if (!currentCard) return
    const retentionBefore = getRetrievability(currentCard)
    await reviewCard(currentCard.id, rating)
    // 每复习一张卡计入每日挑战 / 连胜统计
    trackReview(1)
    setResults(prev => [...prev, { cardId: currentCard.id, rating, retentionBefore }])
    if (index + 1 >= cards.length) {
      setFinished(true)
    } else {
      setIndex(i => i + 1)
      setRevealed(false)
    }
  }

  // ── Summary screen ──────────────────────────────────────────────
  if (finished) {
    const avgRetention = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.retentionBefore, 0) / results.length)
      : 0
    const totalCards = results.length
    const againCount = results.filter(r => r.rating === 1).length
    const hardCount = results.filter(r => r.rating === 2).length
    const goodCount = results.filter(r => r.rating === 3).length
    const easyCount = results.filter(r => r.rating === 4).length

    return (
      <div className="page" style={{ background: '#f6f5f4', minHeight: '100vh' }}>
        <header className="header">
          <button className="btn-back" onClick={onBack}>← 返回首页</button>
          <h1 style={{ color: '#37352f' }}>✅ 复习完成</h1>
        </header>
        <div className="result-card" style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, background: '#fff', padding: 32 }}>
          <div className="result-score" style={{ color: '#e07030', fontSize: 56 }}>{totalCards}</div>
          <p style={{ fontSize: 16, color: '#6b6b6b' }}>卡片已复习</p>
          <div style={{ marginTop: 20, fontSize: 14, color: '#6b6b6b', lineHeight: 2 }}>
            <p>📊 平均记忆保留率：<strong style={{ color: '#37352f' }}>{avgRetention}%</strong></p>
            <p>🔄 Again：{againCount} | Hard：{hardCount} | Good：{goodCount} | Easy：{easyCount}</p>
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary btn-block" onClick={loadCards}>
              🔄 再来一轮
            </button>
            <button className="btn btn-block" onClick={onBack}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page" style={{ background: '#f6f5f4', minHeight: '100vh' }}>
        <div className="empty">
          <p style={{ fontSize: 18 }}>⏳ 加载复习卡片中...</p>
        </div>
      </div>
    )
  }

  // ── No cards due ────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div className="page" style={{ background: '#f6f5f4', minHeight: '100vh' }}>
        <header className="header">
          <button className="btn-back" onClick={onBack}>← 返回首页</button>
          <h1 style={{ color: '#37352f' }}>🔄 FSRS复习</h1>
        </header>
        <div className="result-card" style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, background: '#fff', padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🎉</p>
          <p style={{ fontSize: 16, color: '#6b6b6b' }}>没有待复习的卡片</p>
          <p style={{ fontSize: 13, color: '#999', marginTop: 8 }}>做一份测试或练习，错题会自动加入复习计划</p>
          <button className="btn btn-block" onClick={onBack} style={{ marginTop: 20 }}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // ── Current card ─────────────────────────────────────────────────
  return (
    <div className="page" style={{ background: '#f6f5f4', minHeight: '100vh' }}>
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回首页</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#37352f', fontSize: 20 }}>🔄 FSRS复习</h1>
          <span style={{ color: '#6b6b6b', fontSize: 14 }}>
            {index + 1}/{cards.length}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#e07030', borderRadius: 2, width: `${((index) / cards.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
        <p style={{ color: '#6b6b6b', fontSize: 13, marginTop: 4 }}>
          剩余 {cards.length - index - 1} 张卡片
        </p>
      </header>

      {/* Card front (question) */}
      <div
        className="quiz-card"
        onClick={() => !revealed && setRevealed(true)}
        style={{
          cursor: revealed ? 'default' : 'pointer',
          background: revealed ? '#fff' : '#fff',
          border: revealed ? '2px solid #e07030' : '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{
            display: 'inline-block',
            background: revealed ? '#e07030' : '#e8925a',
            color: '#fff',
            padding: '4px 14px',
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600,
          }}>
            {revealed ? '翻开了' : '点击翻开'}
          </span>
        </div>
        <div className="q-text" style={{ fontSize: 18, lineHeight: 1.7, textAlign: 'center' }}>
          {currentCard.front}
        </div>

        {revealed && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: '#37352f', whiteSpace: 'pre-wrap' }}>
              {currentCard.back}
            </div>
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleRate(1)}
            style={ratingBtnStyle('#ef4444')}
          >
            😰 Again
          </button>
          <button
            onClick={() => handleRate(2)}
            style={ratingBtnStyle('#eab308')}
          >
            🤔 Hard
          </button>
          <button
            onClick={() => handleRate(3)}
            style={ratingBtnStyle('#22c55e')}
          >
            😊 Good
          </button>
          <button
            onClick={() => handleRate(4)}
            style={ratingBtnStyle('#3b82f6')}
          >
            🚀 Easy
          </button>
        </div>
      )}

      {!revealed && (
        <p style={{ textAlign: 'center', color: '#999', fontSize: 13, marginTop: 16 }}>
          点击卡片上方区域翻转
        </p>
      )}
    </div>
  )
}

function ratingBtnStyle(color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 4px',
    borderRadius: 10,
    border: `2px solid ${color}20`,
    background: '#fff',
    color: color,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}
