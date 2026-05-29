import type { CSSProperties } from 'react';
import type {
  Activity,
  ActivityStepRange,
  GameActivityEdge,
  GameActivityEdgeAnimation,
  GameActivityEdgeStyleWindow,
  GameCharacterClass,
  GameMapNodeOccupancy,
} from '@eduquest/shared';
import {
  GenericGraph,
  GraphEdge,
  GraphNode,
  type GraphNodeAnnularSegment,
} from '../molecules/GenericGraph';
import { AvatarDeck, type AvatarDeckMember, type AvatarDeckMotion } from '../molecules/AvatarDeck';
import {
  CheckCircle2,
  CloudFog,
  Lock,
} from 'lucide-react';
import { getActivityVisualVariant } from '../../features/game/activityPresentation';
import { renderLucideIcon } from '../../features/game/lucideIconCatalog';
import { UI_COLOR_TOKENS } from '../../styles/colorTokens';
import { useTranslation } from '../../hooks/useTranslation';

interface PlayerMapMarker {
  studentId?: string;
  guildId?: string;
  activityId: string | null;
  previousActivityId?: string;
  characterClass?: GameCharacterClass;
  illustrationUrl?: string;
  label: string;
}

interface GameMapProps {
  activities: Activity[];
  edges: GameActivityEdge[];
  nodeOccupancies?: GameMapNodeOccupancy[];
  playerMarker?: PlayerMapMarker;
  canEditLocked?: boolean;
  showGuildOccupancyMarkers?: boolean;
  showCompletionState?: boolean;
  currentStep?: number;
  onSelectNode: (activity: Activity) => void;
  onSelectEdge?: (edge: GameActivityEdge) => void;
  onClearSelection?: () => void;
  onNodeMove?: (activity: Activity, position: { x: number; y: number }) => void;
  onConnectEdges?: (edge: GraphEdge) => void;
  onDeleteNodes?: (activities: Activity[]) => void;
  onDeleteEdges?: (edges: GraphEdge[]) => void;
}

const SOLO_OCCUPANCY_COLOR = UI_COLOR_TOKENS.neutral;
const FALLBACK_GUILD_COLOR = UI_COLOR_TOKENS.quest;
const EDGE_COLOR_LOCKED = UI_COLOR_TOKENS.neutral;
const EDGE_COLOR_TARGET = UI_COLOR_TOKENS.quest;
const EDGE_COLOR_COMPLETED = UI_COLOR_TOKENS.completed;

const CHARACTER_CLASS_COLORS: Record<GameCharacterClass, string> = {
  scholar: UI_COLOR_TOKENS.scholar,
  champion: UI_COLOR_TOKENS.champion,
  guide: UI_COLOR_TOKENS.guide,
  specialist: UI_COLOR_TOKENS.specialist,
};

const MAP_AVATAR_TRAVEL_KEYFRAMES = `
@keyframes map-avatar-travel {
  0% {
    opacity: 0.25;
    transform: translate(var(--travel-x, 0), var(--travel-y, 0)) scale(0.72);
  }
  70% {
    opacity: 1;
    transform: translate(0, 0) scale(1.08);
  }
  100% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}

.map-avatar-travel {
  animation: map-avatar-travel 900ms cubic-bezier(0.22, 1, 0.36, 1);
}
`;

