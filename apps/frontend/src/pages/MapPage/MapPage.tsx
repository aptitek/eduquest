import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  Activity,
  ActivityStepRange,
  BossActivityAnswerField,
  GameActivityCompletion,
  GameActivityEdge,
  GameActivityEdgeStyleWindow,
} from '@eduquest/shared';
import { useGameStore } from '../../features/game/gameStore';
import {
  type ActivityCompletionDraft,
  type ActivityCardFieldsPayload,
  completeMapActivity,
  createMapActivity,
  createMapActivityEdge,
  deleteMapActivity,
  deleteMapActivityEdge,
  fetchMapActivities,
  moveCharacterToActivity,
  updateMapActivityCardColor,
  updateMapActivityCardFields,
  updateMapActivityIcon,
  updateMapActivityIllustration,
  updateMapActivityEdgeStyles,
  updateMapActivityPosition,
  updateMapActivityStepRanges,
  updateMapActivityTitle,
} from '../../features/game/api';
import { getActivityXpReward } from '../../features/game/activityPresentation';
import { useTranslation } from '../../hooks/useTranslation';

// UI Layout and Styling Wrappers (Atomic Design)
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { MapContainer, MapArea, MapSidePanel, LoadingMap } from '../../components/organisms/MapContainer';
import { GameMap } from '../../components/organisms/GameMap';
import type { GraphEdge } from '../../components/molecules/GenericGraph';
import { ActivityCard, type ActivityCardData, type ActivityResourceLink } from '../../components/organisms/ActivityCard';
import { MapEdgeCard } from '../../components/organisms/MapEdgeCard';
import { formatUserDisplayName } from '../../utils/displayName';
import { cn } from '../../utils/cn';
import { useErrorReporter } from '../../features/errors/notifications';
import { uploadAsset } from '../../features/assets/api';

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
  const reportError = useErrorReporter();
  const {
    student,
    character,
    user,
    activities,
    activityEdges,
    currentStep,
    activityCompletions,
    nodeOccupancies,
    currentActivityId,
    currentMove,
    selectedGameId,
    setActivities,
    patchActivity,
    setActivityEdges,
    patchActivityEdge,
    removeActivityEdges,
    setMapData,
    addActivityCompletion,
    setCurrentMove,
    gainXp,
  } = useGameStore();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GameActivityEdge | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [edgeStyleError, setEdgeStyleError] = useState<string | null>(null);
  const [savingEdgeId, setSavingEdgeId] = useState<string | null>(null);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [previewStep, setPreviewStep] = useState(currentStep);
  const deletingActivityIdsRef = useRef(new Set<string>());
  const deletingEdgeIdsRef = useRef(new Set<string>());
  const edgeStyleSaveVersionsRef = useRef(new Map<string, number>());
  const activityStepRangeSaveVersionsRef = useRef(new Map<string, number>());
  const activityTitleSaveVersionsRef = useRef(new Map<string, number>());
  const activityCardFieldSaveVersionsRef = useRef(new Map<string, number>());
  const showMapError = (messageKey: string, error: unknown) => {
    reportError(error, { messageKey, id: messageKey });
  };

  // Chargement de la carte depuis le Backend Hono
  const fetchMapData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const mapData = await fetchMapActivities(token, selectedGameId);
      setMapData(mapData);
      setSelectedActivity(null);
      setSelectedEdge(null);
    } catch (error: unknown) {
      console.warn('Could not load map activities.', error);
      showMapError('map.errors.load', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [selectedGameId]);

  useEffect(() => {
    setPreviewStep(currentStep);
  }, [currentStep, selectedGameId]);

  useEffect(() => {
    const handleCohortStepUpdated = () => {
      fetchMapData();
    };

    window.addEventListener('eduquest:cohort-step-updated', handleCohortStepUpdated);
    return () => window.removeEventListener('eduquest:cohort-step-updated', handleCohortStepUpdated);
  }, [selectedGameId]);

  useEffect(() => {
    setSelectedEdge((current) => {
      if (!current) return current;
      return activityEdges.find((edge) => edge.id === current.id) || null;
    });
  }, [activityEdges]);

  useEffect(() => {
    setSelectedActivity((current) => {
      if (!current) return current;
      return activities.find((activity) => activity.id === current.id) || null;
    });
  }, [activities]);

  const completedActivityIds = activityCompletions.map((completion) => completion.activityId);
  const previewSteps = useMemo(
    () => getMapPreviewSteps(activities, activityEdges, currentStep),
    [activities, activityEdges, currentStep]
  );
  useEffect(() => {
    if (!previewSteps.includes(previewStep)) {
      setPreviewStep(previewSteps.includes(currentStep) ? currentStep : previewSteps[0]);
    }
  }, [currentStep, previewStep, previewSteps]);
  const previewStepIndex = Math.max(0, previewSteps.indexOf(previewStep));
  const canPreviewPreviousStep = previewStepIndex > 0;
  const canPreviewNextStep = previewStepIndex >= 0 && previewStepIndex < previewSteps.length - 1;
  const changePreviewStepByOffset = (offset: -1 | 1) => {
    const currentIndex = previewSteps.indexOf(previewStep);
    const fallbackIndex = previewSteps.reduce(
      (closestIndex, step, index) =>
        Math.abs(step - previewStep) < Math.abs(previewSteps[closestIndex] - previewStep)
          ? index
          : closestIndex,
      0
    );
    const nextIndex = Math.max(
      0,
      Math.min(previewSteps.length - 1, (currentIndex >= 0 ? currentIndex : fallbackIndex) + offset)
    );
    setPreviewStep(previewSteps[nextIndex]);
  };

  const handleCreateActivity = async () => {
    if (!user?.isAdmin || isCreatingActivity) return;

    setIsCreatingActivity(true);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const activity = await createMapActivity(
        token,
        { mapX: 500, mapY: 300, currentStep },
        selectedGameId
      );
      setActivities([...activities, activity]);
      setSelectedActivity(activity);
      setSelectedEdge(null);
    } catch (error) {
      console.warn('Could not create activity.', error);
      showMapError('map.errors.createActivity', error);
    } finally {
      setIsCreatingActivity(false);
    }
  };

  const handleSelectActivity = async (activity: Activity) => {
    setSelectedActivity(activity);
    setSelectedEdge(null);
    if (user?.isAdmin) return;
    if (!character) return;
    if (activity.isCurrent || activity.isLocked) return;
    if (
      currentActivityId &&
      !hasDirectMapEdge(activityEdges, currentActivityId, activity.id)
    ) {
      return;
    }

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const result = await moveCharacterToActivity(token, activity.id, selectedGameId);
      setCurrentMove(result.move, result.currentActivityId);
      setSelectedActivity({ ...activity, isCurrent: true });
    } catch (error) {
      console.warn('Could not track character move.', error);
      showMapError('map.errors.moveActivity', error);
    }
  };

  const handleClearMapSelection = () => {
    setSelectedActivity(null);
    setSelectedEdge(null);
  };

  // Soumission / Résolution d'un nœud
  const handleCompleteActivity = async (act: Activity, draft?: ActivityCompletionDraft) => {
    if (completedActivityIds.includes(act.id) || completingActivityId) return;
    const onboardingTask = getStringMetadata((act.metadata || {}) as Record<string, unknown>, 'onboardingTask');

    if (onboardingTask === 'character_card' && !character) {
      window.location.hash = 'character';
      return;
    }

    if (onboardingTask === 'institutional_profile') {
      const hasInstitutionalProfile = Boolean(
        user?.firstName ||
          user?.lastName ||
          user?.birthDate ||
          student?.cohortMemberships?.some((membership) => membership.institutionalEmail)
      );
      if (!hasInstitutionalProfile) {
        setCompletionError(t('map.onboarding.institutionalProfileRequired'));
        return;
      }
    }

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
      showMapError('map.errors.completeActivity', error);
      setCompletionError(t('detailPanel.completionError'));
    } finally {
      setCompletingActivityId(null);
    }
  };

  const handleMoveActivityNode = async (activity: Activity, position: { x: number; y: number }) => {
    if (!user?.isAdmin) return;

    const nextPosition = { mapX: position.x, mapY: position.y };
    patchActivity(activity.id, nextPosition);
    if (selectedActivity?.id === activity.id) {
      setSelectedActivity({ ...selectedActivity, ...nextPosition });
    }

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityPosition(
        token,
        activity.id,
        nextPosition,
        selectedGameId
      );
      patchActivity(activity.id, updatedActivity);
      if (selectedActivity?.id === activity.id) {
        setSelectedActivity((current) =>
          current?.id === activity.id ? { ...current, ...updatedActivity } : current
        );
      }
    } catch (error) {
      console.warn('Could not update activity map position.', error);
      showMapError('map.errors.updatePosition', error);
      patchActivity(activity.id, { mapX: activity.mapX, mapY: activity.mapY });
      if (selectedActivity?.id === activity.id) {
        setSelectedActivity((current) =>
          current?.id === activity.id
            ? { ...current, mapX: activity.mapX, mapY: activity.mapY }
            : current
        );
      }
    }
  };

  const handleActivityIconChange = async (activity: Activity, iconKey: string) => {
    if (!user?.isAdmin) return;

    const previousMetadata = (activity.metadata || {}) as Record<string, unknown>;
    const nextPatch = {
      metadata: {
        ...previousMetadata,
        iconKey,
      },
    };
    patchActivity(activity.id, nextPatch);
    setSelectedActivity((current) => (current?.id === activity.id ? { ...current, ...nextPatch } : current));

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityIcon(token, activity.id, iconKey, selectedGameId);
      patchActivity(activity.id, updatedActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...updatedActivity } : current
      );
    } catch (error) {
      console.warn('Could not update activity icon.', error);
      showMapError('map.errors.updateIcon', error);
      patchActivity(activity.id, { metadata: activity.metadata });
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, metadata: activity.metadata } : current
      );
    }
  };

  const handleActivityTitleChange = async (activity: Activity, title: string) => {
    if (!user?.isAdmin) return;

    const nextTitle = title.trim();
    const previousActivity = activity;
    const saveVersion = (activityTitleSaveVersionsRef.current.get(activity.id) || 0) + 1;
    activityTitleSaveVersionsRef.current.set(activity.id, saveVersion);

    patchActivity(activity.id, { title: nextTitle });
    setSelectedActivity((current) => (current?.id === activity.id ? { ...current, title: nextTitle } : current));

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityTitle(token, activity.id, nextTitle, selectedGameId);
      if (activityTitleSaveVersionsRef.current.get(activity.id) !== saveVersion) return;
      patchActivity(activity.id, updatedActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...updatedActivity } : current
      );
    } catch (error) {
      if (activityTitleSaveVersionsRef.current.get(activity.id) !== saveVersion) return;
      console.warn('Could not update activity title.', error);
      showMapError('map.errors.updateTitle', error);
      patchActivity(previousActivity.id, previousActivity);
      setSelectedActivity((current) =>
        current?.id === previousActivity.id ? previousActivity : current
      );
    }
  };

  const handleActivityCardFieldsChange = async (
    activity: Activity,
    saveKey: string,
    payload: ActivityCardFieldsPayload,
    optimisticPatch: Partial<Activity>,
    errorKey: string
  ) => {
    if (!user?.isAdmin) return;

    const previousActivity = activity;
    const versionKey = `${activity.id}:${saveKey}`;
    const saveVersion = (activityCardFieldSaveVersionsRef.current.get(versionKey) || 0) + 1;
    activityCardFieldSaveVersionsRef.current.set(versionKey, saveVersion);

    patchActivity(activity.id, optimisticPatch);
    setSelectedActivity((current) =>
      current?.id === activity.id ? { ...current, ...optimisticPatch } : current
    );

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityCardFields(token, activity.id, payload, selectedGameId);
      if (activityCardFieldSaveVersionsRef.current.get(versionKey) !== saveVersion) return;
      patchActivity(activity.id, updatedActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...updatedActivity } : current
      );
    } catch (error) {
      if (activityCardFieldSaveVersionsRef.current.get(versionKey) !== saveVersion) return;
      console.warn('Could not update activity card field.', error);
      showMapError(errorKey, error);
      patchActivity(previousActivity.id, previousActivity);
      setSelectedActivity((current) =>
        current?.id === previousActivity.id ? previousActivity : current
      );
    }
  };

  const handleActivitySubtitleChange = (activity: Activity, subtitle: string) => {
    const previousMetadata = (activity.metadata || {}) as Record<string, unknown>;
    const metadata = { ...previousMetadata, subtitle };
    void handleActivityCardFieldsChange(
      activity,
      'subtitle',
      { subtitle },
      { metadata },
      'map.errors.updateSubtitle'
    );
  };

  const handleActivityDescriptionChange = (activity: Activity, description: string) => {
    const previousMetadata = (activity.metadata || {}) as Record<string, unknown>;
    const metadata = { ...previousMetadata, description };
    void handleActivityCardFieldsChange(
      activity,
      'description',
      { description },
      { metadata },
      'map.errors.updateDescription'
    );
  };

  const handleActivityGoldRewardChange = (activity: Activity, goldReward: number) => {
    void handleActivityCardFieldsChange(
      activity,
      'basePoints',
      { basePoints: goldReward },
      { basePoints: goldReward },
      'map.errors.updateGoldReward'
    );
  };

  const handleActivityResourcesChange = (activity: Activity, resources: ActivityResourceLink[]) => {
    const normalizedResources = resources
      .map((resource) => ({
        ...(resource.title?.trim() ? { title: resource.title.trim() } : {}),
        url: resource.url.trim(),
      }))
      .filter((resource) => resource.url);
    const previousMetadata = (activity.metadata || {}) as Record<string, unknown>;
    const metadata = { ...previousMetadata, resources: normalizedResources };
    void handleActivityCardFieldsChange(
      activity,
      'resources',
      { resources: normalizedResources },
      { metadata },
      'map.errors.updateResources'
    );
  };

  const handleActivityCardPositionChange = (activity: Activity, position: { mapX: number; mapY: number }) => {
    void handleActivityCardFieldsChange(
      activity,
      'position',
      position,
      position,
      'map.errors.updatePosition'
    );
  };

  const handleActivityParticipationModeChange = (
    activity: Activity,
    participationMode: Activity['participationMode']
  ) => {
    if (!participationMode) return;
    void handleActivityCardFieldsChange(
      activity,
      'participationMode',
      { participationMode },
      { participationMode },
      'map.errors.updateParticipationMode'
    );
  };

  const handleActivityCardColorChange = async (activity: Activity, cardColor: string) => {
    if (!user?.isAdmin) return;

    const previousColor = activity.cardColor;
    patchActivity(activity.id, { cardColor });
    setSelectedActivity((current) => (current?.id === activity.id ? { ...current, cardColor } : current));

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityCardColor(token, activity.id, cardColor, selectedGameId);
      patchActivity(activity.id, updatedActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...updatedActivity } : current
      );
    } catch (error) {
      console.warn('Could not update activity card color.', error);
      showMapError('map.errors.updateColor', error);
      patchActivity(activity.id, { cardColor: previousColor });
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, cardColor: previousColor } : current
      );
    }
  };

  const handleActivityIllustrationChange = async (activity: Activity, illustrationUrl: string) => {
    if (!user?.isAdmin) return;

    const previousMetadata = (activity.metadata || {}) as Record<string, unknown>;
    const nextMetadata = { ...previousMetadata };
    if (illustrationUrl.trim()) {
      nextMetadata.illustrationUrl = illustrationUrl.trim();
    } else {
      delete nextMetadata.illustrationUrl;
    }
    const nextPatch = { metadata: nextMetadata };
    patchActivity(activity.id, nextPatch);
    setSelectedActivity((current) => (current?.id === activity.id ? { ...current, ...nextPatch } : current));

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityIllustration(
        token,
        activity.id,
        illustrationUrl,
        selectedGameId
      );
      patchActivity(activity.id, updatedActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...updatedActivity } : current
      );
    } catch (error) {
      console.warn('Could not update activity illustration.', error);
      showMapError('map.errors.updateIllustration', error);
      patchActivity(activity.id, { metadata: activity.metadata });
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, metadata: activity.metadata } : current
      );
    }
  };

  const uploadActivityIllustration = async (activity: Activity, file: File) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) throw new Error('Missing session token.');

    const asset = await uploadAsset(token, 'activity-illustration', file, activity.id);
    return asset.url;
  };

  const handleActivityStepRangesChange = async (
    activity: Activity,
    stepRanges: ActivityStepRange[]
  ) => {
    if (!user?.isAdmin) return;

    const previousActivity = activities.find((candidate) => candidate.id === activity.id) || activity;
    const saveVersion = (activityStepRangeSaveVersionsRef.current.get(activity.id) || 0) + 1;
    activityStepRangeSaveVersionsRef.current.set(activity.id, saveVersion);
    const optimisticActivity = resolveActivityWithStepRanges(
      previousActivity,
      stepRanges,
      activities,
      activityEdges,
      previewStep
    );
    patchActivity(activity.id, optimisticActivity);
    setSelectedActivity((current) =>
      current?.id === activity.id ? { ...current, ...optimisticActivity } : current
    );

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedActivity = await updateMapActivityStepRanges(
        token,
        activity.id,
        stepRanges,
        selectedGameId
      );
      if (activityStepRangeSaveVersionsRef.current.get(activity.id) !== saveVersion) return;
      patchActivity(activity.id, updatedActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...updatedActivity } : current
      );
    } catch (error) {
      if (activityStepRangeSaveVersionsRef.current.get(activity.id) !== saveVersion) return;
      console.warn('Could not update activity step ranges.', error);
      showMapError('map.errors.updateStepRanges', error);
      patchActivity(previousActivity.id, previousActivity);
      setSelectedActivity((current) =>
        current?.id === activity.id ? { ...current, ...previousActivity } : current
      );
    }
  };

  const handleDeleteActivityEdges = async (deletedEdges: Array<{ id: string }>) => {
    if (!user?.isAdmin) return;

    const edgeIds = deletedEdges
      .map((edge) => edge.id)
      .filter((edgeId) => edgeId && !deletingEdgeIdsRef.current.has(edgeId));
    if (edgeIds.length === 0) return;

    const previousEdges = activityEdges;
    edgeIds.forEach((edgeId) => deletingEdgeIdsRef.current.add(edgeId));
    removeActivityEdges(edgeIds);
    setSelectedEdge((current) => (current && edgeIds.includes(current.id) ? null : current));

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      await Promise.all(edgeIds.map((edgeId) => deleteMapActivityEdge(token, edgeId, selectedGameId)));
    } catch (error) {
      console.warn('Could not delete activity edge.', error);
      showMapError('map.errors.deleteEdge', error);
      setActivityEdges(previousEdges);
    } finally {
      edgeIds.forEach((edgeId) => deletingEdgeIdsRef.current.delete(edgeId));
    }
  };

  const handleConnectActivityEdge = async (edge: GraphEdge) => {
    if (!user?.isAdmin) return;
    if (edge.from === edge.to) return;

    const alreadyExists = activityEdges.some(
      (candidate) => candidate.fromActivityId === edge.from && candidate.toActivityId === edge.to
    );
    if (alreadyExists) return;

    const optimisticEdge: GameActivityEdge = {
      id: edge.id,
      fromActivityId: edge.from,
      toActivityId: edge.to,
      metadata: {},
    };
    const previousEdges = activityEdges;
    setActivityEdges([...activityEdges, optimisticEdge]);
    setSelectedEdge(optimisticEdge);

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const createdEdge = await createMapActivityEdge(
        token,
        { fromActivityId: edge.from, toActivityId: edge.to },
        selectedGameId
      );
      const latestEdges = useGameStore.getState().activityEdges;
      const withoutOptimisticEdge = latestEdges.filter((candidate) => candidate.id !== optimisticEdge.id);
      const hasCreatedEdge = withoutOptimisticEdge.some((candidate) => candidate.id === createdEdge.id);
      setActivityEdges(hasCreatedEdge ? withoutOptimisticEdge : [...withoutOptimisticEdge, createdEdge]);
      setSelectedEdge(createdEdge);
    } catch (error) {
      console.warn('Could not create activity edge.', error);
      showMapError('map.errors.createEdge', error);
      setActivityEdges(previousEdges);
      setSelectedEdge((current) => (current?.id === optimisticEdge.id ? null : current));
    }
  };

  const handleDeleteActivityNodes = async (deletedActivities: Activity[]) => {
    if (!user?.isAdmin) return;

    const activityIds = deletedActivities
      .filter((activity) => !isSystemOnboardingActivity(activity))
      .map((activity) => activity.id)
      .filter((activityId) => activityId && !deletingActivityIdsRef.current.has(activityId));
    if (activityIds.length === 0) return;

    const previousActivities = activities;
    const previousEdges = activityEdges;
    activityIds.forEach((activityId) => deletingActivityIdsRef.current.add(activityId));
    setActivities(activities.filter((activity) => !activityIds.includes(activity.id)));
    setActivityEdges(
      activityEdges.filter(
        (edge) => !activityIds.includes(edge.fromActivityId) && !activityIds.includes(edge.toActivityId)
      )
    );
    setSelectedActivity((current) => (current && activityIds.includes(current.id) ? null : current));
    setSelectedEdge((current) =>
      current &&
      (activityIds.includes(current.fromActivityId) || activityIds.includes(current.toActivityId))
        ? null
        : current
    );

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      await Promise.all(activityIds.map((activityId) => deleteMapActivity(token, activityId, selectedGameId)));
    } catch (error) {
      console.warn('Could not delete activity node.', error);
      showMapError('map.errors.deleteActivity', error);
      setActivities(previousActivities);
      setActivityEdges(previousEdges);
    } finally {
      activityIds.forEach((activityId) => deletingActivityIdsRef.current.delete(activityId));
    }
  };

  const handleSelectEdge = (edge: GameActivityEdge) => {
    if (!user?.isAdmin) return;
    setSelectedActivity(null);
    setSelectedEdge(edge);
    setEdgeStyleError(null);
  };

  const handleChangeEdgeStyles = async (
    edge: GameActivityEdge,
    styleWindows: GameActivityEdgeStyleWindow[]
  ) => {
    if (!user?.isAdmin) return;

    const previousEdge = activityEdges.find((candidate) => candidate.id === edge.id) || edge;
    const saveVersion = (edgeStyleSaveVersionsRef.current.get(edge.id) || 0) + 1;
    edgeStyleSaveVersionsRef.current.set(edge.id, saveVersion);
    const metadata = {
      ...(edge.metadata || {}),
      styleWindows,
    };
    const optimisticEdge = { ...edge, metadata };
    patchActivityEdge(edge.id, optimisticEdge);
    setSelectedEdge(optimisticEdge);
    setSavingEdgeId(edge.id);
    setEdgeStyleError(null);

    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedEdge = await updateMapActivityEdgeStyles(token, edge.id, styleWindows, selectedGameId);
      if (edgeStyleSaveVersionsRef.current.get(edge.id) !== saveVersion) return;
      patchActivityEdge(edge.id, updatedEdge);
      setSelectedEdge(updatedEdge);
    } catch (error) {
      if (edgeStyleSaveVersionsRef.current.get(edge.id) !== saveVersion) return;
      console.warn('Could not update activity edge styles.', error);
      showMapError('map.errors.updateEdgeStyles', error);
      patchActivityEdge(previousEdge.id, previousEdge);
      setSelectedEdge(previousEdge);
      setEdgeStyleError(t('mapEdgeCard.errors.save'));
    } finally {
      if (edgeStyleSaveVersionsRef.current.get(edge.id) === saveVersion) {
        setSavingEdgeId(null);
      }
    }
  };

  if (!user?.isAdmin && (!user || !student)) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-muted font-display">
        {!user ? t('layout.loadingSession') : t('map.empty.profileIncomplete')}
      </div>
    );
  }

  return (
    <GameLayout fitToViewport hideDashboard={Boolean(!user?.isAdmin && !character)}>
      <GameHeader navigationMode={!user?.isAdmin && !character ? 'mapOnly' : 'full'} />

      <MapContainer>
        <MapArea>
          {loading ? (
            <LoadingMap />
          ) : (
            <div className="relative h-full min-h-0">
              <GameMap
                activities={activities}
                edges={activityEdges}
                nodeOccupancies={nodeOccupancies}
                playerMarker={
                  !user?.isAdmin && user
                    ? {
                        activityId: currentActivityId,
                        previousActivityId: currentMove?.fromActivityId,
                        characterClass: character?.characterClass,
                        illustrationUrl: character?.illustrationUrl || user.avatarUrl || user.githubAvatarUrl,
                        label: formatUserDisplayName(user),
                      }
                    : undefined
                }
                canEditLocked={Boolean(user?.isAdmin)}
                showGuildOccupancyMarkers={Boolean(user?.isAdmin)}
                showCompletionState={!user?.isAdmin}
                currentStep={previewStep}
                onSelectNode={handleSelectActivity}
                onSelectEdge={user?.isAdmin ? handleSelectEdge : undefined}
                onClearSelection={handleClearMapSelection}
                onNodeMove={handleMoveActivityNode}
                onConnectEdges={handleConnectActivityEdge}
                onDeleteNodes={handleDeleteActivityNodes}
                onDeleteEdges={handleDeleteActivityEdges}
              />
              {activities.length === 0 ? (
                <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-6">
                  <div className="max-w-md rounded-3xl border border-gaming-border bg-gaming-card/90 p-6 text-center shadow-card backdrop-blur-xl">
                    <p className="font-display text-lg font-black text-text-primary">
                      {user?.isAdmin ? t('map.empty.adminTitle') : t('map.empty.studentTitle')}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      {user?.isAdmin ? t('map.empty.adminDescription') : t('map.empty.studentDescription')}
                    </p>
                  </div>
                </div>
              ) : null}
              {user?.isAdmin ? (
                <>
                  <MapStepPreviewControl
                    steps={previewSteps}
                    value={previewStep}
                    persistedStep={currentStep}
                    canPrevious={canPreviewPreviousStep}
                    canNext={canPreviewNextStep}
                    onChange={setPreviewStep}
                    onPrevious={() => changePreviewStepByOffset(-1)}
                    onNext={() => changePreviewStepByOffset(1)}
                    t={t}
                  />
                </>
              ) : null}
            </div>
          )}
        </MapArea>

        <MapSidePanel>
          {selectedEdge && user?.isAdmin ? (
            <MapEdgeCard
              edge={selectedEdge}
              activities={activities}
              currentStep={previewStep}
              isSaving={savingEdgeId === selectedEdge.id}
              error={edgeStyleError}
              onChange={handleChangeEdgeStyles}
            />
          ) : selectedActivity ? (
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
              onIconChange={
                user?.isAdmin ? (iconKey) => handleActivityIconChange(selectedActivity, iconKey) : undefined
              }
              onTitleChange={
                user?.isAdmin ? (title) => handleActivityTitleChange(selectedActivity, title) : undefined
              }
              onSubtitleChange={
                user?.isAdmin ? (subtitle) => handleActivitySubtitleChange(selectedActivity, subtitle) : undefined
              }
              onDescriptionChange={
                user?.isAdmin
                  ? (description) => handleActivityDescriptionChange(selectedActivity, description)
                  : undefined
              }
              onGoldRewardChange={
                user?.isAdmin ? (goldReward) => handleActivityGoldRewardChange(selectedActivity, goldReward) : undefined
              }
              onResourcesChange={
                user?.isAdmin ? (resources) => handleActivityResourcesChange(selectedActivity, resources) : undefined
              }
              onPositionChange={
                user?.isAdmin ? (position) => handleActivityCardPositionChange(selectedActivity, position) : undefined
              }
              onParticipationModeChange={
                user?.isAdmin
                  ? (participationMode) => handleActivityParticipationModeChange(selectedActivity, participationMode)
                  : undefined
              }
              onCardColorChange={
                user?.isAdmin
                  ? (cardColor) => handleActivityCardColorChange(selectedActivity, cardColor)
                  : undefined
              }
              onIllustrationUrlChange={
                user?.isAdmin
                  ? (illustrationUrl) => handleActivityIllustrationChange(selectedActivity, illustrationUrl)
                  : undefined
              }
              onIllustrationUpload={
                user?.isAdmin ? (file) => uploadActivityIllustration(selectedActivity, file) : undefined
              }
              onStepRangesChange={
                user?.isAdmin
                  ? (stepRanges) => handleActivityStepRangesChange(selectedActivity, stepRanges)
                  : undefined
              }
              className="h-full min-h-0 w-full max-w-none"
            />
          ) : (
            <ActivityCard
              emptyCardLabel={user?.isAdmin ? t('map.addActivity') : undefined}
              onEmptyCardClick={user?.isAdmin && !isCreatingActivity ? handleCreateActivity : undefined}
              className={cn(
                'h-full min-h-0 w-full max-w-none',
                isCreatingActivity && 'cursor-wait opacity-70'
              )}
            />
          )}
        </MapSidePanel>
      </MapContainer>
    </GameLayout>
  );
}

