import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RotateCcw, Search } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { fetchInterventions, type InterventionRecord } from './intervencionesApi';

type StatusCategory = 'open' | 'progress' | 'completed' | 'other';

type StatusOption = {
  value: string;
  category: StatusCategory;
  label: string;
};

function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function classifyStatus(value: string): StatusCategory {
  const normalized = normalizeName(value);
  if (/abiert|pendient|open|pending/.test(normalized)) return 'open';
  if (/curso|proces|progress|active/.test(normalized)) return 'progress';
  if (/termin|finaliz|complet|closed|finish/.test(normalized)) return 'completed';
  return 'other';
}

function getStatusOption(record: InterventionRecord, t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string): StatusOption {
  const status = record.estados_intervencion?.nom_estado?.trim() || record.id_estado?.trim() || t('interventions.unavailable');
  const category = classifyStatus(status);
  if (category === 'open') return { value: category, category, label: t('interventions.statusOpen') };
  if (category === 'progress') return { value: category, category, label: t('interventions.statusProgress') };
  if (category === 'completed') return { value: category, category, label: t('interventions.statusCompleted') };
  return { value: `other:${normalizeName(status)}`, category, label: status };
}

function getName(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fallback;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function getDateSortValue(value: string | null | undefined): number | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return year * 10_000 + month * 100 + day;
}

function statusClasses(category: StatusCategory): string {
  return {
    open: 'ui-intervention-status-open',
    progress: 'ui-intervention-status-progress',
    completed: 'ui-intervention-status-completed',
    other: 'ui-intervention-status-other',
  }[category];
}

function statusDotClasses(category: StatusCategory): string {
  return {
    open: 'ui-intervention-dot-open',
    progress: 'ui-intervention-dot-progress',
    completed: 'ui-intervention-dot-completed',
    other: 'ui-intervention-dot-other',
  }[category];
}

