import { useEffect, useRef, useState, useCallback } from 'react';

// 极验4.0全局类型声明
declare global {
  interface Window {
    initGeetest4?: (config: any, callback: (captchaObj: any) => void) => void;
  }
}

export interface GeetestResult {
  captcha_output: string;
  gen_time: string;
  lot_number: string;
  pass_token: string;
}

interface GeetestProps {
  onSuccess: (result: GeetestResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  type?: 'login' | 'register';
}

export default function GeetestCaptcha({ onSuccess, onError, disabled, type = 'login' }: GeetestProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captchaRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  // 加载极验SDK
  useEffect(() => {
    // 已经加载过
    if (window.initGeetest4) {
      setSdkLoaded(true);
      setReady(true);
      return;
    }

    // 检查是否已有script标签
    const existingScript = document.getElementById('gt4-sdk');
    if (existingScript) {
      // 等待加载完成
      const checkReady = setInterval(() => {
        if (window.initGeetest4) {
          setSdkLoaded(true);
          setReady(true);
          clearInterval(checkReady);
        }
      }, 100);
      setTimeout(() => clearInterval(checkReady), 10000); // 10秒超时
      return;
    }

    // 创建script标签
    const script = document.createElement('script');
    script.id = 'gt4-sdk';
    script.src = 'https://static.geetest.com/v4/gt4.js';
    script.async = true;
    
    script.onload = () => {
      console.log('极验SDK加载成功');
      setSdkLoaded(true);
      setReady(true);
    };
    
    script.onerror = (err) => {
      console.error('极验SDK加载失败:', err);
      setSdkError('极验SDK加载失败');
      onError?.('极验SDK加载失败');
      // SDK加载失败时，调用onError阻止表单提交，绝不调用onSuccess
    };
    
    document.head.appendChild(script);
    
    // 超时处理
    setTimeout(() => {
      if (!window.initGeetest4) {
        console.error('极验SDK加载超时');
        setSdkError('极验SDK加载超时');
        onError?.('极验SDK加载超时');
        // SDK加载超时时，调用onError阻止表单提交，绝不调用onSuccess
      }
    }, 15000);
  }, [onError, onSuccess]);

  // 初始化极验
  useEffect(() => {
    if (!ready || !containerRef.current || !window.initGeetest4) return;

    // 销毁旧实例
    if (captchaRef.current) {
      try {
        captchaRef.current.destroy?.();
      } catch (e) {
        console.warn('销毁旧极验实例失败:', e);
      }
    }
    setVerified(false);

    // 获取配置
    fetch(`/api/geetest/config?type=${type}`)
      .then(res => {
        if (!res.ok) throw new Error('获取配置失败');
        return res.json();
      })
      .then(config => {
        console.log('极验配置:', config);
        
        if (!config.enabled) {
          console.log('服务端未启用极验');
          onSuccess({
            captcha_output: 'bypass',
            gen_time: 'bypass',
            lot_number: 'bypass',
            pass_token: 'bypass',
          });
          return;
        }

        // 初始化极验 — 使用bind模式，用户点击容器触发
        window.initGeetest4?.({
          captchaId: config.captcha_id,
          product: 'bind',
          container: containerRef.current,
        }, (captchaObj: any) => {
          console.log('极验实例创建成功');
          captchaRef.current = captchaObj;

          captchaObj.onReady(() => {
            console.log('极验准备就绪');
          });

          captchaObj.onSuccess(() => {
            console.log('极验验证成功');
            const result = captchaObj.getValidate();
            console.log('验证结果:', result);
            setVerified(true);
            onSuccess({
              captcha_output: result.captcha_output,
              gen_time: result.gen_time,
              lot_number: result.lot_number,
              pass_token: result.pass_token,
            });
          });

          captchaObj.onError((err: any) => {
            console.error('极验错误:', err);
            onError?.(`验证出错: ${err.msg || '未知错误'}`);
          });

          captchaObj.onClose(() => {
            console.log('极验窗口关闭');
          });
        });
      })
      .catch(err => {
        console.error('获取极验配置失败:', err);
        setSdkError('获取验证码配置失败');
        onError?.('获取验证码配置失败');
      });

    return () => {
      try {
        captchaRef.current?.destroy?.();
      } catch (e) {
        console.warn('销毁极验实例失败:', e);
      }
    };
  }, [ready, type, onSuccess, onError]);

  const handleClick = useCallback(() => {
    if (disabled || verified) return;
    if (captchaRef.current) {
      captchaRef.current.showCaptcha?.();
    } else {
      console.warn('极验实例未就绪');
      onError?.('验证码尚未就绪');
    }
  }, [disabled, verified, onError]);

  // SDK 或配置加载失败时禁止提交，服务端不会接受客户端跳过标记。
  if (sdkError) {
    return (
      <div style={{
        padding: '12px',
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#92400e',
      }}>
        ⚠️ {sdkError}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        padding: '12px',
        background: '#f3f4f6',
        borderRadius: 8,
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '0.85rem',
      }}>
        ⏳ 加载验证组件...
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        onClick={handleClick}
        style={{
          padding: '12px',
          background: verified ? '#f0fdf4' : '#fff',
          border: `1px solid ${verified ? '#86efac' : '#e5e7eb'}`,
          borderRadius: 8,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {verified ? (
          <span style={{ color: '#166534', fontSize: '0.9rem' }}>✅ 验证通过</span>
        ) : (
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>🔒 点击完成验证</span>
        )}
      </div>
    </div>
  );
}
