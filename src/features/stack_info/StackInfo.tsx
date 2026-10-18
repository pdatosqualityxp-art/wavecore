import {
  siFastapi,
  siGit,
  siGithub,
  siGithubactions,
  siGithubcopilot,
  siGooglegemini,
  siJavascript,
  siNodedotjs,
  siPostgresql,
  siPython,
  siReact,
  siRender,
  siSupabase,
  siTypescript,
  siVercel,
  siVite,
  siVitest,
  type SimpleIcon,
} from 'simple-icons';
import {
  Blocks,
  Braces,
  Code2,
  Cpu,
  Database,
  FileCode2,
  FileText,
  Layers3,
  Server,
  Workflow,
} from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

type Technology = {
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  logo?: SimpleIcon;
  icon?: typeof Code2;
};

const groups = [
  {
    titleKey: 'stack.section.development',
    icon: Code2,
    technologies: [
      { nameKey: 'stack.tech.vscode.name', descriptionKey: 'stack.tech.vscode.description', icon: Code2 },
      { nameKey: 'stack.tech.copilot.name', descriptionKey: 'stack.tech.copilot.description', logo: siGithubcopilot },
    ],
  },
  {
    titleKey: 'stack.section.frontend',
    icon: Layers3,
    technologies: [
      { nameKey: 'stack.tech.react.name', descriptionKey: 'stack.tech.react.description', logo: siReact },
      { nameKey: 'stack.tech.typescript.name', descriptionKey: 'stack.tech.typescript.description', logo: siTypescript },
      { nameKey: 'stack.tech.vite.name', descriptionKey: 'stack.tech.vite.description', logo: siVite },
      { nameKey: 'stack.tech.vitest.name', descriptionKey: 'stack.tech.vitest.description', logo: siVitest },
      { nameKey: 'stack.tech.vercelFrontend.name', descriptionKey: 'stack.tech.vercelFrontend.description', logo: siVercel },
    ],
  },
  {
    titleKey: 'stack.section.versionControl',
    icon: Workflow,
    technologies: [
      { nameKey: 'stack.tech.git.name', descriptionKey: 'stack.tech.git.description', logo: siGit },
      { nameKey: 'stack.tech.github.name', descriptionKey: 'stack.tech.github.description', logo: siGithub },
    ],
  },
  {
    titleKey: 'stack.section.data',
    icon: Database,
    technologies: [
      { nameKey: 'stack.tech.supabase.name', descriptionKey: 'stack.tech.supabase.description', logo: siSupabase },
      { nameKey: 'stack.tech.postgresql.name', descriptionKey: 'stack.tech.postgresql.description', logo: siPostgresql },
      { nameKey: 'stack.tech.storage.name', descriptionKey: 'stack.tech.storage.description', logo: siSupabase },
    ],
  },
] as const;

const backendOne: readonly Technology[] = [
  { nameKey: 'stack.tech.node.name', descriptionKey: 'stack.tech.node.description', logo: siNodedotjs },
  { nameKey: 'stack.tech.javascript.name', descriptionKey: 'stack.tech.javascript.description', logo: siJavascript },
  { nameKey: 'stack.tech.gemini.name', descriptionKey: 'stack.tech.gemini.description', logo: siGooglegemini },
  { nameKey: 'stack.tech.vercelBackend.name', descriptionKey: 'stack.tech.vercelBackend.description', logo: siVercel },
];

const backendTwo: readonly Technology[] = [
  { nameKey: 'stack.tech.fastapi.name', descriptionKey: 'stack.tech.fastapi.description', logo: siFastapi },
  { nameKey: 'stack.tech.python.name', descriptionKey: 'stack.tech.python.description', logo: siPython },
  { nameKey: 'stack.tech.gemini.name', descriptionKey: 'stack.tech.gemini.description', logo: siGooglegemini },
  { nameKey: 'stack.tech.render.name', descriptionKey: 'stack.tech.render.description', logo: siRender },
  { nameKey: 'stack.tech.actions.name', descriptionKey: 'stack.tech.actions.description', logo: siGithubactions },
];

