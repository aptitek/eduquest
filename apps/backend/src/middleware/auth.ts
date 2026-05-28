import { verify } from 'hono/jwt';
import { MiddlewareHandler } from 'hono';
import { getJwtSecret } from '../config/runtime';
import { apiError } from '../routes/http';

export type UserPayload = {
  id: string;
  email: string;
  isAdmin: boolean;
  githubUsername?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  birthDate?: string;
  bio?: string;
  pronouns?: string;
  avatarUrl?: string;
  githubAvatarUrl?: string;
};

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Read JWT secret dynamically from Cloudflare Workers bindings at runtime.
  const secret = getJwtSecret(c.env || {});

  if (!secret) {
    console.error('JWT_SECRET is not configured for authenticated routes.');
    return apiError(c, 'Authentication is not configured.', 500, {
      errorCode: 'server_configuration',
    });
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiError(c, 'Authentication is required. Please sign in again.', 401, {
      errorCode: 'unauthorized',
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, secret, 'HS256');
    // Inject user payload into Hono's custom context variables
    c.set('user', payload as UserPayload);
    await next();
  } catch (error: any) {
    console.error('JWT Verification failed:', error.message);
    return apiError(c, 'Your session expired. Please sign in again.', 401, {
      errorCode: 'session_expired',
    });
  }
};
