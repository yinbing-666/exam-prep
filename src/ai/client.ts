// AI客户端层：Provider配置 + 通用API调用
// 职责：管理模型提供商、API Key、发起HTTP请求

import { KnowledgeModule, Question } from '../types';
import { getToken } from '../stores/auth';

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

export function getProviders(): ModelProvider[] {
  let customs: ModelProvider[] = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) customs = JSON.parse(saved);
  } catch {}
  return [BUILTIN_PROVIDER, ...customs];
}

export function getCustomProviders(): ModelProvider[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function saveCustomProviders(providers: ModelProvider[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
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
  // 如果用户已登录，走后端中转（保护API Key）
  const token = getToken();
  if (token) {
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
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `API error: ${resp.status}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || data.content || JSON.stringify(data);
  }

  // 未登录：保持原有直接调用逻辑
  const providers = getProviders();
  const provider = providers.find(p => p.id === providerId);
  if (!provider) throw new Error(`未知模型提供商: ${providerId}`);
  if (!provider.apiKey) {
    if (provider.builtin) {
      throw new Error('请先登录后使用内置模型，或在设置中配置自定义模型');
    }
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
  return data.choices[0].message.content;
}
