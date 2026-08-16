import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { getProfile } from '../stores/gamification';
import { getAllStudySets, getResults, getWrongQuestions, saveStudySet, getSubjectFiles } from '../stores';
import { countDueCards } from '../utils/fsrs-service';
import { addSubject, getSubjects, type Subject } from '../utils/subjects';
import type { UserProfile } from '../types/gamification';
import type { QuizResult, StudySet } from '../types';
import {
  AssetIcon,
  Card,
  EmptyState,
  HeroHeader,
  IconPod,
  OrangeButton,
  PageShell,
  ProgressBar,
  SectionTitle,
  StatStrip,
  daysUntil,
} from '../components/TargetUI';
import { GameIcon } from '../components/SharedUI';
import SubjectSelector from '../components/SubjectSelector';
import { buildQuizPrompt, type SubjectConfig } from '../ai/prompts';
import { getProviders } from '../ai/client';
import { generateQuestions } from '../ai/generators';
import FileSelector from '../components/FileSelector';
import JobStatus from '../components/JobStatus';
import { createJob } from '../api/jobs';
import Mistakes from './Mistakes';
import Review from './Review';
import Modules from './Modules';
import MockExams from './MockExams';

function subjectIcon(name: string) {
  if (name.includes('数')) return 'math';
  if (name.includes('英')) return 'english';
  if (name.includes('语')) return 'pencil';
  if (name.includes('物')) return 'physics';
  if (name.includes('化')) return 'chemistry';
  if (name.includes('法') || name.includes('政')) return 'law';
  if (name.includes('史')) return 'history';
  if (name.includes('地')) return 'geography';
  if (name.includes('生')) return 'biology';
  return 'book';
}

function subjectStats(subject: Subject, sets: StudySet[], results: QuizResult[]) {
  const subjectSets = sets.filter(set => set.subject === subject.name || set.subject === subject.id);
  const ids = new Set(subjectSets.flatMap(set => set.questions.map(q => q.id)));
  const subjectResults = results.filter(result => ids.has(result.questionId));
  const total = subjectSets.reduce((sum, set) => sum + set.questions.length, 0);
  const correct = subjectResults.filter(result => result.correct).length;
  return {
    total,
    done: subjectResults.length,
    progress: total > 0 ? Math.round((subjectResults.length / total) * 100) : 0,
    accuracy: subjectResults.length > 0 ? Math.round((correct / subjectResults.length) * 100) : null,
  };
}

