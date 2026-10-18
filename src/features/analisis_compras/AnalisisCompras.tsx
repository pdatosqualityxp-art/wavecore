import { useEffect, useMemo, useState } from 'react';
import { Boxes, Calculator, ChartColumnBig, Package2, Truck, Wallet, Warehouse } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchPurchases, fetchStock, type PurchaseRecord, type StockRecord } from './analisisComprasApi';

type RankingItem = {
  id: string;
  name: string;
  amount: number;
  units: number;
};

type StockItem = {
  id: string;
  name: string;
  units: number;
};

const SUPPLIER_LIMIT = 5;
const PRODUCT_LIMIT = 6;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseDate(dateValue: string | null | undefined): Date | null {
  if (!dateValue) {
    return null;
  }
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, locale: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase() || '?';
}

export default function AnalisisCompras() {
  const { t, language } = useTranslation();
  const [allPurchases, setAllPurchases] = useState<PurchaseRecord[]>([]);
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<'all' | number>('all');
  const [selectedMonth, setSelectedMonth] = useState<'all' | number>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = language === 'en' ? 'en-US' : language === 'ca' ? 'ca-ES' : 'es-ES';

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [purchases, stockRows] = await Promise.all([fetchPurchases(), fetchStock()]);

        if (isCurrent) {
          setAllPurchases(purchases);
          setStock(stockRows);
        }
      } catch (loadError) {
        if (isCurrent) {
          setAllPurchases([]);
          setStock([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      isCurrent = false;
    };
  }, []);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    allPurchases.forEach((purchase) => {
      const date = parseDate(purchase.fecha_compra);
      if (date) {
        yearSet.add(date.getFullYear());
      }
    });
    return Array.from(yearSet).sort((left, right) => right - left);
  }, [allPurchases]);

  const availableMonths = useMemo(() => {
    if (selectedYear === 'all') {
      return [] as Array<{ value: number; label: string }>;
    }

    const monthSet = new Set<number>();
    allPurchases.forEach((purchase) => {
      const date = parseDate(purchase.fecha_compra);
      if (date && date.getFullYear() === Number(selectedYear)) {
        monthSet.add(date.getMonth() + 1);
      }
    });

    return Array.from(monthSet)
      .sort((left, right) => left - right)
      .map((month) => ({
        value: month,
        label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, month - 1, 1)),
      }));
  }, [allPurchases, locale, selectedYear]);

  useEffect(() => {
    if (selectedYear !== 'all' && !years.includes(Number(selectedYear))) {
      setSelectedYear('all');
      setSelectedMonth('all');
    }
  }, [years, selectedYear]);

  useEffect(() => {
    if (selectedYear === 'all') {
      setSelectedMonth('all');
      return;
    }

    if (selectedMonth !== 'all' && !availableMonths.some((month) => month.value === Number(selectedMonth))) {
      setSelectedMonth('all');
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  const filteredPurchases = useMemo(() => {
    return allPurchases.filter((purchase) => {
      const date = parseDate(purchase.fecha_compra);
      if (!date) {
        return false;
      }
      if (selectedYear !== 'all' && date.getFullYear() !== Number(selectedYear)) {
        return false;
      }
      if (selectedMonth !== 'all' && date.getMonth() + 1 !== Number(selectedMonth)) {
        return false;
      }
      return true;
    });
  }, [allPurchases, selectedMonth, selectedYear]);

  const totalSpend = filteredPurchases.reduce((sum, purchase) => sum + toNumber(purchase.total_compra), 0);
  const totalUnits = filteredPurchases.reduce((sum, purchase) => sum + toNumber(purchase.unidades_compra), 0);
  const averageUnitCost = totalUnits > 0 ? totalSpend / totalUnits : null;
  const globalStock = stock.reduce((sum, row) => sum + toNumber(row.unidades), 0);

  const supplierRanking = useMemo<RankingItem[]>(() => {
    const map = new Map<string, RankingItem>();

    filteredPurchases.forEach((purchase) => {
      if (!purchase.id_prov_compo) {
        return;
      }
      const id = String(purchase.id_prov_compo);
      const entry = map.get(id) ?? { id, name: String(purchase.proveedores_compo?.nom_prov_compo ?? id), amount: 0, units: 0 };
      entry.amount += toNumber(purchase.total_compra);
      entry.units += toNumber(purchase.unidades_compra);
      map.set(id, entry);
    });

    return Array.from(map.values()).sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name, locale));
  }, [filteredPurchases, locale]);

  const productRanking = useMemo<RankingItem[]>(() => {
    const map = new Map<string, RankingItem>();

    filteredPurchases.forEach((purchase) => {
      if (!purchase.id_compo) {
        return;
      }
      const id = String(purchase.id_compo);
      const entry = map.get(id) ?? { id, name: String(purchase.componentes?.nom_compo ?? id), amount: 0, units: 0 };
      entry.amount += toNumber(purchase.total_compra);
      entry.units += toNumber(purchase.unidades_compra);
      map.set(id, entry);
    });

    return Array.from(map.values())
      .sort((left, right) => right.units - left.units || left.name.localeCompare(right.name, locale))
      .slice(0, PRODUCT_LIMIT);
  }, [filteredPurchases, locale]);

  const warehouseStock = useMemo<StockItem[]>(() => {
    const map = new Map<string, StockItem>();

    stock.forEach((row) => {
      if (!row.id_alm) {
        return;
      }
      const id = String(row.id_alm);
      const entry = map.get(id) ?? { id, name: String(row.almacen?.nom_alm ?? id), units: 0 };
      entry.units += toNumber(row.unidades);
      map.set(id, entry);
    });

    return Array.from(map.values()).sort((left, right) => right.units - left.units || left.name.localeCompare(right.name, locale));
  }, [stock, locale]);

  const activeSuppliers = supplierRanking.length;
  const topSuppliers = supplierRanking.slice(0, SUPPLIER_LIMIT);
  const maxSupplierAmount = topSuppliers[0]?.amount ?? 0;
  const maxProductUnits = productRanking[0]?.units ?? 0;
  const maxWarehouseUnits = warehouseStock[0]?.units ?? 0;
  const periodKey = `${selectedYear}-${selectedMonth}`;

  const kpis = [
    {
      label: t('analisisCompras.totalSpend'),
      detail: t('analisisCompras.totalSpendDetail'),
      value: formatCurrency(totalSpend, locale),
      icon: Wallet,
      accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
      label: t('analisisCompras.unitsPurchased'),
      detail: t('analisisCompras.unitsPurchasedDetail'),
      value: formatNumber(totalUnits, locale),
      icon: Package2,
      accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      label: t('analisisCompras.activeSuppliers'),
      detail: t('analisisCompras.activeSuppliersDetail'),
      value: formatNumber(activeSuppliers, locale),
      icon: Truck,
      accent: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    {
      label: t('analisisCompras.globalStock'),
      detail: t('analisisCompras.globalStockDetail'),
      value: formatNumber(globalStock, locale),
      icon: Boxes,
      accent: 'bg-gradient-to-r from-amber-400/25 to-yellow-300/20 text-amber-700 dark:text-amber-200',
    },
  ];

  return (
    <section className="ui-dashboard-sales w-full space-y-6">
      <header className="ui-surface flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <span className="ui-home-icon-badge flex h-12 w-12 items-center justify-center rounded-2xl">
            <ChartColumnBig size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('menu.finance')}</p>
            <h1 className="ui-heading mt-2 text-3xl font-bold tracking-tight">{t('analisisCompras.heading')}</h1>
            <p className="ui-muted mt-2 max-w-2xl text-sm leading-6">{t('analisisCompras.description')}</p>
          </div>
        </div>

        <div className="ui-period-control flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-end">
          <label className="flex min-w-[9.5rem] flex-col gap-2 text-left">
            <span className="ui-muted text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{t('analisisCompras.year')}</span>
            <select
              aria-label={t('analisisCompras.year')}
              value={selectedYear}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedYear(value === 'all' ? 'all' : Number(value));
                setSelectedMonth('all');
              }}
              className="ui-period-select rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="all">{t('analisisCompras.all')}</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[10rem] flex-col gap-2 text-left">
            <span className="ui-muted text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{t('analisisCompras.month')}</span>
            <select
              aria-label={t('analisisCompras.month')}
              value={selectedMonth}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMonth(value === 'all' ? 'all' : Number(value));
              }}
              disabled={selectedYear === 'all'}
              className="ui-period-select rounded-xl border px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">{t('analisisCompras.all')}</option>
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {isLoading && (
        <div className="ui-surface rounded-2xl p-6" role="status">
          <p className="ui-muted text-sm">{t('analisisCompras.loading')}</p>
        </div>
      )}

      {error && (
        <div className="ui-alert rounded-2xl p-5 text-sm" role="alert">
          <p className="font-semibold">{t('analisisCompras.error')}</p>
          <p className="mt-2 text-sm opacity-90">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {filteredPurchases.length === 0 ? (
            <div className="ui-surface rounded-2xl p-6">
              <p className="ui-muted text-sm">{t('analisisCompras.emptyPeriod')}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map(({ label, detail, value, icon: Icon, accent }) => (
                  <article key={label} className="ui-kpi-card ui-home-card ui-surface rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.16em]">{label}</p>
                        <p className="ui-heading mt-3 text-2xl font-bold sm:text-[2rem]">{value}</p>
                        <p className="ui-muted mt-2 text-[0.66rem] leading-5">{detail}</p>
                      </div>
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
                        <Icon size={19} aria-hidden="true" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('analisisCompras.suppliers')}</p>
                      <h2 className="ui-heading text-xl font-semibold">{t('analisisCompras.topSuppliers')}</h2>
                    </div>
                    <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">
                      {t('analisisCompras.top5')}
                    </span>
                  </header>

                  <div className="space-y-4">
                    {topSuppliers.map((supplier, index) => (
                      <div key={supplier.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="ui-ranking-avatar" aria-hidden="true">{initialOf(supplier.name)}</span>
                            <span className="ui-heading truncate font-medium">{supplier.name}</span>
                          </div>
                          <span className="ui-heading shrink-0 text-sm font-semibold">{formatCurrency(supplier.amount, locale)}</span>
                        </div>
                        <p className="ui-muted text-[0.72rem]">{t('analisisCompras.units')}: {formatNumber(supplier.units, locale)}</p>
                        <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                          <span
                            key={`${periodKey}-${supplier.id}`}
                            aria-hidden="true"
                            className="ui-ranking-fill ui-ranking-fill-clients block h-full rounded-full"
                            style={{ width: `${maxSupplierAmount > 0 ? (supplier.amount / maxSupplierAmount) * 100 : 0}%`, animationDelay: `${index * 60}ms` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('analisisCompras.products')}</p>
                      <h2 className="ui-heading text-xl font-semibold">{t('analisisCompras.topProducts')}</h2>
                    </div>
                    <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">
                      {t('analisisCompras.top6')}
                    </span>
                  </header>

                  <div className="space-y-4">
                    {productRanking.map((product, index) => (
                      <div key={product.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="ui-ranking-avatar" aria-hidden="true">{initialOf(product.name)}</span>
                            <span className="ui-heading truncate font-medium">{product.name}</span>
                          </div>
                          <span className="ui-heading shrink-0 text-sm font-semibold">{formatNumber(product.units, locale)}</span>
                        </div>
                        <p className="ui-muted text-[0.72rem]">
                          {t('analisisCompras.averageCost')}: {product.units > 0 ? formatCurrency(product.amount / product.units, locale) : t('analisisCompras.noData')}
                        </p>
                        <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                          <span
                            key={`${periodKey}-${product.id}`}
                            aria-hidden="true"
                            className="ui-ranking-fill ui-ranking-fill-products block h-full rounded-full"
                            style={{ width: `${maxProductUnits > 0 ? (product.units / maxProductUnits) * 100 : 0}%`, animationDelay: `${index * 60}ms` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                  <header className="mb-4 flex items-center gap-3">
                    <span className="ui-geography-icon flex h-10 w-10 items-center justify-center rounded-xl">
                      <Warehouse size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('analisisCompras.stock')}</p>
                      <h2 className="ui-heading text-xl font-semibold">{t('analisisCompras.stockByWarehouse')}</h2>
                      <p className="ui-muted mt-1 text-xs">{t('analisisCompras.stockScope')}</p>
                    </div>
                  </header>

                  {warehouseStock.length === 0 ? (
                    <p className="ui-muted text-sm">{t('analisisCompras.emptyStock')}</p>
                  ) : (
                    <div className="space-y-4">
                      {warehouseStock.map((warehouse, index) => {
                        const share = globalStock > 0 ? (warehouse.units / globalStock) * 100 : 0;
                        return (
                          <div key={warehouse.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="ui-heading truncate font-medium">{warehouse.name}</span>
                              <span className="ui-heading shrink-0 text-sm font-semibold">{formatNumber(warehouse.units, locale)}</span>
                            </div>
                            <div
                              className="ui-ranking-bar h-2.5 overflow-hidden rounded-full"
                              role="progressbar"
                              aria-label={`${warehouse.name}: ${formatNumber(warehouse.units, locale)}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(share)}
                            >
                              <span
                                aria-hidden="true"
                                className="ui-ranking-fill ui-ranking-fill-stock block h-full rounded-full"
                                style={{ width: `${maxWarehouseUnits > 0 ? (warehouse.units / maxWarehouseUnits) * 100 : 0}%`, animationDelay: `${index * 60}ms` }}
                              />
                            </div>
                            <p className="ui-muted text-xs">{formatNumber(share, locale, 1)}% {t('analisisCompras.ofTotalStock')}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                  <header className="mb-4 flex items-center gap-3">
                    <span className="ui-geography-icon flex h-10 w-10 items-center justify-center rounded-xl">
                      <Calculator size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('analisisCompras.efficiency')}</p>
                      <h2 className="ui-heading text-xl font-semibold">{t('analisisCompras.costAndEfficiency')}</h2>
                    </div>
                  </header>

                  <dl className="space-y-3">
                    <div className="ui-cost-metric rounded-xl p-4">
                      <dt className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.16em]">{t('analisisCompras.averageUnitCost')}</dt>
                      <dd className="ui-heading mt-2 text-2xl font-bold">
                        {averageUnitCost === null ? t('analisisCompras.noData') : formatCurrency(averageUnitCost, locale)}
                      </dd>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="ui-cost-metric rounded-xl p-4">
                        <dt className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.16em]">{t('analisisCompras.totalSpend')}</dt>
                        <dd className="ui-heading mt-2 text-lg font-semibold">{formatCurrency(totalSpend, locale)}</dd>
                      </div>
                      <div className="ui-cost-metric rounded-xl p-4">
                        <dt className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.16em]">{t('analisisCompras.unitsPurchased')}</dt>
                        <dd className="ui-heading mt-2 text-lg font-semibold">{formatNumber(totalUnits, locale)}</dd>
                      </div>
                    </div>
                  </dl>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
