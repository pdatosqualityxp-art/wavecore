const REQUEST_TIMEOUT_MS = 120_000;
const CHAT_API_PATH = '/api/agent_cfo';
export const MAX_QUESTION_LENGTH = 2000;

export type CfoSourceType =
  | 'pdf'
  | 'products'
  | 'table'
  | 'sales'
  | 'purchases'
  | 'stock';

export type CfoSource = {
  id: string;
  type: CfoSourceType;
  reference: string;
  details: Record<string, unknown>;
};

export type CfoConsultedSource = {
  type: 'pdf' | 'table';
  reference: string;
};

export type CfoAgentReply = {
  answer: string;
  model: string;
  sources: CfoSource[];
  consulted_sources: CfoConsultedSource[];
};

export type AgentCfoChatErrorKind =
  | 'configuration'
  | 'network'
  | 'timeout'
  | 'request'
  | 'auth'
  | 'response'
  | 'server';

export class AgentCfoChatApiError extends Error {
  constructor(readonly kind: AgentCfoChatErrorKind, readonly status?: number) {
    super(`CFO agent request failed: ${kind}`);
    this.name = 'AgentCfoChatApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCfoSource(value: unknown): value is CfoSource {
  return isRecord(value)
    && typeof value.id === 'string'
    && (
      value.type === 'pdf'
      || value.type === 'products'
      || value.type === 'table'
      || value.type === 'sales'
      || value.type === 'purchases'
      || value.type === 'stock'
    )
    && typeof value.reference === 'string'
    && isRecord(value.details);
}

function isCfoConsultedSource(value: unknown): value is CfoConsultedSource {
  return isRecord(value)
    && (value.type === 'pdf' || value.type === 'table')
    && typeof value.reference === 'string';
}

function isCfoAgentReply(value: unknown): value is CfoAgentReply {
  return isRecord(value)
    && typeof value.answer === 'string'
    && value.answer.trim().length > 0
    && typeof value.model === 'string'
    && Array.isArray(value.sources)
    && value.sources.every(isCfoSource)
    && Array.isArray(value.consulted_sources)
    && value.consulted_sources.every(isCfoConsultedSource);
}

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new AgentCfoChatApiError('configuration');
  }

  try {
    const url = new URL(configuredUrl);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
      throw new AgentCfoChatApiError('configuration');
    }
  } catch (error) {
    if (error instanceof AgentCfoChatApiError) {
      throw error;
    }
    throw new AgentCfoChatApiError('configuration');
  }

  return configuredUrl.replace(/\/+$/, '');
}

export async function askCfoAgent(question: string): Promise<CfoAgentReply> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion || trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    throw new AgentCfoChatApiError('request');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}${CHAT_API_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof AgentCfoChatApiError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new AgentCfoChatApiError('timeout');
      }
      throw new AgentCfoChatApiError('network');
    }

    if (!response.ok) {
      const kind = response.status === 400 || response.status === 422
        ? 'request'
        : response.status === 401 || response.status === 403
          ? 'auth'
          : 'server';
      throw new AgentCfoChatApiError(kind, response.status);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (controller.signal.aborted) {
        throw new AgentCfoChatApiError('timeout');
      }
      throw new AgentCfoChatApiError('response', response.status);
    }

    if (!isCfoAgentReply(data)) {
      throw new AgentCfoChatApiError('response', response.status);
    }

    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}
