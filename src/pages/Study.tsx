import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSubjectNames, getSubjectColor, type SubjectName } from '../types/question';
import { storage } from '../utils/storage';
import { Card, HeroHeader, IconPod, OrangeButton, PageShell, ProgressBar, SectionTitle } from '../components/TargetUI';

function subjectGameIcon(subject: string) {
  if (subject.includes('数')) return 'math';
  if (subject.includes('英')) return 'english';
  if (subject.includes('语')) return 'pencil';
  if (subject.includes('物')) return 'physics';
  if (subject.includes('化')) return 'chemistry';
  if (subject.includes('政')) return 'law';
  if (subject.includes('史')) return 'history';
  if (subject.includes('地')) return 'geography';
  if (subject.includes('生')) return 'biology';
  return 'book';
}

const featureLinks = [
  { icon: 'book', label: '知识清单', hint: '按章节整理核心考点', path: '/knowledge', tone: 'from-orange-50 to-white' },
  { icon: 'clock', label: '临考速背', hint: '快速复盘高频内容', path: '/flashcards', tone: 'from-green-50 to-white' },
  { icon: 'clipboard', label: '学习卡片', hint: '用卡片拆解记忆点', path: '/cards', tone: 'from-blue-50 to-white' },
  { icon: 'mistake', label: '错题本', hint: '集中攻克薄弱题目', path: '/mistakes', tone: 'from-red-50 to-white' },
  { icon: 'fire', label: 'FSRS复习', hint: '按记忆曲线安排复习', path: '/fsrs', tone: 'from-purple-50 to-white' },
];

const Study: React.FC = () => {
  const navigate = useNavigate();
  const subjects = getSubjectNames();
  const [currentSubject, setCurrentSubject] = useState<SubjectName>(
    storage.get('current_subject', subjects[0])
  );

  const [subjectProgress, setSubjectProgress] = useState<Record<string, number>>({});

  React.useEffect(() => {
    const progress: Record<string, number> = {};
    subjects.forEach(subject => {
      const p = storage.getSubjectProgress(subject);
      progress[subject] = p.totalQuestions > 0
        ? Math.round((p.correctCount / p.totalQuestions) * 100)
        : 0;
    });
    setSubjectProgress(progress);
  }, []);

  const activeProgress = subjectProgress[currentSubject] || 0;
  const completedSubjects = subjects.filter(subject => (subjectProgress[subject] || 0) >= 80).length;

  return (
    <PageShell>
      <HeroHeader
        title="练习"
        subtitle="选择科目，再进入刷题、模考和复习工具"
        mascot="rabbit"
        compact
        right={
          <OrangeButton className="px-4 py-2 text-[11px]" onClick={() => navigate('/new-subject')}>
            新建科目
          </OrangeButton>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '当前科目', value: currentSubject },
            { label: '掌握度', value: `${activeProgress}%` },
            { label: '高分科目', value: completedSubjects },
          ].map(item => (
            <div key={item.label} className="rounded-[18px] bg-white/18 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-sm">
              <div className="truncate text-[10px] font-black text-white/70">{item.label}</div>
              <div className="num-3d mt-1 truncate text-base font-[900] leading-none tracking-tighter text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </HeroHeader>

      <div className="relative z-20 mt-7 space-y-9 px-6">
        <section className="space-y-3">
          <SectionTitle icon="book" title="我的科目" />
          <Card className="p-3">
            <div className="space-y-2">
              {subjects.map(subject => {
                const color = getSubjectColor(subject as SubjectName);
                const progress = subjectProgress[subject] || 0;
                const active = currentSubject === subject;

                return (
                  <motion.button
                    key={subject}
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      setCurrentSubject(subject as SubjectName);
                      storage.set('current_subject', subject);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[22px] border p-3 text-left transition-all ${
                      active
                        ? 'border-orange-300 bg-orange-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_20px_rgba(249,115,22,0.10)]'
                        : 'border-transparent bg-gray-50/80 active:bg-orange-50/60'
                    }`}
                  >
                    <IconPod
                      icon={subjectGameIcon(subject)}
                      className="h-12 w-12 rounded-[18px] border-white/60"
                      iconClassName="h-8 w-8"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-gray-900">{subject}</span>
                        <span className={`num-3d shrink-0 text-sm font-[900] tracking-tighter ${active ? 'text-orange-600' : 'text-gray-500'}`}>
                          {progress}%
                        </span>
                      </span>
                      <span className="mt-2 block">
                        <ProgressBar value={progress} color={color} height={7} />
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionTitle icon="target" title="练习模式" />
          <div className="grid grid-cols-2 gap-4">
            <Card className="overflow-hidden p-0 bg-gradient-to-b from-blue-50 to-white" onClick={() => navigate('/quiz')}>
              <div className="p-4">
                <IconPod icon="memo" className="h-12 w-12 rounded-[18px] bg-white/80 from-white to-blue-50" iconClassName="h-8 w-8" />
                <div className="mt-4 text-base font-black text-gray-900">刷题模式</div>
                <div className="mt-1 text-xs font-bold leading-snug text-gray-400">围绕当前科目快速练习</div>
              </div>
              <div className="h-1.5 bg-gradient-to-r from-blue-400 via-sky-300 to-white" />
            </Card>
            <Card className="overflow-hidden p-0 bg-gradient-to-b from-violet-50 to-white" onClick={() => navigate('/mock')}>
              <div className="p-4">
                <IconPod icon="clipboard" className="h-12 w-12 rounded-[18px] bg-white/80 from-white to-violet-50" iconClassName="h-8 w-8" />
                <div className="mt-4 text-base font-black text-gray-900">模拟考试</div>
                <div className="mt-1 text-xs font-bold leading-snug text-gray-400">按考试节奏完整训练</div>
              </div>
              <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-300 to-white" />
            </Card>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle icon="star" title="复习工具" />
          <Card className="p-2">
            <div className="space-y-1.5">
              {featureLinks.map(item => (
                <motion.button
                  key={item.label}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[20px] bg-gradient-to-r ${item.tone} px-3 py-3 text-left transition-colors active:bg-orange-50/70`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <IconPod icon={item.icon} className="h-10 w-10 rounded-2xl bg-white/80 from-white to-orange-50/60" iconClassName="h-6 w-6" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-gray-900">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-gray-400">{item.hint}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xl font-black text-gray-300">＞</span>
                </motion.button>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </PageShell>
  );
};

export default Study;
