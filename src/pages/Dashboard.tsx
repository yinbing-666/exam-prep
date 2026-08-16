import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateReadiness, type ReadinessData } from '../utils/readiness'
import { AccuracyRing, AssetIcon } from '../components/TargetUI'
import { generateQuestions } from '../ai/generators'
import { getProviders } from '../ai/client'
import { saveStudySet } from '../stores'

interface Props { onBack: () => void }

export default function Dashboard({ onBack }: Props) {
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    calculateReadiness().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ed] flex flex-col items-center justify-center p-5 text-center font-sans">
        <AssetIcon icon="🦊" className="w-12 h-12 animate-bounce" />
        <p className="text-xs font-black text-gray-400 mt-2">{'智能诊断核心就绪度资产中...'}</p>
      </div>
    )
  }
  if (!data) return null
  const { readinessScore, overallPercentage, mockAttempts, weakChapters, chapterPerformance,
          knowledgeTagPerformance, weakKnowledgeTags, todayFocus } = data
  const getScoreTheme = (score: number) => {
    if (score < 40) return { color: '#ef4444', desc: '💪 刚起步，不要急！建议锁定制导高频考点。' };
    if (score < 70) return { color: '#f59e0b', desc: '🔥 状态处于爬坡期，针对性排查错题可暴涨能量。' };
    return { color: '#22c55e', desc: '🏆 状态极其出色！就绪舱指标完全达标，充满信心迎战吧！' };
  };
  const theme = getScoreTheme(readinessScore);

  async function handleFocusedPractice() {
    if (!data || todayFocus.length === 0) return;
    setGenerating(true);
    try {
      const providers = await getProviders();
      const provider = providers[0];
      const modelId = provider.models[0]?.id || 'gpt-4o';
      const tagContent = todayFocus.join('、');
      const questions = await generateQuestions(
        `请根据以下知识点生成练习题：${tagContent}`,
        '薄弱专项',
        provider.id,
        modelId,
        todayFocus.length * 3,
        undefined,
        undefined,
        undefined,
        todayFocus
      );
      const studySet = {
        id: `focused-${Date.now()}`,
        title: '薄弱专项练习',
        chapter: '薄弱专项',
        content: '',
        questions,
        createdAt: Date.now(),
      };
      await saveStudySet(studySet);
      navigate('/practice');
    } catch (e) {
      console.error('针对性出题失败', e);
    } finally {
      setGenerating(false);
    }
  }
  return (
    <div className="pb-24 min-h-screen bg-[#fff7ed] text-[#1a1a1a] max-w-[480px] mx-auto font-sans antialiased px-4 pt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xl font-light text-gray-400 hover:text-orange-500">{'←'}</button>
        <h1 className="text-lg font-[900] text-gray-800">{'📊 核心就绪度仪表盘'}</h1>
      </div>
      <div className="bg-white rounded-[28px] p-6 border border-orange-50/60 shadow-[0_12px_24px_-4px_rgba(249,115,22,0.04)] flex flex-col items-center">
        <AccuracyRing percentage={readinessScore} size={130} stroke={12} />
        <span className="text-xs font-black text-gray-400 mt-3">{'全维就绪诊断分'}</span>
        <p className="text-xs font-bold text-center text-gray-500 mt-3 leading-relaxed max-w-[280px]">{theme.desc}</p>
      </div>
      {/* 薄弱知识点专群 */}
      {weakKnowledgeTags.length > 0 && (
        <div className="bg-white rounded-[26px] p-5 border border-gray-50 shadow-sm space-y-3">
          <h3 className="font-black text-sm text-gray-800 flex items-center gap-1.5">{'🎯 薄弱知识点'}</h3>
          <div className="flex flex-wrap gap-2">
            {weakKnowledgeTags.map(tag => {
              const perf = knowledgeTagPerformance[tag]
              const pct = Math.round(perf.percentage * 100)
              return (
                <div key={tag} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-black text-red-600">{tag}</span>
                  <span className="text-xs text-red-400">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* 今日重点 */}
      {todayFocus.length > 0 && (
        <div className="bg-orange-50 rounded-[22px] p-4 border border-orange-100 space-y-3">
          <h3 className="font-black text-xs text-orange-600">{'⚡ 今日优先攻克'}</h3>
          <div className="space-y-1.5">
            {todayFocus.map((tag, i) => {
              const perf = knowledgeTagPerformance[tag]
              const errors = perf.total - perf.correct
              return (
                <div key={tag} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-center leading-4 font-black text-[10px]">{i + 1}</span>
                  <span className="font-bold text-gray-800">{tag}</span>
                  <span className="text-gray-400">还差 {errors} 题完全掌握</span>
                </div>
              )
            })}
          </div>
          <button
            onClick={handleFocusedPractice}
            disabled={generating}
            className="w-full py-2.5 rounded-full bg-orange-500 text-white text-sm font-black hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? '⚡ 生成中...' : '🎯 针对这几项出题'}
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-50 shadow-sm">
          <span className="text-xl font-[900] text-emerald-500 tracking-tight">{Math.round(overallPercentage * 100)}%</span>
          <span className="text-[10px] font-black text-gray-400 block mt-1">{'全站正确率'}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-50 shadow-sm">
          <span className="text-xl font-[900] text-indigo-500 tracking-tight">{mockAttempts}</span>
          <span className="text-[10px] font-black text-gray-400 block mt-1">{'模拟实战次'}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-50 shadow-sm">
          <span className="text-xl font-[900] text-red-500 tracking-tight">{weakChapters.length}</span>
          <span className="text-[10px] font-black text-gray-400 block mt-1">{'薄弱章节群'}</span>
        </div>
      </div>
      <div className="bg-white rounded-[26px] p-5 border border-gray-50 shadow-sm space-y-3">
        <h3 className="font-black text-sm text-gray-800 flex items-center gap-1.5">{'📈 细分章节正确率条'}</h3>
        <div className="space-y-3.5 pt-1">
          {Object.entries(chapterPerformance).map(([ch, perf]: any) => {
            const pct = Math.round(perf.percentage * 100);
            const isWeak = weakChapters.includes(ch);
            const color = perf.total === 0 ? '#9ca3af' : pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
            return (
              <div key={ch} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-gray-700 flex items-center gap-1">{isWeak && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}{ch}</span>
                  <span style={{ color }}>{perf.total > 0 ? pct + '% (' + perf.correct + '/' + perf.total + '题)' : '暂无演练数据'}</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: (perf.total > 0 ? pct : 0) + '%', backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}
