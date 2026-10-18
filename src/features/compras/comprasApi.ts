import { fetchAllRows } from '../../shared/lib/fetchAllRows';

export type PurchaseRecord = {
  id_compra: string;
  fecha_compra: string | null;
  proveedor: string | null;
  componente: string | null;
  unidades_compra: number | null;
  precio_unidad: number | null;
  total_compra: number | null;
};

type Row = Omit<PurchaseRecord, 'proveedor' | 'componente'> & {
  id_prov_compo: string | null;
  id_compo: string | null;
  proveedores_compo?: { nom_prov_compo?: string | null } | null;
  componentes?: { nom_compo?: string | null } | null;
};

export async function fetchPurchases(): Promise<PurchaseRecord[]> {
  const rows = await fetchAllRows<Row>(
    'compras',
    'id_compra, id_prov_compo, id_compo, unidades_compra, precio_unidad, total_compra, fecha_compra, proveedores_compo(nom_prov_compo), componentes(nom_compo)',
    'id_compra',
  );

  return rows.map((row) => ({
    id_compra: row.id_compra,
    fecha_compra: row.fecha_compra,
    proveedor: row.proveedores_compo?.nom_prov_compo ?? row.id_prov_compo,
    componente: row.componentes?.nom_compo ?? row.id_compo,
    unidades_compra: row.unidades_compra,
    precio_unidad: row.precio_unidad,
    total_compra: row.total_compra,
  }));
}
