import { fetchAllRows } from '../../shared/lib/fetchAllRows';

export type ClientRecord = {
  id_cliente?: string | null;
  nom_cliente?: string | null;
  poblacion_cliente?: string | null;
  pais_cliente?: string | null;
};

export function fetchClients(): Promise<ClientRecord[]> {
  return fetchAllRows<ClientRecord>('clientes', 'id_cliente, nom_cliente, poblacion_cliente, pais_cliente', 'id_cliente');
}
