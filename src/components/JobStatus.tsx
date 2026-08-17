import { useState, useEffect, useRef } from 'react';
import { getToken, handleUnauthorized } from '../stores/auth';

interface Job {
  id: string;
  job_type: string;
  status: string;
  progress: number;
  progress_text: string;
  result?: string;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface Props {
  jobId: string;
  onComplete: (result: any) => void;
  onError?: (error: string) => void;
}

export default function JobStatus({ jobId, onComplete, onError }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [polling, setPolling] = useState(true);

  // 父组件常传内联回调（每次渲染都是新引用）：用 ref 保存最新回调，
  // 避免回调引用变化导致 effect 反复重建轮询 interval
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!jobId || !polling) return;

    const pollInterval = setInterval(async () => {
      try {
        // 与全局登录态一致：走 stores/auth 的内存 token，不从 localStorage 直接读
        const token = getToken();
        if (!token) {
          clearInterval(pollInterval);
          setPolling(false);
          return;
        }
        const resp = await fetch(`/api/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!resp.ok) {
          if (resp.status === 401) handleUnauthorized(); // token 过期：全局登出并跳转登录页
          clearInterval(pollInterval);
          setPolling(false);
          return;
        }

        const data = await resp.json();
        setJob(data);

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setPolling(false);
          try {
            const result = JSON.parse(data.result);
            onCompleteRef.current(result);
          } catch {
            onCompleteRef.current(data.result);
          }
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setPolling(false);
          onErrorRef.current?.(data.error || '处理失败');
        }
      } catch (err) {
        console.error('轮询失败:', err);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [jobId, polling]);

  if (!job) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <p style={styles.text}>正在初始化任务...</p>
      </div>
    );
  }

  const jobTypeNames: Record<string, string> = {
    'knowledge_list': '知识清单',
    'quiz': '刷题',
    'mock_exam': '模拟考试',
  };

  return (
    <div style={styles.container}>
      {/* 进度条 */}
      <div style={styles.progressContainer}>
        <div style={{
          ...styles.progressBar,
          width: `${job.progress}%`,
          background: job.status === 'failed' ? '#ef4444' : 
                      job.status === 'completed' ? '#22c55e' : '#f97316',
        }} />
      </div>

      {/* 状态图标 */}
      {job.status === 'processing' && (
        <div style={styles.spinner} />
      )}
      {job.status === 'completed' && (
        <div style={styles.checkmark}>✅</div>
      )}
      {job.status === 'failed' && (
        <div style={styles.errorIcon}>❌</div>
      )}

      {/* 状态文字 */}
      <p style={{
        ...styles.text,
        color: job.status === 'failed' ? '#ef4444' : 
               job.status === 'completed' ? '#22c55e' : '#6b7280',
      }}>
        {job.progress_text || '处理中...'}
      </p>

      {/* 进度百分比 */}
      <p style={styles.progressText}>
        {jobTypeNames[job.job_type] || job.job_type} · {job.progress}%
      </p>

      {/* 错误信息 */}
      {job.error && (
        <p style={styles.errorText}>{job.error}</p>
      )}

      {/* 提示 */}
      {job.status === 'processing' && (
        <p style={styles.hint}>
          💡 可以离开此页面，处理完成后回来查看
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    background: '#fff',
    borderRadius: 16,
    margin: '16px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    height: 8,
    background: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #f97316',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 32,
    marginBottom: 12,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  text: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#6b7280',
    margin: 0,
    textAlign: 'center',
  },
  progressText: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: '8px 0 0',
  },
  errorText: {
    fontSize: '0.8rem',
    color: '#ef4444',
    margin: '12px 0 0',
    padding: '8px 12px',
    background: '#fef2f2',
    borderRadius: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: '16px 0 0',
    textAlign: 'center',
  },
};
