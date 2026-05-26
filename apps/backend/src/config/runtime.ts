export type AppEnvironment = 'development' | 'production';

export type RuntimeBindings = {
  APP_ENV?: string;
  ENABLE_MOCK_DATA?: string;
  ENABLE_DEBUG_AUTH?: string;
  DATABASE_URL?: string;
  FRONTEND_URL?: string;
  JWT_SECRET?: string;
};

const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:5173';
const DEFAULT_DEV_JWT_SECRET = 'eduquest-secret-key-1337-gaming-token';

export function getAppEnvironment(env: RuntimeBindings): AppEnvironment {
  return env.APP_ENV === 'production' ? 'production' : 'development';
}

export function isProduction(env: RuntimeBindings) {
  return getAppEnvironment(env) === 'production';
}

export function isMockDataEnabled(env: RuntimeBindings) {
  if (isProduction(env)) return false;

  return env.ENABLE_MOCK_DATA === 'true' || !env.DATABASE_URL;
}

export function isDebugAuthEnabled(env: RuntimeBindings) {
  if (isProduction(env)) return false;

  return env.ENABLE_DEBUG_AUTH === 'true' || isMockDataEnabled(env);
}

export function getFrontendUrl(env: RuntimeBindings) {
  return env.FRONTEND_URL || (isProduction(env) ? undefined : DEFAULT_DEV_FRONTEND_URL);
}

export function getJwtSecret(env: RuntimeBindings) {
  return env.JWT_SECRET || (isProduction(env) ? undefined : DEFAULT_DEV_JWT_SECRET);
}

export function requireFrontendUrl(env: RuntimeBindings) {
  const frontendUrl = getFrontendUrl(env);
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL must be configured for production deployments.');
  }

  return frontendUrl;
}

export function requireJwtSecret(env: RuntimeBindings) {
  const jwtSecret = getJwtSecret(env);
  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be configured for production deployments.');
  }

  return jwtSecret;
}
