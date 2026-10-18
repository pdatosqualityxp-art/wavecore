import { useMemo } from 'react';
import { Truck } from 'lucide-react';
import DataTablePage, { type DataColumn } from '../../shared/components/DataTablePage';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchComponentSuppliers } from './proveedoresCompoApi';

export default function ProveedoresCompo() {
  const { t } = useTranslation();
  const columns = useMemo<DataColumn[]>(() => [
    { key: 'id_prov_compo', label: t('componentSuppliers.id'), kind: 'id' },
    { key: 'nom_prov_compo', label: t('componentSuppliers.name') },
    { key: 'poblacion_prov_compo', label: t('componentSuppliers.city') },
    { key: 'pais_prov_compo', label: t('componentSuppliers.country') },
  ], [t]);

  return (
    <DataTablePage
      prefix="componentSuppliers"
      menuLabel={t('menu.componentSuppliers')}
      icon={Truck}
      columns={columns}
      fetchRows={fetchComponentSuppliers}
      sortKey="nom_prov_compo"
      titleKey="nom_prov_compo"
    />
  );
}
