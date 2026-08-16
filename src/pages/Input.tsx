import { useState, useEffect, useRef } from 'react';
import { generateQuestionsTwoStage, getProviders, type ModelProvider } from '../ai';
import { saveStudySet } from '../stores';
import { parseFile, ACCEPTED_TYPES } from '../utils/fileParser';

interface Props { onBack: () => void; subject?: string }

export default function Input({ onBack, subject }: Props) {
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('第1章');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 模型选择
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [providerId, setProviderId] = useState('provider1');
  const [modelId, setModelId] = useState('qwen-plus');

  const chapters = ['第1章', '第4章', '第5章', '第8章', '第10章', '第11章', '其他'];

  useEffect(() => {
    const ps = getProviders();
    setProviders(ps);
    const withKey = ps.find(p => p.apiKey);
    if (withKey) {
      setProviderId(withKey.id);
      setModelId(withKey.models[0].id);
    }
  }, []);

  const currentProvider = providers.find(p => p.id === providerId);

  function handleProviderChange(id: string) {
    setProviderId(id);
    const p = providers.find(pr => pr.id === id);
    if (p && p.models.length > 0) setModelId(p.models[0].id);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    setParsing(true);
    setError('');
    try {
      const parsed = await parseFile(file);
      setContent(parsed.content);
      if (!title.trim()) setTitle(parsed.title);
      setFileName(`${file.name} (${parsed.charCount.toLocaleString()} 字)`);
    } catch (err: any) {
      setError(err.message || '文件解析失败');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleGenerate() {
    if (!content.trim()) { setError('请粘贴内容或上传文件'); return }
    if (!title.trim()) { setError('请输入标题'); return }
    setLoading(true)
    setError('')
    try {
      // P0-3: fixed — subject (a string name) is NOT a subjectId; count=undefined so defaults to 10
      const questions = await generateQuestionsTwoStage(content, chapter, providerId, modelId)
      await saveStudySet({
        id: Date.now().toString(),
        title: title.trim(),
        chapter,
        content: content.trim(),
        questions,
        createdAt: Date.now(),
        subject: subject || '',
      })
      onBack()
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <button className="btn-back" onClick={onBack}>← 返回</button>
        <h1>添加内容</h1>
      </header>

      <div className="form">
        <label>
          <span>标题</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="如：微机原理第8章 汇编程序设计"
          />
        </label>

        <label>
          <span>章节</span>
          <select value={chapter} onChange={e => setChapter(e.target.value)}>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="model-select">
          <label>
            <span>AI 模型</span>
            <select value={providerId} onChange={e => handleProviderChange(e.target.value)}>
              {providers.map(p => (
                <option key={p.id} value={p.id} disabled={!p.apiKey}>
                  {p.name} {!p.apiKey ? '（未配置）' : ''}
                </option>
              ))}
            </select>
          </label>
          {currentProvider && currentProvider.models.length > 1 && (
            <select value={modelId} onChange={e => setModelId(e.target.value)}>
              {currentProvider.models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="upload-section">
          <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileUpload} style={{ display: 'none' }} />
          <button
            className="btn btn-outline btn-block"
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? '⏳ 解析中...' : '📤 上传课件文件（PDF/DOCX/PPTX/TXT/MD）'}
          </button>
          {fileName && <p className="upload-status">✅ {fileName}</p>}
        </div>

        <div className="divider"><span>或</span></div>

        <label>
          <span>手动粘贴内容</span>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setFileName(''); }}
            placeholder="粘贴课件、笔记、教材内容..."
            rows={12}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button
          className="btn btn-primary btn-block"
          onClick={handleGenerate}
          disabled={loading || !content.trim()}
        >
          {loading ? '⏳ AI 正在出题...' : '🤖 AI 生成题目'}
        </button>
      </div>
    </div>
  )
}