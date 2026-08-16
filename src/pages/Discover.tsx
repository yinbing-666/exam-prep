import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLeaderboard, getProfile } from '../stores/gamification';
import { VIRTUAL_LEADERBOARD, type LeaderboardEntry, type UserProfile } from '../types/gamification';
import { AssetIcon, Card, IconPod, PageShell, ProgressBar, SectionTitle } from '../components/TargetUI';
import { GameIcon } from '../components/SharedUI';

const resources = [
  { icon: 'idea', title: '学习技巧', desc: '掌握高效学习方法', action: '去学习', bg: 'bg-orange-50' },
  { icon: 'clipboard', title: '考试攻略', desc: '考试动态与提分策略', action: '去查看', bg: 'bg-blue-50' },
  { icon: 'book', title: '科目资料', desc: '各科资料免费整理', action: '去获取', bg: 'bg-green-50' },
  { icon: 'speech', title: '社区讨论', desc: '交流经验互相助攻', action: '去参与', bg: 'bg-purple-50' },
];

const methods = [
  { title: '五步学习框架', desc: '目标拆解、复述、回忆、间隔复习和错题复盘统一执行。' },
  { title: '费曼技巧复述法', desc: '用最直白的语言讲出来，讲不清的地方就是下一轮重点。' },
  { title: '间隔重复记忆法', desc: '把复习安排到快遗忘前，减少无效重复，强化长期记忆。' },
  { title: '主动回忆法', desc: '合上资料先想答案，再对照纠偏，让大脑真正参与检索。' },
  { title: '番茄钟深度专注', desc: '用固定时间块减少切换成本，保持复习节奏和可持续状态。' },
];

const tools = [
  { icon: 'clock', title: '计时器', desc: '专注计时' },
  { icon: 'math', title: '公式表', desc: '公式速查' },
  { icon: 'chart', title: '错题统计', desc: '提分分析' },
];

function sanitizeLeaderboardName(name: string) {
  const pure = name
    .replace(/[\u200d\ufe0e\ufe0f]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, '')
    .trim();
  return pure || '同学';
}

function animalAvatarForRank(rank: number) {
  const animals = ['fox', 'cat', 'bear', 'animalRabbit'];
  return animals[(Math.max(1, rank) - 1) % animals.length];
}

function Podium({ ranks }: { ranks: LeaderboardEntry[] }) {
  const displayRanks = (ranks.length > 0 ? ranks : VIRTUAL_LEADERBOARD).map(entry => ({
    ...entry,
    name: sanitizeLeaderboardName(entry.name),
  }));
  const top3 = displayRanks.slice(0, 3);
  const ordered = [top3[1], top3[0], top3[2]].filter((entry): entry is LeaderboardEntry => Boolean(entry));

  return (
    <Card className="overflow-visible p-5">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon="trophy" title="学霸榜" />
        <button className="shrink-0 text-xs font-black text-gray-400">完整榜单 ＞</button>
      </div>

      <div className="mt-3 flex min-h-[216px] items-end justify-center gap-3 overflow-visible pt-8">
        {ordered.map(entry => {
          const first = entry.rank === 1;
          const height = first ? 86 : entry.rank === 2 ? 66 : 52;
          const barClass = first
            ? 'from-yellow-300 to-orange-400'
            : entry.rank === 2
              ? 'from-slate-200 to-slate-400'
              : 'from-orange-200 to-orange-400';

          return (
            <div key={entry.rank} className="relative flex w-[88px] shrink-0 flex-col items-center">
              {first && (
                <motion.div
                  className="absolute -top-8 z-20"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <GameIcon type="crown" size="sm" framed={false} />
                </motion.div>
              )}
              <div
                className={`flex items-center justify-center rounded-[22px] bg-white shadow-[0_10px_20px_rgba(90,45,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] ${
                  first ? 'h-20 w-20 border-2 border-yellow-300' : 'h-16 w-16 border border-orange-100'
                }`}
              >
                <GameIcon
                  type={animalAvatarForRank(entry.rank)}
                  size={first ? 'lg' : 'md'}
                  framed={false}
                  className={first ? 'h-16 w-16' : 'h-12 w-12'}
                />
              </div>
              <div className="mt-2 w-full truncate text-center text-sm font-black leading-tight text-gray-900">{entry.name}</div>
              <div className="num-3d w-full truncate text-center text-xs font-[900] leading-tight tracking-tighter text-gray-700">{entry.studyMinutes} 分钟</div>
              <div
                className={`mt-2 flex w-[88px] items-center justify-center rounded-t-[22px] bg-gradient-to-b ${barClass} text-2xl font-black text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.45)]`}
                style={{ height }}
              >
                {entry.rank}
              </div>
            </div>
          );
        })}
      </div>

      {displayRanks[3] && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-orange-100 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-5 shrink-0 text-center text-base font-black text-gray-300">{displayRanks[3].rank}</span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
              <GameIcon type={animalAvatarForRank(displayRanks[3].rank)} size="sm" framed={false} className="h-8 w-8" />
            </div>
            <span className="truncate font-black text-gray-700">{displayRanks[3].name}</span>
          </div>
          <span className="num-3d shrink-0 text-sm font-[900] tracking-tighter text-gray-800">{displayRanks[3].studyMinutes} 分钟</span>
        </div>
      )}
    </Card>
  );
}