export function GameMap({
  activities,
  edges,
  nodeOccupancies = [],
  playerMarker,
  canEditLocked = false,
  showGuildOccupancyMarkers = false,
  showCompletionState = true,
  currentStep = 0,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  onNodeMove,
  onConnectEdges,
  onDeleteNodes,
  onDeleteEdges,
}: GameMapProps) {
  const { t } = useTranslation();
  type NodeStatus = 'FOG_OF_WAR' | 'ACTIVE';

  const getIcon = (activity: Activity, status: NodeStatus, isLocked: boolean) => {
    if (status === 'FOG_OF_WAR') return <CloudFog size={20} />;
    if (isLocked) return <Lock size={20} />;
    const metadata = (activity.metadata || {}) as Record<string, unknown>;
    return renderLucideIcon(typeof metadata.iconKey === 'string' ? metadata.iconKey : activity.type, 20);
  };

  const getColors = (activity: Activity, status: NodeStatus) => {
    const isLocked = !canEditLocked && Boolean(activity.isLocked);

    if (!canEditLocked && status === 'FOG_OF_WAR') {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed opacity-50 blur-[1px]';
    }
    if (activity.isCurrent) {
      return 'bg-status-quest/20 border-status-quest text-status-quest cursor-pointer motion-safe:hover:scale-110 shadow-glow-primary ring-2 ring-status-quest/40';
    }
    if (!canEditLocked && !activity.isRevealed) {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed opacity-40';
    }
    if (isLocked) {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed';
    }
    if (activity.cardColor) {
      return 'cursor-pointer motion-safe:hover:scale-110 shadow-lg';
    }
    switch (getActivityVisualVariant(activity.type)) {
      case 'campfire':
        return 'bg-status-campfire/10 border-status-campfire text-status-campfire hover:border-status-campfire cursor-pointer motion-safe:hover:scale-110 motion-safe:animate-pulse';
      case 'quest':
        return 'bg-status-quest/10 border-status-quest text-status-quest hover:border-status-quest cursor-pointer motion-safe:hover:scale-110';
      case 'boss':
        return 'bg-status-boss/10 border-status-boss text-status-boss hover:border-status-boss cursor-pointer motion-safe:hover:scale-110 motion-safe:animate-bounce';
    }
  };

  const getColorStyle = (activity: Activity, status: NodeStatus): CSSProperties | undefined => {
    const isLocked = !canEditLocked && Boolean(activity.isLocked);

    if (!activity.cardColor || isLocked) return undefined;
    if (!canEditLocked && (status === 'FOG_OF_WAR' || !activity.isRevealed)) return undefined;

    return {
      backgroundColor: `color-mix(in srgb, ${activity.cardColor} 18%, transparent)`,
      borderColor: activity.cardColor,
      color: activity.cardColor,
      boxShadow: `0 0 18px color-mix(in srgb, ${activity.cardColor} 28%, transparent)`,
    };
  };

  // Convert Activity list to reusable Generic GraphNode list (KISS)
  const occupancyByActivityId = new Map(
    nodeOccupancies.map((occupancy) => [occupancy.activityId, occupancy])
  );
  const effectivePlayerMarker = playerMarker
    ? {
        ...playerMarker,
        guildId:
          playerMarker.guildId ||
          resolvePlayerGuildIdFromOccupancies(nodeOccupancies, playerMarker.studentId),
      }
    : undefined;
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const graphNodes: GraphNode<Activity>[] = activities.map((act) => {
    const visibilityStatus: NodeStatus = act.isRevealed ? 'ACTIVE' : 'FOG_OF_WAR';
    const displayStatus: NodeStatus = canEditLocked ? 'ACTIVE' : visibilityStatus;
    const locked = !canEditLocked && (displayStatus !== 'ACTIVE' || Boolean(act.isLocked));
    const isFogged = displayStatus === 'FOG_OF_WAR';
    const isCompleted = showCompletionState && Boolean(act.isCompleted);
    const showAdminFogBadge = canEditLocked && isActivityFoggedByStepWindow(act, currentStep);
    const hasPlayerMarker =
      effectivePlayerMarker &&
      (effectivePlayerMarker.activityId ? effectivePlayerMarker.activityId === act.id : act.isCurrent);
    const occupancy = occupancyByActivityId.get(act.id);
    const marker = buildMapNodeMarker({
      playerMarker: hasPlayerMarker ? effectivePlayerMarker : undefined,
      currentPlayerMarker: effectivePlayerMarker,
      occupancy,
      activity: act,
      activityById,
      showGuildOccupancyMarkers,
      t,
    });

    return {
      id: act.id,
      label: act.title,
      displayLabel: isFogged ? t('map.hiddenNode') : act.title,
      x: act.mapX,
      y: act.mapY,
      isCompleted,
      isLocked: locked,
      isHidden: false,
      icon: getIcon(act, displayStatus, locked),
      badge: isCompleted ? (
        <CheckCircle2
          size={18}
          strokeWidth={3.25}
          className="text-status-completed drop-shadow-[0_0_6px_var(--color-status-completed)]"
        />
      ) : showAdminFogBadge ? (
        <CloudFog
          size={18}
          strokeWidth={3.25}
          className="text-status-locked drop-shadow-[0_0_6px_var(--color-status-locked)]"
        />
      ) : undefined,
      marker,
      annularSegments: buildAnnularSegments(act, occupancy),
      customClass: getColors(act, displayStatus),
      customStyle: getColorStyle(act, displayStatus),
      fogState: canEditLocked ? undefined : isFogged ? 'fog' : locked ? undefined : 'clear',
      deletable: !isSystemOnboardingActivity(act),
      metadata: isFogged ? undefined : act,
    };
  });
  const nodeById = new Map(graphNodes.map((node) => [node.id, node]));
  const graphEdges: GraphEdge[] = edges.map((edge) => {
    const fromNode = nodeById.get(edge.fromActivityId);
    const toNode = nodeById.get(edge.toActivityId);
    const edgeStyle = resolveMapEdgeStyle({
      edge,
      fromActivity: activityById.get(edge.fromActivityId),
      toActivity: activityById.get(edge.toActivityId),
      currentActivityId: effectivePlayerMarker?.activityId,
      currentStep,
    });

    return {
      id: edge.id,
      from: edge.fromActivityId,
      to: edge.toActivityId,
      isCompleted: showCompletionState && Boolean(fromNode?.isCompleted && toNode?.isCompleted),
      isLocked: Boolean(fromNode?.isLocked || toNode?.isLocked),
      isHidden: Boolean(fromNode?.isHidden || toNode?.isHidden),
      ...edgeStyle,
    };
  });

  return (
    <>
      <style>{MAP_AVATAR_TRAVEL_KEYFRAMES}</style>
      <GenericGraph
        nodes={graphNodes}
        edges={graphEdges}
        width={1000}
        height="100%"
        className="h-full min-h-0"
        allowLockedSelection={canEditLocked}
        editable={canEditLocked}
        connectable={canEditLocked}
        deletable={canEditLocked}
        onNodeMove={(node, position) => {
          if (node.metadata) onNodeMove?.(node.metadata, position);
        }}
        onDeleteEdges={onDeleteEdges}
        onConnectNodes={onConnectEdges}
        onDeleteNodes={(nodes) => {
          const deletedActivities = nodes.flatMap((node) =>
            node.metadata && !isSystemOnboardingActivity(node.metadata) ? [node.metadata] : []
          );
          if (deletedActivities.length > 0) onDeleteNodes?.(deletedActivities);
        }}
        onSelectEdge={(edge) => {
          const selectedEdge = edges.find((candidate) => candidate.id === edge.id);
          if (selectedEdge) onSelectEdge?.(selectedEdge);
        }}
        onPaneClick={onClearSelection}
        onSelectNode={(node) => {
          if (node.metadata) onSelectNode(node.metadata);
        }}
      />
    </>
  );
}

