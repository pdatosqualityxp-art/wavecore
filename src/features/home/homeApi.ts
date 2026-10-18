import { supabase } from '../../shared/lib/supabase';

export type OperationalCounts = {
  products: number;
  clients: number;
  interventions: number;
};

async function countRows(table: 'productos' | 'clientes' | 'intervenciones'): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw error;
  }
  if (count === null) {
    throw new Error(`Supabase did not return an exact count for ${table}.`);
  }

  return count;
}

export async function fetchOperationalCounts(): Promise<OperationalCounts> {
  const [products, clients, interventions] = await Promise.all([
    countRows('productos'),
    countRows('clientes'),
    countRows('intervenciones'),
  ]);

  return { products, clients, interventions };
}
