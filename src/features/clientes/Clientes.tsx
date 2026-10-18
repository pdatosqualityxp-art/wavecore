import { useMemo } from 'react';
import { Users } from 'lucide-react';
import DataTablePage, { type DataColumn } from '../../shared/components/DataTablePage';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchClients } from './clientesApi';

export default function Clientes() {
  const { t } = useTranslation();
  const columns = useMemo<DataColumn[]>(() => [
    { key: 'id_cliente', label: t('clients.id'), kind: 'id' },
    { key: 'nom_cliente', label: t('clients.name') },
    { key: 'poblacion_cliente', label: t('clients.city') },
    { key: 'pais_cliente', label: t('clients.country') },
  ], [t]);

  return (
    <DataTablePage
      prefix="clients"
      menuLabel={t('menu.clients')}
      icon={Users}
      columns={columns}
      fetchRows={fetchClients}
      sortKey="nom_cliente"
      titleKey="nom_cliente"
    />
  );
}
