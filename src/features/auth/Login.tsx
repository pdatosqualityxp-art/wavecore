import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRight, ChevronDown, Languages, LockKeyhole, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import logo from '../../assets/logo.png';

type LoginErrorKey = 'login.error' | 'login.guestProviderDisabled';

function isAnonymousProviderDisabled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'anonymous_provider_disabled'
  );
}

export default function Login() {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<LoginErrorKey | null>(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  async function authenticate(
    authenticateUser: () => Promise<{ error: unknown }>,
    isGuestSignIn = false,
  ) {
    setIsLoading(true);
    setErrorKey(null);

    try {
      const { error } = await authenticateUser();
      if (error) {
        setErrorKey(
          isGuestSignIn && isAnonymousProviderDisabled(error)
            ? 'login.guestProviderDisabled'
            : 'login.error',
        );
        return;
      }
      navigate('/', { replace: true });
    } catch {
      setErrorKey('login.error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate(() => supabase.auth.signInWithPassword({ email, password }));
  }

  function handleGuestLogin() {
    void authenticate(() => supabase.auth.signInAnonymously(), true);
  }

  function handleLanguageMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setIsLanguageMenuOpen(false);
    }
  }

  function selectLanguage(nextLanguage: 'es' | 'ca' | 'en') {
    setLanguage(nextLanguage);
    setIsLanguageMenuOpen(false);
  }

  return (
    <main className="dark ui-login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="login-glow-field absolute -inset-[35%]" />
        <div className="login-glow-sweep absolute -inset-y-1/2 -left-1/4 w-full" />
      </div>

      <section className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2.5" aria-label={t('brand.name')}>
            <img src={logo} alt={t('brand.name')} className="h-11 w-11 object-contain" />
            <span className="ui-login-heading text-lg font-bold tracking-tight">{t('brand.name')}</span>
          </a>

          <div className="relative" onKeyDown={handleLanguageMenuKeyDown}>
            <button
              type="button"
              aria-label={t('login.language')}
              aria-haspopup="listbox"
              aria-expanded={isLanguageMenuOpen}
              aria-controls="language-options"
              onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
              className="ui-language-trigger flex h-10 w-36 items-center justify-between rounded-xl px-3 text-sm font-medium outline-none transition"
            >
              <span className="flex items-center gap-2">
                <Languages size={16} className="ui-language-icon" aria-hidden="true" />
                {t(`language.${language}`)}
              </span>
              <ChevronDown size={15} className="ui-language-chevron" aria-hidden="true" />
            </button>
            {isLanguageMenuOpen && (
              <div
                id="language-options"
                role="listbox"
                aria-label={t('login.language')}
                className="ui-language-menu absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl p-1"
              >
                {(['es', 'ca', 'en'] as const).map((optionLanguage) => (
                  <button
                    key={optionLanguage}
                    type="button"
                    role="option"
                    aria-selected={language === optionLanguage}
                    onClick={() => selectLanguage(optionLanguage)}
                    className="ui-language-option w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none"
                  >
                    {t(`language.${optionLanguage}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ui-login-card rounded-3xl p-7 backdrop-blur-xl sm:p-9">
          <div className="mb-8">
            <span className="ui-accent-badge mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <LockKeyhole size={13} aria-hidden="true" />
              {t('login.eyebrow')}
            </span>
            <h1 className="ui-login-heading text-3xl font-bold tracking-tight">
              {t('login.title')}
            </h1>
            <p className="ui-login-muted mt-2 text-sm leading-6">
              {t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="ui-login-label mb-2 block text-sm font-medium">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="ui-login-input w-full rounded-xl px-4 py-3 text-sm outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="ui-login-label mb-2 block text-sm font-medium">
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="ui-login-input w-full rounded-xl px-4 py-3 text-sm outline-none transition"
              />
            </div>

            {errorKey && (
              <p role="alert" className="ui-alert rounded-xl px-4 py-3 text-sm">
                {t(errorKey)}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="ui-button ui-button-primary flex w-full items-center justify-center gap-2 px-4 py-3"
            >
              {isLoading ? t('login.loading') : t('login.submit')}
              {!isLoading && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>

          <div className="relative my-6 flex items-center">
            <div className="ui-divider flex-grow border-t" />
            <span className="ui-divider-label mx-3 shrink-0 text-xs">{t('login.divider')}</span>
            <div className="ui-divider flex-grow border-t" />
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="ui-button ui-button-guest flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
          >
            <UserRound size={17} aria-hidden="true" />
            {isLoading ? t('login.loading') : t('login.guest')}
          </button>
          <p className="ui-login-muted mt-3 text-center text-xs leading-5">
            {t('login.guestDescription')}
          </p>
        </div>
      </section>
    </main>
  );
}
