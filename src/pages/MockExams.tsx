import { useState, useEffect } from 'react';
import { MockExam, MockExamConfig } from '../types';
import { getAllMockExams, saveMockExam, deleteMockExam, getAllStudySets, getSubjectFiles } from '../stores';
import { generateMockExam, getProviders, type ModelProvider } from '../ai';
import { handleUnauthorized } from '../stores/auth';
import FileSelector from '../components/FileSelector';

interface Props { onBack: () => void; subject?: string }

const ALL_CHAPTERS = ['第1章', '第2章', '第3章', '第4章', '第5章', '第6章', '第7章', '第8章', '第9章', '第10章', '第11章'];

const DEFAULT_CONFIG: MockExamConfig = {
  chapters: ['第1章', '第4章', '第5章', '第8章', '第10章', '第11章'],
  questionTypes: { choice: 10, judge: 5, short: 4, essay: 2, programming: 0 },
  scoring: { choice: 2, judge: 2, short: 5, essay: 10, programming: 0 },
  duration: 90,
  referenceReal: false,
  customFocus: '',
};

export default function MockExams({ onBack, subject }: Props) {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExam, setShowExam] = useState<MockExam | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showConfig, setShowConfig] = useState(true);

  // 配置状态
  const [config, setConfig] = useState<MockExamConfig>(DEFAULT_CONFIG);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);

  // 模型选择
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');

  // 文件选择
  const [subjectId, setSubjectId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  useEffect(() => {
    loadExams();
    loadChapters();
    const ps = getProviders();
    setProviders(ps);
    const withKey = ps.find(p => p.apiKey);
    if (withKey) {
      setProviderId(withKey.id);
      setModelId(withKey.models[0].id);
    }
  }, []);

  async function loadChapters() {
    const allSets = await getAllStudySets();
    const subjectSets = subject ? allSets.filter(s => s.subject === subject) : allSets;
    const chapters = [...new Set(subjectSets.map(s => s.chapter))];
    if (chapters.length > 0) {
      setAvailableChapters(chapters);
      // 默认选中有内容的章节
      setConfig(prev => ({ ...prev, chapters: prev.chapters.filter(c => chapters.includes(c) || ALL_CHAPTERS.includes(c)) }));
    }
  }

  async function loadExams() {
    const all = await getAllMockExams();
    const data = subject ? all.filter(e => e.subject === subject) : all;
    setExams(data.sort((a, b) => b.createdAt - a.createdAt));
  }

  function toggleChapter(ch: string) {
    setConfig(prev => ({
      ...prev,
      chapters: prev.chapters.includes(ch) ? prev.chapters.filter(c => c !== ch) : [...prev.chapters, ch],
    }));
  }

  function selectAllChapters() { setConfig(prev => ({ ...prev, chapters: ALL_CHAPTERS })); }
  function selectKeyChapters() { setConfig(prev => ({ ...prev, chapters: ['第1章', '第4章', '第5章', '第8章', '第10章', '第11章'] })); }

  function updateType(type: keyof typeof config.questionTypes, val: number) {
    setConfig(prev => ({ ...prev, questionTypes: { ...prev.questionTypes, [type]: Math.max(0, val) } }));
  }

  function updateScore(type: keyof typeof config.scoring, val: number) {
    setConfig(prev => ({ ...prev, scoring: { ...prev.scoring, [type]: Math.max(0, val) } }));
  }

  const totalQuestions = config.questionTypes.choice + config.questionTypes.judge + config.questionTypes.short + config.questionTypes.essay;
  const totalScore = config.questionTypes.choice * config.scoring.choice + config.questionTypes.judge * config.scoring.judge + config.questionTypes.short * config.scoring.short + config.questionTypes.essay * config.scoring.essay;

  async function handleGenerate() {
    if (config.chapters.length === 0) { setError('请至少选择一个章节'); return; }
    if (totalQuestions === 0) { setError('请至少设置一种题型'); return; }
    if (selectedFiles.length === 0) { setError('请至少选择一个文件'); return; }
    const currentProvider = providers.find(p => p.id === providerId);
    if (!currentProvider?.apiKey) { setError('请先配置API Key'); return; }

    setLoading(true);
    setError('');
    try {
      // 从后端获取选中文件的内容
      let content = '';
      
      if (subjectId) {
        try {
          const textParts = await Promise.all(
            selectedFiles.map(async (f: any) => {
              const res = await fetch(`/api/upload/files/${f.id}/text`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('exam_token')}` },
              });
              if (res.status === 401) handleUnauthorized(); // token 过期：全局登出并跳转登录页
              if (res.ok) {
                const data = await res.json();
                return `【${f.filename}】\n${data.text}`;
              }
              return '';
            })
          );
          content = textParts.filter(t => t).join('\n\n---\n\n');
        } catch (e) {
          console.error('获取后端文件失败:', e);
        }
      }
      
      // 如果后端没有数据，尝试从本地获取
      if (!content) {
        const allSets = await getAllStudySets();
        const subjectSets = subject ? allSets.filter(s => s.subject === subject) : allSets;
        const filtered = subjectSets.filter(s => config.chapters.includes(s.chapter));
        if (filtered.length === 0) { setError('所选章节没有课件内容，请先添加'); return; }
        content = filtered.map(s => `【${s.chapter}】\n${s.content}`).join('\n\n---\n\n');
      }

      const result = await generateMockExam(content, config, providerId, modelId);

      const title = config.chapters.length === ALL_CHAPTERS.length ? '全真模拟考' : `${config.chapters.join('+')} 模拟考`;
      const exam: MockExam = {
        id: `mock-${Date.now()}`,
        title: `${title}（${config.duration}分钟/${totalScore}分）`,
        content: result.paper,
        answerKey: result.answerKey,
        duration: config.duration,
        createdAt: Date.now(),
      };
      await saveMockExam(exam);
      setShowExam(exam);
      setShowAnswer(false);
      setShowConfig(false);
      loadExams();
    } catch (e: any) {
      setError(e.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  const currentProvider = providers.find(p => p.id === providerId);

  // 试卷展示视图
  if (showExam) {
    return (
      <div className="page">
        <header className="header">
          <button className="btn-back" onClick={() => { setShowExam(null); setShowAnswer(false); if (exams.length > 0) setShowConfig(false); }}>← 返回</button>
          <h1>{showExam.title}</h1>
          <p className="subtitle">时长 {showExam.duration} 分钟</p>
        </header>
        <div className="mock-tabs">
          <button className={`tab-btn ${!showAnswer ? 'active' : ''}`} onClick={() => setShowAnswer(false)}>📋 试题</button>
          <button className={`tab-btn ${showAnswer ? 'active' : ''}`} onClick={() => setShowAnswer(true)}>✅ 解析</button>
        </div>
        <div className="mock-content">
          <div className="mock-paper">
            {(showAnswer ? showExam.answerKey : showExam.content).split('\n').map((line, i) => (
              <p key={i} className={line.match(/^[一二三四五六七八九十]/) ? 'mock-section-title' : line.match(/^【/) ? 'mock-section-title' : ''}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 配置面板
  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>🎯 模拟考</h1>
        <p className="subtitle">自定义组卷 · 参考985/211真题</p>
      </header>

      {showConfig ? (
        <div className="form">
          {/* 文件选择器 */}
          {subject && (
            <div className="config-section">
              <span className="config-label">📁 选择要处理的文件</span>
              <FileSelector subjectId={subjectId} onSelectionChange={setSelectedFiles} />
            </div>
          )}

          {/* 章节选择 */}
          <div className="config-section">
            <div className="config-header">
              <span>📂 考试范围</span>
              <div className="config-actions-inline">
                <button className="btn-text" onClick={selectAllChapters}>全选</button>
                <button className="btn-text" onClick={selectKeyChapters}>重点章节</button>
              </div>
            </div>
            <div className="chapter-grid">
              {ALL_CHAPTERS.map(ch => (
                <label key={ch} className={`chapter-chip ${config.chapters.includes(ch) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={config.chapters.includes(ch)} onChange={() => toggleChapter(ch)} />
                  {ch}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="config-label" style={{ fontSize: 13, color: 'var(--text2)' }}>✏️ 自定义重点（选填，AI 会重点出题）</span>
              <textarea
                className="fb-note"
                style={{ width: '100%', minHeight: 60, marginTop: 4, resize: 'vertical' }}
                placeholder="例：第三章的二叉树遍历算法、第五章的排序算法时间复杂度对比、TCP三次握手过程..."
                value={config.customFocus}
                onChange={e => setConfig(prev => ({ ...prev, customFocus: e.target.value }))}
              />
            </div>
          </div>

          {/* 题型与分值 */}
          <div className="config-section">
            <span className="config-label">📝 题型与分值</span>
            <div className="qtype-table">
              <div className="qtype-header">
                <span>题型</span><span>数量</span><span>每题分值</span><span>小计</span>
              </div>
              {[
                { key: 'choice' as const, label: '选择题', icon: '🔘' },
                { key: 'judge' as const, label: '判断题', icon: '✅' },
                { key: 'short' as const, label: '简答题', icon: '📝' },
                { key: 'essay' as const, label: '论述题', icon: '📄' },
              ].map(t => (
                <div key={t.key} className="qtype-row">
                  <span>{t.icon} {t.label}</span>
                  <input type="number" min={0} max={50} value={config.questionTypes[t.key]}
                    onChange={e => updateType(t.key, parseInt(e.target.value) || 0)} />
                  <span style={{ textAlign: 'center', color: 'var(--text3)' }}>×</span>
                  <input type="number" min={0} max={50} value={config.scoring[t.key]}
                    onChange={e => updateScore(t.key, parseInt(e.target.value) || 0)} />
                  <span className="qtype-subtotal">={config.questionTypes[t.key] * config.scoring[t.key]}分</span>
                </div>
              ))}
              <div className="qtype-total">
                共 <strong>{totalQuestions}</strong> 题 · <strong>{totalScore}</strong> 分
              </div>
            </div>
          </div>

          {/* 时长 + 模型 + 真题参考 */}
          <div className="config-section">
            <label>
              <span>⏱️ 考试时长</span>
              <select value={config.duration} onChange={e => setConfig(prev => ({ ...prev, duration: Number(e.target.value) }))}>
                {[30, 45, 60, 75, 90, 105, 120].map(m => <option key={m} value={m}>{m} 分钟</option>)}
              </select>
            </label>
            <label>
              <span>🤖 AI 模型</span>
              <select value={providerId} onChange={e => { setProviderId(e.target.value); const p = providers.find(pr => pr.id === e.target.value); if (p?.models[0]) setModelId(p.models[0].id); }}>
                {providers.map(p => <option key={p.id} value={p.id} disabled={!p.apiKey}>{p.name} {!p.apiKey ? '(未配置)' : ''}</option>)}
              </select>
            </label>
            {currentProvider && currentProvider.models.length > 1 && (
              <select value={modelId} onChange={e => setModelId(e.target.value)}>
                {currentProvider.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            <label className="checkbox-label">
              <input type="checkbox" checked={config.referenceReal} onChange={e => setConfig(prev => ({ ...prev, referenceReal: e.target.checked }))} />
              <span>🎓 参考985/211真题风格出题</span>
            </label>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary btn-block" onClick={handleGenerate} disabled={loading || totalQuestions === 0}>
            {loading ? '⏳ AI 正在出卷...' : `📝 生成试卷（${totalQuestions}题/${totalScore}分）`}
          </button>
        </div>
      ) : (
        <div style={{ padding: '16px 0' }}>
          <button className="btn btn-outline btn-block" onClick={() => setShowConfig(true)} style={{ marginBottom: 16 }}>
            ⚙️ 修改配置重新出卷
          </button>
        </div>
      )}

      {/* 历史试卷 */}
      {exams.length > 0 && (
        <div className="exam-list" style={{ marginTop: showConfig ? 16 : 0 }}>
          <h3 style={{ marginBottom: 12, color: 'var(--text2)' }}>📄 历史试卷（{exams.length}）</h3>
          {exams.map(exam => (
            <div key={exam.id} className="set-card">
              <div className="set-info">
                <h3>{exam.title}</h3>
                <p>{new Date(exam.createdAt).toLocaleDateString()} · {exam.duration}分钟</p>
              </div>
              <div className="set-actions">
                <button className="btn btn-sm" onClick={() => { setShowExam(exam); setShowAnswer(false); }}>查看</button>
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('确定删除？')) { await deleteMockExam(exam.id); loadExams(); } }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}