export default function Intervenciones() {
  const { t, language } = useTranslation();
  const [records, setRecords] = useState<InterventionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [searchId, setSearchId] = useState('');
  const locale = language === 'en' ? 'en-US' : language === 'ca' ? 'ca-ES' : 'es-ES';

  useEffect(() => {
    let isCurrent = true;

    async function loadRecords() {
      setIsLoading(true);
      setHasError(false);
      try {
        const data = await fetchInterventions();
        if (isCurrent) setRecords(data);
      } catch (error) {
        console.error('Failed to load interventions:', error);
        if (isCurrent) {
          setRecords([]);
          setHasError(true);
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadRecords();
    return () => {
      isCurrent = false;
    };
  }, []);

  const statusOptions = useMemo(() => {
    const options = new Map<string, StatusOption>([
      ['open', { value: 'open', category: 'open', label: t('interventions.statusOpen') }],
      ['progress', { value: 'progress', category: 'progress', label: t('interventions.statusProgress') }],
      ['completed', { value: 'completed', category: 'completed', label: t('interventions.statusCompleted') }],
    ]);
    records.forEach((record) => {
      const option = getStatusOption(record, t);
      if (!options.has(option.value)) options.set(option.value, option);
    });
    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [locale, records, t]);

  const clientOptions = useMemo(() => {
    const options = new Map<string, string>();
    records.forEach((record) => {
      const name = getName(record.clientes?.nom_cliente, '');
      if (name && !options.has(normalizeName(name))) options.set(normalizeName(name), name);
    });
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], locale));
  }, [locale, records]);

  const productOptions = useMemo(() => {
    const options = new Map<string, string>();
    records.forEach((record) => {
      const name = getName(record.productos?.nom_prod, '');
      if (name && !options.has(normalizeName(name))) options.set(normalizeName(name), name);
    });
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], locale));
  }, [locale, records]);

  const filteredRecords = useMemo(() => {
    const query = searchId.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const status = getStatusOption(record, t);
      const clientName = normalizeName(record.clientes?.nom_cliente ?? '');
      const productName = normalizeName(record.productos?.nom_prod ?? '');
      const id = String(record.id_int ?? '').toLocaleLowerCase();
      return (selectedStatus === 'all' || status.value === selectedStatus)
        && (selectedClient === 'all' || clientName === selectedClient)
        && (selectedProduct === 'all' || productName === selectedProduct)
        && (!query || id.includes(query));
    }).sort((a, b) => {
      const dateA = getDateSortValue(a.fecha_aviso);
      const dateB = getDateSortValue(b.fecha_aviso);
      if (dateA === null) return dateB === null ? 0 : 1;
      if (dateB === null) return -1;
      return dateB - dateA;
    });
  }, [records, searchId, selectedClient, selectedProduct, selectedStatus, t]);

  function clearFilters() {
    setSelectedStatus('all');
    setSelectedClient('all');
    setSelectedProduct('all');
    setSearchId('');
  }

  function renderStatus(record: InterventionRecord, withDot: boolean) {
    const status = getStatusOption(record, t);
    const styles = statusClasses(status.category);
    return (
      <span className="inline-flex items-center gap-2">
        {withDot && (
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClasses(status.category)}`}
          />
        )}
        <span className={`ui-intervention-status ${styles} inline-flex rounded-full px-2.5 py-1 text-xs font-semibold`}>
          {status.label}
        </span>
      </span>
    );
  }

  function getFields(record: InterventionRecord) {
    const unavailable = t('interventions.unavailable');
    const id = String(record.id_int ?? unavailable);
    return [
      { label: t('interventions.id'), value: id },
      { label: t('interventions.noticeDate'), value: formatDate(record.fecha_aviso, locale, unavailable) },
      { label: t('interventions.interventionDate'), value: formatDate(record.fecha_int, locale, unavailable) },
      { label: t('interventions.client'), value: getName(record.clientes?.nom_cliente, unavailable) },
      { label: t('interventions.product'), value: getName(record.productos?.nom_prod, unavailable) },
      { label: t('interventions.service'), value: getName(record.servicios_intervencion?.nom_servicio, unavailable) },
    ];
  }

  function renderMobileFields(record: InterventionRecord) {
    return (
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {getFields(record).map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="ui-muted text-xs font-medium">{field.label}</dt>
            <dd className="ui-heading mt-1 break-words text-sm">{field.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="ui-muted text-xs font-medium">{t('interventions.status')}</dt>
          <dd className="mt-1">{renderStatus(record, false)}</dd>
        </div>
      </dl>
    );
  }

  const activeFilters = selectedStatus !== 'all' || selectedClient !== 'all' || selectedProduct !== 'all' || searchId.trim() !== '';

  return (
    <main className="ui-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <header className="flex items-start gap-4">
          <span className="ui-home-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <ClipboardList size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="ui-muted text-sm font-semibold">{t('menu.interventions')}</p>
            <h1 className="ui-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t('interventions.heading')}</h1>
            <p className="ui-muted mt-2 text-sm leading-6">{t('interventions.description')}</p>
          </div>
        </header>

        <section aria-label={t('interventions.heading')} className="ui-surface rounded-2xl p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block min-w-0">
              <span className="ui-muted mb-1.5 block text-xs font-semibold">{t('interventions.statusFilter')}</span>
              <select
                aria-label={t('interventions.statusFilter')}
                className="ui-input min-h-11 w-full rounded-xl px-3 text-sm"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="all">{t('interventions.all')}</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="ui-muted mb-1.5 block text-xs font-semibold">{t('interventions.clientFilter')}</span>
              <select
                aria-label={t('interventions.clientFilter')}
                className="ui-input min-h-11 w-full rounded-xl px-3 text-sm"
                value={selectedClient}
                onChange={(event) => setSelectedClient(event.target.value)}
              >
                <option value="all">{t('interventions.all')}</option>
                {clientOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="ui-muted mb-1.5 block text-xs font-semibold">{t('interventions.productFilter')}</span>
              <select
                aria-label={t('interventions.productFilter')}
                className="ui-input min-h-11 w-full rounded-xl px-3 text-sm"
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
              >
                <option value="all">{t('interventions.all')}</option>
                {productOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="ui-muted mb-1.5 block text-xs font-semibold">{t('interventions.searchId')}</span>
              <span className="relative block">
                <Search size={17} aria-hidden="true" className="ui-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  aria-label={t('interventions.searchId')}
                  className="ui-input min-h-11 w-full rounded-xl pl-10 pr-3 text-sm"
                  type="search"
                  placeholder={t('interventions.searchPlaceholder')}
                  value={searchId}
                  onChange={(event) => setSearchId(event.target.value)}
                />
              </span>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!activeFilters}
              className="ui-accent-text inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-[var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {t('interventions.clearFilters')}
            </button>
          </div>
        </section>

        {isLoading ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p role="status" className="ui-muted text-sm">{t('interventions.loading')}</p>
          </section>
        ) : hasError ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p role="alert" className="text-sm font-medium text-[var(--color-danger-text)]">{t('interventions.error')}</p>
          </section>
        ) : records.length === 0 ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p className="ui-muted text-sm">{t('interventions.empty')}</p>
          </section>
        ) : filteredRecords.length === 0 ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p className="ui-muted text-sm">{t('interventions.noMatches')}</p>
          </section>
        ) : (
          <>
            <section className="ui-surface hidden overflow-hidden rounded-2xl lg:block">
              <div className="overflow-x-auto">
                <table className="ui-interventions-table w-full min-w-[1120px] table-fixed text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="w-[7%] px-4 py-3">{t('interventions.status')}</th>
                      <th scope="col" className="w-[7%] px-4 py-3">{t('interventions.id')}</th>
                      <th scope="col" aria-sort="descending" className="w-[10%] px-4 py-3">{t('interventions.noticeDate')}</th>
                      <th scope="col" className="w-[15%] px-4 py-3">{t('interventions.interventionDate')}</th>
                      <th scope="col" className="w-[18%] px-4 py-3">{t('interventions.client')}</th>
                      <th scope="col" className="w-[24%] px-4 py-3">{t('interventions.product')}</th>
                      <th scope="col" className="w-[10%] px-4 py-3">{t('interventions.service')}</th>
                      <th scope="col" className="w-[9%] px-4 py-3">{t('interventions.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, index) => {
                      const fields = getFields(record);
                      return (
                        <tr key={`${record.id_int ?? 'intervention'}-${index}`} className="ui-interventions-row">
                          <td className="px-4 py-3.5">
                            <span className={`block h-4 w-4 rounded-full ${statusDotClasses(getStatusOption(record, t).category)}`} aria-hidden="true" />
                          </td>
                          {fields.map((field) => (
                            <td key={field.label} className={`ui-heading break-words px-4 py-3.5 align-middle text-sm ${field.label === t('interventions.id') ? 'ui-interventions-id' : ''}`}>
                              {field.value}
                            </td>
                          ))}
                          <td className="px-4 py-3.5 align-middle">{renderStatus(record, false)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <section aria-label={t('interventions.heading')} className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredRecords.map((record, index) => (
                <article key={`${record.id_int ?? 'intervention'}-${index}`} className="ui-surface min-w-0 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className={`h-4 w-4 shrink-0 rounded-full ${statusDotClasses(getStatusOption(record, t).category)}`} />
                      <span className="ui-heading truncate text-sm font-bold">{String(record.id_int ?? t('interventions.unavailable'))}</span>
                    </span>
                    {renderStatus(record, false)}
                  </div>
                  {renderMobileFields(record)}
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
