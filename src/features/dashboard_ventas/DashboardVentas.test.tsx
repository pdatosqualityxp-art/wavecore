import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { supabase } from '../../shared/lib/supabase';
import DashboardVentas from './DashboardVentas';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('DashboardVentas', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id_venta: 'VEN0001',
            id_cliente: 'CLI0001',
            id_prod: 'PROD0001',
            unidades: 2,
            total_venta: '1800.00',
            fecha_venta: '2026-01-10',
            clientes: { nom_cliente: 'Café Central', poblacion_cliente: 'Barcelona' },
            productos: { nom_prod: 'Cafetera Espresso Pro 1' },
          },
          {
            id_venta: 'VEN0002',
            id_cliente: 'CLI0002',
            id_prod: 'PROD0002',
            unidades: 1,
            total_venta: '2400.00',
            fecha_venta: '2026-02-15',
            clientes: { nom_cliente: 'Hotel Gran Vía', poblacion_cliente: 'Madrid' },
            productos: { nom_prod: 'Cafetera Espresso Pro 2' },
          },
        ],
        error: null,
      }),
    } as never);
  });

  it('loads sales data and renders the dashboard summary', async () => {
    render(
      <LanguageProvider>
        <DashboardVentas />
      </LanguageProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Resumen comercial' })).toBeInTheDocument();
    expect(supabase.from).toHaveBeenCalledWith('ventas');
    expect(await screen.findByText('Café Central')).toBeInTheDocument();
    expect(screen.getByText('Facturación global')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top 5 localidades con más ventas' })).toBeInTheDocument();
    expect(screen.getByText('Barcelona')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('shows an error when sales data cannot be loaded', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied' },
      }),
    } as never);

    render(
      <LanguageProvider>
        <DashboardVentas />
      </LanguageProvider>,
    );

    expect(await screen.findByText('permission denied')).toBeInTheDocument();
  });
});
