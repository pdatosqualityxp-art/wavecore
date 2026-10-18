import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { supabase } from '../../shared/lib/supabase';
import ControlServicios from './ControlServicios';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const interventions = [
  {
    id_int: 'INT-1',
    id_serv: 'SERV-M',
    id_estado: 'OPEN',
    id_cliente: 'CLIENT-1',
    id_pro_serv: 'PRS-1',
    id_prod: 'PROD-1',
    fecha_aviso: '2025-01-10',
    servicios_intervencion: { id_servicio: 'SERV-M', nom_servicio: 'Mantenimiento', coste_servicio_prov: '50.00', ingreso_servicio_cli: '90.00' },
    estados_intervencion: { nom_estado: 'Pendiente' },
    proveedores_serv: { nom_pro_serv: 'Asistencia Técnica Uno' },
    productos: { nom_prod: 'Producto Uno' },
  },
  {
    id_int: 'INT-2',
    id_serv: 'SERV-I',
    id_estado: 'WORK',
    id_cliente: 'CLIENT-1',
    id_pro_serv: 'PRS-1',
    id_prod: 'PROD-2',
    fecha_aviso: '2025-01-20',
    servicios_intervencion: { id_servicio: 'SERV-I', nom_servicio: 'Instalación', coste_servicio_prov: '80.00', ingreso_servicio_cli: '150.00' },
    estados_intervencion: { nom_estado: 'En Proceso' },
    proveedores_serv: { nom_pro_serv: 'Asistencia Técnica Uno' },
    productos: { nom_prod: 'Producto Dos' },
  },
  {
    id_int: 'INT-3',
    id_serv: 'SERV-M',
    id_estado: 'DONE',
    id_cliente: 'CLIENT-2',
    id_pro_serv: 'PRS-2',
    id_prod: 'PROD-1',
    fecha_aviso: '2025-02-05',
    servicios_intervencion: { id_servicio: 'SERV-M', nom_servicio: 'Mantenimiento', coste_servicio_prov: '50.00', ingreso_servicio_cli: '90.00' },
    estados_intervencion: { nom_estado: 'Finalizada' },
    proveedores_serv: { nom_pro_serv: 'Servicio Técnico Dos' },
    productos: { nom_prod: 'Producto Uno' },
  },
  {
    id_int: 'INT-4',
    id_serv: 'SERV-R',
    id_estado: 'OPEN',
    id_cliente: 'CLIENT-3',
    id_pro_serv: 'PRS-2',
    id_prod: 'PROD-3',
    fecha_aviso: '2026-01-05',
    servicios_intervencion: { id_servicio: 'SERV-R', nom_servicio: 'Reparación', coste_servicio_prov: '100.00', ingreso_servicio_cli: '180.00' },
    estados_intervencion: { nom_estado: 'Abierta' },
    proveedores_serv: { nom_pro_serv: 'Servicio Técnico Dos' },
    productos: { nom_prod: 'Producto Tres' },
  },
];

function mockInterventions(data: unknown[] | null = interventions, error: { message: string } | null = null) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data, error }),
  } as never);
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ControlServicios />
    </LanguageProvider>,
  );
}

describe('ControlServicios', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockInterventions();
  });

  it('loads intervention data and calculates service, status, product and provider metrics', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Control Servicios' })).toBeInTheDocument();
    expect(supabase.from).toHaveBeenCalledWith('intervenciones');
    expect(screen.getByText('Intervenciones registradas').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Servicios activos / en curso').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Facturación potencial').parentElement).toHaveTextContent('510,00');
    expect(screen.getByText('Margen bruto estimado').parentElement).toHaveTextContent('230,00');
    const providerRanking = screen.getByRole('heading', { name: 'Proveedores de servicios con mayor gasto' }).closest('section');
    expect(providerRanking).toHaveTextContent('Asistencia Técnica Uno');
    expect(providerRanking).toHaveTextContent('130,00');
    expect(providerRanking).toHaveTextContent('Servicio Técnico Dos');
    expect(providerRanking).toHaveTextContent('150,00');
    const providerNames = Array.from(providerRanking?.querySelectorAll('.ui-heading.min-w-0') ?? []).map((node) => node.textContent);
    expect(providerNames.slice(0, 2)).toEqual(['Servicio Técnico Dos', 'Asistencia Técnica Uno']);
    expect(screen.getByText('Producto Uno')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Abierta' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('progressbar', { name: 'En curso' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('progressbar', { name: 'Terminada' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('progressbar', { name: 'Abierta' }).querySelector('span')).toHaveClass('ui-control-status-open');
    expect(screen.getByRole('progressbar', { name: 'En curso' }).querySelector('span')).toHaveClass('ui-control-status-progress');
    expect(screen.getByRole('progressbar', { name: 'Terminada' }).querySelector('span')).toHaveClass('ui-control-status-completed');
    const serviceVolume = screen.getAllByText('Volumen de intervenciones por tipo de servicio')[0].closest('section');
    const serviceBars = serviceVolume?.querySelectorAll('.ui-ranking-fill');
    expect(serviceBars).toHaveLength(3);
    expect(serviceBars?.[0]).toHaveClass('ui-ranking-fill-products');
    expect(serviceBars?.[1]).toHaveClass('ui-ranking-fill-products');
    expect(serviceBars?.[2]).toHaveClass('ui-ranking-fill-products');

    const maintenanceProducts = screen.getByRole('heading', { name: 'Top 5 productos con mantenimiento' }).closest('section');
    const repairProducts = screen.getByRole('heading', { name: 'Top 5 productos con reparación' }).closest('section');
    expect(maintenanceProducts?.querySelector('.ui-ranking-fill')).toHaveClass('ui-control-fill-maintenance');
    expect(repairProducts?.querySelector('.ui-ranking-fill')).toHaveClass('ui-control-fill-repair');

    expect(providerRanking?.querySelector('div.space-y-5')).toBeInTheDocument();
    expect(providerRanking?.querySelector('div.md\\:grid-cols-2')).not.toBeInTheDocument();
  });

  it('filters metrics by year and month', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Control Servicios' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Año' }), { target: { value: '2025' } });
    await waitFor(() => {
      expect(screen.getByText('Intervenciones registradas').parentElement).toHaveTextContent('3');
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mes' }), { target: { value: '1' } });

    expect(screen.getByText('Intervenciones registradas').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Facturación potencial').parentElement).toHaveTextContent('240,00');
    expect(screen.queryByText('Servicio Técnico Dos')).not.toBeInTheDocument();
  });

  it('shows an explicit error when the intervention data request fails', async () => {
    mockInterventions(null, { message: 'permission denied' });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
  });

  it('shows an empty state when the source has no interventions', async () => {
    mockInterventions([]);

    renderPage();

    expect(await screen.findByText('No hay intervenciones para el período seleccionado.')).toBeInTheDocument();
  });
});
