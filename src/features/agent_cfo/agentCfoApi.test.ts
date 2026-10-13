import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../shared/lib/supabase';
import { AgentCfoApiError, ingestDocument, listDocuments } from './agentCfoApi';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('agentCfoApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends the document fields as multipart form data and validates the 201 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id_documento: 'doc-1', url_storage: 'CFO_PDFs/doc-1.pdf' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' });

    const result = await ingestDocument({
      file,
      titulo: 'Annual report',
      tipo_documento: 'Memoria anual',
      departamento_origen: 'Finanzas',
      fecha_emision: '2026-01-31',
      resumen_ejecutivo: '',
    });

    expect(result.id_documento).toBe('doc-1');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8000/api/documents/ingest');
    expect(options.method).toBe('POST');
    expect(options.headers).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
    const body = options.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('titulo')).toBe('Annual report');
    expect(body.get('tipo_documento')).toBe('Memoria anual');
    expect(body.get('departamento_origen')).toBe('Finanzas');
    expect(body.get('fecha_emision')).toBe('2026-01-31');
    expect(body.has('resumen_ejecutivo')).toBe(false);
  });

  it('reports missing API configuration instead of calling a success-shaped fallback', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(ingestDocument({
      file: new File(['pdf'], 'report.pdf', { type: 'application/pdf' }),
      titulo: 'Report',
      tipo_documento: 'Balance',
      departamento_origen: 'Finance',
      fecha_emision: '2026-01-31',
      resumen_ejecutivo: '',
    })).rejects.toMatchObject({ kind: 'configuration' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps invalid-PDF responses to an explicit API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));

    await expect(ingestDocument({
      file: new File(['not a pdf'], 'report.pdf', { type: 'application/pdf' }),
      titulo: 'Report',
      tipo_documento: 'Balance',
      departamento_origen: 'Finance',
      fecha_emision: '2026-01-31',
      resumen_ejecutivo: '',
    })).rejects.toMatchObject({ kind: 'invalidPdf', status: 422 });
  });

  it('queries Supabase documents newest first and validates returned records', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{
        id_documento: 'doc-1',
        titulo: 'Annual report',
        tipo_documento: 'Memoria anual',
        departamento_origen: 'Finanzas',
        fecha_emision: '2026-01-31',
        resumen_ejecutivo: null,
        url_storage: 'CFO_PDFs/doc-1.pdf',
        created_at: '2026-02-01T12:00:00Z',
      }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    vi.mocked(supabase.from).mockReturnValue({ select } as never);

    const documents = await listDocuments();

    expect(supabase.from).toHaveBeenCalledWith('documentos');
    expect(select).toHaveBeenCalledWith(
      'id_documento, titulo, tipo_documento, departamento_origen, fecha_emision, resumen_ejecutivo, url_storage, created_at',
    );
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(documents).toHaveLength(1);
  });

  it('surfaces Supabase read failures', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS denied' } });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ order }),
    } as never);

    await expect(listDocuments()).rejects.toBeInstanceOf(AgentCfoApiError);
    await expect(listDocuments()).rejects.toMatchObject({ kind: 'list' });
  });
});
