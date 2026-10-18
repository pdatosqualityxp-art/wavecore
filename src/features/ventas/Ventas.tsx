import { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import DataTablePage, { type DataColumn } from '../../shared/components/DataTablePage';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchSales } from './ventasApi';

export default function Ventas() {
  const { t } = useTranslation();
  const columns = useMemo<DataColumn[]>(() => [
    { key: 'id_venta', label: t('sales.id'), kind: 'id' },
    { key: 'fecha_venta', label: t('sales.date'), kind: 'date' },
    { key: 'cliente', label: t('sales.client') },
    { key: 'producto', label: t('sales.product') },
    { key: 'unidades', label: t('sales.units'), kind: 'number' },
    { key: 'precio_unidad', label: t('sales.unitPrice'), kind: 'money' },
    { key: 'total_venta', label: t('sales.total'), kind: 'money' },
  ], [t]);

  return (
    <DataTablePage
      prefix="sales"
      menuLabel={t('menu.sales')}
      icon={ShoppingCart}
      columns={columns}
      fetchRows={fetchSales}
      sortKey="fecha_venta"
      sortDirection="desc"
      titleKey="id_venta"
    />
  );
}
