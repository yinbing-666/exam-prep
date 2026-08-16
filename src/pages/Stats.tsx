import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getResults } from '../stores/results';
import { getAllModules } from '../stores/modules';
import { QuizResult, KnowledgeModule } from '../types';

const Stats: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [modules, setModules] = useState<KnowledgeModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [r, m] = await Promise.all([getResults(), getAllModules()]);
      setResults(r);
      setModules(m);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalQuestions = results.length;
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = totalQuestions > 0 ? Math.round(correctCount / totalQuestions * 100) : 0;
  const wrongCount = totalQuestions - correctCount;

  // 按日期分组统计
  const byDate = new Map<string, { total: number; correct: number }>();
  results.forEach(r => {
    const date = new Date(r.answeredAt).toLocaleDateString('zh-CN');
    const existing = byDate.get(date) || { total: 0, correct: 0 };
    existing.total++;
    if (r.correct) existing.correct++;
    byDate.set(date, existing);
  });

  // 最近7天的数据
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toLocaleDateString('zh-CN');
    return {
      date,
      label: d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      ...(byDate.get(date) || { total: 0, correct: 0 }),
    };
  }).reverse();

  const maxDaily = Math.max(...last7Days.map(d => d.total), 1);

  // 知识模块进度
  const moduleStats = {
    total: modules.length,
    todo: modules.filter(m => m.status === 'todo').length,
    doing: modules.filter(m => m.status === 'doing').length,
    done: modules.filter(m => m.status === 'done').length,
  };
  const moduleProgress = moduleStats.total > 0 ? Math.round(moduleStats.done / moduleStats.total * 100) : 0;

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e8e2db',
    padding: '20px',
    marginBottom: 16,
  };

  const statBoxStyle = {
    flex: 1,
    textAlign: 'center' as const,
    padding: '12px 8px',
    background: '#faf8f5',
    borderRadius: 12,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      paddingBottom: 80,
    }}>
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
          学习统计
        </h1>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          加载中...
        </div>
      ) : (
        <>
          {/* 总体统计 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ padding: '20px' }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 16 }}>
                📊 总体数据
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f97316' }}>{totalQuestions}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>总答题</div>
                </div>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{correctCount}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>正确</div>
                </div>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{wrongCount}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>错误</div>
                </div>
                <div style={statBoxStyle}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{accuracy}%</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>正确率</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 最近7天 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ padding: '0 20px' }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 16 }}>
                📈 最近7天
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {last7Days.map((day, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      background: day.total > 0 ? '#f97316' : '#e5e7eb',
                      borderRadius: '4px 4px 0 0',
                      height: day.total > 0 ? `${Math.max(day.total / maxDaily * 80, 4)}px` : '4px',
                      transition: 'height 0.3s',
                    }} />
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 4 }}>
                      {day.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2d2d2d' }}>
                      {day.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 知识模块进度 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ padding: '0 20px' }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 16 }}>
                📚 知识模块进度
              </div>
              <div style={{
                background: '#e5e7eb',
                borderRadius: 8,
                height: 12,
                overflow: 'hidden',
                marginBottom: 12,
              }}>
                <div style={{
                  width: `${moduleProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #34d399)',
                  borderRadius: 8,
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                <span>{moduleStats.done}/{moduleStats.total} 已完成</span>
                <span>{moduleProgress}%</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <div style={{ ...statBoxStyle, background: '#fef3c7' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#92400e' }}>{moduleStats.todo}</div>
                  <div style={{ fontSize: '0.7rem', color: '#92400e' }}>待学习</div>
                </div>
                <div style={{ ...statBoxStyle, background: '#dbeafe' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af' }}>{moduleStats.doing}</div>
                  <div style={{ fontSize: '0.7rem', color: '#1e40af' }}>进行中</div>
                </div>
                <div style={{ ...statBoxStyle, background: '#dcfce7' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#166534' }}>{moduleStats.done}</div>
                  <div style={{ fontSize: '0.7rem', color: '#166534' }}>已完成</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 空状态提示 */}
          {totalQuestions === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ padding: '0 20px' }}
            >
              <div style={{
                textAlign: 'center',
                padding: 32,
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e8e2db',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 8 }}>
                  还没有学习记录
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 16 }}>
                  开始做题后这里会显示你的学习数据
                </div>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '10px 24px',
                    background: '#f97316',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  开始学习
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Stats;
