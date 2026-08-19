// AI客户端层：Provider配置 + 通用API调用
// 职责：管理模型提供商、API Key、发起HTTP请求

import { KnowledgeModule, Question } from '../types';
import { getToken, handleUnauthorized } from '../stores/auth';

export interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: { id: string; name: string }[];
  builtin?: boolean;  // 内置选项不可删除
}

const BUILTIN_AI_API_BASE = import.meta.env.VITE_AI_API_BASE?.trim() ?? '';
const BUILTIN_AI_MODEL = import.meta.env.VITE_AI_MODEL?.trim() ?? '';

// 内置服务配置（不可删除；由构建环境提供）
const BUILTIN_PROVIDER: ModelProvider = {
  id: 'builtin-ai',
  name: '内置 AI 服务',
  baseUrl: BUILTIN_AI_API_BASE,
  apiKey: '',  // 不硬编码：登录用户走后端 /api/ai/chat 代理；未登录不可用
  models: BUILTIN_AI_MODEL
    ? [{ id: BUILTIN_AI_MODEL, name: BUILTIN_AI_MODEL }]
    : [],
  builtin: true,
};

const STORAGE_KEY = 'exam-prep-model-config';
// API Key 单独存储（providerId → apiKey），不与其他配置同桶，降低 localStorage 明文泄露面
const KEYS_STORAGE_KEY = 'exam-prep-model-config-keys';

export function getProviders(): ModelProvider[] {
  let customs: ModelProvider[] = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) customs = JSON.parse(saved);
    // 组装时从独立 key 存储恢复 apiKey
    customs = customs.map((p) => ({ ...p, apiKey: readApiKey(p.id) }));
  } catch {}
  return [BUILTIN_PROVIDER, ...customs];
}

export function getCustomProviders(): ModelProvider[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved).map((p: any) => ({ ...p, apiKey: readApiKey(p.id) }));
  } catch {}
  return [];
}

function readApiKey(providerId: string): string {
  try {
    const keys = JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) || '{}');
    return keys[providerId] ?? '';
  } catch { return ''; }
}

export function saveCustomProviders(providers: ModelProvider[]) {
  // 剥离 apiKey 后存配置，apiKey 单独存
  const stripped = providers.map(({ apiKey, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  const keys: Record<string, string> = {};
  for (const p of providers) if (p.apiKey) keys[p.id] = p.apiKey;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function addCustomProvider(): ModelProvider {
  const customs = getCustomProviders();
  const newP: ModelProvider = {
    id: `custom-${Date.now()}`,
    name: `自定义模型 ${customs.length + 1}`,
    baseUrl: '',
    apiKey: '',
    models: [],
  };
  customs.push(newP);
  saveCustomProviders(customs);
  return newP;
}

export function saveProviderConfig(providerId: string, updates: Partial<ModelProvider>) {
  const customs = getCustomProviders();
  const p = customs.find(pr => pr.id === providerId);
  if (p) {
    Object.assign(p, updates);
    saveCustomProviders(customs);
  }
}

export function deleteCustomProvider(providerId: string) {
  const customs = getCustomProviders().filter(p => p.id !== providerId);
  saveCustomProviders(customs);
  // 清理对应 key
  try {
    const keys = JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) || '{}');
    delete keys[providerId];
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch {}
}

export function saveApiKey(providerId: string, apiKey: string) {
  saveProviderConfig(providerId, { apiKey });
}

// 通用AI调用（所有生成函数共用）
export async function callAI(
  providerId: string,
  modelId: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const providers = getProviders();
  const provider = providers.find(p => p.id === providerId);
  if (!provider) throw new Error(`未知模型提供商: ${providerId}`);

  // 内置提供商：登录用户走后端中转（保护后端 Key）；未登录不可用
  if (provider.builtin) {
    const token = getToken();
    if (!token) {
      throw new Error('请先登录后使用内置模型，或在设置中配置自定义模型');
    }
    const resp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
      }),
    });
    if (!resp.ok) {
      if (resp.status === 401) handleUnauthorized();
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `API error: ${resp.status}`);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || data.content;
    if (typeof content !== 'string' || !content) {
      throw new Error('模型返回了无法解析的响应');
    }
    return content;
  }

  // 自定义提供商：始终直接调用（用自己的 Key），不依赖登录态
  if (!provider.apiKey) {
    throw new Error(`请先在设置中配置 ${provider.name} 的 API Key`);
  }
  const resp = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
    }),
  });

  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) {
    throw new Error('模型返回了无法解析的响应');
  }
  return content;
}
