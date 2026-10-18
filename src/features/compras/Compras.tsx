import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import DataTablePage, { type DataColumn } from '../../shared/components/DataTablePage';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchPurchases } from './comprasApi';

export default function Compras() {
  const { t } = useTranslation();
  const columns = useMemo<DataColumn[]>(() => [
    { key: 'id_compra', label: t('purchases.id'), kind: 'id' },
    { key: 'fecha_compra', label: t('purchases.date'), kind: 'date' },
    { key: 'proveedor', label: t('purchases.supplier') },
    { key: 'componente', label: t('purchases.component') },
    { key: 'unidades_compra', label: t('purchases.units'), kind: 'number' },
    { key: 'precio_unidad', label: t('purchases.unitPrice'), kind: 'money' },
    { key: 'total_compra', label: t('purchases.total'), kind: 'money' },
  ], [t]);

  return (
    <DataTablePage
      prefix="purchases"
      menuLabel={t('menu.purchases')}
      icon={Receipt}
      columns={columns}
      fetchRows={fetchPurchases}
      sortKey="fecha_compra"
      sortDirection="desc"
      titleKey="id_compra"
    />
  );
}
