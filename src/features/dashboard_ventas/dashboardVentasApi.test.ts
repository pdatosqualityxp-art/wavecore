import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../shared/lib/supabase';
import { fetchSales } from './dashboardVentasApi';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function mockSelect(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  vi.mocked(supabase.from).mockReturnValue({ select } as never);
  return select;
}

describe('fetchSales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta la tabla ventas con sus relaciones y devuelve los registros', async () => {
    const rows = [{ id_venta: 1, total_venta: 10 }];
    const select = mockSelect({ data: rows, error: null });

    await expect(fetchSales()).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith('ventas');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('clientes(nom_cliente, poblacion_cliente)'));
    expect(select).toHaveBeenCalledWith(expect.stringContaining('productos(nom_prod)'));
  });

  it('devuelve una lista vacía cuando no hay datos', async () => {
    mockSelect({ data: null, error: null });

    await expect(fetchSales()).resolves.toEqual([]);
  });

  it('propaga el error de Supabase', async () => {
    const error = { message: 'boom' };
    mockSelect({ data: null, error });

    await expect(fetchSales()).rejects.toBe(error);
  });
});
