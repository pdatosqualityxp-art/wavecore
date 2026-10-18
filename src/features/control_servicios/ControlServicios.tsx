import { useEffect, useMemo, useState } from 'react';
import { Activity, BriefcaseBusiness, CircleDollarSign, Wrench } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchInterventions, type InterventionRecord } from './controlServiciosApi';

type RankingItem = {
  id: string;
  name: string;
  count: number;
  revenue: number;
};

type ProviderRankingItem = {
  id: string;
  name: string;
  count: number;
  spend: number;
};

type StatusBucket = 'open' | 'progress' | 'completed' | 'other';

type StatusItem = {
  id: string;
  name: string;
  count: number;
  bucket: StatusBucket;
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
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

function classifyStatus(name: string): StatusBucket {
  const normalized = normalizeName(name);
  if (/abiert|pendient|open|pending/.test(normalized)) {
    return 'open';
  }
  if (/curso|proces|progress|active/.test(normalized)) {
    return 'progress';
  }
  if (/termin|finaliz|complet|closed|finish/.test(normalized)) {
    return 'completed';
  }
  return 'other';
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

function getServiceId(intervention: InterventionRecord): string {
  return String(intervention.servicios_intervencion?.id_servicio ?? intervention.id_serv ?? '');
}

function getServiceName(intervention: InterventionRecord): string {
  return intervention.servicios_intervencion?.nom_servicio?.trim() || getServiceId(intervention);
}

export default function ControlServicios() {
  const { t, language } = useTranslation();
  const [allInterventions, setAllInterventions] = useState<InterventionRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<'all' | number>('all');
  const [selectedMonth, setSelectedMonth] = useState<'all' | number>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = language === 'en' ? 'en-US' : language === 'ca' ? 'ca-ES' : 'es-ES';

  useEffect(() => {
    let isCurrent = true;

    async function loadInterventions() {
      setIsLoading(true);
      setError(null);
      try {
        const interventions = await fetchInterventions();
        if (isCurrent) {
          setAllInterventions(interventions);
        }
      } catch (loadError) {
        if (isCurrent) {
          setAllInterventions([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadInterventions();
    return () => {
      isCurrent = false;
    };
  }, []);

  const years = useMemo(() => {
    const values = new Set<number>();
    allInterventions.forEach((intervention) => {
      const date = parseDate(intervention.fecha_aviso);
      if (date) {
        values.add(date.getFullYear());
      }
    });
    return Array.from(values).sort((left, right) => right - left);
  }, [allInterventions]);

  useEffect(() => {
    if (years.length === 0 || (selectedYear !== 'all' && !years.includes(selectedYear))) {
      setSelectedYear('all');
      setSelectedMonth('all');
    }
  }, [selectedYear, years]);

  const availableMonths = useMemo(() => {
    if (selectedYear === 'all') {
      return [];
    }
    const values = new Set<number>();
    allInterventions.forEach((intervention) => {
      const date = parseDate(intervention.fecha_aviso);
      if (date?.getFullYear() === selectedYear) {
        values.add(date.getMonth() + 1);
      }
    });
    return Array.from(values)
      .sort((left, right) => left - right)
      .map((month) => ({
        value: month,
        label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, month - 1, 1)),
      }));
  }, [allInterventions, locale, selectedYear]);

  useEffect(() => {
    if (
      selectedYear === 'all'
      || (selectedMonth !== 'all' && !availableMonths.some((month) => month.value === selectedMonth))
    ) {
      setSelectedMonth('all');
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  const filteredInterventions = useMemo(() => allInterventions.filter((intervention) => {
    const date = parseDate(intervention.fecha_aviso);
    if (!date) {
      return false;
    }
    return (selectedYear === 'all' || date.getFullYear() === selectedYear)
      && (selectedMonth === 'all' || date.getMonth() + 1 === selectedMonth);
  }), [allInterventions, selectedMonth, selectedYear]);

  const services = useMemo(() => {
    const map = new Map<string, RankingItem>();
    filteredInterventions.forEach((intervention) => {
      const id = getServiceId(intervention);
      if (!id) {
        return;
      }
      const service = map.get(id) ?? {
        id,
        name: getServiceName(intervention),
        count: 0,
        revenue: 0,
      };
      service.count += 1;
      service.revenue += parseDecimal(intervention.servicios_intervencion?.ingreso_servicio_cli) ?? 0;
      map.set(id, service);
    });
    return Array.from(map.values()).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, locale));
  }, [filteredInterventions, locale]);

  const statuses = useMemo(() => {
    const map = new Map<string, StatusItem>();
    filteredInterventions.forEach((intervention) => {
      const name = intervention.estados_intervencion?.nom_estado?.trim() || intervention.id_estado || t('controlServicios.otherStatus');
      const bucket = classifyStatus(name);
      const normalizedName = normalizeName(name) || name;
      const id = bucket === 'other' ? normalizedName : bucket;
      const item = map.get(id) ?? { id, name, count: 0, bucket };
      item.count += 1;
      map.set(id, item);
    });
    const order: Record<StatusBucket, number> = { open: 0, progress: 1, completed: 2, other: 3 };
    return Array.from(map.values()).sort((left, right) => order[left.bucket] - order[right.bucket] || right.count - left.count);
  }, [filteredInterventions, t]);

  const productsByService = useMemo(() => {
    const result = new Map<string, RankingItem[]>();
    const groups = new Map<string, Map<string, RankingItem>>();
    filteredInterventions.forEach((intervention) => {
      const serviceId = getServiceId(intervention);
      const productId = String(intervention.id_prod ?? intervention.productos?.nom_prod ?? '');
      if (!serviceId || !productId) {
        return;
      }
      const products = groups.get(serviceId) ?? new Map<string, RankingItem>();
      const product = products.get(productId) ?? {
        id: productId,
        name: intervention.productos?.nom_prod?.trim() || productId,
        count: 0,
        revenue: 0,
      };
      product.count += 1;
      products.set(productId, product);
      groups.set(serviceId, products);
    });
    groups.forEach((products, serviceId) => {
      result.set(serviceId, Array.from(products.values())
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, locale))
        .slice(0, 5));
    });
    return result;
  }, [filteredInterventions, locale]);

  const providers = useMemo(() => {
    const map = new Map<string, ProviderRankingItem>();
    filteredInterventions.forEach((intervention) => {
      const providerId = intervention.id_pro_serv?.trim();
      if (!providerId) {
        return;
      }
      const provider = map.get(providerId) ?? {
        id: providerId,
        name: intervention.proveedores_serv?.nom_pro_serv?.trim() || providerId,
        count: 0,
        spend: 0,
      };
      provider.count += 1;
      provider.spend += parseDecimal(intervention.servicios_intervencion?.coste_servicio_prov) ?? 0;
      map.set(providerId, provider);
    });
    return Array.from(map.values())
      .sort((left, right) => right.spend - left.spend || right.count - left.count || left.name.localeCompare(right.name, locale))
      .slice(0, 5);
  }, [filteredInterventions, locale]);

  const totalInterventions = filteredInterventions.length;
  const activeInterventions = filteredInterventions.reduce((total, intervention) => {
    const status = classifyStatus(intervention.estados_intervencion?.nom_estado ?? '');
    return total + (status === 'open' || status === 'progress' ? 1 : 0);
  }, 0);
  const potentialRevenue = filteredInterventions.reduce(
    (total, intervention) => total + (parseDecimal(intervention.servicios_intervencion?.ingreso_servicio_cli) ?? 0),
    0,
  );
  const grossMargin = filteredInterventions.reduce((total, intervention) => {
    const revenue = parseDecimal(intervention.servicios_intervencion?.ingreso_servicio_cli);
    const cost = parseDecimal(intervention.servicios_intervencion?.coste_servicio_prov);
    return total + (revenue !== null && cost !== null ? revenue - cost : 0);
  }, 0);
  const maxServiceCount = Math.max(1, ...services.map((service) => service.count));
  const maxProviderSpend = Math.max(1, ...providers.map((provider) => provider.spend));

  const kpis = [
    {
      label: t('controlServicios.registered'),
      detail: t('controlServicios.registeredDetail'),
      value: formatNumber(totalInterventions, locale),
      icon: BriefcaseBusiness,
      accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      label: t('controlServicios.active'),
      detail: t('controlServicios.activeDetail'),
      value: formatNumber(activeInterventions, locale),
      icon: Activity,
      accent: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    {
      label: t('controlServicios.potentialRevenue'),
      detail: t('controlServicios.potentialRevenueDetail'),
      value: formatCurrency(potentialRevenue, locale),
      icon: CircleDollarSign,
      accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
      label: t('controlServicios.grossMargin'),
      detail: t('controlServicios.grossMarginDetail'),
      value: formatCurrency(grossMargin, locale),
      icon: Wrench,
      accent: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
  ];

  const statusLabels: Record<StatusBucket, string> = {
    open: t('controlServicios.open'),
    progress: t('controlServicios.inProgress'),
    completed: t('controlServicios.completed'),
    other: '',
  };
  const statusClasses: Record<StatusBucket, string> = {
    open: 'ui-control-status-open',
    progress: 'ui-control-status-progress',
    completed: 'ui-control-status-completed',
    other: 'ui-control-status-other',
  };

  return (
    <section className="w-full space-y-6">
      <header className="ui-surface flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <span className="ui-home-icon-badge flex h-12 w-12 items-center justify-center rounded-2xl">
            <Wrench size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('controlServicios.eyebrow')}</p>
            <h1 className="ui-heading mt-2 text-3xl font-bold tracking-tight">{t('controlServicios.heading')}</h1>
            <p className="ui-muted mt-2 max-w-2xl text-sm leading-6">{t('controlServicios.description')}</p>
          </div>
        </div>
        <div className="ui-period-control flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-end">
          <label className="flex min-w-[9.5rem] flex-col gap-2 text-left">
            <span className="ui-muted text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{t('controlServicios.year')}</span>
            <select
              aria-label={t('controlServicios.year')}
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
              <option value="all">{t('controlServicios.all')}</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-col gap-2 text-left">
            <span className="ui-muted text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{t('controlServicios.month')}</span>
            <select
              aria-label={t('controlServicios.month')}
              value={selectedMonth}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMonth(value === 'all' ? 'all' : Number(value));
              }}
              disabled={selectedYear === 'all'}
              className="ui-period-select rounded-xl border px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">{t('controlServicios.all')}</option>
              {availableMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      {isLoading && <div className="ui-surface rounded-2xl p-6" role="status"><p className="ui-muted text-sm">{t('controlServicios.loading')}</p></div>}
      {error && (
        <div className="ui-alert rounded-2xl p-5 text-sm" role="alert">
          <p className="font-semibold">{t('controlServicios.error')}</p>
          <p className="mt-2 text-sm opacity-90">{error}</p>
        </div>
      )}
      {!isLoading && !error && (
        totalInterventions === 0 ? (
          <div className="ui-surface rounded-2xl p-6"><p className="ui-muted text-sm">{t('controlServicios.emptyPeriod')}</p></div>
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
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}><Icon size={19} aria-hidden="true" /></span>
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                <header className="mb-5">
                  <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('controlServicios.serviceVolume')}</p>
                </header>
                <div className="space-y-5">
                  {services.map((service, index) => (
                    <div key={service.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="ui-heading min-w-0 truncate font-medium">{service.name}</span>
                        <span className="ui-heading shrink-0 font-semibold">{formatNumber(service.count, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="ui-muted">{t('controlServicios.interventions')}</span>
                        <span className="ui-muted">{t('controlServicios.revenue')}: {formatCurrency(service.revenue, locale)}</span>
                      </div>
                      <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                        <span
                          key={`${service.id}-${selectedYear}-${selectedMonth}`}
                          aria-hidden="true"
                          className="ui-ranking-fill ui-ranking-fill-products block h-full rounded-full"
                          style={{ width: `${(service.count / maxServiceCount) * 100}%`, animationDelay: `${index * 60}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ui-surface ui-ranking-card rounded-2xl p-5">
                <header className="mb-5">
                  <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('controlServicios.statusDistribution')}</p>
                </header>
                <div className="space-y-5">
                  {statuses.map((status, index) => (
                    <div key={status.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="ui-heading font-medium">{statusLabels[status.bucket] || status.name}</span>
                        <span className="ui-heading font-semibold">{formatNumber(status.count, locale)}</span>
                      </div>
                      <div
                        className="ui-ranking-bar h-2.5 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-label={statusLabels[status.bucket] || status.name}
                        aria-valuemin={0}
                        aria-valuemax={totalInterventions}
                        aria-valuenow={status.count}
                        aria-valuetext={`${formatNumber(status.count, locale)} / ${formatNumber(totalInterventions, locale)}`}
                      >
                        <span
                          key={`${status.id}-${selectedYear}-${selectedMonth}`}
                          aria-hidden="true"
                          className={`ui-ranking-fill block h-full rounded-full ${statusClasses[status.bucket]}`}
                          style={{ width: `${(status.count / totalInterventions) * 100}%`, animationDelay: `${index * 60}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                  {statuses.length === 0 && <p className="ui-muted text-sm">{t('controlServicios.noData')}</p>}
                </div>
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {services.map((service) => {
                const products = productsByService.get(service.id) ?? [];
                const maxCount = Math.max(1, ...products.map((product) => product.count));
                return (
                  <section key={service.id} className="ui-surface ui-ranking-card rounded-2xl p-5">
                    <header className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('controlServicios.products')}</p>
                        <h2 className="ui-heading mt-1 text-lg font-semibold">{t('controlServicios.topProducts')} {service.name.toLocaleLowerCase(locale)}</h2>
                      </div>
                      <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">{t('controlServicios.top5')}</span>
                    </header>
                    {products.length === 0 ? <p className="ui-muted text-sm">{t('controlServicios.emptyRanking')}</p> : (
                      <div className="space-y-4">
                        {products.map((product, index) => (
                          <div key={product.id} className="space-y-2">
                            <div className="flex items-start justify-between gap-3 text-sm">
                              <span className="ui-heading min-w-0 font-medium">{product.name}</span>
                              <span className="ui-heading shrink-0 font-semibold">{formatNumber(product.count, locale)}</span>
                            </div>
                            <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                              <span
                                key={`${product.id}-${selectedYear}-${selectedMonth}`}
                                aria-hidden="true"
                                className={`ui-ranking-fill block h-full rounded-full ${
                                  normalizeName(service.name).includes('manten')
                                    ? 'ui-control-fill-maintenance'
                                    : normalizeName(service.name).includes('repar')
                                      ? 'ui-control-fill-repair'
                                      : 'ui-ranking-fill-products'
                                }`}
                                style={{ width: `${(product.count / maxCount) * 100}%`, animationDelay: `${index * 60}ms` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <section className="ui-surface ui-ranking-card rounded-2xl p-5">
              <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="ui-muted text-[0.62rem] font-semibold uppercase tracking-[0.18em]">{t('controlServicios.serviceVolume')}</p>
                  <h2 className="ui-heading mt-1 text-xl font-semibold">{t('controlServicios.topProviders')}</h2>
                </div>
                <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]">{t('controlServicios.top5')}</span>
              </header>
              {providers.length === 0 ? <p className="ui-muted text-sm">{t('controlServicios.emptyProviders')}</p> : (
                <div className="space-y-5">
                  {providers.map((provider, index) => (
                    <div key={provider.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span className="ui-heading min-w-0 font-medium">{provider.name}</span>
                        <span className="ui-heading shrink-0 font-semibold">{formatCurrency(provider.spend, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="ui-muted">{t('controlServicios.serviceCount')}: {formatNumber(provider.count, locale)}</span>
                        <span className="ui-muted">{t('controlServicios.providerSpend')}</span>
                      </div>
                      <div className="ui-ranking-bar h-2.5 overflow-hidden rounded-full">
                        <span
                          key={`${provider.id}-${selectedYear}-${selectedMonth}`}
                          aria-hidden="true"
                          className="ui-ranking-fill ui-ranking-fill-clients block h-full rounded-full"
                          style={{ width: `${(provider.spend / maxProviderSpend) * 100}%`, animationDelay: `${index * 60}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}
    </section>
  );
}
