import type { CSSProperties } from 'react';
import type {
  Activity,
  ActivityType,
  GameActivityEdge,
  GameActivityEdgeAnimation,
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
  BookOpen,
  CheckCircle2,
  CloudFog,
  Compass,
  Flame,
  Hammer,
  HelpCircle,
  Lock,
  Shield,
  Snowflake,
  Swords,
  User,
  Users,
} from 'lucide-react';
import { getActivityVisualVariant } from '../../features/game/activityPresentation';
import { renderLucideIcon } from '../../features/game/lucideIconCatalog';
import { UI_COLOR_TOKENS } from '../../styles/colorTokens';
import { useTranslation } from '../../hooks/useTranslation';

interface PlayerMapMarker {
  activityId: string | null;
  previousActivityId?: string;
  characterClass: GameCharacterClass;
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
  onSelectNode: (activity: Activity) => void;
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
  onSelectNode,
}: GameMapProps) {
  const { t } = useTranslation();
  type NodeStatus = 'FOG_OF_WAR' | 'ACTIVE';

  const getIcon = (type: ActivityType, status: NodeStatus, isLocked: boolean) => {
    if (status === 'FOG_OF_WAR') return <CloudFog size={20} />;
    if (isLocked) return <Lock size={20} />;
    switch (type) {
      case 'onboarding':
        return <Compass size={20} />;
      case 'character_creation':
        return <User size={20} />;
      case 'tavern':
        return <Users size={20} />;
      case 'tutorial':
        return <BookOpen size={20} />;
      case 'ice_breaker':
        return <Snowflake size={20} />;
      case 'campfire':
        return <Flame size={20} />;
      case 'quiz':
        return <HelpCircle size={20} />;
      case 'practical':
        return <Hammer size={20} />;
      case 'mini_boss':
        return <Shield size={20} />;
      case 'boss':
        return <Swords size={20} />;
    }
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
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const graphNodes: GraphNode<Activity>[] = activities.map((act) => {
    const visibilityStatus: NodeStatus = act.isRevealed ? 'ACTIVE' : 'FOG_OF_WAR';
    const displayStatus: NodeStatus = canEditLocked ? 'ACTIVE' : visibilityStatus;
    const locked = !canEditLocked && (displayStatus !== 'ACTIVE' || Boolean(act.isLocked));
    const isFogged = displayStatus === 'FOG_OF_WAR';
    const isCompleted = showCompletionState && Boolean(act.isCompleted);
    const hasPlayerMarker =
      playerMarker &&
      (playerMarker.activityId ? playerMarker.activityId === act.id : act.isCurrent);
    const occupancy = occupancyByActivityId.get(act.id);
    const marker = buildMapNodeMarker({
      playerMarker: hasPlayerMarker ? playerMarker : undefined,
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
      icon: getIcon(act.type, displayStatus, locked),
      badge: isCompleted ? (
        <CheckCircle2
          size={18}
          strokeWidth={3.25}
          className="text-status-completed drop-shadow-[0_0_6px_var(--color-status-completed)]"
        />
      ) : undefined,
      marker,
      annularSegments: buildAnnularSegments(act, occupancy),
      customClass: getColors(act, displayStatus),
      customStyle: getColorStyle(act, displayStatus),
      fogState: canEditLocked ? undefined : isFogged ? 'fog' : locked ? undefined : 'clear',
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
      currentActivityId: playerMarker?.activityId,
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
}: {
  edge: GameActivityEdge;
  fromActivity?: Activity;
  toActivity?: Activity;
  currentActivityId?: string | null;
}): Pick<GraphEdge, 'color' | 'opacity' | 'strokeWidth' | 'strokeDasharray' | 'animation'> {
  const metadata = edge.metadata || {};
  const manualAnimation =
    getEdgeAnimation(metadata.edgeAnimation) || getEdgeAnimation(metadata.animation);
  const manualColor =
    getStringMetadata(metadata, 'edgeColor') || getStringMetadata(metadata, 'color');
  const manualOpacity = getNumberMetadata(metadata, 'opacity', 0, 1);
  const manualStrokeWidth = getNumberMetadata(metadata, 'strokeWidth', 1, 8);
  const manualDash = getStringMetadata(metadata, 'strokeDasharray');

  const automaticStyle = getAutomaticMapEdgeStyle(fromActivity, toActivity, currentActivityId);

  return {
    ...automaticStyle,
    color: manualColor || automaticStyle.color,
    opacity: manualOpacity ?? automaticStyle.opacity,
    strokeWidth: manualStrokeWidth ?? automaticStyle.strokeWidth,
    strokeDasharray: manualDash || automaticStyle.strokeDasharray,
    animation: manualAnimation || automaticStyle.animation,
  };
}

function getAutomaticMapEdgeStyle(
  fromActivity: Activity | undefined,
  toActivity: Activity | undefined,
  currentActivityId?: string | null
): Pick<GraphEdge, 'color' | 'opacity' | 'strokeWidth' | 'strokeDasharray' | 'animation'> {
  if (!fromActivity || !toActivity) {
    return { color: EDGE_COLOR_LOCKED, opacity: 0.18, strokeDasharray: '2 10', animation: 'pulse' };
  }

  if (fromActivity.isCompleted && toActivity.isCompleted) {
    return { color: EDGE_COLOR_COMPLETED, opacity: 0.7, strokeWidth: 3.5, animation: 'flow' };
  }

  if (!toActivity.isRevealed) {
    return { color: EDGE_COLOR_LOCKED, opacity: 0.18, strokeDasharray: '2 10', animation: 'pulse' };
  }

  if (fromActivity.isLocked || toActivity.isLocked) {
    return { color: EDGE_COLOR_LOCKED, opacity: 0.28, strokeDasharray: '6 8' };
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
      animation: 'pulse',
    };
  }

  return { color: EDGE_COLOR_LOCKED, opacity: 0.35, strokeDasharray: '4 10' };
}

function getEdgeAnimation(value: unknown): GameActivityEdgeAnimation | undefined {
  return value === 'none' || value === 'flow' || value === 'pulse' ? value : undefined;
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
  occupancy,
  activity,
  activityById,
  showGuildOccupancyMarkers,
  t,
}: {
  playerMarker?: PlayerMapMarker;
  occupancy?: GameMapNodeOccupancy;
  activity: Activity;
  activityById: Map<string, Activity>;
  showGuildOccupancyMarkers?: boolean;
  t: (path: string) => string;
}) {
  const adminGuildGroups = showGuildOccupancyMarkers ? buildAdminGuildMarkerGroups(occupancy, t) : [];
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
    : activity.participationMode === 'guild'
      ? (occupancy?.segments || []).flatMap((segment) => {
          if (segment.kind !== 'guild' || !segment.members?.length) return [];
          return [
            <GuildMemberMapMarker
              key={segment.guildId || `${activity.id}-${segment.guildName || segment.color}`}
              color={segment.color || FALLBACK_GUILD_COLOR}
              guildName={segment.guildName}
              members={segment.members}
              currentActivity={activity}
              activityById={activityById}
            />,
          ];
        })
      : [];

  if (!playerMarker && guildMarkers.length === 0) return undefined;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {playerMarker ? (
        <AvatarDeck
          members={[
            {
              id: 'current-player',
              name: playerMarker.label,
              avatarUrl: playerMarker.illustrationUrl,
              onClick: () => openClassTarget(),
            },
          ]}
          color={CHARACTER_CLASS_COLORS[playerMarker.characterClass]}
          size="md"
          getAvatarMotion={() =>
            getTravelMotion(getTravelVector(activityById, playerMarker.previousActivityId, activity))
          }
        />
      ) : null}
      {guildMarkers}
    </div>
  );
}

function GuildMemberMapMarker({
  color,
  guildName,
  members,
  currentActivity,
  activityById,
}: {
  color: string;
  guildName?: string;
  members: NonNullable<GameMapNodeOccupancy['segments'][number]['members']>;
  currentActivity: Activity;
  activityById: Map<string, Activity>;
}) {
  const avatarMembers = toAvatarMembers(members, guildName);

  return (
    <AvatarDeck
      members={avatarMembers}
      color={color}
      size="sm"
      className="shrink-0"
      getAvatarMotion={(member) => {
        const occupancyMember = members.find((candidate) => candidate.studentId === member.id);
        return getTravelMotion(
          getTravelVector(activityById, occupancyMember?.fromActivityId, currentActivity)
        );
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
    onClick: () => openClassTarget(group.name),
  }));

  return (
    <div className="group/admin-guild-marker relative shrink-0">
      <AvatarDeck
        members={guildMembers}
        color={FALLBACK_GUILD_COLOR}
        size="sm"
        className="shrink-0"
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
    avatarUrl: member.avatarUrl,
    subtitle: member.characterClass,
    onClick: () => openClassTarget(member.guildName || guildName, member.studentId),
  }));
}

function openClassTarget(guildName?: string, memberId?: string) {
  if (guildName || memberId) {
    sessionStorage.setItem(
      'eduquest_class_scroll_target',
      JSON.stringify({
        guildName,
        memberId,
      })
    );
  }

  window.location.hash = 'class';
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
                avatarUrl: member.avatarUrl,
                subtitle: member.characterClass,
                onClick: () =>
                  openClassTarget(member.guildName || segment.guildName, member.studentId),
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
        avatarUrl: member.avatarUrl,
        subtitle: member.characterClass,
        onClick: () => openClassTarget(member.guildName || segment.guildName, member.studentId),
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
