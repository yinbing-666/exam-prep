import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSubjectDetail, type BackendSubject } from '../stores/subjects';
import { getToken } from '../stores/auth';
import { GameIcon } from '../components/SharedUI';

interface FileInfo {
  id: string;
  filename: string;
  file_size: number;
  created_at: string;
}

interface JobInfo {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export default function SubjectResources() {
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subject, setSubject] = useState<BackendSubject | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [subjectData, filesData, jobsData] = await Promise.all([
        fetchSubjectDetail(subjectId!),
        fetchFiles(subjectId!),
        fetchJobs(subjectId!),
      ]);
      setSubject(subjectData);
      setFiles(filesData);
      setJobs(jobsData);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function fetchFiles(subjectId: string): Promise<FileInfo[]> {
    const token = getToken();
    const resp = await fetch(`/api/upload/files?subject_id=${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.files || data || [];
  }

  async function fetchJobs(subjectId: string): Promise<JobInfo[]> {
    const token = getToken();
    const resp = await fetch(`/api/jobs?subject_id=${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.jobs || [];
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length || !subjectId) return;
    
    setUploading(true);
    setError('');
    
    try {
      const token = getToken();
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_id', subjectId);
        
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.detail || `上传 ${file.name} 失败`);
        }
      }
      // 重新加载文件列表
      await loadData();
    } catch (e: any) {
      setError(e.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`确定删除 "${filename}"？`)) return;
    
    try {
      const token = getToken();
      const resp = await fetch(`/api/upload/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('删除失败');
      await loadData();
    } catch (e: any) {
      setError(e.message || '删除失败');
    }
  }

  async function handleDeleteJob(jobId: string, jobType: string) {
    const typeNames: Record<string, string> = {
      'knowledge_list': '知识清单',
      'quiz': '练习题',
      'mock_exam': '模拟考试',
    };
    if (!confirm(`确定删除这条${typeNames[jobType] || jobType}记录？`)) return;
    
    try {
      const token = getToken();
      const resp = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('删除失败');
      await loadData();
    } catch (e: any) {
      setError(e.message || '删除失败');
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'docx' || ext === 'doc') return '📝';
    if (ext === 'pptx' || ext === 'ppt') return '📊';
    if (ext === 'txt') return '📃';
    if (ext === 'md') return '📋';
    return '📁';
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <GameIcon type="inbox" size="lg" />
          <p style={{ color: '#6b7280', fontWeight: 600, marginTop: 16 }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* 顶部导航 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GameIcon type="inbox" size="sm" framed={false} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1f2937' }}>资料库</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>{subject?.name || '加载中'}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* 统计信息 */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>已上传资料</p>
              <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#1f2937' }}>{files.length} 份</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background: '#f97316',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <GameIcon type="inbox" size="sm" framed={false} />
              {uploading ? '上传中...' : '上传资料'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{ background: '#fef2f2', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* 使用说明 */}
        <div style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 16px', marginBottom: 20, border: '1px solid #fcd34d' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
            <strong>统一资料管理</strong>：上传的资料会自动关联到此科目。出题、知识清单、模拟考试时会自动使用已上传的资料，无需重复选择。
          </p>
        </div>

        {/* 文件列表 */}
        {files.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <GameIcon type="inbox" size="lg" />
            <p style={{ margin: '16px 0 0', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>还没有资料</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>上传课件资料，AI 出题时会自动使用</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {files.map(file => (
              <div
                key={file.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <GameIcon type="book" size="sm" framed={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                    {formatFileSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(file.id, file.filename)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: '#9ca3af',
                    padding: 4,
                  }}
                >
                  <GameIcon type="wastebasket" size="sm" framed={false} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 任务历史 */}
        {jobs.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>任务历史</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jobs.map(job => {
                const typeNames: Record<string, string> = {
                  'knowledge_list': '知识清单',
                  'quiz': '练习题',
                  'mock_exam': '模拟考试',
                };
                const statusNames: Record<string, string> = {
                  'completed': '✅ 已完成',
                  'processing': '⏳ 处理中',
                  'failed': '❌ 失败',
                  'pending': '⏳ 等待中',
                };
                const statusColors: Record<string, string> = {
                  'completed': '#22c55e',
                  'processing': '#f59e0b',
                  'failed': '#ef4444',
                  'pending': '#6b7280',
                };
                return (
                  <div
                    key={job.id}
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>
                          {typeNames[job.job_type] || job.job_type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: statusColors[job.status] || '#6b7280' }}>
                          {statusNames[job.status] || job.status}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteJob(job.id, job.job_type)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                    >
                      <GameIcon type="wastebasket" size="sm" framed={false} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 快捷操作 */}
        {files.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>快捷操作</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                onClick={() => navigate('/practice/quiz')}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <GameIcon type="target" size="sm" framed={false} />
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>出练习题</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>自动使用已上传资料</p>
              </button>
              <button
                onClick={() => navigate('/practice/modules')}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <GameIcon type="book" size="sm" framed={false} />
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>生成知识清单</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>自动使用已上传资料</p>
              </button>
              <button
                onClick={() => navigate('/practice/mock')}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <GameIcon type="trophy" size="sm" framed={false} />
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>模拟考试</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>自动使用已上传资料</p>
              </button>
              <button
                onClick={() => navigate('/practice')}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <GameIcon type="home" size="sm" framed={false} />
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>返回练习</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>回到练习主页</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
