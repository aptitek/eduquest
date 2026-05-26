import { useEffect, useState } from 'react';
import type { Activity, GameActivityCompletion } from '@eduquest/shared';
import { useGameStore } from '../../features/game/gameStore';
import { completeMapActivity, fetchMapActivities, moveCharacterToActivity } from '../../features/game/api';
import { getActivityXpReward } from '../../features/game/activityPresentation';
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
    student,
    character,
    activities,
    activityEdges,
    activityCompletions,
    setActivities,
    setMapData,
    addActivityCompletion,
    setCurrentMove,
    gainXp,
  } = useGameStore();

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
      setMapData(await fetchMapActivities(token));
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

  const completedActivityIds = activityCompletions.map((completion) => completion.activityId);

  const handleSelectActivity = async (activity: Activity) => {
    setSelectedActivity(activity);
    if (activity.isCurrent || activity.isLocked || activity.isStormed) return;

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const result = await moveCharacterToActivity(token, activity.id);
      setCurrentMove(result.move, result.currentActivityId);
    } catch (error) {
      console.warn('Could not track character move.', error);
    }
  };

  // Soumission / Résolution d'un nœud
  const handleCompleteActivity = async (act: Activity) => {
    if (completedActivityIds.includes(act.id) || completingActivityId) return;

    setCompletingActivityId(act.id);
    setCompletionError(null);

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const completion: GameActivityCompletion = await completeMapActivity(token, act.id);

      addActivityCompletion(completion);
      gainXp(getActivityXpReward(act));
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
              edges={activityEdges}
              onSelectNode={handleSelectActivity}
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
