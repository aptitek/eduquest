import { verify } from 'hono/jwt';
import { MiddlewareHandler } from 'hono';

export type UserPayload = {
  id: string;
  email: string;
  isAdmin: boolean;
  githubUsername?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  githubAvatarUrl?: string;
};

const DEFAULT_JWT_SECRET = 'eduquest-secret-key-1337-gaming-token';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Read JWT secret dynamically from Cloudflare Workers bindings at runtime
  const secret = c.env?.JWT_SECRET || DEFAULT_JWT_SECRET;

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
