import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mapRouter } from './routes/map';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { rewardsRouter } from './routes/rewards';
import { assetRouter, publicAssetRouter } from './routes/assets';
import { webhooksRouter } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { getFrontendUrl } from './config/runtime';
import { apiError } from './routes/http';

type Bindings = {
  APP_ENV?: string;
  ENABLE_DEBUG_AUTH?: string;
  DB?: D1Database;
  JWT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  FRONTEND_URL?: string;
  ASSET_PUBLIC_BASE_URL?: string;
  ASSETS?: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware CORS pour autoriser les requêtes du Front-end local (Vite)
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedOrigin = getFrontendUrl(c.env);
      if (!allowedOrigin) return null;
      return origin === allowedOrigin ? origin : allowedOrigin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Montage des routes publiques d'authentification sous /api/auth
app.route('/api/auth', authRouter);
app.route('/assets', publicAssetRouter);
app.route('/api/webhooks', webhooksRouter);

// Enforcer l'authentification sur les endpoints protégés du jeu
app.use('/api/map', authMiddleware);
app.use('/api/map/*', authMiddleware);
app.use('/api/games', authMiddleware);
app.use('/api/games/*', authMiddleware);
app.use('/api/guilds', authMiddleware);
app.use('/api/guilds/*', authMiddleware);
app.use('/api/guild-invitations/*', authMiddleware);
app.use('/api/dashboard', authMiddleware);
app.use('/api/dashboard/*', authMiddleware);
app.use('/api/rewards/*', authMiddleware);
app.use('/api/admin/*', authMiddleware);
app.use('/api/assets/*', authMiddleware);

app.get('/', (c) => {
  return c.text("Bienvenue sur l'API de l'EduQuest Game Master Server ! 🎮");
});

// Montage du sous-routeur d'activités/carte sous le préfixe /api
app.route('/api', mapRouter);
app.route('/api/admin', adminRouter);
app.route('/api', rewardsRouter);
app.route('/api', assetRouter);

app.notFound((c) => {
  return apiError(c, 'The requested endpoint could not be found.', 404, {
    errorCode: 'not_found',
  });
});

app.onError((error, c) => {
  console.error('Unhandled API error:', error);
  return apiError(c, 'An unexpected server error occurred. Please try again later.', 500, {
    errorCode: 'internal_error',
  });
});

export default app;
