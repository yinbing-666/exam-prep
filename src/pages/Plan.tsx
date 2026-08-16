import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getAchievements } from '../stores/gamification';
import { getAllDailyPlans } from '../stores/dailyPlans';
import { getDisplaySubjects, type DisplaySubject } from '../stores/subjects';
import { calculateReadiness, type ReadinessData } from '../utils/readiness';
import { countDueCards } from '../utils/fsrs-service';
import { DEFAULT_PROFILE, type UserProfile } from '../types/gamification';
import type { DailyPlan } from '../types';
import {
  AssetIcon,
  Card,
  EmptyState,
  HeroHeader,
  MedalBadge,
  OrangeButton,
  PageShell,
  ProgressBar,
  SectionTitle,
  StatStrip,
  daysUntil,
} from '../components/TargetUI';
import { GameIcon } from '../components/SharedUI';

function currentWeek() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  return days;
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function masteryColor(plan: DailyPlan) {
  if (plan.status === 'done') return '#22c55e';
  if (plan.mastery === 'red') return '#ef4444';
  if (plan.mastery === 'yellow') return '#ff8a00';
  if (plan.mastery === 'green') return '#22c55e';
  return '#d6d3d1';
}

type ChartBar = {
  key: string;
  value: number;
  color: string;
  label?: string;
  showValue?: boolean;
};

