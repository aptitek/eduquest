import type { Activity, ActivityType, GameActivityEdge } from '@eduquest/shared';
import { GenericGraph, GraphEdge, GraphNode } from '../molecules/GenericGraph';
import { BookOpen, Compass, Flame, Hammer, HelpCircle, Lock, Shield, Snowflake, Swords, User, Users } from 'lucide-react';
import { getActivityVisualVariant } from '../../features/game/activityPresentation';

interface GameMapProps {
  activities: Activity[];
  edges: GameActivityEdge[];
  onSelectNode: (activity: Activity) => void;
}

export function GameMap({
  activities,
  edges,
  onSelectNode,
}: GameMapProps) {
  const getIcon = (type: ActivityType, isLocked: boolean) => {
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

  const getColors = (activity: Activity) => {
    const isCompleted = Boolean(activity.isCompleted);
    const isLocked = Boolean(activity.isLocked);

    if (activity.isStormed) {
      return 'bg-gaming-base border-status-boss/50 text-status-boss/60 cursor-not-allowed opacity-60';
    }
    if (activity.isCurrent) {
      return 'bg-status-quest/20 border-status-quest text-status-quest cursor-pointer motion-safe:hover:scale-110 shadow-glow-primary ring-2 ring-status-quest/40';
    }
    if (!activity.isRevealed) {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed opacity-40';
    }
    if (isLocked) {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed';
    }
    if (isCompleted) {
      return 'bg-status-completed/10 border-status-completed text-status-completed hover:border-status-completed cursor-pointer motion-safe:hover:scale-110 shadow-lg';
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

  // Convert Activity list to reusable Generic GraphNode list (KISS)
  const graphNodes: GraphNode<Activity>[] = activities.map((act) => {
    const locked = Boolean(act.isLocked || act.isStormed);

    return {
      id: act.id,
      label: act.title,
      x: act.mapX,
      y: act.mapY,
      isCompleted: Boolean(act.isCompleted),
      isLocked: locked,
      isHidden: !act.isRevealed,
      isStormed: act.isStormed,
      icon: getIcon(act.type, locked),
      customClass: getColors(act),
      metadata: act,
    };
  });
  const nodeById = new Map(graphNodes.map((node) => [node.id, node]));
  const graphEdges: GraphEdge[] = edges.map((edge) => {
    const fromNode = nodeById.get(edge.fromActivityId);
    const toNode = nodeById.get(edge.toActivityId);

    return {
      id: edge.id,
      from: edge.fromActivityId,
      to: edge.toActivityId,
      isCompleted: Boolean(fromNode?.isCompleted && toNode?.isCompleted),
      isLocked: Boolean(fromNode?.isLocked || toNode?.isLocked),
      isHidden: Boolean(fromNode?.isHidden || toNode?.isHidden),
    };
  });

  return (
    <GenericGraph
      nodes={graphNodes}
      edges={graphEdges}
      width={1000}
      height={600}
      onSelectNode={(node) => {
        if (node.metadata) onSelectNode(node.metadata);
      }}
    />
  );
}

export default GameMap;
