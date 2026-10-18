import { useMemo } from 'react';
import { Boxes } from 'lucide-react';
import DataTablePage, { type DataColumn } from '../../shared/components/DataTablePage';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchComponents } from './componentesApi';

export default function Componentes() {
  const { t } = useTranslation();
  const columns = useMemo<DataColumn[]>(() => [
    { key: 'id_compo', label: t('components.id'), kind: 'id' },
    { key: 'nom_compo', label: t('components.name') },
    { key: 'desc_compo', label: t('components.componentDescription') },
    { key: 'precio_compo', label: t('components.price'), kind: 'money' },
  ], [t]);

  return (
    <DataTablePage
      prefix="components"
      menuLabel={t('menu.components')}
      icon={Boxes}
      columns={columns}
      fetchRows={fetchComponents}
      sortKey="nom_compo"
      titleKey="nom_compo"
    />
  );
}
