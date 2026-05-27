import { useEffect, useState } from 'react';
import type { Activity, BossActivityAnswerField, GameActivityCompletion, GameActivityEdge } from '@eduquest/shared';
import { useGameStore } from '../../features/game/gameStore';
import {
  type ActivityCompletionDraft,
  completeMapActivity,
  fetchMapActivities,
  moveCharacterToActivity,
} from '../../features/game/api';
import { getActivityXpReward } from '../../features/game/activityPresentation';
import { useTranslation } from '../../hooks/useTranslation';

// UI Layout and Styling Wrappers (Atomic Design)
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { MapContainer, MapArea, MapSidePanel, LoadingMap } from '../../components/organisms/MapContainer';
import { GameMap } from '../../components/organisms/GameMap';
import { ActivityDetailPanel } from '../../components/organisms/ActivityDetailPanel';
import { ActivityCard, type ActivityCardData, type ActivityResourceLink } from '../../components/organisms/ActivityCard';
import { formatUserDisplayName } from '../../utils/displayName';

const DEFAULT_BOSS_ANSWER_FIELDS: BossActivityAnswerField[] = [
  {
    id: 'workUrl',
    label: 'Project URL',
    kind: 'url',
    placeholder: 'https://github.com/your-team/project',
  },
  {
    id: 'attachments',
    label: 'Project files',
    kind: 'file',
    accept: '.pdf,.zip,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.json',
    maxFiles: 3,
    maxBytes: 10 * 1024 * 1024,
  },
];

function getDefaultBossAnswerFields(t: (path: string) => string): BossActivityAnswerField[] {
  return DEFAULT_BOSS_ANSWER_FIELDS.map((field) => ({
    ...field,
    label:
      field.id === 'workUrl'
        ? t('activityCard.defaultFields.projectUrl')
        : t('activityCard.defaultFields.projectFiles'),
  }));
}

export function MapPage() {
  const { t } = useTranslation();
  const {
    student,
    character,
    user,
    activities,
    activityEdges,
    activityCompletions,
    nodeOccupancies,
    currentActivityId,
    currentMove,
    selectedGameId,
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
      const mapData = await fetchMapActivities(token, selectedGameId);
      setMapData(mapData);
      setSelectedActivity(null);
    } catch (error: unknown) {
      console.warn('Could not load map activities.', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [selectedGameId]);

  useEffect(() => {
    const handleCohortStepUpdated = () => {
      fetchMapData();
    };

    window.addEventListener('eduquest:cohort-step-updated', handleCohortStepUpdated);
    return () => window.removeEventListener('eduquest:cohort-step-updated', handleCohortStepUpdated);
  }, [selectedGameId]);

  const completedActivityIds = activityCompletions.map((completion) => completion.activityId);

  const handleSelectActivity = async (activity: Activity) => {
    setSelectedActivity(activity);
    if (user?.isAdmin) return;
    if (activity.isCurrent || activity.isLocked) return;

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const result = await moveCharacterToActivity(token, activity.id, selectedGameId);
      setCurrentMove(result.move, result.currentActivityId);
      setSelectedActivity({ ...activity, isCurrent: true });
    } catch (error) {
      console.warn('Could not track character move.', error);
    }
  };

  // Soumission / Résolution d'un nœud
  const handleCompleteActivity = async (act: Activity, draft?: ActivityCompletionDraft) => {
    if (completedActivityIds.includes(act.id) || completingActivityId) return;

    setCompletingActivityId(act.id);
    setCompletionError(null);

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const completion: GameActivityCompletion = await completeMapActivity(token, act.id, selectedGameId, draft);

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

  if (!user?.isAdmin && (!character || !student)) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-muted font-display">
        {t('layout.loadingSession')}
      </div>
    );
  }

  return (
    <GameLayout fitToViewport>
      <GameHeader />

      <MapContainer>
        <MapArea>
          {loading ? (
            <LoadingMap />
          ) : (
            <GameMap
              activities={activities}
              edges={activityEdges}
              nodeOccupancies={nodeOccupancies}
              playerMarker={
                !user?.isAdmin && user && character
                  ? {
                      activityId: currentActivityId,
                      previousActivityId: currentMove?.fromActivityId,
                      characterClass: character.characterClass,
                      illustrationUrl: user.avatarUrl || user.githubAvatarUrl,
                      label: formatUserDisplayName(user),
                    }
                  : undefined
              }
              canEditLocked={Boolean(user?.isAdmin)}
              showGuildOccupancyMarkers={Boolean(user?.isAdmin)}
              showCompletionState={!user?.isAdmin}
              onSelectNode={handleSelectActivity}
            />
          )}
        </MapArea>

        <MapSidePanel>
          {selectedActivity ? (
            <ActivityCard
              activity={toActivityCardData(selectedActivity, activities, activityEdges, t)}
              canEdit={Boolean(user?.isAdmin)}
              showCompletionAction={!user?.isAdmin}
              isCompleted={completedActivityIds.includes(selectedActivity.id)}
              isResolving={completingActivityId === selectedActivity.id}
              resolveError={completionError}
              onResolve={
                user?.isAdmin || selectedActivity.isLocked
                  ? undefined
                  : (draft) => handleCompleteActivity(selectedActivity, draft)
              }
              className="h-full min-h-0 w-full max-w-none"
            />
          ) : (
            <ActivityDetailPanel
              selectedActivity={null}
              completedActivityIds={completedActivityIds}
              onComplete={handleCompleteActivity}
              completingActivityId={completingActivityId}
              completionError={completionError}
            />
          )}
        </MapSidePanel>
      </MapContainer>
    </GameLayout>
  );
}

