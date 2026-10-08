import { ArrowRight, BarChart3, Boxes, Database, Globe2, Radio, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../shared/i18n/LanguageContext';

export default function Home() {
  const { t } = useTranslation();
  const cards = [
    { icon: Boxes, label: t('home.strategy'), title: t('home.dashboardCard'), description: t('home.dashboardDescription') },
    { icon: Globe2, label: t('home.market'), title: t('home.marketCard'), description: t('home.marketDescription') },
    { icon: Radio, label: t('home.iot'), title: t('home.iotCard'), description: t('home.iotDescription') },
  ];
  const metrics = [
    { label: t('home.products'), value: '50' },
    { label: t('home.clients'), value: '20' },
    { label: t('home.interventions'), value: '150' },
  ];

  return (
    <div className="w-full space-y-6">
      <section className="ui-home-hero ui-surface relative overflow-hidden rounded-3xl p-6 sm:p-9 lg:p-11">
        <div className="relative z-10 max-w-3xl lg:pr-80">
          <span className="ui-accent-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
            <Sparkles size={13} aria-hidden="true" />
            {t('home.eyebrow')}
          </span>
          <h1 className="ui-heading mt-6 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t('home.title')}
          </h1>
          <p className="ui-muted mt-4 max-w-2xl text-sm leading-7 sm:text-base">
            {t('home.subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard" className="ui-button ui-button-primary ui-home-dashboard-button inline-flex items-center gap-2 px-5 py-3 text-sm">
              {t('home.openDashboard')}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/stack" className="ui-button ui-button-secondary inline-flex items-center px-5 py-3 text-sm">
              {t('home.exploreStack')}
            </Link>
          </div>
        </div>
        <div className="ui-home-quick-view relative z-10 mt-8 rounded-2xl p-5 lg:absolute lg:right-8 lg:top-8 lg:mt-0 lg:w-72">
          <div className="flex items-center justify-between">
            <div>
              <p className="ui-muted text-[0.625rem] font-semibold uppercase tracking-[0.2em]">{t('home.quickView')}</p>
              <h2 className="ui-heading mt-1 text-base font-semibold">{t('home.operationalControl')}</h2>
            </div>
            <span className="ui-home-icon-badge flex h-10 w-10 items-center justify-center rounded-xl">
              <BarChart3 size={19} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {metrics.map((metric, index) => (
              <div key={metric.label} className="ui-home-metric-row flex items-center justify-between rounded-xl px-3 py-3">
                <span className="flex items-center gap-2 text-xs">
                  {index === 0 ? <Database size={15} aria-hidden="true" /> : index === 1 ? <Globe2 size={15} aria-hidden="true" /> : <Radio size={15} aria-hidden="true" />}
                  {metric.label}
                </span>
                <strong className="ui-heading text-sm">{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label={t('home.capabilities')} className="grid gap-4 lg:grid-cols-3">
        {cards.map(({ icon: Icon, label, title, description }) => (
          <article key={title} className="ui-home-card ui-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="ui-home-icon-badge flex h-10 w-10 items-center justify-center rounded-xl">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="ui-home-pill rounded-full px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-widest">{label}</span>
            </div>
            <h2 className="ui-heading mt-5 text-lg font-semibold">{title}</h2>
            <p className="ui-muted mt-2 text-sm leading-6">{description}</p>
          </article>
        ))}
      </section>

      <section className="ui-home-data ui-surface rounded-2xl p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="ui-home-database-icon flex h-10 w-10 items-center justify-center rounded-xl">
              <Database size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="ui-muted text-[0.6rem] font-semibold uppercase tracking-[0.2em]">{t('home.data')}</p>
              <h2 className="ui-heading text-base font-semibold">{t('home.databaseStatus')}</h2>
            </div>
          </div>
          <span className="ui-home-pill rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-widest">{t('brand.name')}</span>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="ui-home-stat rounded-xl p-4">
              <p className="ui-muted text-[0.6rem] font-semibold uppercase tracking-[0.2em]">{metric.label}</p>
              <p className="ui-heading mt-2 text-2xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
