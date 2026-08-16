import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getAchievements, getProfile, saveAchievements, saveProfile } from '../stores/gamification';
import { getAll, putMany } from '../stores/db';
import { isLoggedIn, getUser, logout } from '../stores/auth';
import { syncPush } from '../stores/sync';
import { ACHIEVEMENTS, DEFAULT_PROFILE, type Achievement, type UserProfile } from '../types/gamification';
import { AssetIcon, Card, IconPod, OrangeButton, PageShell, ProgressBar, SectionTitle, ShieldBadge } from '../components/TargetUI';
import { GameIcon } from '../components/SharedUI';

function beatText(value: number | string, base: number) {
  if (value === '--') return '暂无可比较数据';
  return `击败了全站 ${Math.max(12, Math.min(98, base))}% 同学`;
}

export default function Me() {
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS.map(item => ({ ...item })));
  const [confirmClear, setConfirmClear] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getProfile(), getAchievements()]).then(([p, a]) => {
      setProfile(p);
      setAchievements(a);
    });
  }, []);

  const accuracy = profile.totalQuestions > 0 ? Math.round((profile.correctCount / profile.totalQuestions) * 1000) / 10 : null;
  const xpPercent = profile.xpToNext > 0 ? Math.round((profile.xp / profile.xpToNext) * 100) : 0;
  const unlocked = achievements.filter(a => a.unlocked).length;

  async function exportData() {
    // 全量备份：profile/成就（localStorage）+ IndexedDB 全部 store
    const storeNames = ['studySets', 'results', 'mastered', 'modules', 'mockExams', 'mockAttempts', 'materials', 'dailyPlans', 'fsrsCards', 'gamification'];
    const stores: Record<string, unknown[]> = {};
    for (const name of storeNames) {
      try { stores[name] = await getAll(name as never); } catch { stores[name] = []; }
    }
    const blob = new Blob([JSON.stringify({
      version: 2,
      profile,
      achievements,
      stores,
      exportedAt: new Date().toISOString(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const data = JSON.parse(String(event.target?.result || '{}'));
        if (data.profile) {
          await saveProfile(data.profile);
          setProfile(data.profile);
        }
        if (data.achievements) {
          await saveAchievements(data.achievements);
          setAchievements(data.achievements);
        }
        if (data.stores && typeof data.stores === 'object') {
          for (const name of Object.keys(data.stores)) {
            try { await putMany(name as never, data.stores[name] || []); } catch { /* 跳过无法恢复的 store */ }
          }
        }
        alert('导入成功');
      } catch {
        alert('导入失败，文件格式不正确');
      }
    };
    reader.readAsText(file);
  }

  async function clearData() {
    const nextProfile = { ...DEFAULT_PROFILE };
    const nextAchievements = ACHIEVEMENTS.map(item => ({ ...item }));
    await saveProfile(nextProfile);
    await saveAchievements(nextAchievements);
    setProfile(nextProfile);
    setAchievements(nextAchievements);
    setConfirmClear(false);
  }

  const authUser = getUser();

  const stats = [
    { icon: 'memo', value: profile.totalQuestions, label: '总刷题数', beat: beatText(profile.totalQuestions, Math.round(profile.totalQuestions / 8) + 28), tone: 'from-blue-50 to-white' },
    { icon: 'target', value: accuracy === null ? '--' : `${accuracy}%`, label: '正确率', beat: beatText(accuracy === null ? '--' : accuracy, Math.round(accuracy || 0)), tone: 'from-red-50 to-white' },
    { icon: 'fire', value: profile.streak, label: '连续天数', beat: beatText(profile.streak, profile.streak * 8 + 18), tone: 'from-orange-50 to-white' },
    { icon: 'trophy', value: unlocked, label: '成就解锁', beat: beatText(unlocked, unlocked * 7 + 22), tone: 'from-yellow-50 to-white' },
  ];

  const menuItems = [
    { icon: 'user', label: '个人资料', hint: '昵称、头像与等级信息', action: () => {} },
    { icon: 'chart', label: '学习统计', hint: '刷题、正确率与趋势', action: () => {} },
    { icon: 'bell', label: '通知设置', hint: '提醒时间和复习节奏', action: () => {} },
    { icon: 'palette', label: '主题设置', hint: '界面风格与显示偏好', action: () => {} },
    ...(loggedIn
      ? [{ icon: 'history' as const, label: '☁️ 同步数据', hint: '上传本地数据到云端', action: async () => {
          try { await syncPush('gamification'); await syncPush('studySets'); alert('同步成功！'); } catch { alert('同步失败'); }
        }}]
      : []),
    { icon: 'floppyDisk', label: '导出数据备份', hint: '保存本地学习档案', action: exportData },
    { icon: 'inbox', label: '导入数据备份', hint: '恢复历史备份文件', action: () => fileRef.current?.click() },
    { icon: 'wastebasket', label: '清除本地数据', hint: '重置本机学习记录', action: () => setConfirmClear(true), danger: true },
    ...(loggedIn
      ? [{ icon: 'lock' as const, label: '退出登录', hint: '退出当前账号', action: () => { logout(); setLoggedIn(false); }, danger: true }]
      : [{ icon: 'gear' as const, label: '点击登录', hint: '登录后可云同步数据', action: () => { window.location.reload(); } }]),
  ];
  const menuGroups = [menuItems.slice(0, 4), menuItems.slice(4)];

  return (
    <PageShell>
      <header className="gradient-header relative overflow-hidden rounded-b-[36px] px-6 pb-12 pt-8 text-white">
        <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-white/12" />
        <GameIcon type="star" size="sm" className="absolute right-8 top-14 h-7 w-7 opacity-35" framed={false} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-[82px] w-[82px] flex-shrink-0 items-center justify-center rounded-[28px] border-4 border-white/40 bg-white/95 shadow-[0_14px_28px_rgba(119,47,0,0.18),inset_0_2px_0_rgba(255,255,255,0.9)]">
            <GameIcon type="fox" size="lg" className="h-16 w-16" framed={false} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-3xl font-black leading-tight drop-shadow-sm">{authUser?.nickname || '学习者'}</h1>
              <span className="num-3d shrink-0 rounded-xl bg-yellow-200 px-3 py-1 text-base font-[900] tracking-tighter text-gray-800">Lv.{profile.level}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <ProgressBar value={xpPercent} height={10} />
              </div>
              <span className="num-3d shrink-0 text-sm font-[900] tracking-tighter text-gray-800">{profile.xp} / {profile.xpToNext} XP</span>
            </div>
            <p className="mt-3 truncate text-base font-black text-white/95">坚持学习，未来可期！</p>
          </div>
        </div>
      </header>

      <div className="relative z-20 mt-7 space-y-9 px-6">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-gray-900">升级进度</div>
              <div className="mt-1 text-xs font-bold text-gray-400">完成练习与复习可获得 XP</div>
            </div>
            <span className="num-3d rounded-2xl bg-orange-50 px-3 py-1 text-sm font-[900] tracking-tighter text-orange-600">{xpPercent}%</span>
          </div>
          <ProgressBar value={xpPercent} height={12} />
          <div className="mt-3 flex items-center justify-between text-xs font-black text-gray-400">
            <span>Lv.{profile.level}</span>
            <span className="num-3d font-[900] tracking-tighter text-gray-700">{profile.xp} / {profile.xpToNext} XP</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {stats.map(item => (
            <Card key={item.label} className={`overflow-hidden p-0 bg-gradient-to-b ${item.tone}`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <IconPod icon={item.icon} className="h-11 w-11 rounded-2xl bg-white/80 from-white to-orange-50/60" iconClassName="h-7 w-7" />
                  <div className="num-giant num-3d min-w-0 text-right text-[32px] font-[900] leading-none tracking-tighter">{item.value}</div>
                </div>
                <div className="mt-3 text-sm font-black leading-tight text-gray-900">{item.label}</div>
                <div className="mt-1 text-[11px] font-bold leading-snug text-gray-400">{item.beat}</div>
              </div>
              <div className="h-1.5 bg-gradient-to-r from-orange-300 via-yellow-300 to-white" />
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <SectionTitle title="我的成就" />
            <span className="num-3d text-sm font-[900] tracking-tighter text-gray-800">{unlocked}/{achievements.length} 已解锁 ＞</span>
          </div>
          <div className="mt-4 rounded-[18px] bg-orange-50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs font-black">
              <span className="text-orange-600">收集进度</span>
              <span className="num-3d font-[900] tracking-tighter text-orange-600">{Math.round((unlocked / achievements.length) * 100)}%</span>
            </div>
            <ProgressBar value={Math.round((unlocked / achievements.length) * 100)} height={9} />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-x-3 gap-y-5">
            {achievements.slice(0, 12).map((achievement, index) => (
              <ShieldBadge
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

        <div className="space-y-4">
          {menuGroups.map((group, groupIndex) => (
            <Card key={groupIndex} className="p-2">
              <div className="space-y-1.5">
                {group.map(item => (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.98 }}
                    onClick={item.action}
                    className={`flex w-full items-center justify-between gap-3 rounded-[20px] px-3 py-3 text-left transition-colors active:bg-orange-50/60 ${item.danger ? 'text-red-500' : 'text-gray-900'}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <IconPod icon={item.icon} className="h-10 w-10 rounded-2xl bg-gray-50 from-gray-50 to-orange-50/60" iconClassName="h-6 w-6" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        <span className={`mt-0.5 block truncate text-[11px] font-bold ${item.danger ? 'text-red-300' : 'text-gray-400'}`}>{item.hint}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xl font-black text-gray-300">＞</span>
                  </motion.button>
                ))}
              </div>
            </Card>
          ))}
          </div>
          <input ref={fileRef} type="file" accept=".json" onChange={importData} className="hidden" />
      </div>

      <AnimatePresence>
        {confirmClear && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5" onClick={() => setConfirmClear(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <AssetIcon icon="warning" className="mx-auto h-14 w-14" />
              <h3 className="mt-3 text-xl font-black text-gray-900">确认清除所有记录？</h3>
              <p className="mt-2 text-sm font-bold text-gray-400">此操作会重置学习等级、成就和本地统计，且不可恢复。</p>
              <div className="mt-6 flex gap-3">
                <button className="flex-1 rounded-2xl bg-gray-100 py-3 font-black text-gray-500" onClick={() => setConfirmClear(false)}>取消</button>
                <OrangeButton className="flex-1 py-3" onClick={clearData}>确认清除</OrangeButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
