import { Hono } from 'hono';
import { GUILDS, Activity } from '@eduquest/shared';
import { getDb } from '../db';
import { gameActivities } from '../db/schema';

type Bindings = {
  DATABASE_URL: string;
};

export const mapRouter = new Hono<{ Bindings: Bindings }>();

// Données de simulation pour la carte (Mock) si la base de données n'est pas connectée
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act_1',
    type: 'campfire',
    title: "Le Feu de Camp de l'Initiation",
    isGraded: false,
    x: 150,
    y: 300,
    requiredLevel: 1,
    unlockRule: {
      requiredLevel: 1,
    },
  },
  {
    id: 'act_2',
    type: 'quest',
    title: 'La Forêt des Variables et Constantes',
    isGraded: true,
    x: 350,
    y: 180,
    requiredLevel: 1,
    unlockRule: {
      requiredLevel: 1,
      requiredCompletedActivities: ['act_1'],
    },
  },
  {
    id: 'act_3',
    type: 'quest',
    title: 'Le Ravin du Contrôle de Flux (if/else)',
    isGraded: true,
    x: 550,
    y: 420,
    requiredLevel: 2,
    unlockRule: {
      requiredLevel: 2,
      requiredCompletedActivities: ['act_2'],
    },
  },
  {
    id: 'act_4',
    type: 'boss',
    title: 'Le Sphinx des Fonctions Récursives',
    isGraded: true,
    x: 800,
    y: 300,
    requiredLevel: 3,
    bossMetadata: {
      projectUrl: 'https://github.com/eduquest/sphinx-recursive',
      gradingUrl: 'https://api.eduquest.com/grade',
    },
    unlockRule: {
      requiredLevel: 3,
      requiredCompletedActivities: ['act_3'],
    },
  },
];

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
      activities: MOCK_ACTIVITIES,
    });
  }

  try {
    const db = getDb(databaseUrl);
    const activitiesFromDb = await db.select().from(gameActivities);

    if (activitiesFromDb.length === 0) {
      return c.json({
        success: true,
        source: 'mock_fallback',
        activities: MOCK_ACTIVITIES,
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
      activities: MOCK_ACTIVITIES,
    });
  }
});
