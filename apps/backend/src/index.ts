import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mapRouter } from './routes/map';
import { authRouter } from './routes/auth';
import { assetRouter, publicAssetRouter } from './routes/assets';
import { webhooksRouter } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { getFrontendUrl } from './config/runtime';

type Bindings = {
  APP_ENV?: string;
  ENABLE_MOCK_DATA?: string;
  ENABLE_DEBUG_AUTH?: string;
  DATABASE_URL?: string;
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
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Montage des routes publiques d'authentification sous /api/auth
app.route('/api/auth', authRouter);
app.route('/assets', publicAssetRouter);
app.route('/api/webhooks', webhooksRouter);

// Enforcer l'authentification sur les endpoints protégés du jeu
app.use('/api/map', authMiddleware);
app.use('/api/guilds', authMiddleware);
app.use('/api/dashboard', authMiddleware);
app.use('/api/assets/*', authMiddleware);

app.get('/', (c) => {
  return c.text("Bienvenue sur l'API de l'EduQuest Game Master Server ! 🎮");
});

// Montage du sous-routeur d'activités/carte sous le préfixe /api
app.route('/api', mapRouter);
app.route('/api', assetRouter);

export default app;
