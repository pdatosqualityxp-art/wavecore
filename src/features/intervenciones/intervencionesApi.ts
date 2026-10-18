import { supabase } from '../../shared/lib/supabase';

export type InterventionRecord = {
  id_int?: string | number | null;
  id_estado?: string | null;
  id_cliente?: string | null;
  id_prod?: string | null;
  id_serv?: string | null;
  fecha_aviso?: string | null;
  fecha_int?: string | null;
  estados_intervencion?: { nom_estado?: string | null } | null;
  clientes?: { nom_cliente?: string | null } | null;
  productos?: { nom_prod?: string | null } | null;
  servicios_intervencion?: { nom_servicio?: string | null } | null;
};

export async function fetchInterventions(): Promise<InterventionRecord[]> {
  const { data, error } = await supabase
    .from('intervenciones')
    .select('id_int, id_estado, id_cliente, id_prod, id_serv, fecha_aviso, fecha_int, estados_intervencion(nom_estado), clientes(nom_cliente), productos(nom_prod), servicios_intervencion(nom_servicio)');

  if (error) {
    throw error;
  }

  return (data ?? []) as InterventionRecord[];
}
