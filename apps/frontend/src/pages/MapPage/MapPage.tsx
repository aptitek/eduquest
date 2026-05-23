import { useEffect, useState } from 'react';
import { Activity, GameBattle } from '@eduquest/shared';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';

// UI Layout and Styling Wrappers (Atomic Design)
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { MapContainer, MapArea, LoadingMap } from '../../components/organisms/MapContainer';
import { GameMap } from '../../components/organisms/GameMap';
import { ActivityDetailPanel } from '../../components/organisms/ActivityDetailPanel';

export function MapPage() {
  const { t } = useTranslation();
  const {
    user,
    student,
    character,
    activities,
    battles,
    setUserSession,
    setActivities,
    addBattle,
    gainXp,
  } = useGameStore();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiSource, setApiSource] = useState<'database' | 'mock' | 'offline'>('offline');

  // Initialisation de la session de jeu mockée (si vide)
  useEffect(() => {
    if (!user) {
      setUserSession(
        {
          id: 'user_1',
          githubEmail: 'wizard@github.com',
          isAdmin: false,
        },
        {
          id: 'stud_1',
          userId: 'user_1',
          guildId: 'mages',
          institutionalEmail: 'wizard@school.edu',
          pronouns: ['He/Him'],
          photoUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        },
        {
          studentId: 'stud_1',
          characterClass: 'Mage Frontend',
          stats: {
            str: 5,
            dex: 8,
            int: 18,
            cha: 12,
            xp: 25,
          },
          currentLevel: 1,
        }
      );
    }
  }, [user, setUserSession]);

  // Chargement de la carte depuis le Backend Hono
  const fetchMapData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8787/api/map');
      if (!response.ok) {
        throw new Error('Erreur HTTP ' + response.status);
      }
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities);
        setApiSource(data.source || 'database');
      } else {
        throw new Error('Le serveur a renvoyé un statut invalide');
      }
    } catch (error: any) {
      console.warn('Backend injoignable ou en erreur. Utilisation des mocks locaux.');
      setApiSource('offline');
      setActivities([
        {
          id: 'act_1',
          type: 'campfire',
          title: "Le Feu de Camp de l'Initiation",
          isGraded: false,
          x: 150,
          y: 300,
          requiredLevel: 1,
          unlockRule: { requiredLevel: 1 },
        },
        {
          id: 'act_2',
          type: 'quest',
          title: 'La Forêt des Variables et Constantes',
          isGraded: true,
          x: 350,
          y: 180,
          requiredLevel: 1,
          unlockRule: { requiredLevel: 1, requiredCompletedActivities: ['act_1'] },
        },
        {
          id: 'act_3',
          type: 'quest',
          title: 'Le Ravin du Contrôle de Flux (if/else)',
          isGraded: true,
          x: 550,
          y: 420,
          requiredLevel: 2,
          unlockRule: { requiredLevel: 2, requiredCompletedActivities: ['act_2'] },
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
          },
          unlockRule: { requiredLevel: 3, requiredCompletedActivities: ['act_3'] },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  const completedActivityIds = battles.map((b) => b.activityId);

  // Soumission / Résolution d'un nœud
  const handleCompleteActivity = (act: Activity) => {
    if (completedActivityIds.includes(act.id)) return;

    const newBattle: GameBattle = {
      id: `battle_${Date.now()}`,
      studentId: student?.id || 'stud_1',
      activityId: act.id,
      grade: act.isGraded ? 0.9 : undefined,
      createdAt: new Date().toISOString(),
    };

    addBattle(newBattle);
    const xpReward = act.type === 'boss' ? 200 : act.type === 'quest' ? 100 : 50;
    gainXp(xpReward);
    setSelectedActivity(null);
  };

  if (!character || !student) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-muted font-display">
        {t('layout.loadingSession')}
      </div>
    );
  }

  return (
    <GameLayout>
      <GameHeader apiSource={apiSource} loading={loading} onRefresh={fetchMapData} />

      <MapContainer>
        <MapArea>
          {loading ? (
            <LoadingMap />
          ) : (
            <GameMap
              activities={activities}
              completedActivityIds={completedActivityIds}
              playerLevel={character.currentLevel}
              onSelectNode={setSelectedActivity}
            />
          )}
        </MapArea>

        <ActivityDetailPanel
          selectedActivity={selectedActivity}
          completedActivityIds={completedActivityIds}
          onComplete={handleCompleteActivity}
        />
      </MapContainer>
    </GameLayout>
  );
}

export default MapPage;
