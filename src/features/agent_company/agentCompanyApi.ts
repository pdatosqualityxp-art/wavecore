import { supabase } from '../../shared/lib/supabase';

const REQUEST_TIMEOUT_MS = 55_000;
const MAX_NETWORK_ATTEMPTS = 2;
const CHAT_API_PATH = '/api/chat';

export type ChatApiErrorKind = 'auth' | 'network' | 'timeout' | 'request' | 'response' | 'server';

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

  let accessToken: string;
  try {
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (
      error
      || !session?.access_token
      || (session.expires_at !== undefined && session.expires_at <= Date.now() / 1000)
    ) {
      throw new ChatApiError('auth');
    }
    accessToken = session.access_token;
  } catch {
    throw new ChatApiError('auth');
  }

  for (let attempt = 0; attempt < MAX_NETWORK_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(CHAT_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const kind = response.status === 400
          ? 'request'
          : response.status === 401
            ? 'auth'
            : 'server';
        throw new ChatApiError(kind, response.status);
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