function resolveMapEdgeStyle({
  edge,
  fromActivity,
  toActivity,
  currentActivityId,
  currentStep,
}: {
  edge: GameActivityEdge;
  fromActivity?: Activity;
  toActivity?: Activity;
  currentActivityId?: string | null;
  currentStep: number;
}): Pick<GraphEdge, 'color' | 'opacity' | 'strokeWidth' | 'strokeDasharray' | 'animation'> {
  const metadata = edge.metadata || {};
  const manualAnimation =
    getEdgeAnimation(metadata.edgeAnimation) || getEdgeAnimation(metadata.animation);
  const manualColor =
    getStringMetadata(metadata, 'edgeColor') || getStringMetadata(metadata, 'color');
  const activeWindow = getActiveEdgeStyleWindow(metadata.styleWindows, currentStep);
  const manualOpacity = getNumberMetadata(metadata, 'opacity', 0, 1);
  const manualStrokeWidth = getNumberMetadata(metadata, 'strokeWidth', 1, 8);
  const manualDash = getStringMetadata(metadata, 'strokeDasharray');

  const automaticStyle = getAutomaticMapEdgeStyle(fromActivity, toActivity, currentActivityId, currentStep);

  if (activeWindow) {
    const activeAnimation =
      getEdgeAnimation(activeWindow.animation) ||
      manualAnimation ||
      getDefaultActiveEdgeAnimation(fromActivity, toActivity, currentStep);
    const isDisabled = activeAnimation === 'disabled';
    const opacity = manualOpacity ?? (isDisabled ? getDisabledEdgeOpacity(automaticStyle.opacity) : 0.9);
    const strokeDasharray = manualDash || (isDisabled ? automaticStyle.strokeDasharray || '2 10' : 'none');

    return {
      ...automaticStyle,
      color: activeWindow.color || manualColor || automaticStyle.color,
      opacity,
      strokeWidth: manualStrokeWidth ?? automaticStyle.strokeWidth,
      strokeDasharray,
      animation: activeAnimation,
    };
  }

  return {
    ...automaticStyle,
    color: manualColor || automaticStyle.color,
    opacity: manualOpacity ?? automaticStyle.opacity,
    strokeWidth: manualStrokeWidth ?? automaticStyle.strokeWidth,
    strokeDasharray: manualDash || automaticStyle.strokeDasharray,
    animation: manualAnimation || automaticStyle.animation,
  };
}

