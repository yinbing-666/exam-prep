import { GeetestResult } from '../components/GeetestCaptcha';

const TOKEN_KEY = 'exam_token';
const USER_KEY = 'exam_user';
const COOKIE_TOKEN_KEY = 'exam_token_backup';

// Cookie 工具函数
function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax;Secure`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function removeCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export interface AuthUser {
  user_id: string;
  nickname: string;
}

let currentToken: string | null = null;
let currentUser: AuthUser | null = null;

// 初始化时从 localStorage 或 cookie 加载
export function initAuth() {
  // 优先从 localStorage 读取
  currentToken = localStorage.getItem(TOKEN_KEY);
  
  // 如果 localStorage 没有，从 cookie 读取备份
  if (!currentToken) {
    const cookieToken = getCookie(COOKIE_TOKEN_KEY);
    if (cookieToken) {
      currentToken = cookieToken;
      // 恢复到 localStorage
      localStorage.setItem(TOKEN_KEY, cookieToken);
    }
  }
  
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
    } catch {
      currentUser = null;
    }
  }
}

export function getToken(): string | null {
  return currentToken;
}

export function getUser(): AuthUser | null {
  return currentUser;
}

export function isLoggedIn(): boolean {
  return !!currentToken;
}

export function logout() {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  removeCookie(COOKIE_TOKEN_KEY);
}

async function safeJson(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    console.error('[auth] 非JSON响应:', resp.status, text.slice(0, 200));
    throw new Error(`服务器响应异常 (${resp.status})`);
  }
}

export async function login(username: string, password: string, captcha?: GeetestResult): Promise<AuthUser> {
  const body: any = { username, password };
  if (captcha) {
    body.captcha_output = captcha.captcha_output;
    body.gen_time = captcha.gen_time;
    body.lot_number = captcha.lot_number;
    body.pass_token = captcha.pass_token;
  }

  const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await safeJson(resp);
  if (!resp.ok) throw new Error(data.detail || data.message || '登录失败，请检查用户名和密码');

  currentToken = data.token;
  currentUser = { user_id: data.user_id, nickname: data.nickname || username };
  
  // 同时保存到 localStorage 和 cookie
  localStorage.setItem(TOKEN_KEY, currentToken!);
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  setCookie(COOKIE_TOKEN_KEY, currentToken!);
  
  return currentUser;
}

export async function register(username: string, password: string, nickname?: string, captcha?: GeetestResult): Promise<AuthUser> {
  const body: any = { username, password, nickname: nickname || username };
  if (captcha) {
    body.captcha_output = captcha.captcha_output;
    body.gen_time = captcha.gen_time;
    body.lot_number = captcha.lot_number;
    body.pass_token = captcha.pass_token;
  }

  const resp = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await safeJson(resp);
  if (!resp.ok) throw new Error(data.detail || data.message || '注册失败');

  currentToken = data.token;
  currentUser = { user_id: data.user_id, nickname: data.nickname || username };
  
  // 同时保存到 localStorage 和 cookie
  localStorage.setItem(TOKEN_KEY, currentToken!);
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  setCookie(COOKIE_TOKEN_KEY, currentToken!);
  
  return currentUser;
}
