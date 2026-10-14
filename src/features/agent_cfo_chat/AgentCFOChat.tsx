import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import {
  AgentCfoChatApiError,
  MAX_QUESTION_LENGTH,
  askCfoAgent,
  type AgentCfoChatErrorKind,
  type CfoAgentReply,
  type CfoSourceType,
} from './agentCfoChatApi';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  sources?: CfoAgentReply['sources'];
};

type FailedQuestion = {
  id: number;
  text: string;
};

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

const errorTranslationKeys: Record<AgentCfoChatErrorKind, TranslationKey> = {
  configuration: 'agentCfoChat.errorConfiguration',
  network: 'agentCfoChat.errorNetwork',
  timeout: 'agentCfoChat.errorTimeout',
  request: 'agentCfoChat.errorRequest',
  auth: 'agentCfoChat.errorAuth',
  response: 'agentCfoChat.errorResponse',
  server: 'agentCfoChat.errorServer',
};

const sourceTranslationKeys: Record<CfoSourceType, TranslationKey> = {
  pdf: 'agentCfoChat.sourcePdf',
  sales: 'agentCfoChat.sourceSales',
  purchases: 'agentCfoChat.sourcePurchases',
  stock: 'agentCfoChat.sourceStock',
};

export default function AgentCFOChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<FailedQuestion | null>(null);
  const [errorKind, setErrorKind] = useState<AgentCfoChatErrorKind | null>(null);
  const nextMessageId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function requestReply(question: FailedQuestion) {
    setIsSending(true);
    setErrorKind(null);

    try {
      const reply = await askCfoAgent(question.text);
      setMessages((current) => [
        ...current,
        {
          id: ++nextMessageId.current,
          role: 'assistant',
          text: reply.answer,
          sources: reply.sources,
        },
      ]);
      setFailedQuestion(null);
      setDraft('');
    } catch (error) {
      const kind = error instanceof AgentCfoChatApiError ? error.kind : 'server';
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
          <h1 className="ui-heading text-2xl font-bold tracking-tight sm:text-3xl">{t('agentCfoChat.title')}</h1>
          <p className="ui-muted mt-2 max-w-3xl text-sm leading-6">{t('agentCfoChat.description')}</p>
        </div>
      </header>

      <div className="ui-surface flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-3xl">
        <div
          aria-label={t('agentCfoChat.history')}
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
              <p className="ui-heading mt-5 text-lg font-semibold">{t('agentCfoChat.welcome')}</p>
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
                {message.role === 'user' ? t('agentCfoChat.you') : t('agentCfoChat.assistant')}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                  <p className="ui-muted mb-2 text-xs font-semibold">{t('agentCfoChat.sources')}</p>
                  <ul className="ui-muted space-y-1 text-xs">
                    {message.sources.map((source) => (
                      <li key={source.id} className="break-words">
                        <span className="font-semibold">{t(sourceTranslationKeys[source.type])}:</span>{' '}
                        {source.reference}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}

          {isSending && (
            <p className="ui-muted mr-auto flex items-center gap-2 text-sm" role="status">
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
              {t('agentCfoChat.sending')}
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
                  {t('agentCfoChat.retry')}
                </button>
              )}
            </div>
          )}

          <form className="flex items-end gap-3" onSubmit={(event) => void sendQuestion(event)}>
            <label className="sr-only" htmlFor="agent-cfo-chat-question">{t('agentCfoChat.inputLabel')}</label>
            <textarea
              className="ui-chat-composer min-h-12 max-h-40 min-w-0 flex-1 resize-y rounded-xl px-4 py-3 text-sm leading-6"
              disabled={isSending}
              id="agent-cfo-chat-question"
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={t('agentCfoChat.inputPlaceholder')}
              rows={1}
              value={draft}
            />
            <button
              aria-label={t('agentCfoChat.send')}
              className="ui-chat-send inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed"
              disabled={isSending || !draft.trim()}
              type="submit"
            >
              <Send size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{t('agentCfoChat.send')}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
