import { Hono } from 'hono';
import { GUILDS } from '@eduquest/shared';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Bienvenue sur l\'API de l\'EduQuest Game Master Server ! 🎮');
});

app.get('/api/guilds', (c) => {
  return c.json({
    success: true,
    guilds: GUILDS,
  });
});

export default app;
