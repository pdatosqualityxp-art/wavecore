import { supabase } from '../../shared/lib/supabase';

export type ServiceRelation = {
  id_servicio?: string | null;
  nom_servicio?: string | null;
  coste_servicio_prov?: number | string | null;
  ingreso_servicio_cli?: number | string | null;
} | null;

export type InterventionRecord = {
  id_int?: string | number | null;
  id_prod?: string | null;
  id_serv?: string | null;
  id_estado?: string | null;
  id_cliente?: string | null;
  id_pro_serv?: string | null;
  fecha_aviso?: string | null;
  productos?: { nom_prod?: string | null } | null;
  servicios_intervencion?: ServiceRelation;
  estados_intervencion?: { nom_estado?: string | null } | null;
  proveedores_serv?: { nom_pro_serv?: string | null } | null;
};

export async function fetchInterventions(): Promise<InterventionRecord[]> {
  const { data, error } = await supabase
    .from('intervenciones')
    .select('id_int, id_prod, id_serv, id_estado, id_cliente, id_pro_serv, fecha_aviso, productos(nom_prod), servicios_intervencion(id_servicio, nom_servicio, coste_servicio_prov, ingreso_servicio_cli), estados_intervencion(nom_estado), proveedores_serv(nom_pro_serv)');

  if (error) {
    throw error;
  }

  return (data ?? []) as InterventionRecord[];
}
