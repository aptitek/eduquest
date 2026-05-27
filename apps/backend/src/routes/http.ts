import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { UserPayload } from '../middleware/auth';

type ApiContext = Context<any>;
type ErrorPayload = Record<string, unknown>;

export function apiError(
  c: ApiContext,
  error: string,
  status: ContentfulStatusCode,
  extra?: ErrorPayload
) {
  return c.json({ success: false, error, ...extra }, status);
}

export function forbidden(c: ApiContext, error = 'Forbidden') {
  return apiError(c, error, 403);
}

export function missingDatabaseUrl(c: ApiContext) {
  return apiError(c, 'DATABASE_URL is required.', 503);
}

export function requireDatabaseUrl(c: ApiContext) {
  return c.env?.DATABASE_URL || missingDatabaseUrl(c);
}

export function requireAdminUser(c: ApiContext) {
  const user = c.get('user') as UserPayload | undefined;
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
  return body === undefined ? apiError(c, error, 400) : body;
}
