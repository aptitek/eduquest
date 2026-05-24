import { Hono } from 'hono';
import { GUILDS } from '@eduquest/shared';
import { getDb } from '../db';
import { gameActivities } from '../db/schema';
import { DEBUG_ACTIVITIES } from '../dev/debugBackup';

type Bindings = {
  DATABASE_URL: string;
};

export const mapRouter = new Hono<{ Bindings: Bindings }>();

mapRouter.get('/guilds', (c) => {
  return c.json({
    success: true,
    guilds: GUILDS,
  });
});

// GET /api/map : Renvoie la carte des activités (dynamique ou mock)
mapRouter.get('/map', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;

  // Si aucune URL de base de données n'est spécifiée, on renvoie les mocks
  if (!databaseUrl) {
    return c.json({
      success: true,
      source: 'mock',
      activities: DEBUG_ACTIVITIES,
    });
  }

  try {
    const db = getDb(databaseUrl);
    const activitiesFromDb = await db.select().from(gameActivities);

    if (activitiesFromDb.length === 0) {
      return c.json({
        success: true,
        source: 'mock_fallback',
        activities: DEBUG_ACTIVITIES,
      });
    }

    return c.json({
      success: true,
      source: 'database',
      activities: activitiesFromDb.map((act) => ({
        id: act.id,
        type: act.type as any,
        title: act.title,
        startDate: act.startDate || undefined,
        endDate: act.endDate || undefined,
        url: act.url || undefined,
        isGraded: act.isGraded,
        x: act.x,
        y: act.y,
        requiredLevel: act.requiredLevel,
        bossMetadata: act.bossMetadata || undefined,
      })),
    });
  } catch (error: any) {
    console.error('Erreur SQL, repli vers les données mocks:', error.message);
    return c.json({
      success: true,
      source: 'mock_error_fallback',
      warning: 'Erreur SQL, renvoi des fausses données de secours.',
      activities: DEBUG_ACTIVITIES,
    });
  }
});
