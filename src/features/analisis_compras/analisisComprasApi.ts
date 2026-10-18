import { supabase } from '../../shared/lib/supabase';

export type PurchaseRecord = {
  id_compra?: string | number | null;
  id_prov_compo?: string | number | null;
  id_compo?: string | number | null;
  unidades_compra?: number | string | null;
  precio_unidad?: number | string | null;
  total_compra?: number | string | null;
  fecha_compra?: string | null;
  proveedores_compo?: { nom_prov_compo?: string | null } | null;
  componentes?: { nom_compo?: string | null } | null;
};

export type StockRecord = {
  id_compo?: string | number | null;
  id_alm?: string | number | null;
  unidades?: number | string | null;
  almacen?: { nom_alm?: string | null } | null;
};

export async function fetchPurchases(): Promise<PurchaseRecord[]> {
  const { data, error } = await supabase
    .from('compras')
    .select('id_compra, id_prov_compo, id_compo, unidades_compra, precio_unidad, total_compra, fecha_compra, proveedores_compo(nom_prov_compo), componentes(nom_compo)');

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as PurchaseRecord[];
}

export async function fetchStock(): Promise<StockRecord[]> {
  const { data, error } = await supabase
    .from('stock_compo')
    .select('id_compo, id_alm, unidades, almacen(nom_alm)');

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as StockRecord[];
}
