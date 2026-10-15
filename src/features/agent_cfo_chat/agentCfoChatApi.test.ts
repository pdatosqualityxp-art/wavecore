import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentCfoChatApiError, askCfoAgent } from './agentCfoChatApi';

describe('agentCfoChatApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000/');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts a question to the CFO agent and validates the answer and sources', async () => {
    const reply = {
      answer: 'Las ventas fueron de 125.000 €.',
      model: 'gemini-3.5-flash-lite',
      sources: [{
        id: 'source-1',
        type: 'sales',
        reference: 'Ventas del cuarto trimestre',
        details: { period: '2025-Q4' },
      }],
      consulted_sources: [{ type: 'table', reference: 'ventas (informe agregado)' }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => reply,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(askCfoAgent(' ¿Cuáles fueron las ventas? ')).resolves.toEqual(reply);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8000/api/agent_cfo');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBe(JSON.stringify({ question: '¿Cuáles fueron las ventas?' }));
  });

  it('accepts product catalog sources', async () => {
    const reply = {
      answer: 'Hay productos en el catálogo.\n\nModelo utilizado: gemini-3.5-flash-lite',
      model: 'gemini-3.5-flash-lite',
      sources: [{
        id: 'source-1',
        type: 'products',
        reference: 'Producto: Cafetera',
        details: { id_prod: 'P1', nom_prod: 'Cafetera' },
      }],
      consulted_sources: [{ type: 'table', reference: 'productos' }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => reply,
    }));

    await expect(askCfoAgent('¿Puedes ver los productos?')).resolves.toEqual(reply);
  });

  it('accepts direct business table sources', async () => {
    const reply = {
      answer: 'Hay almacenes.\n\nModelo utilizado: gemini-3.5-flash-lite',
      model: 'gemini-3.5-flash-lite',
      sources: [{
        id: 'source-1',
        type: 'table',
        reference: 'almacen: A1',
        details: { table: 'almacen', id_alm: 'A1' },
      }],
      consulted_sources: [{ type: 'table', reference: 'almacen' }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => reply,
    }));

    await expect(askCfoAgent('¿Puedes ver los almacenes?')).resolves.toEqual(reply);
  });

  it('rejects malformed consulted source locations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        answer: 'Respuesta.',
        model: 'gemini-3.5-flash-lite',
        sources: [],
        consulted_sources: [{ type: 'database', reference: 'ventas' }],
      }),
    }));

    await expect(askCfoAgent('consulta')).rejects.toMatchObject({ kind: 'response' });
  });

  it('reports missing configuration and invalid requests explicitly', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_API_BASE_URL', '');

    await expect(askCfoAgent('consulta')).rejects.toMatchObject({ kind: 'configuration' });
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000');
    await expect(askCfoAgent('   ')).rejects.toMatchObject({ kind: 'request' });
    await expect(askCfoAgent('q'.repeat(2001))).rejects.toMatchObject({ kind: 'request' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps HTTP failures and rejects malformed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    await expect(askCfoAgent('consulta')).rejects.toMatchObject({
      kind: 'server',
      status: 502,
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ answer: 'Respuesta sin fuentes válidas', sources: [{}] }),
    }));
    await expect(askCfoAgent('consulta')).rejects.toBeInstanceOf(AgentCfoChatApiError);
    await expect(askCfoAgent('consulta')).rejects.toMatchObject({ kind: 'response' });
  });

  it('reports an explicit timeout when the request is aborted', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));

    const request = askCfoAgent('consulta');
    const timeoutAssertion = expect(request).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(120_000);
    await timeoutAssertion;
  });
});
