import { supabase } from '../../shared/lib/supabase';
import { getAuthorizationHeader, MissingSessionError } from '../../shared/lib/authHeader';

export const MAX_PDF_SIZE_BYTES = 10_000_000;

export type DocumentRecord = {
  id_documento: string;
  titulo: string;
  tipo_documento: string;
  departamento_origen: string;
  fecha_emision: string;
  resumen_ejecutivo: string | null;
  url_storage: string;
  created_at: string | null;
};

export type IngestDocumentInput = {
  file: File;
  titulo: string;
  tipo_documento: string;
  departamento_origen: string;
  fecha_emision: string;
  resumen_ejecutivo: string;
};

export type AgentCfoApiErrorKind =
  | 'configuration'
  | 'network'
  | 'unsupportedFile'
  | 'invalidPdf'
  | 'tooLarge'
  | 'request'
  | 'auth'
  | 'response'
  | 'server'
  | 'list';

export class AgentCfoApiError extends Error {
  constructor(readonly kind: AgentCfoApiErrorKind, readonly status?: number) {
    super(`Agent CFO request failed: ${kind}`);
    this.name = 'AgentCfoApiError';
  }
}

type IngestDocumentResponse = {
  id_documento: string;
  url_storage: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDocumentRecord(value: unknown): value is DocumentRecord {
  return isRecord(value)
    && typeof value.id_documento === 'string'
    && typeof value.titulo === 'string'
    && typeof value.tipo_documento === 'string'
    && typeof value.departamento_origen === 'string'
    && typeof value.fecha_emision === 'string'
    && (typeof value.resumen_ejecutivo === 'string' || value.resumen_ejecutivo === null)
    && typeof value.url_storage === 'string'
    && (typeof value.created_at === 'string' || value.created_at === null);
}

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new AgentCfoApiError('configuration');
  }

  try {
    const url = new URL(configuredUrl);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
      throw new AgentCfoApiError('configuration');
    }
  } catch (error) {
    if (error instanceof AgentCfoApiError) {
      throw error;
    }
    throw new AgentCfoApiError('configuration');
  }

  return configuredUrl.replace(/\/+$/, '');
}

function getHttpErrorKind(status: number): AgentCfoApiErrorKind {
  if (status === 400 || status === 422) {
    return status === 422 ? 'invalidPdf' : 'request';
  }
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 413) {
    return 'tooLarge';
  }
  if (status === 415) {
    return 'unsupportedFile';
  }
  return 'server';
}

function isIngestDocumentResponse(value: unknown): value is IngestDocumentResponse {
  return isRecord(value)
    && typeof value.id_documento === 'string'
    && value.id_documento.length > 0
    && typeof value.url_storage === 'string'
    && value.url_storage.length > 0;
}

export async function ingestDocument(input: IngestDocumentInput): Promise<IngestDocumentResponse> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('titulo', input.titulo);
  formData.append('tipo_documento', input.tipo_documento);
  formData.append('departamento_origen', input.departamento_origen);
  formData.append('fecha_emision', input.fecha_emision);
  if (input.resumen_ejecutivo.trim()) {
    formData.append('resumen_ejecutivo', input.resumen_ejecutivo.trim());
  }

  let response: Response;
  try {
    const authorization = await getAuthorizationHeader();
    response = await fetch(`${getApiBaseUrl()}/api/documents/ingest`, {
      method: 'POST',
      headers: authorization,
      body: formData,
    });
  } catch (error) {
    if (error instanceof AgentCfoApiError) {
      throw error;
    }
    if (error instanceof MissingSessionError) {
      throw new AgentCfoApiError('auth');
    }
    throw new AgentCfoApiError('network');
  }

  if (!response.ok) {
    throw new AgentCfoApiError(getHttpErrorKind(response.status), response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AgentCfoApiError('response', response.status);
  }

  if (response.status !== 201 || !isIngestDocumentResponse(data)) {
    throw new AgentCfoApiError('response', response.status);
  }

  return data;
}

export type DocumentSignedUrl = {
  signed_url: string;
  expires_in: number;
};

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export const DOCUMENTS_BUCKET = 'waveStorageTest';
const SIGNED_URL_TTL_SECONDS = 60;
const STORAGE_PATH_PATTERN = /^CFO_PDFs\/[A-Za-z0-9._-]+\.pdf$/i;

// The path comes from the `documentos` row already read under the user's RLS, never from free user input.
export async function getDocumentSignedUrl(storagePath: string): Promise<DocumentSignedUrl> {
  if (!STORAGE_PATH_PATTERN.test(storagePath) || storagePath.includes('..')) {
    throw new AgentCfoApiError('request');
  }

  let result: Awaited<ReturnType<ReturnType<typeof supabase.storage.from>['createSignedUrl']>>;
  try {
    result = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  } catch {
    throw new AgentCfoApiError('network');
  }

  const { data, error } = result;
  if (error) {
    const status = (error as { status?: number; statusCode?: string | number }).status
      ?? Number((error as { statusCode?: string | number }).statusCode);
    if (status === 401 || status === 403) {
      throw new AgentCfoApiError('auth', status);
    }
    if (status === 400 || status === 404) {
      throw new AgentCfoApiError('request', status);
    }
    throw new AgentCfoApiError('server');
  }

  if (!data || typeof data.signedUrl !== 'string' || !isHttpUrl(data.signedUrl)) {
    throw new AgentCfoApiError('response');
  }

  return { signed_url: data.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS };
}
export async function listDocuments(): Promise<DocumentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('documentos')
      .select('id_documento, titulo, tipo_documento, departamento_origen, fecha_emision, resumen_ejecutivo, url_storage, created_at')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data) || !data.every(isDocumentRecord)) {
      throw new AgentCfoApiError('list');
    }

    return data;
  } catch (error) {
    if (error instanceof AgentCfoApiError) {
      throw error;
    }
    throw new AgentCfoApiError('list');
  }
}