export default MapPage;

function toActivityCardData(
  activity: Activity,
  activities: Activity[],
  edges: GameActivityEdge[],
  t: (path: string) => string
): ActivityCardData {
  const metadata = (activity.metadata || {}) as Record<string, unknown>;
  const activityById = new Map(activities.map((candidate) => [candidate.id, candidate]));
  const adjacentNodes = edges
    .filter((edge) => edge.fromActivityId === activity.id || edge.toActivityId === activity.id)
    .map((edge) => (edge.fromActivityId === activity.id ? edge.toActivityId : edge.fromActivityId))
    .map((activityId) => activityById.get(activityId)?.title)
    .filter((title): title is string => Boolean(title));
  const resources = getActivityResources(metadata, activity.url);

  return {
    title: activity.title,
    subtitle: `${t(`common.${activity.type}`)} · ${activity.isGraded ? t('activityCard.graded') : t('activityCard.notGraded')}`,
    description:
      getStringMetadata(metadata, 'description') ||
      getStringMetadata(metadata, 'lore') ||
      getStringMetadata(metadata, 'summary') ||
      t('activityCard.defaultDescription'),
    illustrationUrl: getStringMetadata(metadata, 'illustrationUrl'),
    illustrationAlt: getStringMetadata(metadata, 'illustrationAlt') || activity.title,
    goldReward: getActivityXpReward(activity),
    cardColor: activity.cardColor || getStringMetadata(metadata, 'cardColor'),
    participationMode: activity.participationMode || 'solo',
    resources,
    selectedIcon: getStringMetadata(metadata, 'iconKey') || activity.type,
    mapX: activity.mapX,
    mapY: activity.mapY,
    stepRanges: activity.stepRanges || [{ startStep: Math.max(activity.requiredLevel - 1, 0) }],
    adjacentNodes,
    answerFields: getBossAnswerFields(activity, t),
  };
}

function getStringMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
}

function getNestedStringMetadata(metadata: Record<string, unknown>, objectKey: string, key: string) {
  const value = metadata[objectKey];
  if (!value || typeof value !== 'object') return undefined;
  const nestedValue = (value as Record<string, unknown>)[key];
  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

function getActivityResources(metadata: Record<string, unknown>, activityUrl?: string): ActivityResourceLink[] {
  const resources = [
    ...getResourceList(metadata),
    resourceFromUrl(getStringMetadata(metadata, 'geniallyUrl')),
    resourceFromUrl(getNestedStringMetadata(metadata, 'boss', 'projectUrl')),
    resourceFromUrl(getNestedStringMetadata(metadata, 'boss', 'gradingUrl')),
    resourceFromUrl(getStringMetadata(metadata, 'rubricUrl')),
    resourceFromUrl(activityUrl),
  ].filter((resource): resource is ActivityResourceLink => Boolean(resource?.url));

  const seenUrls = new Set<string>();
  return resources.filter((resource) => {
    if (seenUrls.has(resource.url)) return false;
    seenUrls.add(resource.url);
    return true;
  });
}

function getResourceList(metadata: Record<string, unknown>): ActivityResourceLink[] {
  const resources = metadata.resources;
  if (!Array.isArray(resources)) return [];

  return resources.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const resource = item as Record<string, unknown>;
    const title = typeof resource.title === 'string' ? resource.title : undefined;
    const url = typeof resource.url === 'string' ? resource.url : undefined;
    return url ? [{ title, url }] : [];
  });
}

function resourceFromUrl(url?: string, title?: string): ActivityResourceLink | undefined {
  return url ? { title, url } : undefined;
}

function getBossAnswerFields(activity: Activity, t: (path: string) => string): BossActivityAnswerField[] | undefined {
  if (activity.type !== 'boss' && activity.type !== 'mini_boss') return undefined;
  const metadata = (activity.metadata || {}) as Record<string, unknown>;
  const fields = Array.isArray(metadata.answerFields) ? metadata.answerFields : getNestedObjectArray(metadata, 'boss', 'answerFields');
  return fields?.length ? (fields as BossActivityAnswerField[]) : getDefaultBossAnswerFields(t);
}

function getNestedObjectArray(metadata: Record<string, unknown>, objectKey: string, key: string) {
  const value = metadata[objectKey];
  if (!value || typeof value !== 'object') return undefined;
  const nestedValue = (value as Record<string, unknown>)[key];
  return Array.isArray(nestedValue) ? nestedValue : undefined;
}
