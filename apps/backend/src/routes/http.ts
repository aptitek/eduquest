import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorCode, ApiErrorPayload } from '@eduquest/shared';

type ApiContext = Context<any>;
type ErrorPayload = Partial<Omit<ApiErrorPayload, 'success' | 'error' | 'message' | 'errorCode'>> & {
  errorCode?: ApiErrorCode;
  message?: string;
};
type AdminUser = {
  isAdmin?: boolean;
};

export function getDefaultErrorCode(status: ContentfulStatusCode): ApiErrorCode {
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

export function getDefaultErrorMessage(code: ApiErrorCode) {
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

function normalizeErrorMessage(error: string, code: ApiErrorCode) {
  const trimmed = error.trim();
  if (!trimmed) return getDefaultErrorMessage(code);
  if (/^(forbidden|forbidden\.)$/i.test(trimmed)) return getDefaultErrorMessage('access_denied');
  if (/^(unauthorized|unauthorized\.)$/i.test(trimmed)) return getDefaultErrorMessage('unauthorized');
  if (/^server configuration error$/i.test(trimmed)) return getDefaultErrorMessage('server_configuration');
  return trimmed;
}

export function apiError(
  c: ApiContext,
  error: string,
  status: ContentfulStatusCode,
  extra?: ErrorPayload
) {
  const errorCode = extra?.errorCode || getDefaultErrorCode(status);
  const message = extra?.message || normalizeErrorMessage(error, errorCode);
  const { message: _message, errorCode: _errorCode, ...rest } = extra || {};
  return c.json({ success: false, errorCode, message, error: message, ...rest }, status);
}

export function forbidden(c: ApiContext, error = 'Forbidden') {
  return apiError(c, error, 403, { errorCode: 'access_denied' });
}

export function missingDatabaseUrl(c: ApiContext) {
  return apiError(c, 'Database access is not configured.', 503, {
    errorCode: 'server_configuration',
  });
}

export function requireDatabaseUrl(c: ApiContext) {
  return c.env?.DATABASE_URL || missingDatabaseUrl(c);
}

export function requireAdminUser(c: ApiContext) {
  const user = c.get('user') as AdminUser | undefined;
  return user?.isAdmin ? user : forbidden(c);
}

export function parseJsonBody<T>(c: ApiContext, fallback: T): Promise<T>;
export function parseJsonBody<T>(c: ApiContext): Promise<T | undefined>;
export async function parseJsonBody<T>(c: ApiContext, fallback?: T): Promise<T | undefined> {
  try {
    return (await c.req.json()) as T;
  } catch {
    return fallback;
  }
}

export async function parseRequiredJsonBody<T>(c: ApiContext, error = 'Invalid JSON body') {
  const body = await parseJsonBody<T>(c);
  return body === undefined ? apiError(c, error, 400, { errorCode: 'validation_failed' }) : body;
}
