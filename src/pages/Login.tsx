import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { login, register } from '../stores/auth';
import { PageShell, Card } from '../components/TargetUI';
import GeetestCaptcha, { GeetestResult } from '../components/GeetestCaptcha';

type Tab = 'login' | 'register';

export default function Login({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaResult, setCaptchaResult] = useState<GeetestResult | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);

  function clearForm() {
    setUsername('');
    setPassword('');
    setConfirm('');
    setNickname('');
    setError('');
    setCaptchaResult(null);
    setCaptchaFailed(false);
  }

  function switchTab(t: Tab) {
    clearForm();
    setTab(t);
  }

  const handleCaptchaSuccess = useCallback((result: GeetestResult) => {
    setCaptchaResult(result);
  }, []);

  const handleCaptchaError = useCallback((err: string) => {
    console.error('极验错误:', err);
    setCaptchaResult(null);
    setCaptchaFailed(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('请输入用户名'); return; }
    if (!password) { setError('请输入密码'); return; }
    if (tab === 'register') {
      if (password.length < 6) { setError('密码至少6位'); return; }
      if (password !== confirm) { setError('两次密码不一致'); return; }
    }

    if (!captchaResult || captchaFailed) {
      setError('请先完成人机验证');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username.trim(), password, captchaResult);
      } else {
        await register(username.trim(), password, nickname.trim() || undefined, captchaResult);
      }
      onDone();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="px-6 pt-16 pb-8">
        {/* Logo区 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-3">📚</div>
          <h1 className="text-3xl font-black text-white drop-shadow-md tracking-widest">逢考必过</h1>
          <p className="text-white/80 text-sm font-bold mt-1">学习好帮手，考试不发愁</p>
        </motion.div>

        {/* Tab切换 */}
        <div className="flex bg-white/30 backdrop-blur rounded-2xl p-1 mb-6">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === t
                  ? 'bg-white text-[#f97316] shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {t === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {/* 表单 */}
        <AnimatePresence mode="wait">
          <motion.form
            key={tab}
            initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/90 backdrop-blur border-2 border-white/30 
                         text-gray-800 placeholder-gray-400 font-bold
                         focus:border-[#f97316] focus:outline-none transition-colors"
              />
            </div>

            {tab === 'register' && (
              <div>
                <input
                  type="text"
                  placeholder="昵称（选填）"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/90 backdrop-blur border-2 border-white/30 
                           text-gray-800 placeholder-gray-400 font-bold
                           focus:border-[#f97316] focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/90 backdrop-blur border-2 border-white/30 
                         text-gray-800 placeholder-gray-400 font-bold
                         focus:border-[#f97316] focus:outline-none transition-colors"
              />
            </div>

            {tab === 'register' && (
              <div>
                <input
                  type="password"
                  placeholder="确认密码"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/90 backdrop-blur border-2 border-white/30 
                           text-gray-800 placeholder-gray-400 font-bold
                           focus:border-[#f97316] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* 极验验证码 — 根据tab切换类型 */}
            <GeetestCaptcha
              key={tab}  // 切换tab时重新加载
              onSuccess={handleCaptchaSuccess}
              onError={handleCaptchaError}
              disabled={loading}
              type={tab}  // 'login' 或 'register'
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-200 text-sm font-bold text-center bg-red-500/20 rounded-lg py-2"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !captchaResult}
              className="w-full py-3.5 rounded-xl bg-white text-[#f97316] font-black text-lg
                       shadow-lg shadow-orange-500/30 
                       hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02]
                       active:scale-95 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : tab === 'login' ? '登录' : '注册'}
            </button>
          </motion.form>
        </AnimatePresence>

        {/* 底部 */}
        <p className="text-center text-white/60 text-xs mt-6">
          {tab === 'login' ? '没有账号？' : '已有账号？'}
          <button
            onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
            className="text-white font-bold underline underline-offset-2 ml-1"
          >
            {tab === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
      </div>
    </PageShell>
  );
}