const architecture: readonly Technology[] = [
  { nameKey: 'stack.tech.featureDriven.name', descriptionKey: 'stack.tech.featureDriven.description', icon: Blocks },
  { nameKey: 'stack.tech.clean.name', descriptionKey: 'stack.tech.clean.description', icon: FileCode2 },
];

function TechnologyCard({ technology }: { technology: Technology }) {
  const { t } = useTranslation();
  const Icon = technology.icon ?? Code2;
  const name = t(technology.nameKey);

  return (
    <article className="ui-stack-tech-card ui-surface flex min-w-0 items-start gap-4 rounded-2xl p-4 sm:p-5">
      <span className="ui-home-icon-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        {technology.logo ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill={`#${technology.logo.hex}`}
          >
            <path d={technology.logo.path} />
          </svg>
        ) : (
          <Icon size={21} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <h3 className="ui-heading text-sm font-semibold">{name}</h3>
        <p className="ui-muted mt-1 text-sm leading-6">{t(technology.descriptionKey)}</p>
      </div>
    </article>
  );
}

export default function StackInfo() {
  const { t } = useTranslation();

  return (
    <div className="w-full space-y-7">
      <header className="ui-surface flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="ui-home-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
          <Cpu size={27} aria-hidden="true" />
        </span>
        <div>
          <h1 className="ui-heading text-2xl font-bold tracking-tight sm:text-3xl">{t('stack.title')}</h1>
          <p className="ui-muted mt-2 max-w-3xl text-sm leading-7 sm:text-base">{t('stack.description')}</p>
        </div>
      </header>

      <div className="grid w-full items-start gap-6">
        {groups.map(({ titleKey, icon: Icon, technologies }) => (
          <section key={titleKey} aria-labelledby={titleKey}>
            <article className="ui-surface h-full rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="ui-home-icon-badge flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h2 id={titleKey} className="ui-heading text-lg font-semibold">{t(titleKey)}</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {technologies.map((technology) => (
                  <TechnologyCard key={technology.nameKey} technology={technology} />
                ))}
              </div>
            </article>
          </section>
        ))}
      </div>

      <section aria-labelledby="stack-backends-heading" className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <span className="ui-home-icon-badge flex h-9 w-9 items-center justify-center rounded-xl">
            <Server size={18} aria-hidden="true" />
          </span>
          <h2 id="stack-backends-heading" className="ui-heading text-lg font-semibold">{t('stack.section.backends')}</h2>
        </div>
        <div className="grid w-full items-start gap-4">
          <article className="ui-surface rounded-2xl p-5 sm:p-6">
            <h3 className="ui-heading text-base font-semibold">{t('stack.backend1.title')}</h3>
            <p className="ui-muted mt-2 text-sm leading-6">{t('stack.backend1.description')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {backendOne.map((technology) => (
                <TechnologyCard key={technology.nameKey} technology={technology} />
              ))}
            </div>
          </article>
          <article className="ui-surface rounded-2xl p-5 sm:p-6">
            <h3 className="ui-heading text-base font-semibold">{t('stack.backend2.title')}</h3>
            <p className="ui-muted mt-2 text-sm leading-6">{t('stack.backend2.description')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {backendTwo.map((technology) => (
                <TechnologyCard key={technology.nameKey} technology={technology} />
              ))}
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="stack-architecture-heading">
        <article className="ui-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="ui-home-icon-badge flex h-9 w-9 items-center justify-center rounded-xl">
              <Braces size={18} aria-hidden="true" />
            </span>
            <h2 id="stack-architecture-heading" className="ui-heading text-lg font-semibold">{t('stack.section.architecture')}</h2>
          </div>
          <p className="ui-muted mt-3 max-w-3xl text-sm leading-6">{t('stack.architectureDescription')}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {architecture.map((technology) => (
              <TechnologyCard key={technology.nameKey} technology={technology} />
            ))}
          </div>
          <p className="ui-subtle mt-4 flex items-start gap-2 text-xs leading-5">
            <FileText size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t('stack.architectureNote')}
          </p>
        </article>
      </section>
    </div>
  );
}
