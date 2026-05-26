export type AppEnvironment = 'development' | 'production';

export const APP_ENV: AppEnvironment =
  import.meta.env.VITE_APP_ENV === 'development'
    ? 'development'
    : import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.PROD
      ? 'production'
      : 'development';

export const IS_PRODUCTION = APP_ENV === 'production';
export const ENABLE_DEV_TOOLS = !IS_PRODUCTION && import.meta.env.VITE_ENABLE_DEV_TOOLS !== 'false';
export const ENABLE_MOCK_DATA = !IS_PRODUCTION && import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  (IS_PRODUCTION ? window.location.origin : 'http://localhost:8787');
