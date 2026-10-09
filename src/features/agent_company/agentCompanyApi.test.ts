import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';
import { askCompanyAssistant, ChatApiError } from './agentCompanyApi';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('askCompanyAssistant', () => {
  const currentSession: Session = {
    access_token: 'current-user-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'refresh-token',
    user: {
      id: 'user-id',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: currentSession },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts the question and returns the validated reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        reply: 'Respuesta de prueba',
        modelUsed: 'gemini-3.1-flash-lite',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCompanyAssistant('Pregunta de prueba')).resolves.toBe('Respuesta de prueba');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer current-user-access-token',
        },
        body: JSON.stringify({ message: 'Pregunta de prueba' }),
      }),
    );
  });

  it('rejects invalid success payloads without exposing response details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, reply: '  ' }),
    }));

    await expect(askCompanyAssistant('Pregunta'))
      .rejects.toMatchObject<Partial<ChatApiError>>({ kind: 'response' });
  });

  it('does not automatically retry an HTTP error response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCompanyAssistant('Pregunta'))
      .rejects.toMatchObject<Partial<ChatApiError>>({ kind: 'server', status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transient network failure once', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, reply: 'Conexión recuperada' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCompanyAssistant('Pregunta')).resolves.toBe('Conexión recuperada');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not send a blank question', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCompanyAssistant('   '))
      .rejects.toMatchObject<Partial<ChatApiError>>({ kind: 'request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an active session before sending the question', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCompanyAssistant('Pregunta'))
      .rejects.toMatchObject<Partial<ChatApiError>>({ kind: 'auth' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an expired session before sending the question', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          ...currentSession,
          expires_at: Math.floor(Date.now() / 1000) - 1,
        },
      },
      error: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCompanyAssistant('Pregunta'))
      .rejects.toMatchObject<Partial<ChatApiError>>({ kind: 'auth' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an authentication error when the API rejects the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(askCompanyAssistant('Pregunta'))
      .rejects.toMatchObject<Partial<ChatApiError>>({ kind: 'auth', status: 401 });
  });
});