export default function Discover() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getProfile(), getLeaderboard()]).then(([p, ranks]) => {
      setProfile(p);
      setLeaderboard(ranks);
    });
  }, []);

  const xp = profile?.xp || 0;
  const xpToNext = profile?.xpToNext || 100;
  const xpPercent = Math.round((xp / xpToNext) * 100);
  const streak = profile?.streak || 0;

  return (
    <PageShell>
      <header className="gradient-header relative overflow-hidden rounded-b-[36px] px-6 pb-12 pt-8 text-white">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/12" />
        <div className="absolute right-8 top-12 text-3xl text-white/35">✦</div>
        <div className="relative z-10 grid grid-cols-[1fr_118px] items-end gap-4">
          <div className="min-w-0">
            <h1 className="text-[34px] font-black leading-none drop-shadow-sm">发现</h1>
            <div className="mt-4 flex min-w-0 items-center gap-2 text-lg font-black leading-tight">
              <span className="num-3d shrink-0 font-[900] tracking-tighter text-white">Lv.{profile?.level || 1}</span>
              <span className="min-w-0 truncate">学习能量站</span>
              <AssetIcon icon="medal" className="h-7 w-7 shrink-0" framed={false} />
            </div>
            <div className="mt-3 max-w-[200px]">
              <ProgressBar value={xpPercent} height={9} />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm">
              <div className="num-3d text-2xl font-[900] leading-none tracking-tighter text-white">{streak}</div>
              <div className="mt-1 text-[11px] font-black text-white/85">连续天数</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm">
              <div className="num-3d text-lg font-[900] leading-none tracking-tighter text-white">{xp}</div>
              <div className="mt-1 text-[11px] font-black text-white/85">我的经验</div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-20 mt-7 space-y-8 px-6">
        <section className="space-y-4">
          <SectionTitle icon="book" title="精选资源" />
          <div className="grid grid-cols-2 gap-3">
            {resources.map(item => (
              <Card key={item.title} className="min-h-[138px] p-4">
                <IconPod icon={item.icon} className={`h-11 w-11 rounded-2xl ${item.bg}`} iconClassName="h-7 w-7" />
                <h3 className="mt-3 truncate text-base font-black leading-tight text-gray-900">{item.title}</h3>
                <p className="mt-1 line-clamp-2 min-h-[34px] text-xs font-bold leading-snug text-gray-500">{item.desc}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex shrink-0 rounded-xl bg-orange-50 px-2.5 py-1.5 text-xs font-black text-orange-500">
                    {item.action}
                  </span>
                  <span className="shrink-0 text-lg font-black text-gray-300">›</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Podium ranks={leaderboard} />

        <section className="space-y-4">
          <SectionTitle icon="gear" title="学习工具" />
          <Card className="p-2">
            <div className="space-y-1.5">
              {tools.map(tool => (
                <button key={tool.title} className="flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left transition-colors active:bg-orange-50/70">
                  <IconPod icon={tool.icon} className="h-11 w-11 rounded-2xl bg-gray-50 from-gray-50 to-orange-50/50" iconClassName="h-7 w-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black leading-tight text-gray-900">{tool.title}</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-gray-400">{tool.desc}</span>
                  </span>
                  <span className="shrink-0 text-lg font-black text-gray-300">›</span>
                </button>
              ))}
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionTitle icon="idea" title="学习方法" />
          <div className="space-y-3">
            {methods.map((method, index) => {
              const expanded = open === index;
              return (
                <Card key={method.title} className={`overflow-hidden p-0 ${expanded ? 'ring-2 ring-orange-200/80' : ''}`}>
                  <button
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    onClick={() => setOpen(expanded ? null : index)}
                    aria-expanded={expanded}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black text-gray-900">{method.title}</span>
                      <span className="mt-1 block text-xs font-bold text-gray-400">
                        {index === 0 ? '统一执行框架' : '点击查看用法'}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-lg font-black leading-none text-orange-400 transition-transform ${expanded ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </button>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-5 mb-5 rounded-[18px] bg-orange-50/70 px-4 py-3 text-sm font-bold leading-relaxed text-gray-600">
                          {method.desc}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
