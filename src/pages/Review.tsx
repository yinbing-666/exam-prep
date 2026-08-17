import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getWrongQuestions, markMastered } from '../stores/results';
import { WrongQuestion } from '../types';

interface ReviewProps {
  /** Questions passed from MistakesPage when starting a targeted review session */
  reviewQuestions?: WrongQuestion[];
  /** Called when user exits or completes the review session */
  onSessionEnd?: () => void;
}

const Review: React.FC<ReviewProps> = ({ reviewQuestions: initQuestions, onSessionEnd }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'mistakes' | 'mastered'>('mistakes');
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);

  // P0-2: use passed-in questions for review mode, otherwise load from store
  useEffect(() => {
    if (initQuestions && initQuestions.length > 0) {
      setWrongQuestions(initQuestions);
      setReviewMode(true);
      setLoading(false);
    } else {
      loadWrongQuestions();
    }
  }, []);

  async function loadWrongQuestions() {
    try {
      const questions = await getWrongQuestions();
      setWrongQuestions(questions);
    } catch (error) {
      console.error('加载错题失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkMastered(questionId: string) {
    await markMastered(questionId);
    setWrongQuestions(prev => prev.filter(q => q.questionId !== questionId));
    // Advance to next in review mode
    if (reviewMode && reviewIndex < wrongQuestions.length - 1) {
      setReviewIndex(prev => prev);
    }
  }

  function handleReviewAnswer(correct: boolean) {
    if (correct) setReviewScore(s => s + 1);
    if (reviewIndex < wrongQuestions.length - 1) {
      setExpandedId(wrongQuestions[reviewIndex + 1].questionId);
    } else {
      // Review complete
      if (onSessionEnd) onSessionEnd();
    }
  }

  function handleExitReview() {
    if (onSessionEnd) onSessionEnd();
  }

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: '10px 16px',
    background: active ? '#f97316' : 'transparent',
    color: active ? '#fff' : '#6b7280',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  // ─── P0-2: Review-mode UI ───────────────────────────────────
  if (reviewMode && wrongQuestions.length > 0) {
    const current = wrongQuestions[reviewIndex];
    const isLast = reviewIndex === wrongQuestions.length - 1;
    return (
      <div style={{
        minHeight: '100vh',
        background: '#faf8f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
        WebkitFontSmoothing: 'antialiased',
        paddingBottom: 80,
      }}>
        {/* Header */}
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleExitReview} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>←</button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d2d2d' }}>
            错题复习 ({reviewIndex + 1}/{wrongQuestions.length})
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#6b7280' }}>
            ✓ {reviewScore}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ height: 4, background: '#e8e2db', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2, background: '#f97316',
              width: `${((reviewIndex + 1) / wrongQuestions.length) * 100}%`, transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {/* Question card */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e8e2db',
            padding: 20, marginBottom: 16,
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', lineHeight: 1.6, marginBottom: 16 }}>
              {current.question.question}
            </div>
            {/* Show answer if expanded */}
            {expandedId === current.questionId ? (
              <div>
                {current.question.options && (
                  <div style={{ marginBottom: 12 }}>
                    {current.question.options.map((opt, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', marginBottom: 4, borderRadius: 8, fontSize: '0.85rem',
                        background: opt === current.question.answer ? '#dcfce7' :
                          opt === current.lastUserAnswer && opt !== current.question.answer ? '#fee2e2' : '#f9fafb',
                        color: opt === current.question.answer ? '#166534' :
                          opt === current.lastUserAnswer && opt !== current.question.answer ? '#991b1b' : '#374151',
                      }}>
                        {opt}{opt === current.question.answer && ' ✓'}{opt === current.lastUserAnswer && opt !== current.question.answer && ' ✗'}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', marginBottom: 4 }}>正确答案</div>
                  <div style={{ fontSize: '0.85rem', color: '#166534' }}>{current.question.answer}</div>
                </div>
                {current.question.explanation && (
                  <div style={{ background: '#eff6ff', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>💡 解析</div>
                    <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>{current.question.explanation}</div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setExpandedId(current.questionId)}
                style={{ width: '100%', padding: 10, background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
              >
                查看答案
              </button>
            )}
          </div>

          {/* Answer buttons */}
          {expandedId === current.questionId && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { handleReviewAnswer(false); setReviewIndex(i => i + 1); setExpandedId(null); }}
                style={{ flex: 1, padding: 12, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}
              >
                还不太会 ✗
              </button>
              <button
                onClick={() => { handleMarkMastered(current.questionId); handleReviewAnswer(true); setReviewIndex(i => i + 1); setExpandedId(null); }}
                style={{ flex: 1, padding: 12, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}
              >
                已掌握 ✓
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      paddingBottom: 80,
    }}>
      {/* 顶部标题 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '32px 20px 0' }}
      >
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#2d2d2d',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          错题复习
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 4 }}>
          {wrongQuestions.length} 道错题待复习
        </p>
      </motion.div>

      {/* Tab 切换 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ padding: '20px' }}
      >
        <div style={{
          display: 'flex',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e8e2db',
          overflow: 'hidden',
          padding: 4,
        }}>
          <button onClick={() => setActiveTab('mistakes')} style={tabStyle(activeTab === 'mistakes')}>
            待复习 ({wrongQuestions.length})
          </button>
          <button onClick={() => setActiveTab('mastered')} style={tabStyle(activeTab === 'mastered')}>
            已掌握
          </button>
        </div>
      </motion.div>

      {/* 错题列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ padding: '0 20px' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
            加载中...
          </div>
        ) : wrongQuestions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e8e2db',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 4 }}>
              {activeTab === 'mistakes' ? '没有错题！' : '还没有已掌握的题目'}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {activeTab === 'mistakes' ? '继续保持，你的正确率很高！' : '复习错题后标记为已掌握'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence>
              {wrongQuestions.map((wq, index) => (
                <motion.div
                  key={wq.questionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e8e2db',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => setExpandedId(expandedId === wq.questionId ? null : wq.questionId)}
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#2d2d2d',
                        lineHeight: 1.5,
                        marginBottom: 8,
                      }}>
                        {wq.question.question}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: 4,
                        }}>
                          错了 {wq.wrongCount} 次
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          borderRadius: 4,
                        }}>
                          {wq.question.type === 'choice' ? '选择题' :
                           wq.question.type === 'judge' ? '判断题' :
                           wq.question.type === 'short' ? '简答题' : '问答题'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '1.2rem', marginLeft: 8 }}>
                      {expandedId === wq.questionId ? '▼' : '▶'}
                    </span>
                  </div>

                  <AnimatePresence>
                    {expandedId === wq.questionId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          padding: '0 16px 16px',
                          borderTop: '1px solid #f3f4f6',
                          paddingTop: 12,
                        }}>
                          {wq.question.options && (
                            <div style={{ marginBottom: 12 }}>
                              {wq.question.options.map((opt, i) => (
                                <div key={i} style={{
                                  padding: '8px 12px',
                                  marginBottom: 4,
                                  borderRadius: 8,
                                  fontSize: '0.85rem',
                                  background: opt === wq.question.answer ? '#dcfce7' :
                                             opt === wq.lastUserAnswer ? '#fee2e2' : '#f9fafb',
                                  color: opt === wq.question.answer ? '#166534' :
                                         opt === wq.lastUserAnswer ? '#991b1b' : '#374151',
                                  border: opt === wq.question.answer ? '1px solid #86efac' :
                                          opt === wq.lastUserAnswer ? '1px solid #fca5a5' : '1px solid #e5e7eb',
                                }}>
                                  {opt}
                                  {opt === wq.question.answer && ' ✓'}
                                  {opt === wq.lastUserAnswer && opt !== wq.question.answer && ' ✗'}
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{
                            background: '#f0fdf4',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 12,
                          }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                              ✅ 正确答案
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                              {wq.question.answer}
                            </div>
                          </div>

                          {wq.lastUserAnswer && (
                            <div style={{
                              background: '#fef2f2',
                              borderRadius: 8,
                              padding: 12,
                              marginBottom: 12,
                            }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                                ❌ 你的答案
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                                {wq.lastUserAnswer}
                              </div>
                            </div>
                          )}

                          {wq.question.explanation && (
                            <div style={{
                              background: '#eff6ff',
                              borderRadius: 8,
                              padding: 12,
                              marginBottom: 12,
                            }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>
                                💡 解析
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.6 }}>
                                {wq.question.explanation}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => handleMarkMastered(wq.questionId)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✓ 已掌握，从错题本移除
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Review;
