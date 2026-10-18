import { useMemo } from 'react';
import { Package } from 'lucide-react';
import DataTablePage, { type DataColumn } from '../../shared/components/DataTablePage';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchProducts } from './productosApi';

export default function Productos() {
  const { t } = useTranslation();
  const columns = useMemo<DataColumn[]>(() => [
    { key: 'id_prod', label: t('products.id'), kind: 'id' },
    { key: 'nom_prod', label: t('products.name') },
    { key: 'desc_prod', label: t('products.productDescription') },
    { key: 'precio_prod', label: t('products.price'), kind: 'money' },
  ], [t]);

  return (
    <DataTablePage
      prefix="products"
      menuLabel={t('menu.products')}
      icon={Package}
      columns={columns}
      fetchRows={fetchProducts}
      sortKey="nom_prod"
      titleKey="nom_prod"
    />
  );
}
