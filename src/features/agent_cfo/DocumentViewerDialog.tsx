import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ExternalLink, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { AgentCfoApiError, getDocumentSignedUrl, type AgentCfoApiErrorKind } from './agentCfoApi';

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error'; kind: AgentCfoApiErrorKind };

const viewerErrorKeys: Record<AgentCfoApiErrorKind, TranslationKey> = {
  configuration: 'agentCFO.errorConfiguration',
  network: 'agentCFO.viewerErrorNetwork',
  unsupportedFile: 'agentCFO.viewerErrorGeneric',
  invalidPdf: 'agentCFO.viewerErrorGeneric',
  tooLarge: 'agentCFO.viewerErrorGeneric',
  request: 'agentCFO.viewerErrorNotFound',
  auth: 'agentCFO.errorAuth',
  response: 'agentCFO.viewerErrorResponse',
  server: 'agentCFO.viewerErrorGeneric',
  list: 'agentCFO.viewerErrorGeneric',
};

const focusableSelector = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

type Props = {
  storagePath: string;
  title: string;
  onClose: () => void;
};

// Mounted only while a document is selected, so closing discards the signed URL and all viewer state.
export default function DocumentViewerDialog({ storagePath, title, onClose }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<ViewerState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getDocumentSignedUrl(storagePath)
      .then(({ signed_url }) => {
        if (!cancelled) {
          setState({ status: 'ready', url: signed_url });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', kind: error instanceof AgentCfoApiError ? error.kind : 'network' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath, attempt]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6" onKeyDown={handleKeyDown}>
      <button
        aria-hidden="true"
        className="ui-drawer-backdrop absolute inset-0"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="ui-surface relative flex h-full max-h-[56rem] w-full max-w-6xl flex-col gap-3 rounded-2xl p-3 sm:p-5"
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3">
          <h2 className="ui-heading min-w-0 break-words text-lg font-semibold" id={titleId}>
            {t('agentCFO.viewerTitle')}: {title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {state.status === 'ready' && (
              <a
                className="ui-button ui-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                href={state.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink size={15} aria-hidden="true" />
                {t('agentCFO.viewerOpenTab')}
              </a>
            )}
            <button
              className="ui-button ui-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
              onClick={onClose}
              ref={closeRef}
              type="button"
            >
              <X size={15} aria-hidden="true" />
              {t('agentCFO.viewerClose')}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {state.status === 'loading' && (
            <p className="ui-muted flex items-center gap-2 text-sm" role="status">
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
              {t('agentCFO.viewerLoading')}
            </p>
          )}
          {state.status === 'error' && (
            <div className="flex flex-col items-start gap-3">
              <p className="ui-chat-error rounded-xl px-4 py-3 text-sm" role="alert">
                {t(viewerErrorKeys[state.kind])}
              </p>
              <button
                className="ui-button ui-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                onClick={() => setAttempt((current) => current + 1)}
                type="button"
              >
                <RefreshCw size={15} aria-hidden="true" />
                {t('agentCFO.viewerRetry')}
              </button>
            </div>
          )}
          {state.status === 'ready' && (
            <iframe
              className="h-full min-h-0 w-full flex-1 rounded-xl border-0 bg-white"
              referrerPolicy="no-referrer"
              src={state.url}
              title={`${t('agentCFO.viewerFrameTitle')}: ${title}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
