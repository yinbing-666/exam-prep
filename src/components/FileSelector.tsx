import { useState, useEffect } from 'react';
import { getSubjectFiles } from '../stores';

interface FileInfo {
  id: string;
  filename: string;
  selected: boolean;
}

interface Props {
  subjectId?: string;
  onSelectionChange?: (selectedFiles: FileInfo[]) => void;
}

export default function FileSelector({ subjectId, onSelectionChange }: Props) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [subjectId]);

  useEffect(() => {
    onSelectionChange?.(files.filter(f => f.selected));
  }, [files]);

  async function loadFiles() {
    if (!subjectId) return;
    setLoading(true);
    try {
      const fileList = await getSubjectFiles(subjectId);
      setFiles(fileList.map((f: any) => ({ id: f.id, filename: f.filename, selected: true })));
    } catch (e) {
      console.error('加载文件列表失败:', e);
    } finally {
      setLoading(false);
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

  if (loading) {
    return <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>加载文件列表中...</p>;
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12 }}>
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
  );
}
