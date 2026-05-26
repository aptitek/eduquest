import { useEffect, useState } from 'react';
import type { Activity, GameBattle } from '@eduquest/shared';
import { useGameStore } from '../../features/game/gameStore';
import { completeMapActivity, fetchMapActivities } from '../../features/game/api';
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
  const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Chargement de la carte depuis le Backend Hono
  const fetchMapData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      setActivities(await fetchMapActivities(token));
    } catch (error: unknown) {
      console.warn('Could not load map activities.', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  const completedActivityIds = battles.map((b) => b.activityId);

  // Soumission / Résolution d'un nœud
  const handleCompleteActivity = async (act: Activity) => {
    if (completedActivityIds.includes(act.id) || completingActivityId) return;

    setCompletingActivityId(act.id);
    setCompletionError(null);

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const newBattle: GameBattle = await completeMapActivity(token, act.id);

      addBattle(newBattle);
      const xpReward = act.type === 'boss' ? 200 : act.type === 'quest' ? 100 : 50;
      gainXp(xpReward);
      setSelectedActivity(null);
    } catch (error) {
      console.warn('Could not complete map activity.', error);
      setCompletionError(t('detailPanel.completionError'));
    } finally {
      setCompletingActivityId(null);
    }
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
          completingActivityId={completingActivityId}
          completionError={completionError}
        />
      </MapContainer>
    </GameLayout>
  );
}

export default MapPage;