function PracticeMain() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [p, studySets, quizResults, due, wrong] = await Promise.all([
        getProfile(),
        getAllStudySets(),
        getResults(),
        countDueCards(),
        getWrongQuestions(),
      ]);
      setProfile(p);
      setSets(studySets);
      setResults(quizResults);
      setDueCount(due);
      setWrongCount(wrong.length);
      setSubjects(getSubjects());
    }
    load();
  }, []);

  const totalXp = profile?.xp || 0;

  return (
    <PageShell>
      <HeroHeader
        compact
        title="练习"
        subtitle="针对练习，巩固提升"
        mascot="/icons/mascot-rabbit.png"
        right={<OrangeButton className="h-12 w-12 rounded-full p-0 text-2xl" onClick={() => navigate('/practice/new')}>＋</OrangeButton>}
      />

      <div className="relative z-20 mt-7 px-6 space-y-10">
        <StatStrip
          items={[
            { icon: 'medal', value: `Lv.${profile?.level || 1}`, label: '当前等级', sub: `${profile?.xp || 0} / ${profile?.xpToNext || 100} XP` },
            { icon: 'fire', value: profile?.streak || 0, label: '连胜天数', sub: '连续学习' },
            { icon: 'star', value: totalXp, label: '总 XP', sub: '持续积累' },
          ]}
        />

        <div className="space-y-5">
          <SectionTitle
            icon="book"
            title="练习科目"
            action={<button className="text-sm font-bold text-gray-500" onClick={() => navigate('/practice/new')}>新建科目 ＞</button>}
          />
          <Card className="p-4">
            {subjects.length === 0 ? (
              <EmptyState
                icon="book"
                title="还没有练习科目"
                desc="先新建一个科目，再上传资料或生成题目。"
                action={<OrangeButton className="px-7 py-3" onClick={() => navigate('/practice/new')}>新建科目</OrangeButton>}
              />
            ) : (
              <div className="space-y-3">
                {subjects.map(subject => {
                  const stats = subjectStats(subject, sets, results);
                  const left = daysUntil(subject.examDate);
                  const status = stats.accuracy !== null && stats.accuracy >= 80 ? '优秀' : stats.accuracy !== null && stats.accuracy >= 60 ? '良好' : '进步中';
                  return (
                    <div key={subject.id} className="flex flex-col gap-3 rounded-[22px] border border-orange-100 bg-white p-4 shadow-[0_10px_22px_rgba(84,45,0,0.06)] sm:flex-row sm:items-center">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] shadow-md" style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)` }}>
                          <AssetIcon icon={subjectIcon(subject.name)} className="h-11 w-11" />
                        </div>
                        <div className="min-w-0 flex-1 sm:hidden">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2 className="truncate text-xl font-black text-gray-900">{subject.name}</h2>
                            <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600">{status}</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-gray-500">
                            {left !== null ? `考试倒计时 ${Math.max(0, left)} 天` : '尚未设置考试日期'}
                          </div>
                        </div>
                      </div>
                      <div className="hidden min-w-0 flex-1 sm:block">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-xl font-black text-gray-900">{subject.name}</h2>
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600">{status}</span>
                        </div>
                        <div className="mt-1 text-sm font-bold text-gray-500">
                          {left !== null ? `考试倒计时 ${Math.max(0, left)} 天` : '尚未设置考试日期'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={stats.progress} color={subject.color} height={9} />
                          <span className="num-3d w-12 shrink-0 text-right text-2xl font-[900] tracking-tighter leading-none text-gray-800">{stats.progress}%</span>
                        </div>
                        <div className="mt-1 text-sm font-bold text-gray-500">
                          正确率 {stats.accuracy === null ? '--' : `${stats.accuracy}%`} <span className="mx-2 text-gray-300">|</span> 已练习 {stats.done} 题
                        </div>
                      </div>
                      <OrangeButton className="w-full px-6 py-4 text-base sm:w-auto" onClick={() => navigate('/practice/quiz')}>继续练习 ＞</OrangeButton>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <SectionTitle icon="target" title="练习模式" />
          <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/practice/quiz')}
            className="relative flex min-h-[104px] items-center gap-4 overflow-hidden rounded-[22px] border-b-[5px] border-blue-800 px-4 pr-14 text-left text-white shadow-[0_14px_24px_rgba(0,102,245,0.24),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all active:translate-y-[2px] active:border-b-2"
            style={{ background: 'linear-gradient(135deg, #1689ff 0%, #0066f5 100%)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.22),transparent_32%)]" />
            <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/92 shadow-[0_10px_18px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.75)]">
              <GameIcon type="target" size="sm" className="h-8 w-8" framed={false} />
            </div>
            <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
              <div className="whitespace-nowrap text-xl font-black leading-tight drop-shadow-sm">刷题模式</div>
              <div className="mt-1 truncate text-sm font-bold leading-snug text-white/85">针对练习，巩固提升</div>
            </div>
            <div className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-black text-blue-600 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">›</div>
          </button>
          <button
            className="relative flex min-h-[104px] items-center gap-4 overflow-hidden rounded-[22px] border-b-[5px] border-amber-800 px-4 pr-14 text-left text-white shadow-[0_14px_24px_rgba(217,119,6,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] transition-all active:translate-y-[2px] active:border-b-2"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.22),transparent_32%)]" />
            <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/92 shadow-[0_10px_18px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.75)]">
              <GameIcon type="trophy" size="sm" className="h-8 w-8" framed={false} />
            </div>
            <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
              <div className="whitespace-nowrap text-xl font-black leading-tight drop-shadow-sm">模拟考试</div>
              <div className="mt-1 truncate text-sm font-bold leading-snug text-white/85">仿真试卷，模拟实战</div>
            </div>
            <div className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-black text-amber-600 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">›</div>
          </button>
          </div>
        </div>

        <div className="space-y-5">
          <SectionTitle icon="calendar" title="复习工具" />
          {[
            { icon: 'mistake', title: '错题本', desc: '收录所有错题，针对性复习提升', badge: `${wrongCount} 题`, color: 'text-red-500 bg-red-50', path: '/practice/mistakes' },
            { icon: 'calendar', title: 'FSRS复习', desc: '基于遗忘曲线，智能安排复习', badge: `待复习: ${dueCount} 题`, color: 'text-blue-600 bg-blue-50', path: '/practice/review' },
            { icon: 'book', title: '知识清单', desc: '按章节拆解核心考点', badge: `${sets.length} 套资料`, color: 'text-orange-600 bg-orange-50', path: '/practice/modules' },
          ].map(item => (
            <Card key={item.title} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(item.path)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <IconPod icon={item.icon} className="h-10 w-10 rounded-xl bg-gray-50 from-gray-50 to-orange-50/60" iconClassName="h-6 w-6" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-black leading-tight text-gray-900">{item.title}</h3>
                    <p className="mt-1 truncate text-sm font-bold text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`num-3d rounded-full px-4 py-2 text-sm font-[900] tracking-tighter ${item.color}`}>{item.badge}</span>
                  <span className="text-lg font-bold text-gray-300">›</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function NewSubject() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const canSubmit = name.trim() && examDate;

  function submit() {
    if (!canSubmit) return;
    addSubject(name.trim(), examDate, dailyMinutes);
    navigate('/practice');
  }

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  return (
    <PageShell>
      <HeroHeader compact title="新建科目" subtitle="定制你的专属学习计划" right={<button onClick={() => navigate('/practice')} className="rounded-full bg-white/20 px-4 py-2 text-sm font-black">返回</button>} />
      <div className="relative z-20 mt-7 px-5">
        <Card className="p-5 space-y-5">
          <label className="block">
            <span className="text-sm font-black text-gray-700">科目名称</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：数学、法律基础、微机原理" className="mt-2 w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-base font-bold outline-none focus:border-orange-400" />
          </label>
          <label className="block">
            <span className="text-sm font-black text-gray-700">考试日期</span>
            <input type="date" min={tomorrow} value={examDate} onChange={e => setExamDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-3 text-base font-bold outline-none focus:border-orange-400" />
          </label>
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-gray-700">每日学习时间</span>
              <span className="num-3d text-lg font-[900] tracking-tighter text-gray-800">{dailyMinutes} 分钟</span>
            </div>
            <input type="range" min={15} max={180} step={15} value={dailyMinutes} onChange={e => setDailyMinutes(Number(e.target.value))} className="mt-3 w-full accent-orange-500" />
          </label>
          <OrangeButton className="w-full py-4 text-base disabled:opacity-50" onClick={submit}>创建科目</OrangeButton>
        </Card>
      </div>
    </PageShell>
  );
}

function QuizSession() {
  const navigate = useNavigate();
  const [subjectConfig, setSubjectConfig] = useState<import('../ai/prompts').SubjectConfig | undefined>(undefined);
  const [subjectName, setSubjectName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  
  // 题型数量配置
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({
    '选择': 5,
    '判断': 5,
    '简答': 5,
    '程序': 3,
    '论述': 2,
    '填空': 0,
    '计算': 0,
    '画图': 0,
  });
  
  // 总题数
  const totalCount = Object.values(typeCounts).reduce((sum, n) => sum + n, 0);
  
  // 可用题型（根据科目配置）
  const availableTypes = subjectConfig?.questionTypes?.length 
    ? subjectConfig.questionTypes 
    : ['选择', '判断', '简答', '程序', '论述'];
  
  // 科目ID
  const [subjectId, setSubjectId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  function handleSubjectChange(config: import('../ai/prompts').SubjectConfig | undefined, name: string, id?: string) {
    setSubjectConfig(config);
    setSubjectName(name);
    setSubjectId(id || '');
    // 根据科目配置初始化题型数量
    if (config?.questionTypes?.length) {
      const newCounts: Record<string, number> = {};
      config.questionTypes.forEach(t => {
        newCounts[t] = typeCounts[t] || 5;
      });
      setTypeCounts(newCounts);
    }
    setPromptPreview(buildQuizPrompt(totalCount, config, typeCounts));
  }
  
  function handleTypeCountChange(type: string, count: number) {
    const newCounts = { ...typeCounts, [type]: Math.max(0, count) };
    setTypeCounts(newCounts);
    if (subjectName) {
      setPromptPreview(buildQuizPrompt(Object.values(newCounts).reduce((s, n) => s + n, 0), subjectConfig, newCounts));
    }
  }

  async function handleGenerate() {
    if (!subjectName) { setError('请先选择科目'); return; }
    if (totalCount === 0) { setError('请至少选择一种题型的数量'); return; }
    if (selectedFiles.length === 0) { setError('请至少选择一个文件'); return; }
    setGenerating(true);
    setError('');
    try {
      // 创建异步任务
      const newJobId = await createJob({
        job_type: 'quiz',
        subject_id: subjectId || '',
        file_ids: selectedFiles.map((f: any) => f.id),
        config: {
          count: totalCount,
          typeCounts,
          subjectConfig,
        },
      });
      
      setJobId(newJobId);
      setGenerating(false);
    } catch (e: any) {
      setError(e.message || '创建任务失败');
      setGenerating(false);
    }
  }

  // 任务完成回调
  async function handleJobComplete(result: any) {
    try {
      // result 可能是直接的问题数组，或 {content: "AI原始文本"} 格式
      let questions: any[] = [];
      if (Array.isArray(result)) {
        questions = result;
      } else if (Array.isArray(result?.questions)) {
        questions = result.questions;
      } else if (typeof result?.content === 'string') {
        // 后端返回 {content: "AI原始文本"}，尝试从中提取JSON数组
        const match = result.content.match(/\[[\s\S]*\]/);
        if (match) {
          try { questions = JSON.parse(match[0]); } catch { /* ignore */ }
        }
      }
      
      // 确保每个题目都有 id 字段
      questions = questions.map((q: any, i: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${i}`,
      }));
      
      const studySet = {
        id: `quiz-${Date.now()}`,
        title: `${subjectName} 练习 - ${new Date().toLocaleDateString()}`,
        chapter: '综合练习',
        content: '',
        questions,
        createdAt: Date.now(),
        subject: subjectName,
      };
      await saveStudySet(studySet);
      navigate('/practice');
    } catch (e: any) {
      setError(e.message || '保存结果失败');
    } finally {
      setJobId(null);
    }
  }

  return (
    <PageShell>
      <HeroHeader
        compact
        title="刷题模式"
        subtitle="选择科目，生成针对性练习题"
        right={<button onClick={() => navigate('/practice')} className="rounded-full bg-white/20 px-4 py-2 text-sm font-black">返回</button>}
      />
      <div className="relative z-20 mt-7 px-5 space-y-5">
        {/* 科目选择器 */}
        <Card className="p-4">
          <SubjectSelector onSubjectChange={handleSubjectChange} />
        </Card>

        {/* 文件选择器 */}
        {subjectId && (
          <Card className="p-4">
            <FileSelector subjectId={subjectId} onSelectionChange={setSelectedFiles} />
          </Card>
        )}

        {/* 题型数量配置 */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-black text-gray-700">题型数量</span>
            <span className="num-3d text-lg font-[900] tracking-tighter text-orange-600">共 {totalCount} 题</span>
          </div>
          <div className="space-y-3">
            {availableTypes.map(type => (
              <div key={type} className="flex items-center gap-3">
                <span className="w-12 text-xs font-bold text-gray-600">{type}</span>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  value={typeCounts[type] || 0}
                  onChange={e => handleTypeCountChange(type, Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="w-8 text-right text-sm font-black text-gray-800">{typeCounts[type] || 0}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 科目配置摘要 */}
        {subjectConfig && (
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-500">
              <div className="mb-2 text-sm font-black text-gray-700">📋 科目配置</div>
              {subjectConfig.fullName && <div>全称：{subjectConfig.fullName}</div>}
              {subjectConfig.examStyle && <div>考试风格：{subjectConfig.examStyle}</div>}
              {subjectConfig.questionTypes && subjectConfig.questionTypes.length > 0 && (
                <div>题型偏好：{subjectConfig.questionTypes.join('、')}</div>
              )}
              {subjectConfig.difficulty && (
                <div>难度分布：基础{subjectConfig.difficulty.base}% · 提高{subjectConfig.difficulty.advanced}% · 挑战{subjectConfig.difficulty.challenge}%</div>
              )}
              {subjectConfig.specialRequirements && <div>特殊要求：{subjectConfig.specialRequirements}</div>}
            </div>
          </Card>
        )}

        {/* Prompt预览（可折叠，可编辑） */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-black text-gray-400 hover:text-gray-600">
            🔍 查看/编辑出题Prompt
          </summary>
          <Card className="mt-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Prompt内容（可手动修改）</span>
              <button
                onClick={() => {
                  const newPreview = buildQuizPrompt(totalCount, subjectConfig, typeCounts);
                  setPromptPreview(newPreview);
                }}
                className="text-xs text-orange-500 hover:text-orange-700"
              >
                🔄 重置
              </button>
            </div>
            <textarea
              value={promptPreview}
              onChange={e => setPromptPreview(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700 focus:border-orange-400 focus:outline-none"
              rows={8}
              placeholder="出题Prompt将在这里显示，你可以手动修改..."
            />
            <div className="mt-2 text-[10px] text-gray-400">
              💡 修改后的Prompt会直接发送给AI，调整出题风格、难度或添加特殊要求
            </div>
          </Card>
        </details>

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>
        )}

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

        <OrangeButton
          className="w-full py-4 text-base disabled:opacity-50"
          onClick={handleGenerate}
          disabled={generating || !!jobId || !subjectName || totalCount === 0}
        >
          {generating ? '⏳ 正在创建任务...' : jobId ? '⏳ 任务处理中...' : `📝 开始出题（${totalCount}道）`}
        </OrangeButton>
      </div>
    </PageShell>
  );
}

export default function Practice() {
  return (
    <Routes>
      <Route path="/" element={<PracticeMain />} />
      <Route path="new" element={<NewSubject />} />
      <Route path="quiz" element={<QuizSession />} />
      <Route path="mistakes" element={<MistakesPage />} />
      <Route path="review" element={<ReviewPage />} />
      <Route path="modules" element={<ModulesPage />} />
      <Route path="mock" element={<MockExamsPage />} />
      <Route path="*" element={<PracticeMain />} />
    </Routes>
  );
}

// 包装页面组件
function MistakesPage() {
  const navigate = useNavigate();
  return <Mistakes onBack={() => navigate('/practice')} onStartReview={(questions: any[]) => {
    // P0-2: persist review questions in sessionStorage, then navigate to review
    sessionStorage.setItem('review-session', JSON.stringify(questions));
    navigate('/practice/review');
  }} />;
}

function ReviewPage() {
  const navigate = useNavigate();
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);

  // Load questions from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('review-session');
    if (raw) {
      try {
        setReviewQuestions(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  }, []);

  // Called by Review component when user completes or exits review session
  function handleSessionEnd() {
    sessionStorage.removeItem('review-session');
  }

  return (
    <Review
      reviewQuestions={reviewQuestions}
      onSessionEnd={() => {
        handleSessionEnd();
        navigate('/practice/mistakes');
      }}
    />
  );
}

function ModulesPage() {
  const navigate = useNavigate();
  const [subjectConfig, setSubjectConfig] = useState<import('../ai/prompts').SubjectConfig | undefined>(undefined);
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  
  return (
    <div>
      <SubjectSelector onSubjectChange={(config, name, id) => {
        setSubjectConfig(config);
        setSubjectName(name);
        setSubjectId(id || '');
      }} />
      <Modules 
        onBack={() => navigate('/practice')} 
        onStartStudy={(module: any) => {
          // TODO: 开始学习模块
        }} 
        subject={subjectName}
        subjectId={subjectId}
        subjectConfig={subjectConfig}
      />
    </div>
  );
}

function MockExamsPage() {
  const navigate = useNavigate();
  return <MockExams onBack={() => navigate('/practice')} subject={undefined} />;
}
