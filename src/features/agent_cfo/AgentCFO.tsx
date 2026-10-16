import { useEffect, useState, type FormEvent } from 'react';
import { Eye, FileStack, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/LanguageContext';
import DocumentViewerDialog from './DocumentViewerDialog';
import {
  AgentCfoApiError,
  MAX_PDF_SIZE_BYTES,
  ingestDocument,
  listDocuments,
  type AgentCfoApiErrorKind,
  type DocumentRecord,
} from './agentCfoApi';

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

const uploadErrorTranslationKeys: Record<AgentCfoApiErrorKind, TranslationKey> = {
  configuration: 'agentCFO.errorConfiguration',
  network: 'agentCFO.errorNetwork',
  unsupportedFile: 'agentCFO.errorUnsupportedFile',
  invalidPdf: 'agentCFO.errorInvalidPdf',
  tooLarge: 'agentCFO.errorTooLarge',
  request: 'agentCFO.errorRequest',
  auth: 'agentCFO.errorAuth',
  response: 'agentCFO.errorResponse',
  server: 'agentCFO.errorServer',
  list: 'agentCFO.errorList',
};

function formatDate(value: string | null, language: string, dateOnly = false): string {
  if (!value) {
    return '';
  }

  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
}

export default function AgentCFO() {
  const { language, t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasListError, setHasListError] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);
  const [requiredError, setRequiredError] = useState(false);
  const [uploadError, setUploadError] = useState<AgentCfoApiErrorKind | null>(null);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [viewedDocument, setViewedDocument] = useState<{ id: string; path: string; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [department, setDepartment] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [summary, setSummary] = useState('');

  async function refreshDocuments() {
    setIsLoading(true);
    setHasListError(false);
    try {
      setDocuments(await listDocuments());
    } catch {
      setHasListError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshDocuments();
  }, []);

  function closeForm() {
    if (isUploading) {
      return;
    }
    setIsFormOpen(false);
    setUploadError(null);
    setFileError(false);
  }

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    setUploadSucceeded(false);

    const missingRequiredFields = !title.trim() || !documentType.trim() || !department.trim() || !issueDate;
    if (!selectedFile) {
      setFileError(true);
      setRequiredError(missingRequiredFields);
      return;
    }

    const invalidFile = !selectedFile.name.toLowerCase().endsWith('.pdf')
      || selectedFile.type !== 'application/pdf'
      || selectedFile.size > MAX_PDF_SIZE_BYTES;

    if (invalidFile || missingRequiredFields) {
      setFileError(invalidFile);
      setRequiredError(missingRequiredFields);
      return;
    }

    setFileError(false);
    setRequiredError(false);
    setIsUploading(true);
    try {
      await ingestDocument({
        file: selectedFile,
        titulo: title.trim(),
        tipo_documento: documentType.trim(),
        departamento_origen: department.trim(),
        fecha_emision: issueDate,
        resumen_ejecutivo: summary,
      });
      setIsFormOpen(false);
      setUploadSucceeded(true);
      setSelectedFile(null);
      setTitle('');
      setDocumentType('');
      setDepartment('');
      setIssueDate('');
      setSummary('');
      await refreshDocuments();
    } catch (error) {
      setUploadError(error instanceof AgentCfoApiError ? error.kind : 'network');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <span className="ui-home-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <FileStack size={23} aria-hidden="true" />
          </span>
          <div>
            <h1 className="ui-heading text-2xl font-bold tracking-tight sm:text-3xl">{t('agentCFO.title')}</h1>
            <p className="ui-muted mt-2 max-w-3xl text-sm leading-6">{t('agentCFO.description')}</p>
          </div>
        </div>
        <button
          className="ui-button ui-button-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          disabled={isUploading}
          onClick={() => {
            setIsFormOpen((current) => !current);
            setUploadError(null);
            setUploadSucceeded(false);
          }}
          type="button"
          aria-expanded={isFormOpen}
          aria-controls="agent-cfo-upload-form"
        >
          {isFormOpen ? <X size={17} aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}
          {isFormOpen ? t('agentCFO.cancel') : t('agentCFO.upload')}
        </button>
      </header>

      {uploadSucceeded && (
        <p className="ui-chat-assistant-message rounded-xl px-4 py-3 text-sm" role="status">
          {t('agentCFO.uploadSuccess')}
        </p>
      )}

      {isFormOpen && (
        <section
          aria-labelledby="agent-cfo-upload-title"
          className="ui-surface rounded-2xl p-4 sm:p-6"
          id="agent-cfo-upload-form"
        >
          <h2 className="ui-heading text-lg font-semibold" id="agent-cfo-upload-title">
            {t('agentCFO.uploadTitle')}
          </h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" noValidate onSubmit={(event) => void submitDocument(event)}>
            <div className="sm:col-span-2">
              <label className="ui-heading mb-2 block text-sm font-medium" htmlFor="agent-cfo-file">
                {t('agentCFO.file')}
              </label>
              <input
                accept=".pdf,application/pdf"
                className="ui-input w-full rounded-xl px-3 py-2.5 text-sm"
                disabled={isUploading}
                id="agent-cfo-file"
                onChange={(event) => {
                  setSelectedFile(event.currentTarget.files?.[0] ?? null);
                  setFileError(false);
                }}
                required
                type="file"
                aria-invalid={fileError}
                aria-describedby="agent-cfo-file-help"
              />
              <p className="ui-muted mt-1.5 text-xs" id="agent-cfo-file-help">{t('agentCFO.fileLimit')}</p>
              {fileError && <p className="ui-user-menu-error mt-1 text-sm" role="alert">{t('agentCFO.fileLimit')}</p>}
            </div>

            <div>
              <label className="ui-heading mb-2 block text-sm font-medium" htmlFor="agent-cfo-title">
                {t('agentCFO.titleLabel')}
              </label>
              <input
                className="ui-input w-full rounded-xl px-3 py-2.5 text-sm"
                disabled={isUploading}
                id="agent-cfo-title"
                maxLength={255}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setRequiredError(false);
                }}
                required
                aria-invalid={requiredError && !title.trim()}
                value={title}
              />
            </div>

            <div>
              <label className="ui-heading mb-2 block text-sm font-medium" htmlFor="agent-cfo-type">
                {t('agentCFO.type')}
              </label>
              <input
                className="ui-input w-full rounded-xl px-3 py-2.5 text-sm"
                disabled={isUploading}
                id="agent-cfo-type"
                maxLength={100}
                onChange={(event) => {
                  setDocumentType(event.target.value);
                  setRequiredError(false);
                }}
                placeholder={t('agentCFO.typePlaceholder')}
                required
                aria-invalid={requiredError && !documentType.trim()}
                value={documentType}
              />
            </div>

            <div>
              <label className="ui-heading mb-2 block text-sm font-medium" htmlFor="agent-cfo-department">
                {t('agentCFO.department')}
              </label>
              <input
                className="ui-input w-full rounded-xl px-3 py-2.5 text-sm"
                disabled={isUploading}
                id="agent-cfo-department"
                maxLength={100}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setRequiredError(false);
                }}
                placeholder={t('agentCFO.departmentPlaceholder')}
                required
                aria-invalid={requiredError && !department.trim()}
                value={department}
              />
            </div>

            <div>
              <label className="ui-heading mb-2 block text-sm font-medium" htmlFor="agent-cfo-date">
                {t('agentCFO.issueDate')}
              </label>
              <input
                className="ui-input w-full rounded-xl px-3 py-2.5 text-sm"
                disabled={isUploading}
                id="agent-cfo-date"
                onChange={(event) => {
                  setIssueDate(event.target.value);
                  setRequiredError(false);
                }}
                required
                type="date"
                aria-invalid={requiredError && !issueDate}
                value={issueDate}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="ui-heading mb-2 block text-sm font-medium" htmlFor="agent-cfo-summary">
                {t('agentCFO.summary')}
              </label>
              <textarea
                className="ui-input min-h-24 w-full resize-y rounded-xl px-3 py-2.5 text-sm"
                disabled={isUploading}
                id="agent-cfo-summary"
                onChange={(event) => setSummary(event.target.value)}
                value={summary}
              />
            </div>

            {uploadError && (
              <p className="ui-user-menu-error sm:col-span-2" role="alert">
                {t(uploadErrorTranslationKeys[uploadError])}
              </p>
            )}
            {requiredError && <p className="ui-user-menu-error sm:col-span-2" role="alert">{t('agentCFO.errorRequired')}</p>}

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                className="ui-button ui-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                disabled={isUploading}
                type="submit"
              >
                {isUploading && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
                {isUploading ? t('agentCFO.uploading') : t('agentCFO.submit')}
              </button>
              <button
                className="ui-button ui-button-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
                disabled={isUploading}
                onClick={closeForm}
                type="button"
              >
                {t('agentCFO.cancel')}
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="agent-cfo-documents-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="ui-heading text-xl font-semibold" id="agent-cfo-documents-title">
            {t('agentCFO.documents')}
          </h2>
          <button
            className="ui-button ui-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            disabled={isLoading}
            onClick={() => void refreshDocuments()}
            type="button"
          >
            <RefreshCw size={15} aria-hidden="true" />
            {hasListError ? t('agentCFO.retry') : t('agentCFO.refresh')}
          </button>
        </div>

        {isLoading ? (
          <p className="ui-muted flex items-center gap-2 text-sm" role="status">
            <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            {t('agentCFO.loading')}
          </p>
        ) : hasListError ? (
          <p className="ui-chat-error rounded-xl px-4 py-3 text-sm" role="alert">{t('agentCFO.errorList')}</p>
        ) : documents.length === 0 ? (
          <div className="ui-surface rounded-2xl px-5 py-8 text-center">
            <p className="ui-muted text-sm">{t('agentCFO.empty')}</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {documents.map((document) => (
              <li className="ui-surface rounded-2xl p-4 sm:p-5" key={document.id_documento}>
                <article className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <h3 className="ui-heading break-words font-semibold">{document.titulo}</h3>
                    {document.resumen_ejecutivo && (
                      <p className="ui-muted mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                        {document.resumen_ejecutivo}
                      </p>
                    )}
                    <p className="ui-muted mt-3 break-all font-mono text-xs">
                      {t('agentCFO.documentId')}: {document.id_documento}
                    </p>
                  </div>
                  <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="min-w-0">
                      <dt className="ui-muted text-xs">{t('agentCFO.documentType')}</dt>
                      <dd className="ui-heading mt-1 break-words">{document.tipo_documento}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="ui-muted text-xs">{t('agentCFO.departmentColumn')}</dt>
                      <dd className="ui-heading mt-1 break-words">{document.departamento_origen}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="ui-muted text-xs">{t('agentCFO.documentDate')}</dt>
                      <dd className="ui-heading mt-1">{formatDate(document.fecha_emision, language, true)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="ui-muted text-xs">{t('agentCFO.uploadDate')}</dt>
                      <dd className="ui-heading mt-1">{formatDate(document.created_at, language)}</dd>
                    </div>
                  </dl>
                  <div className="sm:col-span-2">
                    <button
                      aria-label={`${t('agentCFO.view')}: ${document.titulo}`}
                      className="ui-button ui-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                      onClick={() => setViewedDocument({ id: document.id_documento, path: document.url_storage, title: document.titulo })}
                      type="button"
                    >
                      <Eye size={15} aria-hidden="true" />
                      {t('agentCFO.view')}
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewedDocument && (
        <DocumentViewerDialog
          key={viewedDocument.id}
          onClose={() => setViewedDocument(null)}
          storagePath={viewedDocument.path}
          title={viewedDocument.title}
        />
      )}
    </section>
  );
}
