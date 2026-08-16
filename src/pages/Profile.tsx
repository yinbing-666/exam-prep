import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getProfile, getAchievements } from '../stores/gamification';
import { UserProfile, Achievement, getXpForLevel } from '../types/gamification';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, a] = await Promise.all([getProfile(), getAchievements()]);
      setProfile(p);
      setAchievements(a);
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const accuracy = profile && profile.totalQuestions > 0 
    ? Math.round(profile.correctCount / profile.totalQuestions * 100) 
    : 0;

  const xpProgress = profile 
    ? Math.round(profile.xp / profile.xpToNext * 100) 
    : 0;

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e8e2db',
    padding: '20px',
    marginBottom: 16,
  };

  const settings = [
    { icon: '👤', label: '个人资料', path: '/profile/edit' },
    { icon: '📊', label: '学习统计', path: '/stats' },
    { icon: '🔔', label: '通知设置', path: '/notifications' },
    { icon: '🎨', label: '主题设置', path: '/theme' },
    { icon: '💾', label: '数据管理', path: '/data' },
    { icon: 'ℹ️', label: '关于', path: '/about' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      paddingBottom: 80,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '32px 20px 0' }}
      >
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#2d2d2d',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          我的
        </h1>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          加载中...
        </div>
      ) : profile ? (
        <>
          {/* 用户卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ padding: '20px' }}
          >
            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              color: '#fff',
              border: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                }}>
                  👤
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.nickname}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Lv.{profile.level} 学习者</div>
                </div>
              </div>

              {/* XP进度条 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                  <span>经验</span>
                  <span>{profile.xp}/{profile.xpToNext} XP</span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  height: 8,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${xpProgress}%`,
                    height: '100%',
                    background: '#fff',
                    borderRadius: 8,
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>

              {/* 统计数据 */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.totalQuestions}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>答题</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{accuracy}%</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>正确率</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.streak}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>连续打卡</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 成就 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ padding: '0 20px' }}
          >
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d' }}>
                  🏆 成就
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {unlockedCount}/{achievements.length} 已解锁
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {achievements.map((a) => (
                  <div key={a.id} style={{
                    textAlign: 'center',
                    padding: '12px 4px',
                    background: a.unlocked ? '#fef3c7' : '#f9fafb',
                    borderRadius: 12,
                    opacity: a.unlocked ? 1 : 0.5,
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{a.icon}</div>
                    <div style={{ fontSize: '0.65rem', color: a.unlocked ? '#92400e' : '#9ca3af', lineHeight: 1.3 }}>
                      {a.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 设置菜单 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ padding: '0 20px' }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', marginBottom: 16 }}>
                ⚙️ 设置
              </div>
              {settings.map((item, index) => (
                <div
                  key={index}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: index < settings.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.9rem', color: '#2d2d2d' }}>{item.label}</span>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>›</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>❌</div>
          加载用户数据失败
        </div>
      )}
    </div>
  );
};

export default Profile;
