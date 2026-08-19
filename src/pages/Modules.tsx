import { useState, useEffect } from 'react';
import { KnowledgeModule } from '../types';
import { getAllModules, updateModuleStatus, getSubjectFiles, saveModules } from '../stores';
import { deleteById } from '../stores/db';
import { getProviders } from '../ai';
import { getAllStudySets } from '../stores';
import { buildPlanPrompt, type SubjectConfig } from '../ai/prompts';
import DiagramRenderer from '../components/DiagramRenderer';
import JobStatus from '../components/JobStatus';
import { createJob } from '../api/jobs';

interface Props {
  onBack: () => void;
  onStartStudy: (module: KnowledgeModule) => void;
  subject?: string;
  subjectId?: string;
  subjectConfig?: SubjectConfig;
}

interface FileInfo {
  id: string;
  filename: string;
  selected: boolean;
}

export default function Modules({ onBack, onStartStudy, subject: subjectName, subjectId, subjectConfig }: Props) {
  const [modules, setModules] = useState<KnowledgeModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'todo' | 'doing' | 'done'>('all');
  const [promptPreview, setPromptPreview] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => { loadModules() }, []);
  useEffect(() => {
    if (subjectConfig) {
      setPromptPreview(buildPlanPrompt(subjectConfig));
    }
  }, [subjectConfig]);
  useEffect(() => { loadFiles() }, [subjectId]);

  async function loadFiles() {
    if (!subjectId) return;
    setLoadingFiles(true);
    try {
      const fileList = await getSubjectFiles(subjectId);
      setFiles(fileList.map((f: any) => ({ id: f.id, filename: f.filename, selected: true })));
    } catch (e) {
      console.error('加载文件列表失败:', e);
    } finally {
      setLoadingFiles(false);
    }
  }

  function toggleFileSelection(fileId: string) {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, selected: !f.selected } : f));
  }

  function selectAllFiles() {
    setFiles(prev => prev.map(f => ({ ...f, selected: true })));
  }

  function deselectAllFiles() {
    setFiles(prev => prev.map(f => ({ ...f, selected: false })));
  }

  async function loadModules() {
    const all = await getAllModules();
    const data = subjectName ? all.filter(m => m.subject === subjectName) : all;
    setModules(data.sort((a, b) => a.importanceRank - b.importanceRank));
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      // 检查是否有选中的文件
      const selectedFiles = files.filter(f => f.selected);
      if (selectedFiles.length === 0) {
        setError('请至少选择一个文件');
        setLoading(false);
        return;
      }

      // 创建异步任务
      const newJobId = await createJob({
        job_type: 'knowledge_list',
        subject_id: subjectId || '',
        file_ids: selectedFiles.map(f => f.id),
        config: {
          customPrompt: customPrompt || undefined,
        },
      });
      
      setJobId(newJobId);
      setLoading(false);
    } catch (e: any) {
      setError(e.message || '创建任务失败');
      setLoading(false);
    }
  }

  // 任务完成回调
  async function handleJobComplete(result: any) {
    try {
      // result 是解析后的JSON（知识点数组）
      const newModules = Array.isArray(result) ? result : [];
      
      // 确保每个模块都有 id 字段（IndexedDB keyPath 要求）
      const modulesWithIds = newModules.map((m: any, i: number) => ({
        ...m,
        id: m.id || `module-${Date.now()}-${i}`,
        status: m.status || 'todo',
        createdAt: m.createdAt || Date.now(),
      }));
      
      // 保存到本地：只替换当前科目（不误删其他科目）。
      // 先写入新模块，再删除本科目不在新结果中的旧记录（逐条写墓碑，避免 pull 复活）
      await saveModules(modulesWithIds)
      if (subjectId) {
        const all = await getAllModules()
        for (const m of all) {
          if (String((m as any).subject_id) === String(subjectId) &&
              !modulesWithIds.some((n: any) => n.id === m.id)) {
            await deleteById('modules', String(m.id))
          }
        }
      }
      await loadModules();
      
      setJobId(null);
    } catch (e: any) {
      setError(e.message || '保存结果失败');
      setJobId(null);
    }
  }

  async function handleStatusChange(id: string, status: 'todo' | 'doing' | 'done') {
    await updateModuleStatus(id, status);
    loadModules();
  }

  const filtered = filter === 'all' ? modules : modules.filter(m => m.status === filter);
  const doneCount = modules.filter(m => m.status === 'done').length;
  const progress = modules.length > 0 ? Math.round(doneCount / modules.length * 100) : 0;

  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>📖 知识模块</h1>
        <p className="subtitle">{modules.length > 0 ? `已掌握 ${doneCount}/${modules.length}（${progress}%）` : '从课件中拆出知识点'}</p>
      </header>

      {modules.length > 0 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* 文件选择区 */}
      {files.length > 0 && (
        <div style={{ marginBottom: 16, background: '#f9fafb', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
              📁 选择要处理的文件 ({files.filter(f => f.selected).length}/{files.length})
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAllFiles} style={{ fontSize: '0.7rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>全选</button>
              <button onClick={deselectAllFiles} style={{ fontSize: '0.7rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>取消全选</button>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {files.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={f.selected}
                  onChange={() => toggleFileSelection(f.id)}
                  style={{ accentColor: '#f97316' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#374151' }}>{f.filename}</span>
              </label>
            ))}
          </div>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 8 }}>
            💡 文件多时建议分批处理，每次选3-5个文件，避免内容过长
          </p>
        </div>
      )}

      {loadingFiles && <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>加载文件列表中...</p>}

      {/* Prompt编辑区 */}
      <details className="prompt-editor" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', padding: '8px 0' }}>
          🔍 查看/编辑知识拆分Prompt
        </summary>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Prompt内容（可手动修改）</span>
            <button onClick={() => {
              setCustomPrompt('');
              setPromptPreview(buildPlanPrompt(subjectConfig));
            }} style={{ fontSize: '0.75rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>🔄 重置</button>
          </div>
          <textarea
            value={customPrompt || promptPreview}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="知识拆分Prompt将在这里显示，你可以手动修改..."
            rows={6}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.75rem', lineHeight: 1.5, resize: 'vertical' }}
          />
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>💡 修改后的Prompt会直接发送给AI，调整知识点拆分方式</p>
        </div>
      </details>

      <div className="module-actions">
        <button className="btn btn-primary btn-block" onClick={handleGenerate} disabled={loading || !!jobId}>
          {loading ? '⏳ 正在创建任务...' : jobId ? '⏳ 任务处理中...' : modules.length > 0 ? '🔄 重新生成' : '🤖 AI 拆分知识模块'}
        </button>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* 任务进度显示 */}
      {jobId && (
        <JobStatus 
          jobId={jobId} 
          onComplete={handleJobComplete}
          onError={(err) => {
            setError(err);
            setJobId(null);
          }}
        />
      )}

      {modules.length > 0 && (
        <>
          <div className="filter-bar">
            {(['all', 'todo', 'doing', 'done'] as const).map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? '全部' : f === 'todo' ? '待学' : f === 'doing' ? '学习中' : '已完成'}
              </button>
            ))}
          </div>

          <div className="module-list">
            {filtered.map(m => (
              <div key={m.id} className={`module-card ${m.status}`}>
                <div className="module-header">
                  <span className="module-rank">#{m.importanceRank}</span>
                  <span className={`difficulty-badge ${m.difficulty === '高' ? 'hard' : m.difficulty === '中' ? 'medium' : 'easy'}`}>
                    {m.difficulty}
                  </span>
                  <span className="module-time">⏱ {m.estimatedMinutes}分钟</span>
                </div>
                <h3 className="module-title">{m.title}</h3>
                <p className="module-exam">📝 {m.examPoints}</p>
                <p className="module-practice">💡 {m.practice}</p>
                
                {/* 速记口诀 */}
                {m.mnemonic && (
                  <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 12px', marginTop: 8, border: '1px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>🔥 速记口诀</div>
                    <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.6 }}>{m.mnemonic}</div>
                  </div>
                )}
                
                {/* 关键公式 */}
                {m.keyFormula && (
                  <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px', marginTop: 8, border: '1px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>📐 关键公式/代码</div>
                    <pre style={{ fontSize: '0.75rem', color: '#1e3a8a', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{m.keyFormula}</pre>
                  </div>
                )}
                
                {/* 可视化图表 */}
                {m.diagram && (
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', marginTop: 8, border: '1px solid #22c55e' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                      🎨 {m.visualHint || '可视化'}
                    </div>
                    <DiagramRenderer content={m.diagram} />
                  </div>
                )}
                
                <div className="module-footer">
                  <select
                    value={m.status}
                    onChange={e => handleStatusChange(m.id, e.target.value as any)}
                    className="status-select"
                  >
                    <option value="todo">待学习</option>
                    <option value="doing">学习中</option>
                    <option value="done">✅ 已完成</option>
                  </select>
                  <button className="btn btn-sm" onClick={() => onStartStudy(m)}>开始学习</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