function BarChart({ items, framed = false }: { items: ChartBar[]; framed?: boolean }) {
  return (
    <div className={`bar-chart-container ${framed ? 'rounded-[22px] border border-orange-100/70 bg-white/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]' : ''}`}>
      {items.map(item => (
        <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span className="num-3d h-4 text-xs font-[900] leading-none tracking-tighter" style={{ color: item.color }}>
            {item.showValue ? `${Math.round(item.value)}%` : ''}
          </span>
          <div className="relative h-24 w-5 overflow-hidden rounded-full bg-stone-100 shadow-[inset_0_3px_6px_rgba(15,23,42,0.08)]">
            <div
              className="bar-fill absolute bottom-0 left-0 right-0 transition-all"
              style={{
                height: `${Math.max(10, Math.min(100, item.value))}%`,
                background: `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, ${item.color} 38%, ${item.color} 100%)`,
              }}
            />
          </div>
          {item.label && (
            <span className="w-full truncate text-center text-[11px] font-bold text-gray-600">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Plan() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [subjects, setSubjects] = useState<DisplaySubject[]>([]);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [p, dailyPlans, ready, due, achievements, subjectList] = await Promise.all([
        getProfile(),
        getAllDailyPlans(),
        calculateReadiness(),
        countDueCards(),
        getAchievements(),
        getDisplaySubjects(),
      ]);
      setProfile(p);
      setPlans(dailyPlans);
      setReadiness(ready);
      setDueCount(due);
      setAchievementCount(achievements.filter(a => a.unlocked).length);
      setSubjects(subjectList);
    }
    load();
  }, []);

  const weekDays = useMemo(() => currentWeek(), []);
  const today = new Date().toISOString().slice(0, 10);
  const todayPlans = plans.filter(plan => plan.date === today);
  const doneToday = todayPlans.filter(plan => plan.status === 'done').length;
  const todayPercent = todayPlans.length ? Math.round((doneToday / todayPlans.length) * 100) : 0;
  const weekLabel = `${formatMonthDay(weekDays[0])} - ${formatMonthDay(weekDays[6])}`;
  const weekPlans = plans.filter(plan => weekDays.some(date => date.toISOString().slice(0, 10) === plan.date));
  const weekDone = weekPlans.filter(plan => plan.status === 'done').length;
  const readinessScore = readiness?.readinessScore ?? 0;
  const closestSubject = [...subjects]
    .map(subject => ({ subject, left: daysUntil(subject.examDate) }))
    .filter(item => item.left !== null)
    .sort((a, b) => (a.left ?? 9999) - (b.left ?? 9999))[0];
  const chartData = readiness ? Object.values(readiness.chapterPerformance).slice(0, 6) : [];

  return (
    <PageShell>
      <HeroHeader
        compact
        title="学习计划"
        subtitle="继续努力，你离目标更近了！"
        mascot="/icons/mascot-rabbit.png"
      />

      <div className="relative z-20 mt-7 space-y-8 px-6">
        <StatStrip
          items={[
            { icon: 'medal', value: `Lv.${profile.level}`, label: '当前等级', sub: `${profile.xp} / ${profile.xpToNext} XP` },
            { icon: 'fire', value: profile.streak, label: '天连续学习', sub: '火热状态中' },
            { icon: 'trophy', value: achievementCount, label: '成就徽章', sub: '持续解锁中' },
          ]}
        />

        <Card className="overflow-hidden p-0">
          <div className="border-b border-orange-100/70 bg-gradient-to-b from-white to-orange-50/45 px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionTitle icon="calendar" title="本周学习计划" />
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_10px_rgba(120,64,0,0.04)]">{weekLabel}</span>
                  <span className="num-3d rounded-full bg-orange-100 px-3 py-1 text-xs font-[900] tracking-tighter text-orange-600">
                    {weekDone}/{weekPlans.length || 0} 完成
                  </span>
                </div>
              </div>
              <button className="shrink-0 rounded-2xl border border-orange-100 bg-white px-3 py-2 text-xs font-[900] text-gray-600 shadow-[0_6px_12px_rgba(249,115,22,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all active:translate-y-[2px]">
                全部 ＞
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 px-1">
              <ProgressBar value={weekPlans.length ? Math.round((weekDone / weekPlans.length) * 100) : 0} height={9} />
              <span className="num-3d w-10 text-right text-sm font-[900] tracking-tighter text-gray-800">
                {weekPlans.length ? Math.round((weekDone / weekPlans.length) * 100) : 0}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 px-4 py-4">
            {weekDays.map((date, index) => {
              const dateKey = date.toISOString().slice(0, 10);
              const dayPlans = plans.filter(plan => plan.date === dateKey);
              const completed = dayPlans.length > 0 && dayPlans.every(plan => plan.status === 'done');
              const isToday = dateKey === today;
              return (
                <div
                  key={dateKey}
                  className={`flex h-[104px] min-w-0 flex-col items-center justify-start rounded-[20px] px-1 pt-2.5 text-center transition-all ${
                    isToday
                      ? 'border border-orange-300 bg-orange-50 shadow-[0_8px_16px_rgba(249,115,22,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
                      : 'border border-gray-100 bg-white/80'
                  }`}
                >
                  <div className="flex h-9 flex-col items-center justify-start">
                    <div className="text-sm font-black leading-none text-gray-700">{['一', '二', '三', '四', '五', '六', '日'][index]}</div>
                    <div className="mt-1 text-xs font-bold leading-none text-gray-400">{formatMonthDay(date)}</div>
                  </div>
                  <div className={`mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
                    completed
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : isToday
                      ? 'border-orange-500 bg-white text-orange-500'
                      : 'border-gray-200 bg-white text-gray-300'
                  }`}>
                    {completed ? '✓' : ''}
                  </div>
                  <div className="mt-1 h-4 text-[10px] font-black leading-none text-gray-400">
                    {dayPlans.length ? `${dayPlans.length}项` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {closestSubject && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900">目标考试倒计时</div>
                <div className="mt-1 truncate text-sm font-bold text-gray-400">关联科目：{closestSubject.subject.name}</div>
              </div>
              <div className="shrink-0 rounded-[22px] bg-gradient-to-b from-yellow-50 to-orange-50 px-4 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <span className="num-3d text-5xl font-[900] tracking-tighter text-gray-800">{Math.max(0, closestSubject.left ?? 0)}</span>
                <span className="ml-1 text-lg font-[900] text-gray-600">天</span>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-5">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionTitle icon="clipboard" title="今日任务" />
                <span className="num-3d rounded-full bg-gray-50 px-3 py-1 text-sm font-[900] tracking-tighter text-gray-800">{doneToday}/{todayPlans.length || 0}</span>
              </div>
              {todayPlans.length === 0 ? (
                <EmptyState
                  icon="target"
                  title="暂无今日协同计划"
                  desc="创建科目并生成计划后，这里会显示当天任务。"
                  action={<OrangeButton className="px-7 py-3" onClick={() => navigate('/practice')}>去配置考点</OrangeButton>}
                />
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-[18px] bg-orange-50 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black text-orange-600">今日完成度</span>
                      <span className="num-3d text-sm font-[900] tracking-tighter text-orange-600">{todayPercent}%</span>
                    </div>
                    <ProgressBar value={todayPercent} height={9} />
                  </div>
                  {todayPlans.map((plan, index) => {
                    const value = plan.status === 'done' ? 100 : plan.timeSpent ? Math.min(95, Math.round((plan.timeSpent / 20) * 100)) : 0;
                    const color = masteryColor(plan);
                    return (
                      <div key={plan.id} className="flex items-center gap-3 rounded-[20px] border border-orange-100/70 bg-white px-3 py-3 shadow-[0_8px_16px_rgba(249,115,22,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <div className="num-3d flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-[900] tracking-tighter" style={{ background: plan.status === 'done' ? '#22c55e' : '#fff', border: `2px solid ${color}`, color: plan.status === 'done' ? '#fff' : color }}>
                          {plan.status === 'done' ? '✓' : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-black ${plan.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{plan.moduleTitle}</div>
                          <div className="mt-2 flex items-center gap-4">
                            <ProgressBar value={value} color={color} height={7} />
                            <span className="num-3d w-12 text-right text-xs font-[900] tracking-tighter text-gray-800">{plan.timeSpent || 0}/20</span>
                          </div>
                        </div>
                        <span className="shrink-0 text-gray-300">›</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionTitle icon="chart" title="章节掌握度" />
                <span className="text-xs font-bold text-gray-400">正确率 (%)</span>
              </div>
              {chartData.length === 0 ? (
                <div className="mt-5 rounded-[24px] bg-gradient-to-br from-orange-50 via-white to-yellow-50 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(120,64,0,0.05)]">
                  <div className="mb-3 rounded-[18px] bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="text-sm font-black leading-tight text-gray-900">暂无章节数据</div>
                    <div className="mt-0.5 text-xs font-bold text-gray-400">上传资料后生成真实掌握度，下方为示例能量仓</div>
                  </div>
                  <BarChart
                    items={[
                      { key: 'demo-1', value: 54, color: '#f59e0b', showValue: true },
                      { key: 'demo-2', value: 80, color: '#22c55e', showValue: true },
                      { key: 'demo-3', value: 42, color: '#ef4444', showValue: true },
                      { key: 'demo-4', value: 66, color: '#f59e0b', showValue: true },
                      { key: 'demo-5', value: 90, color: '#22c55e', showValue: true },
                      { key: 'demo-6', value: 58, color: '#ef4444', showValue: true },
                    ]}
                  />
                </div>

              ) : (
                <div className="mt-5">
                  <BarChart
                    framed
                    items={chartData.map(item => {
                      const value = Math.round(item.percentage * 100);
                      const color = value >= 80 ? '#22c55e' : value >= 50 ? '#ff8a00' : '#ef4444';
                      return {
                        key: item.chapter,
                        value,
                        color,
                        label: item.chapter,
                        showValue: true,
                      };
                    })}
                  />
                  <div className="mt-4 flex items-start gap-3 rounded-[18px] bg-red-50 px-4 py-3 text-xs font-bold text-red-500">
                    <GameIcon type="idea" size="sm" className="h-7 w-7" framed={false} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black text-red-400">薄弱章节</div>
                      <div className="mt-0.5 truncate">{readiness?.weakChapters.length ? readiness.weakChapters.join('、') : '暂无明显薄弱章节'}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="overflow-visible p-5">
              <div className="flex items-center justify-between">
                <SectionTitle icon="target" title="考试准备度" />
                <span className={`rounded-full px-3 py-1 text-xs font-black ${readinessScore >= 70 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                  {readinessScore >= 70 ? '稳态' : '特训'}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <div className="relative h-32 w-32 shrink-0 rounded-full bg-[conic-gradient(#22c55e_0deg,#22c55e_var(--p),#ff6a00_var(--p),#ff6a00_calc(var(--p)+70deg),#f4e9db_calc(var(--p)+70deg))] p-3 shadow-[0_14px_28px_rgba(249,115,22,0.14),inset_0_1px_0_rgba(255,255,255,0.8)]" style={{ ['--p' as string]: `${readinessScore * 2.2}deg` }}>
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                    <span className="num-3d text-4xl font-[900] tracking-tighter text-gray-800">{readinessScore}</span>
                    <span className="num-3d text-lg font-[900] tracking-tighter text-gray-500">/100</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="rounded-2xl bg-orange-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm font-black text-orange-600">
                      <AssetIcon icon="fire" className="h-5 w-5" framed={false} />
                      {readiness && readiness.readinessScore >= 70 ? '状态稳定' : '需要特训'}
                    </div>
                    <p className="mt-0.5 text-[11px] font-bold leading-snug text-orange-500">
                      {readiness && readiness.readinessScore >= 70 ? '保持节奏，继续巩固错题。' : '优先补齐薄弱章节和待复习题。'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="num-3d text-lg font-[900] tracking-tighter leading-none text-gray-800">{dueCount}</div>
                      <div className="mt-1 text-[10px] font-black text-gray-400">待复习</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="num-3d text-lg font-[900] tracking-tighter leading-none text-gray-800">{doneToday}/{todayPlans.length || 0}</div>
                      <div className="mt-1 text-[10px] font-black text-gray-400">今日任务</div>
                    </div>
                  </div>
                  <div className="truncate rounded-2xl bg-green-50 px-3 py-2 text-xs font-black text-green-600">
                    优先：{readiness?.weakChapters.length ? readiness.weakChapters[0] : '暂无明显薄弱章节'}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] bg-green-50 px-4 py-3">
                <div className="min-w-0 text-sm font-black text-green-600">
                  {readinessScore >= 70 ? '处于良好状态' : '需要持续训练'}
                </div>
                <OrangeButton className="shrink-0 px-4 py-2" onClick={() => navigate('/practice')}>开始训练</OrangeButton>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-4 px-5 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-orange-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <GameIcon type="lightning" size="sm" className="h-9 w-9" framed={false} />
                  </div>
                  <div className="min-w-0">
                    <SectionTitle title="FSRS 智能复习" />
                    <div className="mt-1 text-xl font-black text-gray-900">
                      待复习 <span className="num-3d text-gray-800">{dueCount}</span> 题
                    </div>
                    <p className="mt-1 text-xs font-bold text-gray-400">根据遗忘曲线安排复习</p>
                  </div>
                </div>
                <OrangeButton className="h-14 w-14 rounded-full text-3xl" onClick={() => navigate('/practice/fsrs')}>→</OrangeButton>
              </div>
              <div className="h-2 bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400" />
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionTitle icon="medal" title="最近获得成就" />
                <button className="text-xs font-bold text-gray-400" onClick={() => navigate('/me')}>全部 ＞</button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: 'star', title: '坚持达人', condition: `连续学习${profile.streak}天`, unlocked: profile.streak > 0 },
                  { icon: 'target', title: '精准打击', condition: '正确率80%+', unlocked: (readiness?.overallPercentage || 0) >= 0.8 },
                  { icon: 'book', title: '勤学好问', condition: '完成100题', unlocked: profile.totalQuestions >= 100 },
                ].map((item, index) => (
                  <MedalBadge key={item.title} {...item} index={index} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
