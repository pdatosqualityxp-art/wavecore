import { useEffect, useState } from 'react';
import { LogOut, RefreshCw, Waves } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { useTranslation } from '../../shared/i18n/LanguageContext';

const MAX_ROWS_PER_TABLE = 50;

interface TableContent {
  name: string;
  rows: unknown[];
  error: string | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function getConfiguredTableNames(): string[] {
  const configuredTables = import.meta.env.VITE_SUPABASE_TABLES?.trim();
  if (!configuredTables) {
    return [];
  }

  const tableNames = [...new Set(configuredTables.split(',').map((name) => name.trim()))];
  const invalidTableNames = tableNames.filter((name) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name));
  if (invalidTableNames.length > 0) {
    throw new Error(`Invalid table name(s) in VITE_SUPABASE_TABLES: ${invalidTableNames.join(', ')}`);
  }

  return tableNames;
}

async function fetchTableContent(name: string): Promise<TableContent> {
  try {
    const { data, error } = await supabase
      .from(name)
      .select('*')
      .limit(MAX_ROWS_PER_TABLE);

    if (error) {
      return { name, rows: [], error: error.message };
    }
    return { name, rows: data ?? [], error: null };
  } catch (error) {
    return { name, rows: [], error: getErrorMessage(error) };
  }
}

export default function TestLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadTables() {
      setIsLoading(true);
      setError(null);
      setTables([]);

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        if (!data.session) {
          navigate('/login', { replace: true });
          return;
        }

        const tableNames = getConfiguredTableNames();
        const tableContents = await Promise.all(tableNames.map(fetchTableContent));
        if (isCurrent) {
          setTables(tableContents);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadTables();
    return () => {
      isCurrent = false;
    };
  }, [navigate, reloadKey]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setActionError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      navigate('/login', { replace: true });
    } catch (signOutError) {
      setActionError(getErrorMessage(signOutError));
      setIsSigningOut(false);
    }
  }

  return (
    <main className="ui-page min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-4 inline-flex items-center gap-2.5">
              <span className="ui-brand-mark flex h-10 w-10 items-center justify-center rounded-xl">
                <Waves size={22} aria-hidden="true" />
              </span>
              <span className="ui-heading text-lg font-bold tracking-tight">{t('brand.name')}</span>
            </div>
            <h1 className="ui-heading text-3xl font-bold tracking-tight">{t('testLogin.title')}</h1>
            <p className="ui-muted mt-2 max-w-2xl text-sm leading-6">
              {t('testLogin.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              disabled={isLoading}
              className="ui-button ui-button-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60"
            >
              <RefreshCw size={16} aria-hidden="true" />
              {t('testLogin.refresh')}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className="ui-button ui-button-contrast inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden="true" />
              {isSigningOut ? t('testLogin.signingOut') : t('testLogin.signOut')}
            </button>
          </div>
        </header>

        {actionError && (
          <p role="alert" className="ui-alert mb-5 rounded-xl px-4 py-3 text-sm">
            {t('testLogin.signOutError')} {actionError}
          </p>
        )}

        {isLoading && (
          <p role="status" className="ui-surface ui-muted rounded-2xl p-6 text-sm">
            {t('testLogin.loadingTables')}
          </p>
        )}

        {error && (
          <div role="alert" className="ui-alert rounded-2xl p-6 text-sm">
            <p className="font-semibold">{t('testLogin.loadError')}</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">{error}</pre>
          </div>
        )}

        {!isLoading && !error && tables.length === 0 && (
          <p className="ui-surface ui-muted rounded-2xl p-6 text-sm">
            {t('testLogin.noTables')}
          </p>
        )}

        {!isLoading && !error && tables.length > 0 && (
          <>
            <p className="ui-muted mb-4 text-xs">{t('testLogin.rowLimit')}</p>
            <div className="space-y-5">
              {tables.map((table) => (
                <section
                  key={table.name}
                  className="ui-surface overflow-hidden rounded-2xl shadow-sm"
                >
                  <header className="ui-divider flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
                    <h2 className="font-mono text-base font-semibold">{table.name}</h2>
                    <span className="ui-muted text-xs">
                      {table.rows.length} {t('testLogin.rows')}
                    </span>
                  </header>
                  {table.error ? (
                    <div className="ui-alert-strong p-5 text-sm">
                      <p>{t('testLogin.tableError')}</p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">{table.error}</pre>
                    </div>
                  ) : table.rows.length === 0 ? (
                    <p className="ui-muted p-5 text-sm">{t('testLogin.noRows')}</p>
                  ) : (
                    <div className="space-y-3 p-4 sm:p-5">
                      {table.rows.map((row, index) => (
                        <pre
                          key={`${table.name}-${index}`}
                          className="ui-code overflow-x-auto rounded-xl p-4 text-xs leading-5"
                        >
                          {JSON.stringify(row, null, 2) ?? String(row)}
                        </pre>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
