import { motion } from 'framer-motion';
import type React from 'react';
import { GameIcon } from './SharedUI';

export const pageMotion = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const itemMotion = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } },
};

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageMotion}
      initial="hidden"
      animate="show"
      className="min-h-screen max-w-[480px] mx-auto bg-[linear-gradient(180deg,#ff7900_0%,#ff9500_190px,#ffe4c4_360px,#fff1df_100%)] text-[#20140f] pb-44 font-sans antialiased overflow-hidden"
    >
      {children}
      <div aria-hidden="true" style={{ height: 'calc(128px + env(safe-area-inset-bottom, 0px))' }} />
    </motion.div>
  );
}

export function HeroHeader({
  title,
  subtitle,
  avatar,
  right,
  mascot,
  compact = false,
  children,
}: {
  title: string;
  subtitle?: string;
  avatar?: string;
  right?: React.ReactNode;
  mascot?: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const showSideVisual = Boolean(mascot || avatar);

  return (
    <motion.header
      variants={itemMotion}
      className={`gradient-header relative overflow-hidden rounded-b-[36px] text-white px-6 ${compact ? 'pt-8 pb-12' : 'pt-9 pb-14'}`}
    >
      <div className="absolute -right-14 -top-20 w-52 h-52 rounded-full bg-white/12" />
      <div className="absolute right-8 top-14 text-white/35 text-3xl">✦</div>
      <div className="absolute left-5 bottom-8 text-white/55 text-xl">✦</div>
      {showSideVisual && (
        <div className={`absolute ${right ? 'right-20' : 'right-4'} top-1/2 z-0 flex h-16 w-16 -translate-y-1/2 items-center justify-center pointer-events-none`}>
          {mascot ? (
            <GameIcon type="rabbit" size="lg" className="header-mascot" />
          ) : (
            <img
              src={avatar}
              alt=""
              className="header-mascot h-16 w-16 rounded-full bg-white p-1 object-contain shadow-[0_8px_18px_rgba(133,56,0,0.22)]"
            />
          )}
        </div>
      )}
      {right && <div className="absolute right-5 top-7 z-20 shrink-0">{right}</div>}
      <div className="relative z-10 pl-4 pr-24">
        <div className="min-w-0">
          <div className="min-w-0">
            <h1 className={`${compact ? 'text-3xl' : 'text-[34px]'} max-w-full leading-tight font-black tracking-normal drop-shadow-sm break-words`}>
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm font-bold text-white/90 leading-snug">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children && <div className="relative z-10 mt-6 pl-4 pr-24">{children}</div>}
    </motion.header>
  );
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      variants={itemMotion}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      className={`gamified-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({
  icon,
  title,
  action,
}: {
  icon?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#20140f]">
        {icon && <IconPod icon={icon} className="h-8 w-8 rounded-xl" iconClassName="h-5 w-5" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function AssetIcon({
  icon,
  className = 'w-8 h-8',
  framed = false,
}: {
  icon: string;
  className?: string;
  framed?: boolean;
}) {
  return <GameIcon type={icon} className={className} framed={framed} />;
}

export function IconPod({
  icon,
  className = '',
  iconClassName = 'h-7 w-7',
}: {
  icon: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={`icon-pod relative flex h-12 w-12 shrink-0 items-center justify-center overflow-visible rounded-2xl border border-orange-200/30 bg-gradient-to-b from-orange-50 to-orange-100/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] ${className}`}>
      <div className="pointer-events-none absolute left-1 right-1 top-1 h-1 rounded-full bg-white/50" />
      <AssetIcon icon={icon} className={iconClassName} framed={false} />
    </div>
  );
}

export function ProgressBar({
  value,
  color = '#ff6a00',
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-bar w-full" style={{ height }}>
      <div className="progress-fill transition-all duration-500" style={{ width: `${safe}%`, background: `linear-gradient(90deg, ${color}, #f9b400)` }} />
    </div>
  );
}

export function AccuracyRing({
  percentage,
  size = 72,
  stroke = 8,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
}) {
  const safe = Math.max(0, Math.min(100, percentage));
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safe / 100) * circumference;
  const color = safe < 60 ? '#ef4444' : safe < 80 ? '#f59e0b' : '#22c55e';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle stroke="#f3f4f6" fill="transparent" strokeWidth={stroke} r={radius} cx={size / 2} cy={size / 2} />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'backOut' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-sm font-[900]" style={{ color }}>{safe}%</span>
      </div>
    </div>
  );
}