function getActiveEdgeStyleWindow(value: unknown, currentStep: number) {
  if (!Array.isArray(value)) return undefined;
  return value.find((window): window is GameActivityEdgeStyleWindow => {
    if (!window || typeof window !== 'object') return false;
    const candidate = window as Partial<GameActivityEdgeStyleWindow>;
    return (
      typeof candidate.startStep === 'number' &&
      currentStep >= candidate.startStep &&
      (candidate.endStep == null || currentStep < candidate.endStep)
    );
  });
}

function isActivityFoggedByStepWindow(activity: Activity, currentStep: number) {
  return !getActivityStepRanges(activity).some((range) => isStepInsideActivityRange(currentStep, range));
}

function getActivityStepRanges(activity: Activity): ActivityStepRange[] {
  const ranges = Array.isArray(activity.stepRanges)
    ? activity.stepRanges.flatMap((range): ActivityStepRange[] => {
        if (!range || typeof range.startStep !== 'number') return [];
        return range.endStep == null ? [{ startStep: range.startStep }] : [range];
      })
    : [];

  return ranges.length > 0 ? ranges : [{ startStep: Math.max(activity.requiredLevel - 1, 0) }];
}

function isStepInsideActivityRange(step: number, range: ActivityStepRange) {
  return step >= range.startStep && (range.endStep == null || step < range.endStep);
}

function getAutomaticMapEdgeStyle(
  fromActivity: Activity | undefined,
  toActivity: Activity | undefined,
  currentActivityId: string | null | undefined,
  currentStep: number
): Pick<GraphEdge, 'color' | 'opacity' | 'strokeWidth' | 'strokeDasharray' | 'animation'> {
  if (!fromActivity || !toActivity) {
    return { color: EDGE_COLOR_LOCKED, opacity: 0.18, strokeDasharray: '2 10', animation: 'disabled' };
  }

  const fromFogged = isActivityFoggedByStepWindow(fromActivity, currentStep);
  const toFogged = isActivityFoggedByStepWindow(toActivity, currentStep);

  if (fromFogged || toFogged) {
    return { color: EDGE_COLOR_LOCKED, opacity: 0.18, strokeDasharray: '2 10', animation: 'disabled' };
  }

  if (fromActivity.isCompleted && toActivity.isCompleted) {
    return { color: EDGE_COLOR_COMPLETED, opacity: 0.7, strokeWidth: 3.5, animation: 'flow' };
  }

  if (currentActivityId === fromActivity.id && !toActivity.isCompleted) {
    return {
      color: toActivity.cardColor || EDGE_COLOR_TARGET,
      opacity: 0.85,
      strokeWidth: 4,
      animation: 'flow',
    };
  }

  if (fromActivity.isCompleted && !toActivity.isCompleted) {
    return {
      color: toActivity.cardColor || EDGE_COLOR_TARGET,
      opacity: 0.6,
      strokeWidth: 3.5,
      animation: 'none',
    };
  }

  return { color: EDGE_COLOR_LOCKED, opacity: 0.35, animation: 'none' };
}

