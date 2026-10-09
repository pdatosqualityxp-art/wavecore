import { useEffect, useMemo, useState } from 'react';
import { BarChart3, MapPin, Package2, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '../../shared/lib/supabase';
import { useTranslation } from '../../shared/i18n/LanguageContext';

type SaleRecord = {
  id_venta?: string | number | null;
  id_prod?: string | number | null;
  id_cliente?: string | number | null;
  unidades?: number | string | null;
  precio_unidad?: number | string | null;
  total_venta?: number | string | null;
  fecha_venta?: string | null;
  clientes?: { nom_cliente?: string | null; poblacion_cliente?: string | null } | null;
  productos?: { nom_prod?: string | null } | null;
};

type SortableRankingItem = {
  id: string;
  name: string;
  revenue: number;
  units: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function parseDecimal(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
    if (!normalized || !/[0-9]/.test(normalized)) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export default function DashboardVentas() {
  const { t, language } = useTranslation();
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<'all' | number>('all');
  const [selectedMonth, setSelectedMonth] = useState<'all' | number>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = language === 'en' ? 'en-US' : language === 'ca' ? 'ca-ES' : 'es-ES';

  useEffect(() => {
    let isCurrent = true;

    async function loadSales() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('ventas')
          .select('id_venta, id_prod, id_cliente, unidades, precio_unidad, total_venta, fecha_venta, clientes(nom_cliente, poblacion_cliente), productos(nom_prod)');

        if (queryError) {
          throw queryError;
        }

        if (isCurrent) {
          setAllSales((data ?? []) as SaleRecord[]);
        }
      } catch (loadError) {
        if (isCurrent) {
          setAllSales([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadSales();
    return () => {
      isCurrent = false;
    };
  }, []);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    allSales.forEach((sale) => {
      const date = parseDate(sale.fecha_venta ?? null);
      if (date) {
        yearSet.add(date.getFullYear());
      }
    });
    return Array.from(yearSet).sort((left, right) => right - left);
  }, [allSales]);

  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear('all');
      setSelectedMonth('all');
      return;
    }

    if (selectedYear !== 'all' && !years.includes(Number(selectedYear))) {
      setSelectedYear('all');
      setSelectedMonth('all');
    }
  }, [years, selectedYear]);

  const availableMonths = useMemo(() => {
    if (selectedYear === 'all') {
      return [] as Array<{ value: number; label: string }>;
    }

    const monthSet = new Set<number>();
    allSales.forEach((sale) => {
      const date = parseDate(sale.fecha_venta ?? null);
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
  }, [allSales, locale, selectedYear]);

  useEffect(() => {
    if (selectedYear === 'all') {
      setSelectedMonth('all');
      return;
    }

    if (selectedMonth !== 'all' && !availableMonths.some((month) => month.value === Number(selectedMonth))) {
      setSelectedMonth('all');
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  const filteredSales = useMemo(() => {
    return allSales.filter((sale) => {
      const date = parseDate(sale.fecha_venta ?? null);
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
  }, [allSales, selectedMonth, selectedYear]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (parseDecimal(sale.total_venta) ?? 0), 0);
  const totalUnits = filteredSales.reduce((sum, sale) => sum + (parseDecimal(sale.unidades) ?? 0), 0);
  const averageUnitValue = totalUnits > 0 ? totalRevenue / totalUnits : null;
  const operationCount = new Set(filteredSales.map((sale) => String(sale.id_venta ?? '')).filter(Boolean)).size;

  const customerRanking = useMemo<SortableRankingItem[]>(() => {
    const map = new Map<string, SortableRankingItem>();

    filteredSales.forEach((sale) => {
      if (!sale.id_cliente) {
        return;
      }

      const clientId = String(sale.id_cliente);
      const name = String(sale.clientes?.nom_cliente ?? clientId);
      const revenue = parseDecimal(sale.total_venta) ?? 0;
      const units = parseDecimal(sale.unidades) ?? 0;

      const entry = map.get(clientId) ?? { id: clientId, name, revenue: 0, units: 0 };
      entry.revenue += revenue;
      entry.units += units;
      map.set(clientId, entry);
    });

    return Array.from(map.values())
      .sort((left, right) => {
        if (right.revenue !== left.revenue) {
          return right.revenue - left.revenue;
        }
        return left.name.localeCompare(right.name, locale);
      })
      .slice(0, 5);
  }, [filteredSales, locale]);

  const productRanking = useMemo<SortableRankingItem[]>(() => {
    const map = new Map<string, SortableRankingItem>();

    filteredSales.forEach((sale) => {
      if (!sale.id_prod) {
        return;
      }

      const productId = String(sale.id_prod);
      const name = String(sale.productos?.nom_prod ?? productId);
      const revenue = parseDecimal(sale.total_venta) ?? 0;
      const units = parseDecimal(sale.unidades) ?? 0;

      const entry = map.get(productId) ?? { id: productId, name, revenue: 0, units: 0 };
      entry.revenue += revenue;
      entry.units += units;
      map.set(productId, entry);
    });

    return Array.from(map.values())
      .sort((left, right) => {
        if (right.revenue !== left.revenue) {
          return right.revenue - left.revenue;
        }
        return left.name.localeCompare(right.name, locale);
      })
      .slice(0, 5);
  }, [filteredSales, locale]);

  const localityRanking = useMemo<SortableRankingItem[]>(() => {
    const map = new Map<string, SortableRankingItem>();

    filteredSales.forEach((sale) => {
      const locality = sale.clientes?.poblacion_cliente?.trim();
      if (!locality) {
        return;
      }

      const key = locality.toLocaleLowerCase(locale);
      const entry = map.get(key) ?? { id: key, name: locality, revenue: 0, units: 0 };
      entry.revenue += parseDecimal(sale.total_venta) ?? 0;
      entry.units += parseDecimal(sale.unidades) ?? 0;
      map.set(key, entry);
    });

    return Array.from(map.values())
      .sort((left, right) => {
        if (right.revenue !== left.revenue) {
          return right.revenue - left.revenue;
        }
        return left.name.localeCompare(right.name, locale);
      })
      .slice(0, 5);
  }, [filteredSales, locale]);

  const maxCustomerRevenue = customerRanking[0]?.revenue ?? 0;
  const maxProductRevenue = productRanking[0]?.revenue ?? 0;
  const localityRevenueTotal = localityRanking.reduce((sum, locality) => sum + locality.revenue, 0);
  let localityPercentageEnd = 0;
  const localityDonutSegments = localityRanking.map((locality, index) => {
    const percentageStart = localityPercentageEnd;
    localityPercentageEnd += localityRevenueTotal > 0 ? (locality.revenue / localityRevenueTotal) * 100 : 0;
    return `var(--color-geography-${index + 1}) ${percentageStart}% ${localityPercentageEnd}%`;
  });

  const kpis = [
    {
      label: t('dashboardVentas.totalRevenue'),
      detail: 'Suma total del importe facturado',
      value: formatCurrency(totalRevenue, locale),
      icon: Wallet,
      accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
      label: t('dashboardVentas.totalUnits'),
      detail: 'Cantidad total de unidades comercializadas',
      value: formatNumber(totalUnits, locale),
      icon: Package2,
      accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      label: t('dashboardVentas.averageUnitValue'),
      detail: 'Valor medio por operación registrada',
      value: averageUnitValue === null ? t('dashboardVentas.noData') : formatCurrency(averageUnitValue, locale),
      icon: TrendingUp,
      accent: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
    {
      label: t('dashboardVentas.operations'),
      detail: 'Total de ventas procesadas',
      value: formatNumber(operationCount, locale),
      icon: BarChart3,
      accent: 'bg-gradient-to-r from-amber-400/25 to-yellow-300/20 text-amber-700 dark:text-amber-200',
    },
  ];

  return (
    <section className="ui-dashboard-sales w-full space-y-6">
      <header className="ui-surface flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <span className="ui-home-icon-badge flex h-12 w-12 items-center justify-center rounded-2xl">
            <BarChart3 size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('menu.finance')}</p>
            <h1 className="ui-heading mt-2 text-3xl font-bold tracking-tight">{t('dashboardVentas.heading')}</h1>
            <p className="ui-muted mt-2 max-w-2xl text-sm leading-6">{t('dashboardVentas.description')}</p>
          </div>
        </div>

        <div className="ui-period-control flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-end">
          <label className="flex min-w-[9.5rem] flex-col gap-2 text-left">
            <span className="ui-muted text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{t('dashboardVentas.year')}</span>
            <select
              aria-label={t('dashboardVentas.year')}
              value={selectedYear}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedYear(value === 'all' ? 'all' : Number(value));
                if (value === 'all') {
                  setSelectedMonth('all');
                }
              }}
              className="ui-period-select rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="all">{t('dashboardVentas.all')}</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[10rem] flex-col gap-2 text-left">
            <span className="ui-muted text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{t('dashboardVentas.month')}</span>
            <select
              aria-label={t('dashboardVentas.month')}
              value={selectedMonth}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMonth(value === 'all' ? 'all' : Number(value));
              }}
              disabled={selectedYear === 'all'}
              className="ui-period-select rounded-xl border px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">{t('dashboardVentas.all')}</option>
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {isLoading && (
        <div className="ui-surface rounded-2xl p-6" role="status">
          <p className="ui-muted text-sm">{t('dashboardVentas.loading')}</p>
        </div>
      )}

      {error && (
        <div className="ui-alert rounded-2xl p-5 text-sm" role="alert">
          <p className="font-semibold">{t('dashboardVentas.error')}</p>
          <p className="mt-2 text-sm opacity-90">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {filteredSales.length === 0 ? (
            <div className="ui-surface rounded-2xl p-6">
              <p className="ui-muted text-sm">{t('dashboardVentas.emptyPeriod')}</p>
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
                      <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('dashboardVentas.customers')}</p>
                      <h2 className="ui-heading text-xl font-semibold">{t('dashboardVentas.topClients')}</h2>
                    </div>
                    <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">
                      {t('dashboardVentas.top5')}
                    </span>
                  </header>

                  {customerRanking.length === 0 ? (
                    <p className="ui-muted text-sm">{t('dashboardVentas.emptyClients')}</p>
                  ) : (
                    <div className="space-y-4">
                      {customerRanking.map((customer, index) => (
                        <div key={customer.id} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="ui-muted text-xs font-semibold">#{index + 1}</span>
                              <span className="ui-heading truncate font-medium">{customer.name}</span>
                            </div>
                            <span className="ui-heading text-sm font-semibold">{formatCurrency(customer.revenue, locale)}</span>
                          </div>
                          <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                            <span
                              aria-hidden="true"
                              className="ui-ranking-fill ui-ranking-fill-clients block h-full rounded-full"
                              style={{ width: `${maxCustomerRevenue > 0 ? (customer.revenue / maxCustomerRevenue) * 100 : 0}%`, animationDelay: `${index * 60}ms` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('dashboardVentas.products')}</p>
                      <h2 className="ui-heading text-xl font-semibold">{t('dashboardVentas.topProducts')}</h2>
                    </div>
                    <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">
                      {t('dashboardVentas.top5')}
                    </span>
                  </header>

                  {productRanking.length === 0 ? (
                    <p className="ui-muted text-sm">{t('dashboardVentas.emptyProducts')}</p>
                  ) : (
                    <div className="space-y-4">
                      {productRanking.map((product, index) => (
                        <div key={product.id} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="ui-muted text-xs font-semibold">#{index + 1}</span>
                              <span className="ui-heading truncate font-medium">{product.name}</span>
                            </div>
                            <span className="ui-heading text-sm font-semibold">{formatCurrency(product.revenue, locale)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[0.72rem] text-slate-500 dark:text-slate-400">
                            <span>{t('dashboardVentas.unitsSold')}: {formatNumber(product.units, locale)}</span>
                            <span>{t('dashboardVentas.revenue')}</span>
                          </div>
                          <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                            <span
                              aria-hidden="true"
                              className="ui-ranking-fill ui-ranking-fill-products block h-full rounded-full"
                              style={{ width: `${maxProductRevenue > 0 ? (product.revenue / maxProductRevenue) * 100 : 0}%`, animationDelay: `${index * 60}ms` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="ui-surface ui-geography-card rounded-2xl p-5 sm:p-6">
                <header className="mb-6 flex items-center gap-3">
                  <span className="ui-geography-icon flex h-10 w-10 items-center justify-center rounded-xl">
                    <MapPin size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('dashboardVentas.geography')}</p>
                    <h2 className="ui-heading text-xl font-semibold">{t('dashboardVentas.topLocalities')}</h2>
                  </div>
                </header>

                {localityRanking.length === 0 ? (
                  <p className="ui-muted text-sm">{t('dashboardVentas.emptyLocalities')}</p>
                ) : (
                  <div className="grid items-center gap-7 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,2fr)]">
                    <div className="flex justify-center">
                      <div
                        className="ui-geography-donut"
                        role="img"
                        aria-label={`${t('dashboardVentas.geographyChart')}: ${formatCurrency(localityRevenueTotal, locale)}`}
                        style={{ background: `conic-gradient(${localityDonutSegments.join(', ')})` }}
                      >
                        <div className="ui-geography-donut-center">
                          <span className="ui-muted text-[0.58rem] font-semibold uppercase tracking-[0.16em]">
                            {t('dashboardVentas.top5')}
                          </span>
                          <strong className="ui-heading mt-1 text-center text-sm font-bold">
                            {formatCurrency(localityRevenueTotal, locale)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {localityRanking.map((locality, index) => {
                        const share = localityRevenueTotal > 0 ? (locality.revenue / localityRevenueTotal) * 100 : 0;
                        return (
                          <div key={locality.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className={`ui-geography-swatch ui-geography-swatch-${index + 1}`} aria-hidden="true" />
                                <span className="ui-heading truncate font-medium">{locality.name}</span>
                              </div>
                              <span className="ui-heading shrink-0 text-sm font-semibold">{formatCurrency(locality.revenue, locale)}</span>
                            </div>
                            <div
                              className="ui-ranking-bar h-2.5 overflow-hidden rounded-full"
                              role="progressbar"
                              aria-label={`${locality.name}: ${formatCurrency(locality.revenue, locale)}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(share)}
                            >
                              <span
                                aria-hidden="true"
                                className={`ui-geography-fill ui-geography-fill-${index + 1} block h-full rounded-full`}
                                style={{ width: `${share}%`, animationDelay: `${index * 60}ms` }}
                              />
                            </div>
                            <p className="ui-muted text-right text-xs">{formatNumber(share, locale)}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
