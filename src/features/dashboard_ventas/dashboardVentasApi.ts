import { supabase } from '../../shared/lib/supabase';

export type SaleRecord = {
  id_venta?: string | number | null;
  id_prod?: string | number | null;
  id_cliente?: string | number | null;
  unidades?: number | string | null;
  precio_unidad?: number | string | null;
  total_venta?: number | string | null;
  fecha_venta?: string | null;
  clientes?: { nom_cliente?: string | null; poblacion_cliente?: string | null } | null;
  productos?: { nom_prod?: string | null } | null;
};

export async function fetchSales(): Promise<SaleRecord[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('id_venta, id_prod, id_cliente, unidades, precio_unidad, total_venta, fecha_venta, clientes(nom_cliente, poblacion_cliente), productos(nom_prod)');

  if (error) {
    throw error;
  }

  return (data ?? []) as SaleRecord[];
}
