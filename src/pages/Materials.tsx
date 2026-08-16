import { useState, useEffect, useRef } from 'react';
import { Material } from '../types';
import { getAllMaterials, saveMaterial, deleteMaterial } from '../stores';
import { parseFile, ACCEPTED_TYPES } from '../utils/fileParser';

interface Props { onBack: () => void; subject?: string }

export default function Materials({ onBack, subject }: Props) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMaterials() }, []);

  async function loadMaterials() {
    const data = await getAllMaterials();
    const filtered = subject ? data.filter(m => m.subject === subject) : data;
    setMaterials(filtered.sort((a, b) => b.createdAt - a.createdAt));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setLoading(true);
    setError('');

    for (const file of Array.from(files)) {
      try {
        const parsed = await parseFile(file);
        await saveMaterial({
          id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title,
          kind: parsed.kind,
          content: parsed.content,
          charCount: parsed.charCount,
          createdAt: Date.now(),
        });
      } catch (e: any) {
        setError(e.message || `解析 ${file.name} 失败`);
      }
    }

    setLoading(false);
    loadMaterials();
    if (fileRef.current) fileRef.current.value = '';
  }

  function getKindIcon(kind: string) {
    switch (kind) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'md': return '📋';
      default: return '📃';
    }
  }

  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>📁 资料库</h1>
        <p className="subtitle">{materials.length} 份资料</p>
      </header>

      <div className="upload-area">
        <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={handleUpload} style={{ display: 'none' }} />
        <button className="btn btn-primary btn-block" onClick={() => fileRef.current?.click()} disabled={loading}>
          {loading ? '⏳ 解析中...' : '📤 上传资料（PDF/DOCX/PPTX/TXT/MD）'}
        </button>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {materials.length === 0 ? (
        <div className="empty">
          <p>还没有资料</p>
          <p className="text-sm">上传课件资料，AI出题时会自动使用</p>
        </div>
      ) : (
        <div className="material-list">
          {materials.map(m => (
            <div key={m.id} className="material-card">
              <div className="material-header">
                <span className="material-icon">{getKindIcon(m.kind)}</span>
                <div className="material-info">
                  <h3>{m.title}</h3>
                  <p>{m.kind.toUpperCase()} · {m.charCount.toLocaleString()} 字</p>
                </div>
                <button className="btn btn-sm btn-danger" onClick={async () => {
                  if (confirm('确定删除？')) { await deleteMaterial(m.id); loadMaterials(); }
                }}>删除</button>
              </div>
              <p className="material-preview">{m.content.slice(0, 150)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
