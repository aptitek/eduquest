import type { ApiErrorCode, ApiErrorPayload } from '@eduquest/shared';

export type ApiErrorLike = Partial<ApiErrorPayload> & {
  success?: boolean;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly errorCode: ApiErrorCode;
  readonly errorKey?: string;
  readonly payload?: ApiErrorLike;

  constructor(message: string, options: {
    status: number;
    errorCode?: ApiErrorCode;
    errorKey?: string;
    payload?: ApiErrorLike;
  }) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status;
    this.errorCode = options.errorCode || getErrorCodeForStatus(options.status);
    this.errorKey = options.errorKey;
    this.payload = options.payload;
  }
}

export function getErrorCodeForStatus(status: number): ApiErrorCode {
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'access_denied';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 413) return 'payload_too_large';
  if (status === 415) return 'unsupported_media_type';
  if (status === 503) return 'service_unavailable';
  if (status >= 500) return 'internal_error';
  return 'unknown_error';
}

export function getDefaultErrorMessage(code: ApiErrorCode): string {
  switch (code) {
    case 'bad_request':
      return 'The request could not be processed. Please check the submitted data.';
    case 'validation_failed':
      return 'Some submitted fields are invalid. Please review them and try again.';
    case 'unauthorized':
      return 'Authentication is required. Please sign in again.';
    case 'session_expired':
      return 'Your session expired. Please sign in again.';
    case 'access_denied':
      return 'Access denied. You do not have permission to do this.';
    case 'not_found':
      return 'The requested resource could not be found.';
    case 'conflict':
      return 'The request conflicts with the current state. Refresh and try again.';
    case 'payload_too_large':
      return 'The uploaded file or request is too large.';
    case 'unsupported_media_type':
      return 'This file or content type is not supported.';
    case 'service_unavailable':
      return 'This service is temporarily unavailable. Please try again later.';
    case 'server_configuration':
      return 'The server is not configured correctly. Please contact an administrator.';
    case 'network_error':
      return 'The network request failed. Check your connection and try again.';
    case 'internal_error':
      return 'An unexpected server error occurred. Please try again later.';
    case 'unknown_error':
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return normalizeLegacyMessage(error.message);
  if (typeof error === 'string') return normalizeLegacyMessage(error);
  return getDefaultErrorMessage('unknown_error');
}

export function getUserErrorMessage(error: unknown, translate?: (key: string) => string): string {
  if (error instanceof ApiClientError && error.errorKey && translate) {
    const translated = translate(error.errorKey);
    if (isResolvedTranslation(error.errorKey, translated)) return translated;
  }
  if (error instanceof ApiClientError && translate) {
    const translated = translate(`errors.codes.${error.errorCode}`);
    if (isResolvedTranslation(`errors.codes.${error.errorCode}`, translated)) return translated;
  }
  if (error instanceof Error && translate) {
    const translated = translate(error.message);
    if (isResolvedTranslation(error.message, translated)) return translated;
  }
  if (typeof error === 'string' && translate) {
    if (isApiErrorCode(error)) {
      const translated = translate(`errors.codes.${error}`);
      if (isResolvedTranslation(`errors.codes.${error}`, translated)) return translated;
    }
    const translated = translate(error);
    if (isResolvedTranslation(error, translated)) return translated;
  }

  return getErrorMessage(error);
}

export function throwApiResponseError(
  response: Pick<Response, 'status'>,
  data: unknown,
  fallbackMessage: string
): never {
  throw createApiClientError(response, data, fallbackMessage);
}

export function createApiClientError(
  response: Pick<Response, 'status'>,
  data: unknown,
  fallbackMessage: string
) {
  const payload = isApiErrorLike(data) ? data : undefined;
  const statusCode = response.status || 0;
  const errorCode =
    payload?.errorCode || getLegacyErrorCode(payload?.message || payload?.error) || getErrorCodeForStatus(statusCode);
  const message = normalizeLegacyMessage(
    payload?.message || payload?.error || fallbackMessage || getDefaultErrorMessage(errorCode)
  );

  return new ApiClientError(message, {
    status: statusCode,
    errorCode,
    errorKey: payload?.errorKey,
    payload,
  });
}

export async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => undefined);
  if (!response.ok || !isSuccessResponse(data)) {
    throwApiResponseError(response, data, fallbackMessage);
  }

  return data as T;
}

function isSuccessResponse(data: unknown): data is { success: true } {
  return Boolean(data && typeof data === 'object' && (data as { success?: unknown }).success === true);
}

function isApiErrorLike(data: unknown): data is ApiErrorLike {
  return Boolean(data && typeof data === 'object');
}

function getLegacyErrorCode(message?: string): ApiErrorCode | undefined {
  if (!message) return undefined;
  const trimmed = message.trim();
  if (isApiErrorCode(trimmed)) return trimmed;
  if (/^database_url is required\.?$/i.test(trimmed)) return 'server_configuration';
  if (/^(forbidden|forbidden\.)$/i.test(trimmed)) return 'access_denied';
  if (/^(unauthorized|unauthorized or session expired|unauthorized\.)$/i.test(trimmed)) {
    return 'session_expired';
  }
  return undefined;
}

function normalizeLegacyMessage(message: string) {
  const trimmed = message.trim();
  if (isApiErrorCode(trimmed)) return getDefaultErrorMessage(trimmed);
  if (/^(forbidden|forbidden\.)$/i.test(trimmed)) return getDefaultErrorMessage('access_denied');
  if (/^(unauthorized|unauthorized or session expired|unauthorized\.)$/i.test(trimmed)) {
    return getDefaultErrorMessage('session_expired');
  }
  if (/^missing session token\.?$/i.test(trimmed)) return getDefaultErrorMessage('session_expired');
  if (/^database_url is required\.?$/i.test(trimmed)) return getDefaultErrorMessage('server_configuration');
  return trimmed || getDefaultErrorMessage('unknown_error');
}

function isResolvedTranslation(key: string, translated: string) {
  return translated !== key && !translated.startsWith('[[MISSING I18N: ');
}

function isApiErrorCode(value: string): value is ApiErrorCode {
  return [
    'bad_request',
    'validation_failed',
    'unauthorized',
    'session_expired',
    'access_denied',
    'not_found',
    'conflict',
    'payload_too_large',
    'unsupported_media_type',
    'service_unavailable',
    'server_configuration',
    'internal_error',
    'network_error',
    'unknown_error',
  ].includes(value);
}
