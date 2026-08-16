import { useState, useEffect } from 'react';
import { getWrongQuestions, markMastered, type WrongQuestion } from '../stores';

interface Props { onBack: () => void; onStartReview: (questions: WrongQuestion[]) => void }

export default function Mistakes({ onBack, onStartReview }: Props) {
  const [mistakes, setMistakes] = useState<WrongQuestion[]>([]);
  const [filter, setFilter] = useState<string>('all'); // 'all' | tag string

  useEffect(() => { loadMistakes() }, []);

  async function loadMistakes() {
    const data = await getWrongQuestions();
    setMistakes(data);
  }

  // 从错题数据动态提取所有知识点标签及其错误次数
  const tagCounts = mistakes.reduce<Record<string, number>>((acc, m) => {
    const tags = m.question.knowledgeTags || [];
    if (tags.length === 0) {
      // 没有标签的用章节代替
      const ch = m.question.chapter || '未分类';
      acc[ch] = (acc[ch] || 0) + 1;
    } else {
      tags.forEach((t: string) => { acc[t] = (acc[t] || 0) + 1; });
    }
    return acc;
  }, {});

  // 按错误次数降序排列
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  function getTags(question: WrongQuestion['question']): string[] {
    return question.knowledgeTags?.length ? question.knowledgeTags : [question.chapter || '未分类'];
  }

  const filtered = filter === 'all'
    ? mistakes
    : mistakes.filter(m => getTags(m.question).includes(filter));

  async function handleMaster(questionId: string) {
    await markMastered(questionId);
    loadMistakes();
  }

  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>📝 错题本</h1>
        <p className="subtitle">{mistakes.length} 道错题待攻克</p>
      </header>

      {mistakes.length > 0 && (
        <div className="mistake-actions">
          <button className="btn btn-primary btn-block" onClick={() => onStartReview(filtered)}>
            🔄 重练错题（{filtered.length}道）
          </button>
        </div>
      )}

      {/* 知识点标签过滤栏 */}
      {sortedTags.length > 1 && (
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部（{mistakes.length}）
          </button>
          {sortedTags.map(({ tag, count }) => (
            <button
              key={tag}
              className={`filter-btn ${filter === tag ? 'active' : ''}`}
              onClick={() => setFilter(tag)}
              title={`错${count}次`}
            >
              {tag}（{count}）
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <p>{mistakes.length === 0 ? '🎉 还没有错题' : '该标签没有错题'}</p>
        </div>
      ) : (
        <div className="mistake-list">
          {filtered.map((m) => {
            const tags = getTags(m.question);
            return (
              <div key={m.questionId} className="mistake-card">
                <div className="mistake-header">
                  <span className="q-type-badge">
                    {m.question.type === 'choice' ? '选择' :
                     m.question.type === 'judge' ? '判断' :
                     m.question.type === 'short' ? '简答' : '其他'}
                  </span>
                  <span className="mistake-chapter">{m.question.chapter}</span>
                  <span className="mistake-count">错{m.wrongCount}次</span>
                </div>
                {/* 知识点标签 */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {tags.map(t => (
                      <span key={t} className="tag-badge"
                        style={{
                          fontSize: '11px', padding: '1px 6px',
                          background: '#f0f9ff', color: '#0369a1',
                          borderRadius: '4px', border: '1px solid #bae6fd'
                        }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mistake-question">{m.question.question}</p>
                <div className="mistake-answer">
                  <p className="your-answer">你的答案：{m.lastUserAnswer}</p>
                  <p className="correct-answer">正确答案：{m.question.answer}</p>
                </div>
                <p className="mistake-explain">💡 {m.question.explanation}</p>
                <div className="mistake-footer">
                  <button className="btn btn-sm" onClick={() => handleMaster(m.questionId)}>
                    ✅ 已掌握
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
