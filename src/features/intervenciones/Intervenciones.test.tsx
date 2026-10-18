import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { fetchInterventions } from './intervencionesApi';
import Intervenciones from './Intervenciones';

vi.mock('./intervencionesApi', () => ({
  fetchInterventions: vi.fn(),
}));

const records = [
  {
    id_int: 'INT0053',
    fecha_aviso: '2026-08-13',
    fecha_int: '2025-08-27',
    estados_intervencion: { nom_estado: 'Pendiente' },
    clientes: { nom_cliente: 'Restaurante El Celler del Nord' },
    productos: { nom_prod: 'Peladora de Patatas 15kg' },
    servicios_intervencion: { nom_servicio: 'Mantenimiento' },
  },
  {
    id_int: 'INT0074',
    fecha_aviso: '2026-08-10',
    fecha_int: '2025-02-01',
    estados_intervencion: { nom_estado: 'En Proceso' },
    clientes: { nom_cliente: 'Comercial Hostelera Maresme' },
    productos: { nom_prod: 'Tostador de pan Industrial de Cintas' },
    servicios_intervencion: { nom_servicio: 'Mantenimiento' },
  },
  {
    id_int: 'INT0090',
    fecha_aviso: '2026-07-01',
    fecha_int: '2026-07-02',
    estados_intervencion: { nom_estado: 'Finalizada' },
    clientes: { nom_cliente: 'Restaurante El Celler del Nord' },
    productos: { nom_prod: 'Peladora de Patatas 15kg' },
    servicios_intervencion: { nom_servicio: 'Reparación' },
  },
];

function renderPage() {
  return render(<LanguageProvider><Intervenciones /></LanguageProvider>);
}

describe('Intervenciones', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows related intervention fields, local dates and semantic traffic-light statuses', async () => {
    vi.mocked(fetchInterventions).mockResolvedValue(records);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Listado de intervenciones' })).toBeInTheDocument();
    expect(screen.getAllByText('INT0053').length).toBeGreaterThan(0);
    expect(screen.getAllByText('13/08/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('27/08/2025').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Restaurante El Celler del Nord').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Peladora de Patatas 15kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mantenimiento').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Abierta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En curso').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Terminada').length).toBeGreaterThan(0);
    expect(document.querySelector('.ui-intervention-status-open')).toBeInTheDocument();
    expect(document.querySelector('.ui-intervention-status-progress')).toBeInTheDocument();
    expect(document.querySelector('.ui-intervention-status-completed')).toBeInTheDocument();
  });

  it('sorts the visible interventions by notice date descending', async () => {
    vi.mocked(fetchInterventions).mockResolvedValue([...records].reverse());
    renderPage();
    await screen.findByRole('heading', { name: 'Listado de intervenciones' });

    const rows = screen.getByRole('table').querySelectorAll('tbody tr');
    const ids = Array.from(rows, (row) => row.querySelectorAll('td')[1]?.textContent);
    expect(ids).toEqual(['INT0053', 'INT0074', 'INT0090']);
  });

  it('combines status, customer, product and partial case-insensitive ID filters', async () => {
    vi.mocked(fetchInterventions).mockResolvedValue(records);
    renderPage();
    await screen.findByRole('heading', { name: 'Listado de intervenciones' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'open' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: 'restaurante el celler del nord' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Producto' }), { target: { value: 'peladora de patatas 15kg' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar por ID de intervención' }), { target: { value: 't005' } });

    expect(screen.getAllByText('INT0053').length).toBeGreaterThan(0);
    expect(screen.queryByText('INT0074')).not.toBeInTheDocument();
    expect(screen.queryByText('INT0090')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(screen.getAllByText('INT0074').length).toBeGreaterThan(0));
  });

  it('distinguishes loading, request errors, no source records and no filter matches', async () => {
    let resolveRequest: (value: typeof records) => void = () => undefined;
    vi.mocked(fetchInterventions).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando intervenciones');
    resolveRequest(records);
    await screen.findAllByText('INT0053');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar por ID de intervención' }), { target: { value: 'missing' } });
    expect(screen.getByText('No hay intervenciones que coincidan con los filtros.')).toBeInTheDocument();

    cleanup();
    vi.mocked(fetchInterventions).mockRejectedValue(new Error('network failure'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las intervenciones.');

    cleanup();
    vi.mocked(fetchInterventions).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No hay intervenciones registradas.')).toBeInTheDocument();
  });
});
