const DEFAULT_PRODUCTION_URL = 'https://wavecore-api-company.vercel.app';
const REQUEST_TIMEOUT_MS = 55_000;
const MAX_NETWORK_ATTEMPTS = 2;

export type ChatApiErrorKind = 'network' | 'timeout' | 'request' | 'response' | 'server';

export class ChatApiError extends Error {
  constructor(readonly kind: ChatApiErrorKind, readonly status?: number) {
    super(`Company assistant request failed: ${kind}`);
    this.name = 'ChatApiError';
  }
}

type ChatResponse = {
  success: true;
  reply: string;
};

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_AGENT_COMPANY_API_URL;
  const baseUrl = configuredUrl?.trim() || DEFAULT_PRODUCTION_URL;
  return baseUrl.replace(/\/+$/, '');
}

function isChatResponse(value: unknown): value is ChatResponse {
  return typeof value === 'object'
    && value !== null
    && 'success' in value
    && value.success === true
    && 'reply' in value
    && typeof value.reply === 'string'
    && value.reply.trim().length > 0;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function askCompanyAssistant(message: string): Promise<string> {
  if (!message.trim()) {
    throw new ChatApiError('request');
  }

  for (let attempt = 0; attempt < MAX_NETWORK_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ChatApiError(response.status === 400 ? 'request' : 'server', response.status);
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new ChatApiError('response');
      }

      if (!isChatResponse(data)) {
        throw new ChatApiError('response');
      }

      return data.reply;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new ChatApiError('timeout');
      }

      if (error instanceof TypeError && attempt + 1 < MAX_NETWORK_ATTEMPTS) {
        await wait(250 * (2 ** attempt));
        continue;
      }

      throw new ChatApiError('network');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new ChatApiError('network');
}