function MapStepPreviewControl({
  steps,
  value,
  persistedStep,
  canPrevious,
  canNext,
  onChange,
  onPrevious,
  onNext,
  t,
}: {
  steps: number[];
  value: number;
  persistedStep: number;
  canPrevious: boolean;
  canNext: boolean;
  onChange: (step: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  t: (path: string) => string;
}) {
  return (
    <div className="absolute right-5 top-5 z-40 w-24 overflow-hidden rounded-2xl border border-gaming-border bg-gaming-card/95 text-text-primary shadow-card backdrop-blur-xl">
      <div className="border-b border-gaming-border px-2.5 py-2 text-center">
        <p className="font-display text-[0.62rem] font-black uppercase tracking-[0.16em] text-text-muted">
          {t('map.stepPreview.title')}
        </p>
        <p className="mt-0.5 text-[0.62rem] font-semibold text-text-muted">
          {formatTranslation(t('map.stepPreview.uiOnly'), { step: persistedStep })}
        </p>
      </div>
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        className="flex h-8 w-full items-center justify-center border-b border-gaming-border text-text-secondary transition hover:bg-gaming-base focus:outline-none focus:ring-2 focus:ring-status-quest disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={t('map.stepPreview.previous')}
        title={t('map.stepPreview.previous')}
      >
        <ChevronUp size={16} aria-hidden />
      </button>
      <div className="max-h-56 overflow-y-auto p-1.5">
        <div className="space-y-1">
          {steps.map((step) => {
            const isSelected = step === value;
            const isPersisted = step === persistedStep;

            return (
              <button
                key={step}
                type="button"
                onClick={() => onChange(step)}
                aria-pressed={isSelected}
                title={formatTranslation(t('map.stepPreview.select'), { step })}
                className={cn(
                  'relative flex h-9 w-full items-center justify-center rounded-xl border px-2 font-display text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-status-quest',
                  isSelected
                    ? 'border-status-quest bg-status-quest text-gaming-base shadow-glow-primary'
                    : 'border-gaming-border bg-gaming-base/70 text-text-secondary hover:border-status-quest hover:text-status-quest'
                )}
              >
                {step}
                {isPersisted ? (
                  <span
                    className={cn(
                      'absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-gaming-base' : 'bg-status-completed'
                    )}
                    aria-label={t('map.stepPreview.persisted')}
                    title={t('map.stepPreview.persisted')}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="flex h-8 w-full items-center justify-center border-t border-gaming-border text-text-secondary transition hover:bg-gaming-base focus:outline-none focus:ring-2 focus:ring-status-quest disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={t('map.stepPreview.next')}
        title={t('map.stepPreview.next')}
      >
        <ChevronDown size={16} aria-hidden />
      </button>
    </div>
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
    subtitle:
      getStringMetadata(metadata, 'subtitle') ||
      `${t(`common.${activity.type}`)} · ${activity.isGraded ? t('activityCard.graded') : t('activityCard.notGraded')}`,
    description:
      getStringMetadata(metadata, 'description') ||
      getStringMetadata(metadata, 'lore') ||
      getStringMetadata(metadata, 'summary') ||
      t('activityCard.defaultDescription'),
    illustrationUrl: getStringMetadata(metadata, 'illustrationUrl'),
    illustrationAlt: getStringMetadata(metadata, 'illustrationAlt') || activity.title,
    goldReward: getActivityXpReward(activity),
    cardColor: activity.cardColor,
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

function isSystemOnboardingActivity(activity: Activity) {
  const onboardingTask = getStringMetadata((activity.metadata || {}) as Record<string, unknown>, 'onboardingTask');
  return onboardingTask === 'institutional_profile' || onboardingTask === 'character_card';
}

function resolveActivityWithStepRanges(
  activity: Activity,
  stepRanges: ActivityStepRange[],
  activities: Activity[],
  edges: GameActivityEdge[],
  currentStep: number
): Activity {
  const normalizedRanges = stepRanges.length
    ? stepRanges
    : [{ startStep: Math.max(activity.requiredLevel - 1, 0) }];
  const prerequisites = edges
    .filter((edge) => edge.toActivityId === activity.id)
    .map((edge) => edge.fromActivityId);
  const completedActivityIds = new Set(
    activities.filter((candidate) => candidate.isCompleted).map((candidate) => candidate.id)
  );
  const prerequisitesCompleted = prerequisites.every((id) => completedActivityIds.has(id));
  const isRoot = prerequisites.length === 0;
  const isCompleted = Boolean(activity.isCompleted);
  const hasBeenRevealed = normalizedRanges.some((range) => currentStep >= range.startStep);
  const isActiveForStep = normalizedRanges.some((range) => isStepInsideRange(currentStep, range));
  const isRevealed =
    isCompleted || (hasBeenRevealed && isActiveForStep && (isRoot || prerequisitesCompleted));

  return {
    ...activity,
    stepRanges: normalizedRanges,
    isRevealed,
    isLocked: !isRevealed || !prerequisitesCompleted,
  };
}

function isStepInsideRange(step: number, range: ActivityStepRange) {
  return step >= range.startStep && (range.endStep == null || step < range.endStep);
}

function getMapPreviewSteps(
  activities: Activity[],
  edges: GameActivityEdge[],
  persistedStep: number
) {
  const definedSteps = new Set<number>([0, persistedStep]);

  for (const activity of activities) {
    definedSteps.add(Math.max(activity.requiredLevel - 1, 0));
    definedSteps.add(activity.sectorDepth);
    for (const range of activity.stepRanges || []) {
      definedSteps.add(range.startStep);
      if (range.endStep != null) definedSteps.add(range.endStep);
    }
  }

  for (const edge of edges) {
    const styleWindows = edge.metadata?.styleWindows;
    if (!Array.isArray(styleWindows)) continue;
    for (const window of styleWindows) {
      const candidate = window as GameActivityEdgeStyleWindow;
      if (Number.isInteger(candidate.startStep)) definedSteps.add(candidate.startStep);
      if (candidate.endStep != null && Number.isInteger(candidate.endStep)) {
        definedSteps.add(candidate.endStep);
      }
    }
  }

  const maxStep = Math.max(
    ...Array.from(definedSteps).filter((step) => Number.isInteger(step) && step >= 0)
  );
  return Array.from({ length: maxStep + 1 }, (_item, index) => index);
}

function hasDirectMapEdge(edges: GameActivityEdge[], firstActivityId: string, secondActivityId: string) {
  return edges.some(
    (edge) =>
      (edge.fromActivityId === firstActivityId && edge.toActivityId === secondActivityId) ||
      (edge.fromActivityId === secondActivityId && edge.toActivityId === firstActivityId)
  );
}

function formatTranslation(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  );
}

function getNestedStringMetadata(metadata: Record<string, unknown>, objectKey: string, key: string) {
  const value = metadata[objectKey];
  if (!value || typeof value !== 'object') return undefined;
  const nestedValue = (value as Record<string, unknown>)[key];
  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

function getActivityResources(metadata: Record<string, unknown>, activityUrl?: string): ActivityResourceLink[] {
  if (Array.isArray(metadata.resources)) {
    return getResourceList(metadata);
  }

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
