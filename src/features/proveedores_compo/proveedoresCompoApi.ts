import { fetchAllRows } from '../../shared/lib/fetchAllRows';

export type ComponentSupplierRecord = {
  id_prov_compo: string;
  nom_prov_compo: string | null;
  poblacion_prov_compo: string | null;
  pais_prov_compo: string | null;
};

export function fetchComponentSuppliers(): Promise<ComponentSupplierRecord[]> {
  return fetchAllRows<ComponentSupplierRecord>(
    'proveedores_compo',
    'id_prov_compo, nom_prov_compo, poblacion_prov_compo, pais_prov_compo',
    'id_prov_compo',
  );
}
