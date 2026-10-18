import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, type LucideIcon } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

export type DataValue = string | number | null | undefined;
export type DataRow = Record<string, DataValue>;

export type DataColumn = {
  key: string;
  label: string;
  kind?: 'id' | 'text' | 'number' | 'money' | 'date';
};

type DataTablePageProps = {
  prefix: string;
  menuLabel: string;
  icon: LucideIcon;
  columns: DataColumn[];
  fetchRows: () => Promise<DataRow[]>;
  sortKey: string;
  sortDirection?: 'asc' | 'desc';
  titleKey: string;
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function parseDate(value: DataValue): Date | null {
  const match = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toNumber(value: DataValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatValue(value: DataValue, kind: DataColumn['kind'], locale: string, unavailable: string): string {
  if (value === null || value === undefined || String(value).trim() === '') return unavailable;
  if (kind === 'date') {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : unavailable;
  }
  if (kind === 'number') {
    const parsed = toNumber(value);
    return parsed === null ? unavailable : new Intl.NumberFormat(locale).format(parsed);
  }
  if (kind === 'money') {
    const parsed = toNumber(value);
    return parsed === null
      ? unavailable
      : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed);
  }
  return String(value).trim();
}

function compareValues(a: DataValue, b: DataValue, kind: DataColumn['kind'], locale: string): number {
  let result: number | null = null;
  if (kind === 'date') {
    const first = parseDate(a)?.getTime();
    const second = parseDate(b)?.getTime();
    if (first === undefined && second === undefined) return 0;
    if (first === undefined) return 1;
    if (second === undefined) return -1;
    result = first - second;
  } else if (kind === 'number' || kind === 'money') {
    const first = toNumber(a);
    const second = toNumber(b);
    if (first === null && second === null) return 0;
    if (first === null) return 1;
    if (second === null) return -1;
    result = first - second;
  }
  return result ?? String(a ?? '').localeCompare(String(b ?? ''), locale, { sensitivity: 'base', numeric: true });
}

export default function DataTablePage({
  prefix,
  menuLabel,
  icon: Icon,
  columns,
  fetchRows,
  sortKey,
  sortDirection = 'asc',
  titleKey,
}: DataTablePageProps) {
  const { t, language } = useTranslation();
  const k = (suffix: string) => t(`${prefix}.${suffix}` as Parameters<typeof t>[0]);
  const [records, setRecords] = useState<DataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetchRows()
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchRows]);

  const unavailable = t('dataTable.unavailable');

  const rows = useMemo(() => {
    const query = normalize(search);
    const sortColumn = columns.find((column) => column.key === sortKey);
    const direction = sortDirection === 'asc' ? 1 : -1;
    return records
      .map((record) => ({
        record,
        cells: columns.map((column) => formatValue(record[column.key], column.kind, language, unavailable)),
      }))
      .filter((row) => !query || normalize(row.cells.join(' ')).includes(query))
      .sort((a, b) => {
        const aEmpty = a.record[sortKey] === null || a.record[sortKey] === undefined;
        const bEmpty = b.record[sortKey] === null || b.record[sortKey] === undefined;
        if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
        return direction * compareValues(a.record[sortKey], b.record[sortKey], sortColumn?.kind, language);
      });
  }, [records, search, columns, sortKey, sortDirection, language, unavailable]);

  const titleIndex = Math.max(0, columns.findIndex((column) => column.key === titleKey));
  const isNumeric = (column: DataColumn) => column.kind === 'number' || column.kind === 'money';

  return (
    <main className="ui-page min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <header className="flex items-start gap-4">
          <span className="ui-home-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <Icon size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="ui-muted text-sm font-semibold">{menuLabel}</p>
            <h1 className="ui-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{k('heading')}</h1>
            <p className="ui-muted mt-2 text-sm leading-6">{k('description')}</p>
          </div>
        </header>

        <section aria-label={k('heading')} className="ui-surface rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className="ui-muted mb-1.5 block text-xs font-semibold">{k('search')}</span>
              <span className="relative block">
                <Search size={17} aria-hidden="true" className="ui-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  aria-label={k('search')}
                  className="ui-input min-h-11 w-full rounded-xl pl-10 pr-3 text-sm"
                  type="search"
                  placeholder={t('dataTable.searchPlaceholder')}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </span>
            </label>
            <button
              type="button"
              onClick={() => setSearch('')}
              disabled={search.trim() === ''}
              className="ui-accent-text inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-[var(--color-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {t('dataTable.clearSearch')}
            </button>
          </div>
          {!isLoading && !hasError && records.length > 0 && (
            <p role="status" className="ui-muted mt-3 text-xs">
              {t('dataTable.count').replace('{shown}', String(rows.length)).replace('{total}', String(records.length))}
            </p>
          )}
        </section>

        {isLoading ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p role="status" className="ui-muted text-sm">{k('loading')}</p>
          </section>
        ) : hasError ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p role="alert" className="text-sm font-medium text-[var(--color-danger-text)]">{k('error')}</p>
          </section>
        ) : records.length === 0 ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p className="ui-muted text-sm">{k('empty')}</p>
          </section>
        ) : rows.length === 0 ? (
          <section className="ui-surface rounded-2xl p-8 text-center">
            <p className="ui-muted text-sm">{k('noMatches')}</p>
          </section>
        ) : (
          <>
            <section className="ui-surface hidden overflow-hidden rounded-2xl md:block">
              <table className="ui-data-table w-full text-left text-sm">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} scope="col" className={`px-4 py-3 ${isNumeric(column) ? 'text-right' : ''}`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${index}-${row.cells[0]}`} className="ui-data-row">
                      {row.cells.map((cell, cellIndex) => (
                        <td
                          key={columns[cellIndex].key}
                          className={`ui-heading break-words px-4 py-3.5 align-top ${columns[cellIndex].kind === 'id' ? 'ui-data-id' : ''} ${isNumeric(columns[cellIndex]) ? 'text-right tabular-nums' : ''}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section aria-label={k('heading')} className="grid grid-cols-1 gap-3 md:hidden">
              {rows.map((row, index) => (
                <article key={`${index}-${row.cells[0]}`} className="ui-surface min-w-0 rounded-2xl p-4">
                  <p className="ui-heading break-words text-sm font-bold">{row.cells[titleIndex]}</p>
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {columns.map((column, cellIndex) => cellIndex === titleIndex ? null : (
                      <div key={column.key} className="min-w-0">
                        <dt className="ui-muted text-xs font-medium">{column.label}</dt>
                        <dd className="ui-heading mt-1 break-words text-sm">{row.cells[cellIndex]}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
