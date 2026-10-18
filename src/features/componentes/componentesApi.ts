import { fetchAllRows } from '../../shared/lib/fetchAllRows';

export type ComponentRecord = {
  id_compo: string;
  nom_compo: string | null;
  desc_compo: string | null;
  precio_compo: number | null;
};

export function fetchComponents(): Promise<ComponentRecord[]> {
  return fetchAllRows<ComponentRecord>('componentes', 'id_compo, nom_compo, desc_compo, precio_compo', 'id_compo');
}