function getEdgeAnimation(value: unknown): GameActivityEdgeAnimation | undefined {
  if (value === 'glow') return 'pulse';
  return value === 'disabled' ||
    value === 'none' ||
    value === 'flow' ||
    value === 'pulse'
    ? value
    : undefined;
}

function getDisabledEdgeOpacity(value: number | undefined) {
  return Math.min(value ?? 0.28, 0.35);
}

function getDefaultActiveEdgeAnimation(
  fromActivity: Activity | undefined,
  toActivity: Activity | undefined,
  currentStep: number
): GameActivityEdgeAnimation {
  return !fromActivity ||
    !toActivity ||
    isActivityFoggedByStepWindow(fromActivity, currentStep) ||
    isActivityFoggedByStepWindow(toActivity, currentStep)
    ? 'disabled'
    : 'none';
}

function getStringMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumberMetadata(
  metadata: Record<string, unknown>,
  key: string,
  min: number,
  max: number
) {
  const value = metadata[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function buildMapNodeMarker({
  playerMarker,
  currentPlayerMarker,
  occupancy,
  activity,
  activityById,
  showGuildOccupancyMarkers,
  t,
}: {
  playerMarker?: PlayerMapMarker;
  currentPlayerMarker?: PlayerMapMarker;
  occupancy?: GameMapNodeOccupancy;
  activity: Activity;
  activityById: Map<string, Activity>;
  showGuildOccupancyMarkers?: boolean;
  t: (path: string) => string;
}) {
  const isGuildActivity = activity.participationMode === 'guild';
  const adminGuildGroups =
    showGuildOccupancyMarkers && isGuildActivity ? buildAdminGuildMarkerGroups(occupancy, t) : [];
  const currentPlayerStudentId = showGuildOccupancyMarkers ? undefined : currentPlayerMarker?.studentId;
  const currentPlayerGuildId = showGuildOccupancyMarkers ? undefined : currentPlayerMarker?.guildId;
  const currentPlayerInOccupancy = Boolean(
    currentPlayerStudentId &&
      occupancy?.segments.some(
        (segment) => segment.members?.some((member) => member.studentId === currentPlayerStudentId)
      )
  );
  const guildMarkers = showGuildOccupancyMarkers
    ? adminGuildGroups.length
      ? [
          <AdminGuildMapMarker
            key="admin-guilds"
            groups={adminGuildGroups}
            currentActivity={activity}
            activityById={activityById}
            t={t}
          />,
        ]
      : []
    : currentPlayerGuildId
      ? (occupancy?.segments || []).flatMap((segment) => {
          const segmentMembers = segment.members || [];
          const isCurrentGuildSegment = Boolean(
            segment.guildId === currentPlayerGuildId ||
              segmentMembers.some((member) => member.guildId === currentPlayerGuildId)
          );
          const visibleMembers =
            isCurrentGuildSegment && segment.guildId === currentPlayerGuildId
              ? segmentMembers
              : segmentMembers.filter((member) => member.guildId === currentPlayerGuildId);
          if (!visibleMembers.length) return [];
          return [
            <GuildOccupancyMapMarker
              key={segment.guildId || `${activity.id}-${segment.guildName || segment.kind}`}
              color={segment.color || (segment.kind === 'guild' ? FALLBACK_GUILD_COLOR : SOLO_OCCUPANCY_COLOR)}
              guildName={segment.guildName || visibleMembers[0]?.guildName}
              members={visibleMembers}
              currentActivity={activity}
              activityById={activityById}
              currentPlayerStudentId={currentPlayerStudentId}
            />,
          ];
        })
      : [];

  const shouldShowStandalonePlayerMarker = Boolean(
    playerMarker && (!currentPlayerGuildId || !currentPlayerInOccupancy || guildMarkers.length === 0)
  );

  if (!shouldShowStandalonePlayerMarker && guildMarkers.length === 0) return undefined;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {shouldShowStandalonePlayerMarker && playerMarker ? (
        <AvatarDeck
          members={[
            {
              id: playerMarker.studentId || 'current-player',
              name: playerMarker.label,
              avatarUrl: playerMarker.illustrationUrl,
              color: playerMarker.characterClass ? CHARACTER_CLASS_COLORS[playerMarker.characterClass] : undefined,
              onClick: () => openDirectoryTarget(),
            },
          ]}
          color={playerMarker.characterClass ? CHARACTER_CLASS_COLORS[playerMarker.characterClass] : SOLO_OCCUPANCY_COLOR}
          size="md"
          align="center"
          interactive={Boolean(playerMarker.characterClass)}
          getAvatarMotion={() =>
            getTravelMotion(getTravelVector(activityById, playerMarker.previousActivityId, activity))
          }
        />
      ) : null}
      {guildMarkers}
    </div>
  );
}

function isSystemOnboardingActivity(activity: Activity) {
  const metadata = (activity.metadata || {}) as Record<string, unknown>;
  return metadata.onboardingTask === 'institutional_profile' || metadata.onboardingTask === 'character_card';
}

function resolvePlayerGuildIdFromOccupancies(
  occupancies: GameMapNodeOccupancy[],
  studentId?: string
) {
  if (!studentId) return undefined;

  for (const occupancy of occupancies) {
    for (const segment of occupancy.segments) {
      const member = segment.members?.find((candidate) => candidate.studentId === studentId);
      if (member?.guildId) return member.guildId;
      if (member && segment.guildId) return segment.guildId;
    }
  }

  return undefined;
}

function GuildOccupancyMapMarker({
  color,
  guildName,
  members,
  currentActivity,
  activityById,
  currentPlayerStudentId,
}: {
  color: string;
  guildName?: string;
  members: NonNullable<GameMapNodeOccupancy['segments'][number]['members']>;
  currentActivity: Activity;
  activityById: Map<string, Activity>;
  currentPlayerStudentId?: string;
}) {
  const avatarMembers = toAvatarMembers(orderCurrentPlayerFirst(members, currentPlayerStudentId), guildName);
  const includesCurrentPlayer = Boolean(
    currentPlayerStudentId && members.some((member) => member.studentId === currentPlayerStudentId)
  );

  return (
    <AvatarDeck
      members={avatarMembers}
      color={color}
      size={includesCurrentPlayer ? 'md' : 'sm'}
      className="shrink-0"
      stackItemClassName="!left-0"
      align="center"
      restStepRem={includesCurrentPlayer ? 0.28 : 0.24}
      openStepRem={includesCurrentPlayer ? 0.72 : 0.58}
      expanded={false}
      reserveOpenWidth
      expandOnHover={false}
      expandOnParentHover
      liftItemsOnHover={false}
      showLabelsOnHover={false}
      getAvatarMotion={(member) => {
        const occupancyMember = members.find((candidate) => candidate.studentId === member.id);
        return getTravelMotion(getTravelVector(activityById, occupancyMember?.fromActivityId, currentActivity));
      }}
    />
  );
}

interface AdminGuildMarkerGroup {
  id: string;
  name: string;
  iconUrl?: string;
  iconKey?: string;
  color: string;
  members: NonNullable<GameMapNodeOccupancy['segments'][number]['members']>;
}

function AdminGuildMapMarker({
  groups,
  currentActivity,
  activityById,
  t,
}: {
  groups: AdminGuildMarkerGroup[];
  currentActivity: Activity;
  activityById: Map<string, Activity>;
  t: (path: string) => string;
}) {
  const guildMembers: AvatarDeckMember[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    avatarUrl: group.iconKey ? undefined : group.iconUrl,
    icon: group.iconKey ? renderLucideIcon(group.iconKey, 18) : undefined,
    color: group.color,
    subtitle: t('graph.presentCount').replace('{count}', String(group.members.length)),
    onClick: () => openDirectoryTarget(group.name),
  }));

  return (
    <div className="group/admin-guild-marker relative shrink-0">
      <AvatarDeck
        members={guildMembers}
        color={FALLBACK_GUILD_COLOR}
        size="sm"
        className="shrink-0"
        align="center"
        getAvatarMotion={(member) => {
          const group = groups.find((candidate) => candidate.id === member.id);
          const fromActivityId = group?.members.find(
            (occupancyMember) => occupancyMember.fromActivityId
          )?.fromActivityId;
          return getTravelMotion(getTravelVector(activityById, fromActivityId, currentActivity));
        }}
      />
      {groups.some((group) => group.members.length > 0) ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-[80] -translate-x-1/2 pt-2 opacity-0 transition-opacity duration-200 group-hover/admin-guild-marker:pointer-events-auto group-hover/admin-guild-marker:opacity-100 group-focus-within/admin-guild-marker:pointer-events-auto group-focus-within/admin-guild-marker:opacity-100">
          <div className="flex flex-col gap-2 rounded-2xl border border-gaming-border bg-gaming-card/95 p-2 shadow-2xl backdrop-blur">
            {groups.map((group) => {
              const avatarMembers = toAvatarMembers(group.members, group.name);
              if (!avatarMembers.length) return null;

              return (
                <AvatarDeck
                  key={group.id}
                  members={avatarMembers}
                  color={group.color}
                  size="sm"
                  className="min-w-0"
                  getAvatarMotion={(member) => {
                    const occupancyMember = group.members.find(
                      (candidate) => candidate.studentId === member.id
                    );
                    return getTravelMotion(
                      getTravelVector(
                        activityById,
                        occupancyMember?.fromActivityId,
                        currentActivity
                      )
                    );
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildAdminGuildMarkerGroups(
  occupancy: GameMapNodeOccupancy | undefined,
  t: (path: string) => string
): AdminGuildMarkerGroup[] {
  if (!occupancy) return [];

  const groups = new Map<string, AdminGuildMarkerGroup>();

  for (const segment of occupancy.segments) {
    if (segment.studentCount <= 0) continue;

    if (segment.kind === 'guild') {
      const id =
        segment.guildId ||
        `${occupancy.activityId}-${segment.guildName || segment.color || 'guild'}`;
      groups.set(id, {
        id,
        name: segment.guildName || t('graph.guild'),
        iconUrl: segment.guildIconUrl,
        iconKey: segment.guildIconKey,
        color: segment.color || FALLBACK_GUILD_COLOR,
        members: segment.members || [],
      });
      continue;
    }

    for (const member of segment.members || []) {
      const id = member.guildId || member.guildName || `${occupancy.activityId}-unguilded`;
      const group = groups.get(id) || {
        id,
        name: member.guildName || t('class.unguildedTitle'),
        iconUrl: member.guildIconUrl,
        iconKey: member.guildIconKey,
        color: member.guildColor || segment.color || SOLO_OCCUPANCY_COLOR,
        members: [],
      };

      groups.set(id, {
        ...group,
        iconUrl: group.iconUrl || member.guildIconUrl,
        iconKey: group.iconKey || member.guildIconKey,
        color: group.color || member.guildColor || segment.color || SOLO_OCCUPANCY_COLOR,
        members: [...group.members, member],
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name)
  );
}

function toAvatarMembers(
  members: NonNullable<GameMapNodeOccupancy['segments'][number]['members']>,
  guildName?: string
): AvatarDeckMember[] {
  return members.map((member) => ({
    id: member.studentId,
    name: member.displayName,
    avatarUrl: member.characterIllustrationUrl || member.avatarUrl,
    color: member.characterClass ? CHARACTER_CLASS_COLORS[member.characterClass] : undefined,
    subtitle: member.characterClass,
    onClick: () => openDirectoryTarget(member.guildName || guildName, member.studentId),
  }));
}

function orderCurrentPlayerFirst(
  members: NonNullable<GameMapNodeOccupancy['segments'][number]['members']>,
  currentPlayerStudentId?: string
) {
  if (!currentPlayerStudentId) return members;
  const currentPlayer = members.find((member) => member.studentId === currentPlayerStudentId);
  if (!currentPlayer) return members;
  return [
    currentPlayer,
    ...members.filter((member) => member.studentId !== currentPlayerStudentId),
  ];
}

function openDirectoryTarget(guildName?: string, memberId?: string) {
  if (guildName || memberId) {
    sessionStorage.setItem(
      'eduquest_directory_scroll_target',
      JSON.stringify({
        guildName,
        memberId,
      })
    );
  }

  window.location.hash = 'annuaire';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function getTravelMotion(travel?: { x: number; y: number }): AvatarDeckMotion | undefined {
  const hasTravel = travel && (Math.abs(travel.x) > 1 || Math.abs(travel.y) > 1);
  if (!hasTravel) return undefined;

  return {
    travelX: travel.x,
    travelY: travel.y,
  };
}

function getTravelVector(
  activityById: Map<string, Activity>,
  fromActivityId: string | undefined,
  currentActivity: Activity
) {
  if (!fromActivityId || fromActivityId === currentActivity.id) return undefined;

  const fromActivity = activityById.get(fromActivityId);
  if (!fromActivity) return undefined;

  return {
    x: fromActivity.mapX - currentActivity.mapX,
    y: fromActivity.mapY - currentActivity.mapY,
  };
}

function buildAnnularSegments(
  activity: Activity,
  occupancy: GameMapNodeOccupancy | undefined
): GraphNodeAnnularSegment[] | undefined {
  if (!occupancy || occupancy.totalStudents <= 0) return undefined;

  if (activity.participationMode !== 'guild') {
    const studentCount = occupancy.segments.reduce(
      (total, segment) => total + segment.studentCount,
      0
    );
    return studentCount > 0
      ? [
          {
            id: `${activity.id}-solo`,
            color: SOLO_OCCUPANCY_COLOR,
            value: studentCount,
            total: occupancy.totalStudents,
            label: `${studentCount} students`,
            kind: 'solo',
            members: occupancy.segments.flatMap((segment) =>
              (segment.members || []).map((member) => ({
                id: member.studentId,
                name: member.displayName,
                avatarUrl: member.characterIllustrationUrl || member.avatarUrl,
                subtitle: member.characterClass,
                onClick: () =>
                  openDirectoryTarget(member.guildName || segment.guildName, member.studentId),
              }))
            ),
          },
        ]
      : undefined;
  }

  const segments = occupancy.segments.flatMap<GraphNodeAnnularSegment>((segment) => {
    if (segment.studentCount <= 0) return [];

    return {
      id: segment.guildId || `${activity.id}-${segment.kind}`,
      color:
        segment.kind === 'guild' ? segment.color || FALLBACK_GUILD_COLOR : SOLO_OCCUPANCY_COLOR,
      value: segment.studentCount,
      total: occupancy.totalStudents,
      label: segment.guildName || `${segment.studentCount} students`,
      iconUrl: segment.guildIconUrl,
      iconKey: segment.guildIconKey,
      kind: segment.kind,
      members: (segment.members || []).map((member) => ({
        id: member.studentId,
        name: member.displayName,
        avatarUrl: member.characterIllustrationUrl || member.avatarUrl,
        subtitle: member.characterClass,
        onClick: () => openDirectoryTarget(member.guildName || segment.guildName, member.studentId),
      })),
    };
  });

  return segments.length > 0 ? orderSegmentsByColor(segments) : undefined;
}

function orderSegmentsByColor(segments: GraphNodeAnnularSegment[]) {
  const remaining = [...segments].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const ordered: GraphNodeAnnularSegment[] = [];

  while (remaining.length > 0) {
    const previousColor = ordered[ordered.length - 1]?.color;
    const nextIndex = remaining.findIndex((segment) => segment.color !== previousColor);
    const [next] = remaining.splice(nextIndex === -1 ? 0 : nextIndex, 1);
    ordered.push(next);
  }

  if (ordered.length <= 2 || ordered[0].color !== ordered[ordered.length - 1]?.color)
    return ordered;

  const lastIndex = ordered.length - 1;
  const swapIndex = ordered.findIndex((candidate, index) => {
    if (index === 0 || index === lastIndex) return false;
    const left = ordered[index - 1];
    const right = ordered[index + 1];
    const last = ordered[lastIndex];

    return (
      candidate.color !== ordered[0].color &&
      candidate.color !== ordered[lastIndex - 1].color &&
      last.color !== left.color &&
      last.color !== right.color
    );
  });

  if (swapIndex === -1) return ordered;

  const swapped = [...ordered];
  [swapped[swapIndex], swapped[lastIndex]] = [swapped[lastIndex], swapped[swapIndex]];
  return swapped;
}

export default GameMap;
