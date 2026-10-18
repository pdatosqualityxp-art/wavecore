import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../shared/context/AuthContext';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { AgentCfoApiError, getDocumentSignedUrl, ingestDocument, listDocuments, type DocumentRecord } from './agentCfoApi';
import AgentCFO from './AgentCFO';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./agentCfoApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agentCfoApi')>();
  return {
    ...actual,
    ingestDocument: vi.fn(),
    getDocumentSignedUrl: vi.fn(),
    listDocuments: vi.fn(),
  };
});

const savedDocument: DocumentRecord = {
  id_documento: 'doc-1',
  titulo: 'Informe anual',
  tipo_documento: 'Memoria anual',
  departamento_origen: 'Finanzas',
  fecha_emision: '2026-01-31',
  resumen_ejecutivo: 'Resumen del documento',
  url_storage: 'CFO_PDFs/doc-1.pdf',
  created_at: '2026-02-01T12:00:00Z',
};

function mockAuthUser(isAnonymous: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'test-user',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
      is_anonymous: isAnonymous,
    } as User,
    profile: null,
    profileStatus: 'loaded',
    isLoading: false,
  });
}

describe('AgentCFO', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthUser(false);
    vi.mocked(listDocuments).mockResolvedValue([]);
    vi.mocked(ingestDocument).mockResolvedValue({
      id_documento: savedDocument.id_documento,
      url_storage: savedDocument.url_storage,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderPage() {
    return render(
      <LanguageProvider>
        <AgentCFO />
      </LanguageProvider>,
    );
  }

  function submitUploadForm() {
    const form = screen.getByRole('button', { name: 'Enviar documento' }).closest('form');
    if (!form) {
      throw new Error('Upload form was not rendered');
    }
    fireEvent.submit(form);
  }

  it('shows the repository empty state and opens the upload form', async () => {
    renderPage();

    expect(await screen.findByText('Todavía no hay documentos subidos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    expect(screen.getByRole('heading', { name: 'Añadir documento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Archivo PDF')).toHaveAttribute('accept', '.pdf,application/pdf');
  });

  it('hides the submit button and blocks PDF uploads for anonymous users', async () => {
    mockAuthUser(true);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Subir documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Función no permitida para invitado.');
    expect(screen.queryByRole('button', { name: 'Enviar documento' })).not.toBeInTheDocument();

    const form = screen.getByRole('heading', { name: 'Añadir documento' }).closest('section')?.querySelector('form');
    if (!form) {
      throw new Error('Upload form was not rendered');
    }
    fireEvent.submit(form);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it('submits a valid PDF and refreshes the Supabase-backed list', async () => {
    vi.mocked(listDocuments)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedDocument]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Subir documento' }));

    fireEvent.change(screen.getByLabelText('Archivo PDF'), {
      target: { files: [new File(['pdf'], 'annual.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Informe anual' } });
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'Memoria anual' } });
    fireEvent.change(screen.getByLabelText('Departamento de origen'), { target: { value: 'Finanzas' } });
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-01-31' } });
    fireEvent.change(screen.getByLabelText('Resumen ejecutivo (opcional)'), {
      target: { value: 'Resumen del documento' },
    });
    submitUploadForm();

    expect(await screen.findByRole('status')).toHaveTextContent('Documento enviado e indexado correctamente.');
    expect(ingestDocument).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Informe anual',
      tipo_documento: 'Memoria anual',
      departamento_origen: 'Finanzas',
      fecha_emision: '2026-01-31',
      resumen_ejecutivo: 'Resumen del documento',
    }));
    expect(await screen.findByText(/doc-1/)).toBeInTheDocument();
    expect(screen.getByText('Resumen del documento')).toBeInTheDocument();
    expect(listDocuments).toHaveBeenCalledTimes(2);
  });

  it('rejects PDFs over the configured limit without sending them', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Subir documento' }));
    const oversizedFile = new File(['pdf'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversizedFile, 'size', { configurable: true, value: 10_000_001 });
    fireEvent.change(screen.getByLabelText('Archivo PDF'), {
      target: { files: [oversizedFile] },
    });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Informe anual' } });
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'Memoria anual' } });
    fireEvent.change(screen.getByLabelText('Departamento de origen'), { target: { value: 'Finanzas' } });
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-01-31' } });
    submitUploadForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo debe ser un PDF de hasta 10 MB.');
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it('shows a translated validation message for missing required metadata', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Subir documento' }));
    submitUploadForm();

    expect(screen.getAllByRole('alert').map((alert) => alert.textContent).join(' '))
      .toContain('Completa todos los campos obligatorios.');
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it('opens the PDF viewer with a signed URL, and clears it on close', async () => {
    vi.mocked(listDocuments).mockResolvedValue([savedDocument, { ...savedDocument, id_documento: 'doc-2', titulo: 'Otro' }]);
    vi.mocked(getDocumentSignedUrl).mockResolvedValue({ signed_url: 'https://storage.example/signed?t=1', expires_in: 60 });
    renderPage();

    const trigger = await screen.findByRole('button', { name: 'Ver: Informe anual' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: /Vista previa: Informe anual/ });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const frame = await screen.findByTitle(/Visor PDF: Informe anual/);
    expect(frame).toHaveAttribute('src', 'https://storage.example/signed?t=1');
    expect(getDocumentSignedUrl).toHaveBeenCalledWith('CFO_PDFs/doc-1.pdf');
    expect(screen.getByRole('link', { name: 'Abrir en otra pestaña' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('button', { name: 'Ver: Otro' })).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('storage.example');
    expect(trigger).toHaveFocus();
    expect(listDocuments).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state, then an error with retry for the viewer', async () => {
    vi.mocked(listDocuments).mockResolvedValue([savedDocument]);
    let resolveFirst: (error: Error) => void = () => undefined;
    vi.mocked(getDocumentSignedUrl)
      .mockImplementationOnce(() => new Promise((_, reject) => { resolveFirst = reject; }))
      .mockResolvedValueOnce({ signed_url: 'https://storage.example/signed?t=2', expires_in: 60 });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver: Informe anual' }));
    expect(await screen.findByText('Solicitando acceso seguro al documento…')).toBeInTheDocument();

    resolveFirst(new AgentCfoApiError('network'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo contactar con la API');
    expect(screen.queryByTitle(/Visor PDF/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByTitle(/Visor PDF/)).toHaveAttribute('src', 'https://storage.example/signed?t=2');
    expect(getDocumentSignedUrl).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows list read failures distinctly from an empty repository', async () => {
    vi.mocked(listDocuments).mockRejectedValue(new AgentCfoApiError('list'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo leer el repositorio. Comprueba la conexión y los permisos de Supabase.',
    );
    expect(screen.queryByText('Todavía no hay documentos subidos.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));
    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  });

  it('does not automatically retry failed ingestions', async () => {
    vi.mocked(ingestDocument).mockRejectedValue(new AgentCfoApiError('server'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Subir documento' }));
    fireEvent.change(screen.getByLabelText('Archivo PDF'), {
      target: { files: [new File(['pdf'], 'annual.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Informe anual' } });
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'Memoria anual' } });
    fireEvent.change(screen.getByLabelText('Departamento de origen'), { target: { value: 'Finanzas' } });
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-01-31' } });
    submitUploadForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La API no pudo completar la ingesta. No reenvíes automáticamente; comprueba el listado antes de intentarlo de nuevo.',
    );
    expect(ingestDocument).toHaveBeenCalledTimes(1);
  });
});
