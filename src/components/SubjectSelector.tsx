// 科目选择器组件 — 从后端获取科目配置并选择（后端为唯一数据源）

import { useState, useEffect } from 'react';
import { getAllSubjects, toSubjectConfig, type BackendSubject } from '../stores/subjects';
import { getActiveSubjectId, setActiveSubjectId, getLegacySubjectNames } from '../utils/subjects';
import type { SubjectConfig } from '../ai/prompts';

interface SubjectSelectorProps {
  onSubjectChange: (config: SubjectConfig | undefined, subjectName: string, subjectId?: string) => void;
  compact?: boolean;
}

export default function SubjectSelector({ onSubjectChange, compact }: SubjectSelectorProps) {
  const [backendSubjects, setBackendSubjects] = useState<BackendSubject[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setLoading(true);
    setError('');
    try {
      const subjects = await getAllSubjects();
      if (subjects.length > 0) {
        setBackendSubjects(subjects);
        // 默认选中上次活跃的后端科目，否则第一个
        const activeId = getActiveSubjectId();
        const defaultId = subjects.find(s => s.id === activeId)?.id || subjects[0].id;
        applySelection(subjects, defaultId);
      } else {
        // 后端无科目，仅展示旧版本地科目名兜底
        const name = getLegacySubjectNames()[0] || '本课程';
        onSubjectChange(undefined, name);
      }
    } catch {
      // 后端不可用，降级到旧版本地科目名
      const name = getLegacySubjectNames()[0] || '本课程';
      onSubjectChange(undefined, name);
      setError('无法连接后端，使用本地科目');
    } finally {
      setLoading(false);
    }
  }

  function applySelection(subjects: BackendSubject[], id: string) {
    setSelectedId(id);
    setActiveSubjectId(id);
    const selected = subjects.find(s => s.id === id);
    if (selected) {
      onSubjectChange(toSubjectConfig(selected), selected.name, selected.id);
    }
  }

  function handleSelect(id: string) {
    applySelection(backendSubjects, id);
  }

  // 如果后端没有科目，只显示本地科目名
  if (backendSubjects.length === 0 && !loading) {
    const name = getLegacySubjectNames()[0] || '本课程';
    return (
      <div className={compact ? '' : 'mb-4'}>
        <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3">
          <span className="text-lg">📚</span>
          <span className="text-sm font-black text-gray-800">{name}</span>
          {error && <span className="ml-auto text-xs text-gray-400">{error}</span>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={compact ? '' : 'mb-4'}>
        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <span className="text-sm font-bold text-gray-500">加载科目配置...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'mb-4'}>
      <label className="mb-1.5 block text-xs font-black text-gray-500">选择科目</label>
      <div className="flex flex-wrap gap-2">
        {backendSubjects.map(subject => {
          const active = selectedId === subject.id;
          const color = subject.color || '#f97316';
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => handleSelect(subject.id)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${
                active
                  ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-[0_4px_12px_rgba(249,115,22,0.12)]'
                  : 'border-gray-100 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50/30'
              }`}
            >
              {subject.icon && <span className="text-base">{subject.icon}</span>}
              <span>{subject.name}</span>
              {active && subject.questionTypes && subject.questionTypes.length > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-500">
                  {subject.questionTypes.length}种题型
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* 展示选中科目的配置摘要 */}
      {selectedId && (() => {
        const sel = backendSubjects.find(s => s.id === selectedId);
        if (!sel) return null;
        return (
          <div className="mt-2 rounded-xl bg-gray-50/80 px-3 py-2 text-xs text-gray-500">
            {sel.examStyle && <span>📋 {sel.examStyle}</span>}
            {sel.questionTypes && sel.questionTypes.length > 0 && (
              <span className="ml-3">📝 题型：{sel.questionTypes.join('、')}</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
