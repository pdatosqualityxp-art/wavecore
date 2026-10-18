import { fetchAllRows } from '../../shared/lib/fetchAllRows';

export type ProductRecord = {
  id_prod: string;
  nom_prod: string | null;
  desc_prod: string | null;
  precio_prod: number | null;
};

export function fetchProducts(): Promise<ProductRecord[]> {
  return fetchAllRows<ProductRecord>('productos', 'id_prod, nom_prod, desc_prod, precio_prod', 'id_prod');
}
