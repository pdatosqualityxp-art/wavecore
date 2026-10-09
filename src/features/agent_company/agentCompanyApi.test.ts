import { afterEach, describe, expect, it, vi } from 'vitest';
import { askCompanyAssistant, ChatApiError } from './agentCompanyApi';

describe('askCompanyAssistant', () => {
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
      'https://wavecore-api-company.vercel.app/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
});
