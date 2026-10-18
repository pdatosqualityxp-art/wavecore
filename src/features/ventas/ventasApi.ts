import { fetchAllRows } from '../../shared/lib/fetchAllRows';

export type SaleRecord = {
  id_venta: string;
  fecha_venta: string | null;
  cliente: string | null;
  producto: string | null;
  unidades: number | null;
  precio_unidad: number | null;
  total_venta: number | null;
};

type Row = Omit<SaleRecord, 'cliente' | 'producto'> & {
  id_cliente: string | null;
  id_prod: string | null;
  clientes?: { nom_cliente?: string | null } | null;
  productos?: { nom_prod?: string | null } | null;
};

export async function fetchSales(): Promise<SaleRecord[]> {
  const rows = await fetchAllRows<Row>(
    'ventas',
    'id_venta, id_prod, id_cliente, unidades, precio_unidad, total_venta, fecha_venta, clientes(nom_cliente), productos(nom_prod)',
    'id_venta',
  );

  return rows.map((row) => ({
    id_venta: row.id_venta,
    fecha_venta: row.fecha_venta,
    cliente: row.clientes?.nom_cliente ?? row.id_cliente,
    producto: row.productos?.nom_prod ?? row.id_prod,
    unidades: row.unidades,
    precio_unidad: row.precio_unidad,
    total_venta: row.total_venta,
  }));
}
