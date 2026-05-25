import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mapRouter } from './routes/map';
import { authRouter } from './routes/auth';
import { authMiddleware } from './middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

// Middleware CORS pour autoriser les requêtes du Front-end local (Vite)
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedOrigin = c.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
      return origin === allowedOrigin ? origin : allowedOrigin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Montage des routes publiques d'authentification sous /api/auth
app.route('/api/auth', authRouter);

// Enforcer l'authentification sur les endpoints protégés du jeu
app.use('/api/map', authMiddleware);
app.use('/api/guilds', authMiddleware);
app.use('/api/dashboard', authMiddleware);

app.get('/', (c) => {
  return c.text("Bienvenue sur l'API de l'EduQuest Game Master Server ! 🎮");
});

// Montage du sous-routeur d'activités/carte sous le préfixe /api
app.route('/api', mapRouter);

export default app;
