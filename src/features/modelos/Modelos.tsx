import { useState } from 'react';
import { Coffee, Package, Shapes } from 'lucide-react';
import auraLogo from '../../assets/models/aura_logo.png';
import aura2 from '../../assets/models/aura2.png';
import aura3 from '../../assets/models/aura3.png';
import atlasLogo from '../../assets/models/atlas_logo.png';
import atlas2 from '../../assets/models/atlas2.png';
import atlas3 from '../../assets/models/atlas3.png';
import novaLogo from '../../assets/models/nova_logo.png';
import nova1 from '../../assets/models/nova1.png';
import nova2 from '../../assets/models/nova2.png';
import { useTranslation } from '../../shared/i18n/LanguageContext';

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

const families = [
  {
    id: 'nova',
    titleKey: 'models.family.nova',
    logo: novaLogo,
    models: [
      { nameKey: 'models.product.nova1', image: nova1 },
      { nameKey: 'models.product.nova2', image: nova2 },
    ],
  },
  {
    id: 'atlas',
    titleKey: 'models.family.atlas',
    logo: atlasLogo,
    models: [
      { nameKey: 'models.product.atlas2', image: atlas2 },
      { nameKey: 'models.product.atlas3', image: atlas3 },
    ],
  },
  {
    id: 'aura',
    titleKey: 'models.family.aura',
    logo: auraLogo,
    models: [
      { nameKey: 'models.product.aura2', image: aura2 },
      { nameKey: 'models.product.aura3', image: aura3 },
    ],
  },
] as const satisfies readonly {
  id: string;
  titleKey: TranslationKey;
  logo: string;
  models: readonly { nameKey: TranslationKey; image: string }[];
}[];

function ProductImage({ name, source }: { name: string; source: string }) {
  const { t } = useTranslation();
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="ui-muted flex h-72 flex-col items-center justify-center gap-2 text-sm sm:h-80" role="status">
        <Package size={32} aria-hidden="true" />
        <span>{t('models.imageUnavailable')}</span>
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={name}
      loading="lazy"
      className="ui-model-card-image h-72 w-full object-contain p-2 sm:h-80 sm:p-4"
      onError={() => setHasError(true)}
    />
  );
}

function FamilyLogo({ family, source }: { family: string; source: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  return (
    <img
      src={source}
      alt=""
      aria-hidden="true"
      className="ui-model-family-logo h-16 w-auto max-w-32 object-contain sm:h-20 sm:max-w-48"
      onError={() => setHasError(true)}
      data-family={family}
    />
  );
}

export default function Modelos() {
  const { t } = useTranslation();

  return (
    <div className="w-full space-y-7">
      <header className="ui-surface flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="ui-home-icon-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
          <Coffee size={27} aria-hidden="true" />
        </span>
        <div>
          <h1 className="ui-heading text-2xl font-bold tracking-tight sm:text-3xl">{t('models.title')}</h1>
          <p className="ui-muted mt-2 max-w-3xl text-sm leading-7 sm:text-base">{t('models.description')}</p>
        </div>
      </header>

      <div className="space-y-6">
        {families.map(({ id, titleKey, logo, models }) => (
          <section key={id} aria-labelledby={`models-${id}-heading`}>
            <div className="mb-4 flex items-center gap-3 px-1">
              <span className="ui-home-icon-badge flex h-10 w-10 items-center justify-center rounded-xl">
                <Shapes size={19} aria-hidden="true" />
              </span>
              <h2 id={`models-${id}-heading`} className="ui-heading text-lg font-semibold sm:text-xl">
                {t(titleKey)}
              </h2>
              <FamilyLogo family={id} source={logo} />
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {models.map(({ nameKey, image }) => {
                const name = t(nameKey);
                return (
                  <article key={nameKey} className="ui-model-card ui-surface min-w-0 rounded-2xl">
                    <div className="ui-model-card-image-wrap flex min-h-72 items-center justify-center sm:min-h-80">
                      <ProductImage name={name} source={image} />
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="ui-heading text-base font-semibold">{name}</h3>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
