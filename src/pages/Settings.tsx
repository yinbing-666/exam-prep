import { useState, useEffect } from 'react';
import { getProviders, getCustomProviders, addCustomProvider, saveProviderConfig, deleteCustomProvider, type ModelProvider } from '../ai';

interface Props { onBack: () => void }

export default function Settings({ onBack }: Props) {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', modelId: '', modelName: '' });

  useEffect(() => { setProviders(getProviders()) }, []);

  function refresh() { setProviders(getProviders()); }

  function startEdit(p: ModelProvider) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      modelId: p.models[0]?.id || '',
      modelName: p.models[0]?.name || '',
    });
  }

  function handleSave() {
    if (!editingId) return;
    const models = form.modelId.trim()
      ? [{ id: form.modelId.trim(), name: form.modelName.trim() || form.modelId.trim() }]
      : [];
    saveProviderConfig(editingId, {
      name: form.name.trim() || '未命名模型',
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      models,
    });
    refresh();
    setEditingId(null);
  }

  function handleAdd() {
    const p = addCustomProvider();
    refresh();
    startEdit(p);
  }

  function handleDelete(id: string) {
    if (!confirm('删除该模型配置？')) return;
    deleteCustomProvider(id);
    refresh();
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>⚙️ 模型设置</h1>
      </header>

      {/* 说明 */}
      <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '12px 14px', margin: '0 0 16px', fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>📖 如何配置自己的模型？</div>
        <div>1. 点下方「+ 添加自定义模型」</div>
        <div>2. 填 API 地址（如 https://api.deepseek.com/v1/chat/completions）</div>
        <div>3. 填 API Key + 模型 ID</div>
        <div style={{ marginTop: 4, color: 'var(--text2)' }}>支持 DeepSeek、通义千问、智谱、硅基流动等 OpenAI 兼容接口</div>
      </div>

      {/* 内置免费体验 */}
      {providers.filter(p => p.builtin).map(p => (
        <div key={p.id} className="settings-card" style={{ border: '2px solid var(--primary)', background: 'var(--primary-glow)' }}>
          <div className="settings-header">
            <h3>{p.name}</h3>
            <span className="status-dot active" />
          </div>
          <p className="settings-models">模型：{p.models.map(m => m.name).join('、')}</p>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>无需配置，开箱即用 · 限时免费</p>
        </div>
      ))}

      {/* 自定义模型 */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: '16px 0 8px' }}>
        自定义模型
      </div>

      {providers.filter(p => !p.builtin).length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
          还没有自定义模型，点下方添加
        </div>
      )}

      {providers.filter(p => !p.builtin).map(p => (
        <div key={p.id} className="settings-card">
          {editingId === p.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)' }}>
                名称
                <input className="fb-note" style={{ width: '100%', marginTop: 2 }}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="如：DeepSeek / 通义千问 / 我的中转站" />
              </label>
              <label style={{ fontSize: 12, color: 'var(--text2)' }}>
                API 地址（完整 URL）
                <input className="fb-note" style={{ width: '100%', marginTop: 2 }}
                  value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="https://api.example.com/v1/chat/completions" />
              </label>
              <label style={{ fontSize: 12, color: 'var(--text2)' }}>
                API Key
                <input className="fb-note" type="password" style={{ width: '100%', marginTop: 2 }}
                  value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  placeholder="sk-..." />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>
                  模型 ID
                  <input className="fb-note" style={{ width: '100%', marginTop: 2 }}
                    value={form.modelId} onChange={e => setForm(f => ({ ...f, modelId: e.target.value }))}
                    placeholder="deepseek-chat" />
                </label>
                <label style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>
                  显示名称（可选）
                  <input className="fb-note" style={{ width: '100%', marginTop: 2 }}
                    value={form.modelName} onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))}
                    placeholder="DeepSeek Chat" />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-sm btn-primary" onClick={handleSave}>保存</button>
                <button className="btn btn-sm" onClick={() => setEditingId(null)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <div className="settings-header">
                <h3>{p.name}</h3>
                <span className={`status-dot ${p.apiKey && p.baseUrl ? 'active' : 'inactive'}`} />
              </div>
              {p.baseUrl && <p style={{ fontSize: 12, color: 'var(--text3)', wordBreak: 'break-all', margin: '4px 0' }}>{p.baseUrl}</p>}
              {p.models.length > 0
                ? <p className="settings-models">模型：{p.models.map(m => m.name).join('、')}</p>
                : <p className="settings-models" style={{ color: 'var(--text3)' }}>未配置</p>
              }
              <div className="key-display">
                <span className="key-mask">
                  {p.apiKey ? `${p.apiKey.slice(0, 8)}...${p.apiKey.slice(-4)}` : '未配置 Key'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => startEdit(p)}>
                    {p.apiKey ? '修改' : '配置'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>删除</button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {/* 添加按钮 */}
      <button className="btn btn-block" onClick={handleAdd} style={{ marginTop: 12, borderStyle: 'dashed' }}>
        ＋ 添加自定义模型
      </button>

      <p className="settings-hint" style={{ marginTop: 12 }}>
        💡 所有配置存储在浏览器本地，不会上传到任何服务器。
      </p>
    </div>
  );
}