export function OrangeButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`btn-3d-orange ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {children}
    </motion.button>
  );
}

export function StatStrip({
  items,
}: {
  items: { icon: string; value: string | number; label: string; sub?: string; color?: string }[];
}) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item, index) => (
          <div key={item.label} className={`flex min-w-0 flex-col items-center justify-center px-1 sm:px-2 text-center ${index > 0 ? 'border-l border-orange-100' : ''}`}>
            <div className="flex items-center justify-center gap-2">
              <IconPod icon={item.icon} className="h-9 w-9 rounded-full" iconClassName="h-5 w-5" />
              <div className="num-3d text-xl sm:text-2xl font-[900] tracking-tighter text-gray-800 leading-none">
                {item.value}
              </div>
            </div>
            <div className="mt-2 text-[11px] sm:text-xs font-black text-gray-800 leading-tight">{item.label}</div>
            {item.sub && <div className="mt-0.5 max-w-full truncate text-[10px] font-bold text-gray-400 leading-tight">{item.sub}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function EmptyState({
  icon = '📚',
  title,
  desc,
  action,
}: {
  icon?: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <IconPod
        icon={icon}
        className="h-16 w-16 rounded-[22px] bg-white/80 from-white to-orange-50/80 backdrop-blur-sm shadow-[0_16px_30px_rgba(249,115,22,0.08),inset_0_2px_4px_rgba(255,255,255,0.7)]"
        iconClassName="h-10 w-10 object-contain"
      />
      <h3 className="mt-3 text-base font-black text-gray-900">{title}</h3>
      {desc && <p className="mt-1 text-xs font-bold text-gray-400 leading-relaxed">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function medalColor(index: number, unlocked: boolean) {
  if (!unlocked) return { bg: 'linear-gradient(180deg,#f1f1f1,#d7d7d7)', color: '#8d8d8d', icon: '🔒' };
  const colors = [
    ['linear-gradient(180deg,#ffd35a,#ff8a00)', '#b94b00'],
    ['linear-gradient(180deg,#74b8ff,#2777e8)', '#0d53ad'],
    ['linear-gradient(180deg,#8ee36d,#35b84f)', '#1b7b35'],
    ['linear-gradient(180deg,#b486ff,#7c3aed)', '#5521b7'],
    ['linear-gradient(180deg,#ffb84a,#f97316)', '#9d3e00'],
  ];
  const [bg, color] = colors[index % colors.length];
  return { bg, color, icon: '' };
}

function LockedGlyph({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M22 29V23C22 16.9 26.6 12 32 12C37.4 12 42 16.9 42 23V29"
        stroke="#6b7280"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="17" y="28" width="30" height="25" rx="8" fill="#9ca3af" />
      <rect x="17" y="25" width="30" height="25" rx="8" fill="#e5e7eb" stroke="#6b7280" strokeWidth="4" />
      <circle cx="32" cy="37" r="4" fill="#6b7280" />
      <path d="M32 40V45" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function MedalBadge({
  icon,
  title,
  condition,
  unlocked,
  index = 0,
}: {
  icon: string;
  title: string;
  condition: string;
  unlocked: boolean;
  index?: number;
}) {
  const theme = medalColor(index, unlocked);
  return (
    <div className="flex flex-col items-center text-center min-w-0">
      <div
        className={`relative w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-[18px] flex items-center justify-center shadow-[0_8px_16px_rgba(96,45,0,0.14)] ${unlocked ? '' : 'opacity-85'}`}
        style={{ background: theme.bg, clipPath: 'polygon(50% 0%, 88% 15%, 100% 52%, 78% 100%, 50% 86%, 22% 100%, 0 52%, 12% 15%)' }}
      >
        {unlocked ? (
          <AssetIcon icon={icon} className="w-6 h-6 sm:w-8 sm:h-8" framed={false} />
        ) : (
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(31,41,55,0.08)]">
            <LockedGlyph className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
        )}
      </div>
      <div className="mt-2 text-xs font-black text-gray-900 truncate w-full">{title}</div>
      <div className="mt-0.5 text-[10px] font-bold text-gray-400 truncate w-full">{condition}</div>
    </div>
  );
}

export function ShieldBadge({
  icon,
  title,
  condition,
  unlocked,
  index = 0,
}: {
  icon: string;
  title: string;
  condition: string;
  unlocked: boolean;
  index?: number;
}) {
  const theme = medalColor(index, unlocked);
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div
        className={`relative flex h-[58px] w-[54px] items-center justify-center rounded-[18px] ${
          unlocked
            ? 'shadow-[0_10px_20px_rgba(249,115,22,0.16),0_0_18px_rgba(249,180,0,0.18)]'
            : 'opacity-85 shadow-[0_8px_16px_rgba(31,41,55,0.08)]'
        }`}
        style={{ background: theme.bg, clipPath: 'polygon(50% 0%, 88% 15%, 100% 52%, 78% 100%, 50% 86%, 22% 100%, 0 52%, 12% 15%)' }}
      >
        {unlocked ? (
          <AssetIcon icon={icon} className="h-7 w-7" framed={false} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_10px_rgba(31,41,55,0.08)]">
            <LockedGlyph className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="mt-2 w-full truncate text-xs font-black text-gray-900">{title}</div>
      <div className="mt-0.5 w-full truncate text-[10px] font-bold text-gray-400">{condition}</div>
    </div>
  );
}

export function daysUntil(date: string) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
