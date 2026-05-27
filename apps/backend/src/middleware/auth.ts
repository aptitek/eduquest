import { verify } from 'hono/jwt';
import { MiddlewareHandler } from 'hono';
import { getJwtSecret } from '../config/runtime';

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
    return c.json(
      {
        success: false,
        error: 'Server Configuration Error',
        message: 'Authentication is not configured.',
      },
      500
    );
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header. Enforced authentication.',
      },
      401
    );
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, secret, 'HS256');
    // Inject user payload into Hono's custom context variables
    c.set('user', payload as UserPayload);
    await next();
  } catch (error: any) {
    console.error('JWT Verification failed:', error.message);
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token. Please log in again.',
      },
      401
    );
  }
};
