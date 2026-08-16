import { useState, useEffect } from 'react';
import { DailyPlan, KnowledgeModule } from '../types';
import { getAllDailyPlans, saveDailyPlans, deleteAllDailyPlans, completePlanWithFeedback, getAllModules } from '../stores';
import { generateDailyPlan, getProviders } from '../ai';
import type { Subject } from '../utils/subjects';

interface Props {
  onBack: () => void;
  activeSubject: Subject | null;
  subjects: Subject[];
  onRefreshSubjects: () => void;
}

const MASTERY_MAP = {
  red: { icon: '🔴', label: '没懂', desc: '需要重新学' },
  yellow: { icon: '🟡', label: '半懂', desc: '大致理解但不扎实' },
  green: { icon: '🟢', label: '懂了', desc: '可以做题验证' },
};

export default function DailyPlanPage({ onBack, activeSubject, subjects, onRefreshSubjects }: Props) {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [feedbackTarget, setFeedbackTarget] = useState<DailyPlan | null>(null);
  const [fbMastery, setFbMastery] = useState<'red' | 'yellow' | 'green'>('green');
  const [fbTime, setFbTime] = useState(30);
  const [fbNote, setFbNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadPlans(); }, [activeSubject]);

  async function loadPlans() {
    const data = await getAllDailyPlans();
    const filtered = activeSubject ? data.filter(p => p.subject === activeSubject.name) : data;
    setPlans(filtered.sort((a, b) => a.date.localeCompare(b.date) || a.dayOrder - b.dayOrder));
  }

  async function handleGenerate() {
    if (!activeSubject) { setError('请先选择科目'); return; }
    const modules = await getAllModules();
    const todoModules = modules.filter(m => m.status !== 'done' && (m.subject === activeSubject.name || !m.subject));
    if (todoModules.length === 0) { setError('没有待学习的知识模块，请先在知识模块页生成'); return; }

    setLoading(true);
    setError('');
    try {
      const providers = getProviders();
      const withKey = providers.find(p => p.apiKey);
      if (!withKey) { setError('请先配置API Key'); return; }

      const today = new Date().toISOString().slice(0, 10);
      const newPlans = await generateDailyPlan(todoModules, activeSubject.examDate, activeSubject.dailyMinutes, today, withKey.id, withKey.models[0].id);
      // 标记科目
      newPlans.forEach(p => p.subject = activeSubject.name);
      // 删除该科目旧计划
      const allPlans = await getAllDailyPlans();
      const otherPlans = allPlans.filter(p => p.subject !== activeSubject.name);
      await deleteAllDailyPlans();
      await saveDailyPlans([...otherPlans, ...newPlans]);
      loadPlans();
    } catch (e: any) {
      setError(e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  function handleTaskClick(plan: DailyPlan) {
    if (plan.status === 'done') {
      setExpandedId(expandedId === plan.id ? null : plan.id);
      return;
    }
    setFeedbackTarget(plan);
    setFbMastery('green');
    setFbTime(30);
    setFbNote('');
  }

  async function handleSubmitFeedback() {
    if (!feedbackTarget) return;
    await completePlanWithFeedback(feedbackTarget.id, { mastery: fbMastery, timeSpent: fbTime, note: fbNote.trim() });
    setFeedbackTarget(null);
    loadPlans();
  }

  async function handleQuickDone(plan: DailyPlan) {
    await completePlanWithFeedback(plan.id, { mastery: 'green', timeSpent: 0, note: '' });
    loadPlans();
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayPlans = plans.filter(p => p.date === today);
  const futurePlans = plans.filter(p => p.date > today);
  const overduePlans = plans.filter(p => p.date < today && p.status !== 'done');

  const todayDone = todayPlans.filter(p => p.status === 'done').length;
  const todayTotal = todayPlans.length;
  const todayProgress = todayTotal > 0 ? Math.round(todayDone / todayTotal * 100) : 0;

  const todayFeedbacks = todayPlans.filter(p => p.status === 'done' && p.mastery);
  const masteryCounts = { red: todayFeedbacks.filter(p => p.mastery === 'red').length, yellow: todayFeedbacks.filter(p => p.mastery === 'yellow').length, green: todayFeedbacks.filter(p => p.mastery === 'green').length };
  const totalTime = todayFeedbacks.reduce((sum, p) => sum + (p.timeSpent || 0), 0);

  function groupByDate(planList: DailyPlan[]) {
    const groups = new Map<string, DailyPlan[]>();
    planList.forEach(p => { const existing = groups.get(p.date) || []; existing.push(p); groups.set(p.date, existing); });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  function renderPlanCard(p: DailyPlan) {
    const isExpanded = expandedId === p.id;
    const masteryInfo = p.mastery ? MASTERY_MAP[p.mastery] : null;
    return (
      <div key={p.id}>
        <div className={`plan-card ${p.status === 'done' ? 'done' : ''} ${p.mastery === 'red' ? 'mastery-red' : ''}`} onClick={() => handleTaskClick(p)}>
          <div className="plan-check">{p.status === 'done' ? (masteryInfo?.icon || '✅') : '⬜'}</div>
          <div className="plan-content">
            <h4>{p.moduleTitle}</h4>
            <p className="plan-date">{p.date === today ? '' : p.date + ' · '}{p.reason}{p.timeSpent ? ` · 用时${p.timeSpent}分钟` : ''}</p>
          </div>
          {p.status === 'pending' && <button className="btn-quick-done" onClick={e => { e.stopPropagation(); handleQuickDone(p); }} title="直接完成">✓</button>}
        </div>
        {isExpanded && p.status === 'done' && (
          <div className="plan-feedback-detail">
            {masteryInfo && <span>{masteryInfo.icon} {masteryInfo.label}：{masteryInfo.desc}</span>}
            {p.timeSpent ? <span>⏱️ 实际用时 {p.timeSpent} 分钟</span> : null}
            {p.note ? <span>📝 {p.note}</span> : null}
            {p.completedAt ? <span>🕐 完成于 {new Date(p.completedAt).toLocaleTimeString()}</span> : null}
          </div>
        )}
      </div>
    );
  }

  if (!activeSubject) {
    return (
      <div className="page">
        <header className="header"><button className="btn-back" onClick={onBack}>← 返回</button><h1>📅 每日计划</h1></header>
        <div className="empty"><p>请先在首页添加一个科目</p></div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>📅 {activeSubject.name}</h1>
        <p className="subtitle">考试{activeSubject.examDate} · 每天{activeSubject.dailyMinutes}分钟</p>
      </header>

      {/* 反馈弹窗 */}
      {feedbackTarget && (
        <div className="feedback-overlay" onClick={() => setFeedbackTarget(null)}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <h3>学习反馈</h3>
            <p className="feedback-title">{feedbackTarget.moduleTitle}</p>
            <div className="fb-section">
              <span className="fb-label">掌握程度</span>
              <div className="fb-mastery-row">
                {(['red', 'yellow', 'green'] as const).map(m => (
                  <button key={m} className={`fb-mastery-btn ${fbMastery === m ? 'selected' : ''} fb-${m}`} onClick={() => setFbMastery(m)}>
                    {MASTERY_MAP[m].icon}<br />{MASTERY_MAP[m].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="fb-section">
              <span className="fb-label">实际用时</span>
              <div className="fb-time-row">
                {[15, 20, 30, 45, 60].map(t => (
                  <button key={t} className={`fb-time-chip ${fbTime === t ? 'selected' : ''}`} onClick={() => setFbTime(t)}>{t}分</button>
                ))}
                <input type="number" min={1} max={300} value={fbTime} onChange={e => setFbTime(Number(e.target.value))} className="fb-time-input" />
              </div>
            </div>
            <div className="fb-section">
              <span className="fb-label">笔记（选填）</span>
              <textarea value={fbNote} onChange={e => setFbNote(e.target.value)} placeholder="记下难点、易错点、心得..." rows={2} className="fb-note" />
            </div>
            <div className="fb-actions">
              <button className="btn btn-block" onClick={() => setFeedbackTarget(null)}>取消</button>
              <button className="btn btn-primary btn-block" onClick={handleSubmitFeedback}>✅ 提交完成</button>
            </div>
          </div>
        </div>
      )}

      {/* 生成/重新生成 */}
      <div className="plan-actions">
        <button className="btn btn-primary btn-block" onClick={handleGenerate} disabled={loading}>
          {loading ? '⏳ AI 正在安排...' : plans.length > 0 ? '🔄 重新生成计划' : '📅 生成每日计划'}
        </button>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* 今日进度 */}
      {todayTotal > 0 && (
        <div className="today-progress">
          <div className="progress-header"><span>📌 今日进度</span><span>{todayDone}/{todayTotal}</span></div>
          <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${todayProgress}%` }} /></div>
          {todayDone > 0 && (
            <div className="progress-stats">
              {masteryCounts.green > 0 && <span>🟢{masteryCounts.green}</span>}
              {masteryCounts.yellow > 0 && <span>🟡{masteryCounts.yellow}</span>}
              {masteryCounts.red > 0 && <span>🔴{masteryCounts.red}</span>}
              {totalTime > 0 && <span className="progress-time">⏱️ {totalTime}分钟</span>}
            </div>
          )}
          {todayDone === todayTotal && <div className="progress-complete">🎉 今日任务全部完成！</div>}
        </div>
      )}

      {/* 逾期 */}
      {overduePlans.length > 0 && (
        <div className="plan-section">
          <h3 className="plan-section-title" style={{ color: 'var(--wrong, #e53935)' }}>⚠️ 逾期（{overduePlans.length}项）</h3>
          {overduePlans.map(p => renderPlanCard(p))}
        </div>
      )}

      {/* 今日 */}
      {todayPlans.length > 0 && (
        <div className="plan-section">
          <h3 className="plan-section-title">📌 今天（{todayPlans.length}项）</h3>
          {todayPlans.map(p => renderPlanCard(p))}
        </div>
      )}

      {/* 未来 */}
      {groupByDate(futurePlans).map(([date, datePlans]) => (
        <div key={date} className="plan-section">
          <h3 className="plan-section-title">{date}（{datePlans.length}项）</h3>
          {datePlans.map(p => renderPlanCard(p))}
        </div>
      ))}

      {plans.length === 0 && (
        <div className="empty"><p>还没有计划</p><p className="text-sm">点击上方按钮，AI会根据知识模块自动安排</p></div>
      )}
    </div>
  );
}