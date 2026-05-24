import { useEffect, useState } from 'react';
import { Activity, GameBattle } from '@eduquest/shared';
import { BACKEND_BASE_URL } from '../../features/auth/useAuth';
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
  const { student, character, activities, battles, setActivities, addBattle, gainXp } =
    useGameStore();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  // Chargement de la carte depuis le Backend Hono
  const fetchMapData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('eduquest_token');
      const response = await fetch(`${BACKEND_BASE_URL}/api/map`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error('Erreur HTTP ' + response.status);
      }
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities);
      } else {
        throw new Error('Le serveur a renvoyé un statut invalide');
      }
    } catch (error: any) {
      console.warn('Backend injoignable ou en erreur. Utilisation des mocks locaux.');
      //TODO: Move that in the backend please....
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
      <GameHeader />

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
