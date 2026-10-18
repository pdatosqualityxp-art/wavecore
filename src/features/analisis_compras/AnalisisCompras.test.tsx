import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { supabase } from '../../shared/lib/supabase';
import AnalisisCompras from './AnalisisCompras';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const purchases = [
  {
    id_compra: 'C1', id_prov_compo: 'P1', id_compo: 'K1', unidades_compra: 10, total_compra: '1000.00', fecha_compra: '2025-03-10',
    proveedores_compo: { nom_prov_compo: 'Hornos Ibérica' }, componentes: { nom_compo: 'Resistencia' },
  },
  {
    id_compra: 'C2', id_prov_compo: 'P2', id_compo: 'K1', unidades_compra: 30, total_compra: 2000, fecha_compra: '2026-01-05',
    proveedores_compo: { nom_prov_compo: 'Frío Industrial' }, componentes: { nom_compo: 'Resistencia' },
  },
  {
    id_compra: 'C3', id_prov_compo: 'P1', id_compo: 'K2', unidades_compra: 20, total_compra: 1000, fecha_compra: '2026-02-12',
    proveedores_compo: { nom_prov_compo: 'Hornos Ibérica' }, componentes: { nom_compo: 'Termostato' },
  },
];

const stock = [
  { id_compo: 'K1', id_alm: 'A1', unidades: 60, almacen: { nom_alm: 'Almacén Central' } },
  { id_compo: 'K2', id_alm: 'A1', unidades: 20, almacen: { nom_alm: 'Almacén Central' } },
  { id_compo: 'K1', id_alm: 'A2', unidades: 20, almacen: { nom_alm: 'Almacén Norte' } },
];

function mockTables(overrides: Record<string, unknown> = {}) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => ({
    select: vi.fn().mockResolvedValue(
      overrides[table] ?? { data: table === 'compras' ? purchases : stock, error: null },
    ),
  })) as never);
}

function renderPage() {
  return render(
    <LanguageProvider>
      <AnalisisCompras />
    </LanguageProvider>,
  );
}

describe('AnalisisCompras', () => {
  beforeEach(() => mockTables());

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads purchases and stock and renders KPIs and rankings', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Análisis de compras' })).toBeInTheDocument();
    expect(supabase.from).toHaveBeenCalledWith('compras');
    expect(supabase.from).toHaveBeenCalledWith('stock_compo');
    expect((await screen.findAllByText(/4\.?000,00/)).length).toBe(2);
    expect(screen.getAllByText('60')).toHaveLength(2);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getAllByText('Hornos Ibérica').length).toBeGreaterThan(0);
    expect(screen.getByText('Almacén Central')).toBeInTheDocument();
    expect(screen.getByText(/80,0% del stock total/)).toBeInTheDocument();
    expect(screen.getByText(/66,67/)).toBeInTheDocument();
  });

  it('renders animated bars with accessible values', async () => {
    const { container } = renderPage();
    await screen.findByText('Almacén Norte');

    expect(container.querySelectorAll('.ui-ranking-fill').length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('filters purchases by year and month but keeps stock unfiltered', async () => {
    renderPage();
    await screen.findByText('Almacén Norte');

    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2026' } });
    expect(screen.getAllByText(/3\.?000,00/).length).toBe(2);

    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2' } });
    expect(screen.getAllByText(/1\.?000,00/).length).toBeGreaterThan(0);
    expect(within(screen.getByRole('heading', { name: 'Stock actual por almacén' }).closest('section') as HTMLElement).getByText('Almacén Norte')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows an error when data cannot be loaded', async () => {
    mockTables({ compras: { data: null, error: { message: 'permission denied' } } });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los datos de compras.');
    expect(screen.getByText('permission denied')).toBeInTheDocument();
  });

  it('shows an empty state when there are no purchases', async () => {
    mockTables({ compras: { data: [], error: null } });
    renderPage();

    expect(await screen.findByText('No hay compras para el período seleccionado.')).toBeInTheDocument();
  });
});



