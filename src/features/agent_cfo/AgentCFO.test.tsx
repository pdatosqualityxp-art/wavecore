import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { AgentCfoApiError, ingestDocument, listDocuments, type DocumentRecord } from './agentCfoApi';
import AgentCFO from './AgentCFO';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('./agentCfoApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agentCfoApi')>();
  return {
    ...actual,
    ingestDocument: vi.fn(),
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

describe('AgentCFO', () => {
  beforeEach(() => {
    localStorage.clear();
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
