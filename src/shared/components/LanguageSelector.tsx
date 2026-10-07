import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

export default function LanguageSelector({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const { t, language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const options = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    const currentIndex = options.indexOf(event.currentTarget);
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = options.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      options[nextIndex]?.focus();
    }
  }

  function selectLanguage(nextLanguage: 'es' | 'ca' | 'en') {
    setLanguage(nextLanguage);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={containerRef}
      className={`ui-language-control relative mb-2 flex h-10 items-center gap-2 rounded-xl px-2 ${
        isCollapsed ? 'md:justify-center md:px-0' : ''
      }`}
    >
      <Languages size={17} className="ui-language-icon shrink-0" aria-hidden="true" />
      <span className={`ui-muted min-w-0 flex-1 truncate text-xs ${isCollapsed ? 'md:hidden' : ''}`}>
        {t(`language.${language}`)}
      </span>
      <ChevronDown
        size={14}
        className={`ui-language-chevron shrink-0 ${isCollapsed ? 'md:hidden' : ''}`}
        aria-hidden="true"
      />
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('login.language')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="sidebar-language-options"
        onClick={() => setIsOpen((open) => !open)}
        className="ui-language-sidebar-trigger absolute inset-0 rounded-xl"
      />
      {isOpen && (
        <div
          id="sidebar-language-options"
          role="listbox"
          aria-label={t('login.language')}
          className="ui-language-menu ui-language-sidebar-menu absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl p-1"
        >
          {(['es', 'ca', 'en'] as const).map((optionLanguage) => (
            <button
              key={optionLanguage}
              type="button"
              role="option"
              aria-selected={language === optionLanguage}
              onKeyDown={handleOptionKeyDown}
              onClick={() => selectLanguage(optionLanguage)}
              className="ui-language-option w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none"
            >
              {t(`language.${optionLanguage}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
