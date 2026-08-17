import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getAchievements, updateStreak } from '../stores/gamification';
import { getAllDailyPlans, getAllStudySets, getResults } from '../stores';
import { getDisplaySubjects, type DisplaySubject } from '../stores/subjects';
import { ACHIEVEMENTS, DEFAULT_PROFILE, type Achievement, type UserProfile } from '../types/gamification';
import type { DailyPlan, QuizResult, StudySet } from '../types';
import {
  AssetIcon,
  Card,
  EmptyState,
  IconPod,
  MedalBadge,
  OrangeButton,
  PageShell,
  ProgressBar,
  SectionTitle,
  daysUntil,
} from '../components/TargetUI';
import { GameIcon } from '../components/SharedUI';
import { toLocalDateStr } from '../utils/date';

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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return '早安，冲刺的你！';
  if (hour < 18) return '午安，继续向前！';
  return '晚上好，稳住节奏！';
}

function calcSubjectStats(subject: DisplaySubject, sets: StudySet[], results: QuizResult[]) {
  const subjectSets = sets.filter(set => set.subject === subject.name || set.subject === subject.id);
  const questionIds = new Set(subjectSets.flatMap(set => set.questions.map(q => q.id)));
  const subjectResults = results.filter(result => questionIds.has(result.questionId));
  const totalQuestions = subjectSets.reduce((sum, set) => sum + set.questions.length, 0);
  const done = subjectResults.length;
  const correct = subjectResults.filter(result => result.correct).length;
  return {
    progress: totalQuestions > 0 ? Math.round((done / totalQuestions) * 100) : 0,
    accuracy: done > 0 ? Math.round((correct / done) * 100) : null,
    done,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS.map(item => ({ ...item })));
  const [subjects, setSubjects] = useState<DisplaySubject[]>([]);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    async function load() {
      const [p, a, dailyPlans, studySets, quizResults, subjectList] = await Promise.all([
        getProfile(),
        getAchievements(),
        getAllDailyPlans(),
        getAllStudySets(),
        getResults(),
        getDisplaySubjects(),
      ]);
      try {
        await updateStreak();
        setProfile(await getProfile());
      } catch {
        setProfile(p);
      }
      setAchievements(a);
      setPlans(dailyPlans);
      setSets(studySets);
      setResults(quizResults);
      setSubjects(subjectList);
    }
    load();
  }, []);

  const todayPlans = useMemo(() => {
    const today = toLocalDateStr(new Date());
    return plans.filter(plan => plan.date === today);
  }, [plans]);

  const donePlans = todayPlans.filter(plan => plan.status === 'done').length;
  const todayProgress = todayPlans.length > 0 ? Math.round((donePlans / todayPlans.length) * 100) : 0;
  const xpPercent = profile.xpToNext > 0 ? Math.round((profile.xp / profile.xpToNext) * 100) : 0;
  const displayAchievements = achievements.slice(0, 6);
  const quizTarget = 3;
  const reviewTarget = 20;
  const quizDone = Math.min(quizTarget, donePlans);
  const reviewDone = Math.min(reviewTarget, results.length);

  return (
    <PageShell>
      <header className="gradient-header home-hero relative overflow-hidden rounded-b-[34px] px-7 pb-7 pt-7 text-white">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/12" />
        <div className="absolute right-12 top-20 h-2 w-2 rounded-full bg-white/45" />
        <button className="absolute right-5 top-8 z-20 rounded-2xl bg-white/14 px-3.5 py-2 text-xs font-[900] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] active:translate-y-[2px] transition-all">
          签到
        </button>
        <div className="absolute right-5 top-1/2 z-0 flex h-16 w-16 -translate-y-1/2 items-center justify-center">
          <IconPod icon="cap" className="h-16 w-16 rounded-[22px] bg-white/15 from-white/25 to-white/10" iconClassName="h-12 w-12" />
        </div>
        <div className="relative z-10 min-h-[112px] pl-2 pr-24 pt-6">
          <div className="min-w-0">
            <h1 className="text-[29px] font-black leading-tight tracking-normal drop-shadow-sm">{greeting()}</h1>
            <div className="mt-3 flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[12px] font-black leading-none text-white drop-shadow-sm">
              <GameIcon type="fire" size="sm" className="h-6 w-6 shrink-0" framed={false} />
              <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">“每一次努力，都是未来的你在感谢现在的自己。”</span>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <span className="text-sm font-black">学习达人</span>
            <span className="num-3d rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-[900] tracking-tighter text-gray-800">Lv.{profile.level}</span>
          </div>
        </div>
      </header>

      <div className="relative z-20 -mt-2 px-6 space-y-8">
        <div className="relative min-h-[126px] overflow-hidden rounded-[24px] border border-orange-300/40 px-5 py-4 text-white shadow-[0_16px_30px_rgba(249,115,22,0.18)]" style={{ background: 'linear-gradient(135deg,#ff5f00 0%,#ff8a12 48%,#f6b800 100%)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_25%,rgba(255,255,255,0.24),transparent_30%)]" />
          <div className="absolute -left-1 bottom-0 flex h-full w-28 items-end justify-center opacity-95">
            <AssetIcon icon="fire" className="h-[128px] w-[104px] object-contain drop-shadow-[0_14px_22px_rgba(120,45,0,0.18)]" />
          </div>
          <div className="relative z-10 flex min-h-[98px] items-center justify-center">
            <div className="flex min-w-0 items-center justify-center gap-3 pr-20 text-center">
              <div className="num-3d text-[58px] font-[900] leading-none tracking-tighter drop-shadow-sm">{profile.streak}</div>
              <div className="min-w-0">
                <div className="text-xl font-black leading-tight">天连续打卡</div>
                <div className="mt-1 text-sm font-bold text-white/90">{profile.streak >= 7 ? '节奏稳定，继续保持' : '每天一点，稳步推进'}</div>
              </div>
            </div>
            <div className="absolute right-0 flex h-[88px] w-[88px] shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-600 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_10px_20px_rgba(129,55,0,0.22)]" style={{ clipPath: 'polygon(50% 0%, 92% 18%, 100% 58%, 72% 100%, 50% 86%, 28% 100%, 0 58%, 8% 18%)' }} />
              <GameIcon type="crown" size="lg" className="relative z-10" />
              <div className="absolute -bottom-1 z-20 whitespace-nowrap rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-black shadow-md">连续打卡</div>
            </div>
          </div>
        </div>

        <Card className="p-5">
          <div className="space-y-5">
            <SectionTitle icon="target" title="今日目标" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-orange-100 bg-orange-50/45 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <IconPod icon="lightning" className="h-9 w-9 rounded-xl bg-white/80 from-white to-orange-50/70" iconClassName="h-6 w-6" />
                  <span className="num-3d text-2xl font-[900] tracking-tighter leading-none text-gray-800">+{donePlans * 15}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-gray-400">今日经验</div>
              </div>
              <div className="rounded-[18px] border border-orange-100 bg-orange-50/45 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-xs font-bold text-gray-400">等级进度</div>
                  <div className="num-3d text-2xl font-[900] tracking-tighter leading-none text-gray-800">Lv.{profile.level}</div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={xpPercent} height={6} />
                </div>
                <div className="num-3d mt-1 text-xs font-[900] tracking-tighter text-gray-500">{profile.xp} / {profile.xpToNext} XP</div>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-[20px] border border-orange-100 bg-gradient-to-b from-white to-orange-50/35 px-4 py-4 shadow-[inset_0_2px_5px_rgba(255,255,255,0.85),0_8px_18px_rgba(249,115,22,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-black leading-tight text-gray-900">学习任务完成度</div>
                  <span className="num-3d shrink-0 text-3xl font-[900] tracking-tighter leading-none text-gray-800">{todayProgress}%</span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={todayProgress} height={10} />
                </div>
                <p className="mt-3 text-sm font-bold leading-relaxed text-gray-400">
                  {todayPlans.length > 0 ? `已完成 ${donePlans}/${todayPlans.length} 个任务，完成后可获得额外XP奖励！` : '配置考点后，这里会显示今日学习目标。'}
                </p>
              </div>
              <AssetIcon icon="trophy" className="h-16 w-16 shrink-0" />
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <SectionTitle
            icon="book"
            title="科目练习"
            action={<button className="text-sm font-bold text-gray-500" onClick={() => navigate('/subjects')}>管理科目 ＞</button>}
          />
          <Card className="p-4">
            {subjects.length === 0 ? (
              <EmptyState
                icon="book"
                title="还没有科目"
                desc="新建科目后，可以自动生成练习、计划和进度。"
                action={<OrangeButton className="px-6 py-3" onClick={() => navigate('/practice/new')}>新建科目</OrangeButton>}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {subjects.slice(0, 4).map((subject) => {
                  const stats = calcSubjectStats(subject, sets, results);
                  const left = daysUntil(subject.examDate);
                  return (
                    <div key={subject.id} className="flex items-center gap-3.5 rounded-[20px] border border-orange-100/70 bg-white p-3.5 shadow-[0_8px_18px_rgba(77,43,0,0.05)]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] shadow-md" style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)` }}>
                        <AssetIcon icon={subjectIcon(subject.name)} className="w-11 h-11" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-black text-gray-900">{subject.name}</h3>
                          {left !== null && <span className="num-3d rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-[900] tracking-tighter text-gray-800">{left > 0 ? `${left}天` : '已到期'}</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <ProgressBar value={stats.progress} color={subject.color} height={8} />
                          <span className="num-3d w-10 text-right text-sm font-[900] tracking-tighter text-gray-800">{stats.progress}%</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-gray-400">
                          正确率 <span className="text-green-500">{stats.accuracy === null ? '--' : `${stats.accuracy}%`}</span>
                          <span className="mx-2">|</span>
                          已练习 {stats.done} 题
                        </div>
                      </div>
                      <OrangeButton className="shrink-0 px-4 py-3 text-xs" onClick={() => navigate('/practice')}>去练习 ＞</OrangeButton>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="py-1">
          <button
            className="btn-3d-orange w-full bg-gradient-to-r from-[#f97316] to-[#eab308] border-b-[4.5px] border-[#c2410c] text-white font-[900] text-xs py-2.5 px-6 rounded-2xl active:translate-y-[2px] active:border-b-[1.5px] transition-all shadow-[0_9px_16px_rgba(249,115,22,0.22),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-2px_0_rgba(194,65,12,0.16)]"
            onClick={() => navigate('/practice/new')}
          >
            添加科目，定制你的专属学习计划
          </button>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <IconPod icon="trophy" className="h-14 w-14 rounded-[20px] bg-orange-50 from-white to-orange-50/70" iconClassName="h-10 w-10" />
              <div>
                <h3 className="text-lg font-black text-gray-900">今日挑战</h3>
                <div className="num-3d text-xl sm:text-2xl font-[900] tracking-tighter text-gray-800">{reviewDone}/{reviewTarget}次复习 + {quizDone}/{quizTarget}次测验</div>
                <p className="text-xs font-bold text-gray-400">完成挑战，赢取额外 XP 奖励！</p>
              </div>
            </div>
            <div className="border-l border-orange-100 pl-4 sm:pl-6 text-center shrink-0">
              <div className="text-xs font-bold text-gray-400">当前连续完成</div>
              <div className="num-3d mt-1 text-4xl font-[900] tracking-tighter leading-none text-gray-800">{profile.streak}</div>
              <div className="text-sm font-black text-gray-500">天</div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <SectionTitle
            icon="trophy"
            title="成就徽章"
            action={<button className="text-sm font-bold text-gray-500" onClick={() => navigate('/me')}>查看更多 ＞</button>}
          />
          <Card className="p-5">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {displayAchievements.map((achievement, index) => (
                <MedalBadge
                  key={achievement.id}
                  icon={achievement.icon}
                  title={achievement.title}
                  condition={achievement.condition}
                  unlocked={achievement.unlocked}
                  index={index}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
