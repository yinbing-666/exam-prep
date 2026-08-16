import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameIcon } from './SharedUI';

// NOTE: This component requires src/utils/activation.ts to be restored
// with activateCode() and getDeviceId() exports for full functionality.

interface Props { onSuccess: () => void; }

export default function ActivationModal({ onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    if (!code.trim()) { setError('请输入激活码'); return; }
    setLoading(true); setError('');
    try {
      const { activateCode, getDeviceId } = await import('../utils/activation');
      const result = await activateCode(code.trim().toUpperCase(), getDeviceId());
      setLoading(false);
      if (result.ok) onSuccess();
      else setError(result.message || '激活验证未通过，请检查后重试');
    } catch {
      setLoading(false);
      setError('激活模块未加载，请联系管理员');
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 font-sans antialiased">
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="bg-white rounded-[32px] p-7 w-full max-w-[360px] shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-orange-50/30 flex flex-col items-center">
        <div className="icon-pod mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-orange-200/30 bg-gradient-to-b from-orange-50 to-orange-100/40 p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
          <GameIcon type="target" size="lg" className="animate-pulse" />
        </div>
        <h2 className="text-lg font-[900] text-gray-800 tracking-wide">{'造考必过系统激活'}</h2>
        <p className="text-xs font-bold text-gray-400 mt-1 text-center max-w-[220px] leading-relaxed">{'请输入专属特权激活码，一键解锁全系统核心仿真套卷与智能复习引擎。'}</p>
        <div className="w-full mt-6 space-y-2">
          <input type="text" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="XXXX-XXXX" maxLength={9} disabled={loading}
            className={'w-full p-3.5 border-2 rounded-2xl text-center text-base font-black uppercase tracking-[4px] bg-gray-50/50 focus:bg-white focus:outline-none transition-all duration-200 ' + (error ? 'border-red-400 focus:border-red-400' : 'border-orange-100 focus:border-orange-400')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleActivate(); }} />
          {error && <p className="text-[11px] font-black text-red-500 text-center">{error}</p>}
        </div>
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={handleActivate} disabled={loading}
          className="w-full mt-5 bg-gradient-to-r from-[#f97316] to-[#eab308] border-b-[4px] border-[#c2410c] active:border-b-0 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 text-sm tracking-[2px]">
          {loading ? '全真密码链验证中...' : '立 刻 激 活 🚀'}
        </motion.button>
        <p className="text-[10px] font-bold text-gray-400 mt-4 cursor-pointer hover:text-orange-500">{'获取兑换激活码，请联系客服通道'}</p>
      </motion.div>
    </div>
  );
}
