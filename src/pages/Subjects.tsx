import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  getAllSubjects,
  createSubject,
  deleteSubject,
  uploadFile,
  type Subject,
} from '../stores/subjects';
import { isLoggedIn } from '../stores/auth';

const ICONS = ['📚', '💻', '⚛️', '🔬', '📐', '🎨', '🌍', '📊', '🧬', '⚡', '🎵', '📖'];
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

const Subjects: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingSubjectId, setUploadingSubjectId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 创建表单状态
  const [form, setForm] = useState({
    name: '',
    fullName: '',
    icon: '📚',
    color: '#f97316',
    questionTypes: ['选择', '判断', '简答'],
    examStyle: '',
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      if (!isLoggedIn()) {
        navigate('/login');
        return;
      }
      const data = await getAllSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('加载科目失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      const newSubject = await createSubject(form);
      setSubjects(prev => [newSubject, ...prev]);
      setShowCreate(false);
      setForm({ name: '', fullName: '', icon: '📚', color: '#f97316', questionTypes: ['选择', '判断', '简答'], examStyle: '' });
    } catch (error) {
      console.error('创建科目失败:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个科目？已上传的文件和出题记录也会被删除。')) return;
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('删除科目失败:', error);
    }
  }

  async function handleUploadFile(subjectId: string) {
    setUploadingSubjectId(subjectId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingSubjectId) return;

    setUploadStatus('正在上传文件...');
    
    try {
      const data = await uploadFile(file, uploadingSubjectId);
      
      let msg = `✅ 上传成功！提取了 ${data.charCount} 个字符`;
      if (data.imageCount && data.imageCount > 0) {
        msg += `，${data.imageCount} 张图片将在后台识别`;
      }
      if (data.imageSkipped && data.imageSkipped > 0) {
        msg += `（${data.imageSkipped} 张超出上限已跳过）`;
      }
      alert(msg);
      loadSubjects(); // 刷新统计数据
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败');
    } finally {
      setUploadingSubjectId(null);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const questionTypeOptions = ['选择', '判断', '填空', '简答', '论述', '计算', '画图', '程序'];

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e8e2db',
    padding: '20px',
    marginBottom: 16,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      paddingBottom: 80,
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* 顶部 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '32px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', margin: 0 }}>
            我的科目
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 4 }}>
            {subjects.length} 个科目
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '10px 20px',
            background: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + 新建科目
        </button>
      </motion.div>

      {/* 创建表单 */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '0 20px', overflow: 'hidden' }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 16 }}>
                ✏️ 新建科目
              </div>

              {/* 科目名 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4, display: 'block' }}>科目名称 *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例：微机原理"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 全称 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4, display: 'block' }}>完整名称</label>
                <input
                  value={form.fullName}
                  onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="例：汇编语言与接口技术"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 图标选择 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 8, display: 'block' }}>图标</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setForm(prev => ({ ...prev, icon }))}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        border: form.icon === icon ? '2px solid #f97316' : '1px solid #e5e7eb',
                        background: form.icon === icon ? '#fff7ed' : '#fff',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* 颜色选择 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 8, display: 'block' }}>主题色</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(prev => ({ ...prev, color }))}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: color,
                        border: form.color === color ? '3px solid #2d2d2d' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 题型偏好 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 8, display: 'block' }}>题型偏好</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {questionTypeOptions.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          questionTypes: prev.questionTypes.includes(type)
                            ? prev.questionTypes.filter(t => t !== type)
                            : [...prev.questionTypes, type],
                        }));
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: form.questionTypes.includes(type) ? '1px solid #f97316' : '1px solid #e5e7eb',
                        background: form.questionTypes.includes(type) ? '#fff7ed' : '#fff',
                        color: form.questionTypes.includes(type) ? '#ea580c' : '#6b7280',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.name.trim()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: form.name.trim() ? '#f97316' : '#d1d5db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  创建
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 科目列表 */}
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
        ) : subjects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e8e2db',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 8 }}>
              还没有科目
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 16 }}>
              创建你的第一个科目，开始上传课件和出题
            </div>
            <button
              onClick={() => setShowCreate(true)}
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
              + 新建科目
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${subject.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: subject.color + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}>
                      {subject.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d' }}>
                        {subject.name}
                      </div>
                      {subject.fullName && (
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                          {subject.fullName}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {subject.questionTypes.map(type => (
                          <span key={type} style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            background: '#f3f4f6',
                            borderRadius: 4,
                            color: '#6b7280',
                          }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: 4,
                    }}
                  >
                    🗑️
                  </button>
                </div>

                {/* 统计 */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: subject.color }}>{subject.totalUploaded}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>课件</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: subject.color }}>{subject.totalQuestions}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>已出题</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: subject.color }}>{subject.totalReviews}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>已复习</div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleUploadFile(subject.id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#f0fdf4',
                      color: '#166534',
                      border: '1px solid #86efac',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    📤 上传课件
                  </button>
                  <button
                    onClick={() => navigate(`/practice/quiz?subject=${subject.id}`)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #93c5fd',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    📝 开始出题
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 上传加载动画 */}
      <AnimatePresence>
        {uploadingSubjectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 48,
                height: 48,
                border: '4px solid #fff',
                borderTop: '4px solid #f97316',
                borderRadius: '50%',
                marginBottom: 16,
              }}
            />
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                textAlign: 'center',
                padding: '0 20px',
              }}
            >
              {uploadStatus || '正在上传...'}
            </motion.p>
            <p style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.8, marginTop: 8, textAlign: 'center', padding: '0 20px' }}>
              文本提取完成后即可出题，PDF 中的图片将在后台自动识别
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Subjects;
