import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mapRouter } from './routes/map';

type Bindings = {
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware CORS pour autoriser les requêtes du Front-end local (Vite)
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/', (c) => {
  return c.text("Bienvenue sur l'API de l'EduQuest Game Master Server ! 🎮");
});

// Montage du sous-routeur d'activités/carte sous le préfixe /api
app.route('/api', mapRouter);

export default app;
