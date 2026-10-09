import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import { askCompanyAssistant, ChatApiError, type ChatApiErrorKind } from './agentCompanyApi';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

type FailedQuestion = {
  id: number;
  text: string;
};

const errorTranslationKeys: Record<ChatApiErrorKind, Parameters<ReturnType<typeof useTranslation>['t']>[0]> = {
  auth: 'agentCompany.errorAuth',
  network: 'agentCompany.errorNetwork',
  timeout: 'agentCompany.errorTimeout',
  request: 'agentCompany.errorRequest',
  response: 'agentCompany.errorResponse',
  server: 'agentCompany.errorServer',
};

export default function AgentCompany() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<FailedQuestion | null>(null);
  const [errorKind, setErrorKind] = useState<ChatApiErrorKind | null>(null);
  const nextMessageId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function requestReply(question: FailedQuestion) {
    setIsSending(true);
    setErrorKind(null);

    try {
      const reply = await askCompanyAssistant(question.text);
      const answer = { id: ++nextMessageId.current, role: 'assistant' as const, text: reply };
      setMessages((current) => [
        ...current,
        answer,
      ]);
      setFailedQuestion(null);
      setDraft('');
    } catch (error) {
      const kind = error instanceof ChatApiError ? error.kind : 'server';
      setFailedQuestion(question);
      setErrorKind(kind);
      setDraft(question.text);
    } finally {
      setIsSending(false);
    }
  }

  async function sendQuestion(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const questionText = draft.trim();
    if (!questionText || isSending) {
      return;
    }

    const question = { id: ++nextMessageId.current, text: questionText };
    setMessages((current) => [...current, { ...question, role: 'user' }]);
    setFailedQuestion(null);
    setErrorKind(null);
    setDraft('');
    await requestReply(question);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendQuestion();
    }
  }

  function retryFailedQuestion() {
    if (failedQuestion && !isSending) {
      void requestReply(failedQuestion);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col gap-5">
      <header className="flex items-start gap-4">
        <span className="ui-home-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
          <Bot size={23} aria-hidden="true" />
        </span>
        <div>
          <h1 className="ui-heading text-2xl font-bold tracking-tight sm:text-3xl">{t('agentCompany.title')}</h1>
          <p className="ui-muted mt-2 max-w-3xl text-sm leading-6">{t('agentCompany.description')}</p>
        </div>
      </header>

      <div className="ui-surface flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-3xl">
        <div
          aria-label={t('agentCompany.history')}
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-7"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.length === 0 && (
            <div className="m-auto flex max-w-lg flex-col items-center text-center">
              <span className="ui-home-icon-badge flex h-14 w-14 items-center justify-center rounded-2xl">
                <MessageCircle size={25} aria-hidden="true" />
              </span>
              <p className="ui-heading mt-5 text-lg font-semibold">{t('agentCompany.welcome')}</p>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                message.role === 'user'
                  ? 'ui-chat-user-message ml-auto'
                  : 'ui-chat-assistant-message mr-auto'
              }`}
            >
              <p className="ui-muted mb-1 text-xs font-semibold">
                {message.role === 'user' ? t('agentCompany.you') : t('agentCompany.assistant')}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
            </article>
          ))}

          {isSending && (
            <p className="ui-muted mr-auto flex items-center gap-2 text-sm" role="status">
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
              {t('agentCompany.sending')}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[var(--color-border)] p-4 sm:p-5">
          {errorKind && (
            <div className="ui-chat-error mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm" role="alert">
              <span>{t(errorTranslationKeys[errorKind])}</span>
              {failedQuestion && errorKind !== 'request' && (
                <button
                  className="rounded-lg px-3 py-2 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                  disabled={isSending}
                  onClick={retryFailedQuestion}
                  type="button"
                >
                  {t('agentCompany.retry')}
                </button>
              )}
            </div>
          )}

          <form className="flex items-end gap-3" onSubmit={(event) => void sendQuestion(event)}>
            <label className="sr-only" htmlFor="agent-company-question">{t('agentCompany.inputLabel')}</label>
            <textarea
              className="ui-chat-composer min-h-12 max-h-40 min-w-0 flex-1 resize-y rounded-xl px-4 py-3 text-sm leading-6"
              disabled={isSending}
              id="agent-company-question"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={t('agentCompany.inputPlaceholder')}
              rows={1}
              value={draft}
            />
            <button
              aria-label={t('agentCompany.send')}
              className="ui-chat-send inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed"
              disabled={isSending || !draft.trim()}
              type="submit"
            >
              <Send size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{t('agentCompany.send')}</span>
            </button>
          </form>
          <p className="ui-muted mt-3 text-xs leading-5">{t('agentCompany.privacy')}</p>
        </div>
      </div>
    </section>
  );
}
